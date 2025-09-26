const FAQ = require("../models/faq");
const Product = require("../models/product");
const ChatConversation = require("../models/chatConversation");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const crypto = require('crypto');

// Generate UUID-like string
function generateUUID() {
  return crypto.randomUUID ? crypto.randomUUID() : 
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
}

// Initialize Gemini API
if (!process.env.GEMINI_API_KEY) {
  console.error('GEMINI_API_KEY environment variable is required');
  throw new Error('_API_KEY environment variable is not set');
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-8b" });

// Flow 1: Get predefined FAQs (menu-driven)
exports.getFAQs = async (req, res) => {
  try {
    const { category, limit = 10 } = req.query;
    
    const filter = { isActive: true };
    if (category) {
      filter.category = category;
    }

    const faqs = await FAQ.find(filter)
      .sort({ priority: -1, createdAt: -1 })
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      data: faqs,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching FAQs",
      error: error.message,
    });
  }
};

// Flow 1: Get specific FAQ answer
exports.getFAQAnswer = async (req, res) => {
  try {
    const { faqId } = req.params;
    const { sessionId } = req.body;

    const faq = await FAQ.findById(faqId);
    if (!faq) {
      return res.status(404).json({
        success: false,
        message: "FAQ not found",
      });
    }

    // Save conversation
    await saveConversation(sessionId, req.user?.id, faq.question, faq.answer, 'predefined', { faqId });

    res.status(200).json({
      success: true,
      data: {
        question: faq.question,
        answer: faq.answer,
        sessionId,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching FAQ answer",
      error: error.message,
    });
  }
};

// Flow 2: AI-powered conversation
exports.chatWithAI = async (req, res) => {
  try {
    const { message, sessionId: providedSessionId } = req.body;
    
    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Message is required",
      });
    }

    // Generate session ID if not provided
    const sessionId = providedSessionId || generateUUID();

    // Get conversation history
    const conversation = await getConversationHistory(sessionId);

    // Step 1: Intent classification and information retrieval
    const retrievedInfo = await retrieveRelevantInformation(message);

    // Step 2: Generate AI response using RAG
    const aiResponse = await generateAIResponse(message, conversation.messages, retrievedInfo);

    // Step 3: Save conversation
    await saveConversation(sessionId, req.user?.id, message, aiResponse.content, 'ai', {
      intent: aiResponse.intent,
      confidence: aiResponse.confidence,
      retrievedProducts: retrievedInfo.products.map(p => p._id),
    });

    res.status(200).json({
      success: true,
      data: {
        message: aiResponse.content,
        sessionId,
        intent: aiResponse.intent,
        confidence: aiResponse.confidence,
        relatedProducts: retrievedInfo.products.slice(0, 3), // Return top 3 products
        relatedFAQs: retrievedInfo.faqs.slice(0, 2), // Return top 2 FAQs
      },
    });
  } catch (error) {
    console.error('Chat AI Error:', error);
    res.status(500).json({
      success: false,
      message: "Error processing your message",
      error: error.message,
    });
  }
};

// Get conversation history
exports.getConversationHistory = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { limit = 20 } = req.query;

    const conversation = await ChatConversation.findOne({ sessionId })
      .populate('messages.metadata.faqId', 'question')
      .populate('messages.metadata.retrievedProducts', 'name price image');

    if (!conversation) {
      return res.status(200).json({
        success: true,
        data: { 
          messages: [],
          conversationState: {
            isStaffChat: false,
            waitingForStaff: false,
            isActive: true,
            hasUnreadFromCustomer: false,
            assignedStaff: null
          }
        },
      });
    }

    // Return last N messages
    const messages = conversation.messages
      .slice(-parseInt(limit))
      .map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp,
        messageType: msg.messageType,
        relatedProducts: msg.metadata?.retrievedProducts || [],
        faq: msg.metadata?.faqId || null,
      }));

    res.status(200).json({
      success: true,
      data: { 
        messages,
        // Include conversation state information
        conversationState: {
          isStaffChat: conversation.isStaffChat,
          waitingForStaff: conversation.waitingForStaff,
          isActive: conversation.isActive,
          hasUnreadFromCustomer: conversation.hasUnreadFromCustomer,
          assignedStaff: conversation.assignedStaff
        }
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching conversation history",
      error: error.message,
    });
  }
};

// Helper function: Retrieve relevant information using semantic search
async function retrieveRelevantInformation(query) {
  try {
    // Search FAQs
    const faqs = await FAQ.find(
      { 
        $text: { $search: query },
        isActive: true 
      },
      { score: { $meta: "textScore" } }
    )
    .sort({ score: { $meta: "textScore" } })
    .limit(5);

    // Search Products
    const products = await Product.find(
      { $text: { $search: query } },
      { score: { $meta: "textScore" } }
    )
    .populate('category', 'name')
    .sort({ score: { $meta: "textScore" } })
    .limit(10);

    // Enhanced product search by skin concerns, skin type, etc.
    const queryLower = query.toLowerCase();
    const skinConcernProducts = await Product.find({
      $or: [
        { skinConcerns: { $in: [queryLower] } },
        { skinType: { $in: [queryLower] } },
        { benefits: { $regex: queryLower, $options: 'i' } },
        { ingredients: { $regex: queryLower, $options: 'i' } },
      ]
    }).populate('category', 'name').limit(5);

    // Combine and deduplicate products
    const allProducts = [...products, ...skinConcernProducts];
    const uniqueProducts = allProducts.filter((product, index, self) => 
      index === self.findIndex(p => p._id.toString() === product._id.toString())
    );

    return {
      faqs,
      products: uniqueProducts.slice(0, 10),
    };
  } catch (error) {
    console.error('Error retrieving information:', error);
    return { faqs: [], products: [] };
  }
}

// Helper function: Generate AI response using Gemini
async function generateAIResponse(userMessage, conversationHistory, retrievedInfo) {
  try {
    // Build context from retrieved information
    let context = "You are Wrencos Beauty Assistant, an expert skincare consultant. Use the following information to help the customer:\n\n";
    
    // Add product information
    if (retrievedInfo.products.length > 0) {
      context += "RELEVANT PRODUCTS:\n";
      retrievedInfo.products.forEach(product => {
        context += `- ${product.name}: ${product.description || 'Premium skincare product'}\n`;
        if (product.price) context += `  Price: $${product.price}\n`;
        if (product.skinType?.length) context += `  Suitable for: ${product.skinType.join(', ')} skin\n`;
        if (product.benefits?.length) context += `  Benefits: ${product.benefits.join(', ')}\n`;
        if (product.skinConcerns?.length) context += `  Addresses: ${product.skinConcerns.join(', ')}\n`;
      });
      context += "\n";
    }

    // Add FAQ information
    if (retrievedInfo.faqs.length > 0) {
      context += "RELEVANT FAQs:\n";
      retrievedInfo.faqs.forEach(faq => {
        context += `Q: ${faq.question}\nA: ${faq.answer}\n\n`;
      });
    }

    // Build conversation context
    let conversationContext = "";
    if (conversationHistory.length > 0) {
      conversationContext = "\nCONVERSATION HISTORY:\n";
      const recentHistory = conversationHistory.slice(-5);
      recentHistory.forEach(msg => {
        conversationContext += `${msg.role === 'user' ? 'Customer' : 'Assistant'}: ${msg.content}\n`;
      });
      conversationContext += "\n";
    }

    // Create the full prompt
    const prompt = `${context}${conversationContext}

Instructions:
- Be helpful, friendly, and knowledgeable about skincare
- If recommending products, mention specific products from the RELEVANT PRODUCTS list
- Keep responses concise but informative (max 200 words)
- If you don't have specific information, suggest they contact customer service
- Always prioritize product recommendations based on the customer's skin type and concerns
- Include helpful skincare tips when relevant
- Respond in a conversational, natural tone

Customer's current question: ${userMessage}

Response:`;

    // Generate response using Gemini
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const aiResponse = response.text();

    // Simple intent classification based on keywords
    const intent = classifyIntent(userMessage);
    
    return {
      content: aiResponse,
      intent,
      confidence: 0.8,
    };
  } catch (error) {
    console.error('Gemini API Error:', error);
    
    // Fallback response without AI
    return generateFallbackResponse(userMessage, retrievedInfo);
  }
}

// Helper function: Generate fallback response when AI is not available
function generateFallbackResponse(userMessage, retrievedInfo) {
  let fallbackResponse = "I'm here to help you with your skincare needs! ";
  
  if (retrievedInfo.products.length > 0) {
    fallbackResponse += `Based on your query, you might be interested in these products: ${retrievedInfo.products.slice(0, 2).map(p => p.name).join(', ')}. `;
  }
  
  if (retrievedInfo.faqs.length > 0) {
    fallbackResponse += `Here's some helpful information: ${retrievedInfo.faqs[0].answer}`;
  } else {
    fallbackResponse += "Please feel free to browse our product catalog or contact our customer service for personalized recommendations.";
  }

  return {
    content: fallbackResponse,
    intent: classifyIntent(userMessage),
    confidence: 0.5,
  };
}

// Helper function: Simple intent classification
function classifyIntent(message) {
  const messageLower = message.toLowerCase();
  
  if (messageLower.includes('recommend') || messageLower.includes('suggest') || messageLower.includes('best')) {
    return 'product_recommendation';
  } else if (messageLower.includes('price') || messageLower.includes('cost') || messageLower.includes('expensive')) {
    return 'pricing_inquiry';
  } else if (messageLower.includes('ingredient') || messageLower.includes('contain')) {
    return 'ingredient_inquiry';
  } else if (messageLower.includes('skin type') || messageLower.includes('oily') || messageLower.includes('dry') || messageLower.includes('sensitive')) {
    return 'skin_type_consultation';
  } else if (messageLower.includes('acne') || messageLower.includes('wrinkle') || messageLower.includes('dark spot')) {
    return 'skin_concern_help';
  } else if (messageLower.includes('shipping') || messageLower.includes('delivery')) {
    return 'shipping_inquiry';
  } else if (messageLower.includes('return') || messageLower.includes('refund')) {
    return 'return_inquiry';
  } else {
    return 'general_inquiry';
  }
}

// Helper function: Save conversation to database
async function saveConversation(sessionId, userId, userMessage, assistantResponse, messageType, metadata = {}) {
  try {
    let conversation = await ChatConversation.findOne({ sessionId });
    
    if (!conversation) {
      conversation = new ChatConversation({
        sessionId,
        userId,
        messages: [],
      });
    }

    // Add user message
    conversation.messages.push({
      role: 'user',
      content: userMessage,
      messageType: 'text',
    });

    // Add assistant response
    conversation.messages.push({
      role: 'assistant',
      content: assistantResponse,
      messageType,
      metadata,
    });

    await conversation.save();
    return conversation;
  } catch (error) {
    console.error('Error saving conversation:', error);
    throw error;
  }
}

// Helper function: Get conversation history
async function getConversationHistory(sessionId) {
  try {
    const conversation = await ChatConversation.findOne({ sessionId });
    return conversation || { messages: [] };
  } catch (error) {
    console.error('Error fetching conversation:', error);
    return { messages: [] };
  }
}

// Admin functions for managing FAQs
exports.createFAQ = async (req, res) => {
  try {
    const { question, answer, category, tags, priority } = req.body;

    const faq = new FAQ({
      question,
      answer,
      category,
      tags,
      priority,
    });

    await faq.save();

    res.status(201).json({
      success: true,
      data: faq,
      message: "FAQ created successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating FAQ",
      error: error.message,
    });
  }
};

exports.updateFAQ = async (req, res) => {
  try {
    const { faqId } = req.params;
    const updateData = req.body;

    const faq = await FAQ.findByIdAndUpdate(faqId, updateData, { new: true });
    if (!faq) {
      return res.status(404).json({
        success: false,
        message: "FAQ not found",
      });
    }

    res.status(200).json({
      success: true,
      data: faq,
      message: "FAQ updated successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating FAQ",
      error: error.message,
    });
  }
};

exports.deleteFAQ = async (req, res) => {
  try {
    const { faqId } = req.params;

    const faq = await FAQ.findByIdAndDelete(faqId);
    if (!faq) {
      return res.status(404).json({
        success: false,
        message: "FAQ not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "FAQ deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting FAQ",
      error: error.message,
    });
  }
};

// Clear conversation history
exports.clearConversation = async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: "Session ID is required",
      });
    }

    // Delete the conversation from the database
    const deletedConversation = await ChatConversation.findOneAndDelete({ sessionId });

    res.json({
      success: true,
      message: "Conversation cleared successfully",
      data: {
        cleared: !!deletedConversation
      }
    });
  } catch (error) {
    console.error("Error clearing conversation:", error);
    res.status(500).json({
      success: false,
      message: "Error clearing conversation",
      error: error.message,
    });
  }
};

// Staff Chat Functions

// Connect customer to staff chat
exports.connectToStaff = async (req, res) => {
  try {
    const { sessionId } = req.body;
    
    console.log('🔍 Connect to staff called with user:', req.user);
    
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: "Session ID is required",
      });
    }

    // Find or create conversation
    let conversation = await ChatConversation.findOne({ sessionId });
    
    if (!conversation) {
      conversation = new ChatConversation({
        sessionId,
        userId: req.user?.id,
        messages: [],
      });
      console.log('🔍 Created new conversation with userId:', req.user?.id);
    } else {
      // Update existing conversation with user ID if not set
      if (!conversation.userId && req.user?.id) {
        conversation.userId = req.user.id;
        console.log('🔍 Updated existing conversation with userId:', req.user.id);
      }
    }

    // Mark conversation as staff chat and active
    conversation.isStaffChat = true;
    conversation.isActive = true;
    conversation.waitingForStaff = true;
    
    await conversation.save();

    res.status(200).json({
      success: true,
      message: "Connected to staff chat",
      data: { sessionId }
    });

  } catch (error) {
    console.error('Error connecting to staff:', error);
    res.status(500).json({
      success: false,
      message: "Error connecting to staff",
      error: error.message,
    });
  }
};

// Customer sends message to staff
exports.sendMessageToStaff = async (req, res) => {
  try {
    const { sessionId, message } = req.body;
    
    if (!sessionId || !message) {
      return res.status(400).json({
        success: false,
        message: "Session ID and message are required",
      });
    }

    let conversation = await ChatConversation.findOne({ sessionId });
    
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    // Add customer message
    conversation.messages.push({
      role: 'user',
      content: message,
      messageType: 'text',
      timestamp: new Date()
    });

    // Mark as having unread messages for staff
    conversation.hasUnreadFromCustomer = true;
    conversation.lastActivity = new Date();
    
    await conversation.save();

    // Send message to connected admins via WebSocket
    const wsManager = req.app.locals.wsManager;
    if (wsManager) {
      const sent = await wsManager.broadcastCustomerMessage(sessionId, message);
      if (sent) {
        console.log(`✅ Customer message broadcasted to admins for session: ${sessionId}`);
      } else {
        console.log(`⚠️ No admins connected via WebSocket for session: ${sessionId}`);
      }
    }

    res.status(200).json({
      success: true,
      message: "Message sent to staff"
    });

  } catch (error) {
    console.error('Error sending message to staff:', error);
    res.status(500).json({
      success: false,
      message: "Error sending message",
      error: error.message,
    });
  }
};

// Get new messages for customer in staff chat
exports.getStaffMessages = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { lastMessageTime } = req.query; // Optional parameter to track last seen message
    
    const conversation = await ChatConversation.findOne({ sessionId });
    
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    // Get messages since last check
    let recentMessages;
    if (lastMessageTime) {
      // Get messages newer than the last seen message
      recentMessages = conversation.messages.filter(msg => 
        msg.role === 'assistant' && 
        msg.messageType === 'staff' &&
        new Date(msg.timestamp) > new Date(lastMessageTime)
      );
    } else {
      // Fallback: get messages from last 10 seconds (increased from 5 to reduce risk)
      recentMessages = conversation.messages.filter(msg => 
        msg.role === 'assistant' && 
        msg.messageType === 'staff' &&
        new Date(msg.timestamp) > new Date(Date.now() - 10000)
      );
    }

    res.status(200).json({
      success: true,
      data: { newMessages: recentMessages }
    });

  } catch (error) {
    console.error('Error getting staff messages:', error);
    res.status(500).json({
      success: false,
      message: "Error getting messages",
      error: error.message,
    });
  }
};

// Admin Functions for Staff Chat

// Get all active customer chats for admin
exports.getActiveChats = async (req, res) => {
  try {
    const conversations = await ChatConversation.find({ 
      isStaffChat: true, 
      isActive: true 
    })
    .populate('userId', 'username email firstName lastName')
    .sort({ lastActivity: -1 })
    .limit(50);

    const activeChats = conversations.map(conv => {
      const lastMessage = conv.messages.length > 0 ? 
        conv.messages[conv.messages.length - 1].content : null;
      
      const unreadCount = conv.messages.filter(msg => 
        msg.role === 'user' && 
        new Date(msg.timestamp) > (conv.lastStaffRead || new Date(0))
      ).length;

      // Generate customer display name
      let customerName = 'Anonymous Customer';
      let customerEmail = null;
      
      if (conv.userId) {
        if (conv.userId.firstName && conv.userId.lastName) {
          customerName = `${conv.userId.firstName} ${conv.userId.lastName}`;
        } else if (conv.userId.username) {
          customerName = conv.userId.username;
        } else {
          customerName = `Customer ${conv.userId._id}`;
        }
        customerEmail = conv.userId.email;
      }

      return {
        sessionId: conv.sessionId,
        customerName,
        customerEmail,
        customerId: conv.userId?._id,
        lastMessage: lastMessage ? 
          (lastMessage.length > 50 ? lastMessage.substring(0, 50) + '...' : lastMessage) : 
          'No messages yet',
        lastActivity: conv.lastActivity,
        unreadCount,
        waitingForStaff: conv.waitingForStaff
      };
    });

    res.status(200).json({
      success: true,
      data: activeChats
    });

  } catch (error) {
    console.error('Error getting active chats:', error);
    res.status(500).json({
      success: false,
      message: "Error getting active chats",
      error: error.message,
    });
  }
};

// Get messages for a specific chat (admin view)
exports.getChatMessages = async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const conversation = await ChatConversation.findOne({ sessionId })
      .populate('userId', 'username email firstName lastName');
    
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    // Update last staff read time
    conversation.lastStaffRead = new Date();
    await conversation.save();

    // Generate customer display name
    let customerInfo = { name: 'Anonymous Customer', email: null, id: null };
    
    if (conversation.userId) {
      if (conversation.userId.firstName && conversation.userId.lastName) {
        customerInfo.name = `${conversation.userId.firstName} ${conversation.userId.lastName}`;
      } else if (conversation.userId.username) {
        customerInfo.name = conversation.userId.username;
      } else {
        customerInfo.name = `Customer ${conversation.userId._id}`;
      }
      customerInfo.email = conversation.userId.email;
      customerInfo.id = conversation.userId._id;
    }

    res.status(200).json({
      success: true,
      data: { 
        messages: conversation.messages,
        customer: customerInfo
      }
    });

  } catch (error) {
    console.error('Error getting chat messages:', error);
    res.status(500).json({
      success: false,
      message: "Error getting messages",
      error: error.message,
    });
  }
};

// Staff replies to customer
exports.staffReply = async (req, res) => {
  try {
    const { sessionId, message } = req.body;
    
    if (!sessionId || !message) {
      return res.status(400).json({
        success: false,
        message: "Session ID and message are required",
      });
    }

    let conversation = await ChatConversation.findOne({ sessionId });
    
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    // Add staff message
    conversation.messages.push({
      role: 'assistant',
      content: message,
      messageType: 'staff',
      timestamp: new Date()
    });

    // Update conversation state
    conversation.waitingForStaff = false;
    conversation.hasUnreadFromCustomer = false;
    // Don't update lastActivity for staff replies to prevent moving chat to top
    // conversation.lastActivity = new Date();
    conversation.lastStaffRead = new Date();
    
    await conversation.save();

    // Send message via WebSocket if customer is connected
    const wsManager = req.app.locals.wsManager;
    if (wsManager) {
      const sent = await wsManager.sendStaffReply(sessionId, message);
      if (sent) {
        console.log(`✅ Staff reply sent via WebSocket to session: ${sessionId}`);
      } else {
        console.log(`⚠️ Customer not connected via WebSocket for session: ${sessionId}`);
      }
    }

    res.status(200).json({
      success: true,
      message: "Reply sent successfully"
    });

  } catch (error) {
    console.error('Error sending staff reply:', error);
    res.status(500).json({
      success: false,
      message: "Error sending reply",
      error: error.message,
    });
  }
};

// Find existing conversation for a user (to recover lost sessions)
exports.findUserConversation = async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(200).json({
        success: true,
        data: { conversation: null }
      });
    }

    // Find the most recent active conversation for this user
    const conversation = await ChatConversation.findOne({ 
      userId: userId,
      isActive: true,
      lastActivity: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Within last 24 hours
    })
    .sort({ lastActivity: -1 })
    .select('sessionId isStaffChat waitingForStaff lastActivity');

    res.status(200).json({
      success: true,
      data: { conversation }
    });

  } catch (error) {
    console.error('Error finding user conversation:', error);
    res.status(500).json({
      success: false,
      message: "Error finding conversation",
      error: error.message,
    });
  }
};
