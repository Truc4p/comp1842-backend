const mongoose = require("mongoose");

const chatConversationSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false, // Allow anonymous conversations
  },
  messages: [{
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    messageType: {
      type: String,
      enum: ['text', 'predefined', 'ai', 'staff'],
      default: 'text',
    },
    metadata: {
      faqId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "FAQ",
      },
      intent: String,
      confidence: Number,
      retrievedProducts: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      }],
    },
  }],
  isActive: {
    type: Boolean,
    default: true,
  },
  // Staff chat specific fields
  isStaffChat: {
    type: Boolean,
    default: false,
  },
  waitingForStaff: {
    type: Boolean,
    default: false,
  },
  hasUnreadFromCustomer: {
    type: Boolean,
    default: false,
  },
  lastStaffRead: {
    type: Date,
    default: null,
  },
  assignedStaff: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false,
  },
  lastActivity: {
    type: Date,
    default: Date.now,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Update lastActivity on save only if it was explicitly modified
chatConversationSchema.pre('save', function(next) {
  // Only update lastActivity if it was explicitly modified in the code
  // This prevents automatic updates when just updating other fields like lastStaffRead
  if (this.isModified('lastActivity') && this.lastActivity !== undefined) {
    this.lastActivity = this.lastActivity; // Keep the explicitly set value
  }
  next();
});

// Create indexes
chatConversationSchema.index({ sessionId: 1 });
chatConversationSchema.index({ userId: 1 });
chatConversationSchema.index({ lastActivity: -1 });
chatConversationSchema.index({ createdAt: -1 });

module.exports = mongoose.model("ChatConversation", chatConversationSchema);
