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
  throw new Error('GEMINI_API_KEY environment variable is not set');
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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
        data: { messages: [] },
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
      data: { messages },
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

// Helper function: Generate AI response using OpenAI
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
