const mongoose = require("mongoose");

const faqSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true,
    trim: true,
  },
  answer: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    enum: ['general', 'products', 'skincare', 'shipping', 'returns', 'ingredients', 'orders'],
    default: 'general',
  },
  tags: [{
    type: String,
    lowercase: true,
  }],
  isActive: {
    type: Boolean,
    default: true,
  },
  priority: {
    type: Number,
    default: 0, // Higher numbers = higher priority for display
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update the updatedAt field before saving
faqSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Create indexes for better search performance
faqSchema.index({ question: 'text', answer: 'text', tags: 'text' });
faqSchema.index({ category: 1 });
faqSchema.index({ isActive: 1 });
faqSchema.index({ priority: -1 });

module.exports = mongoose.model("FAQ", faqSchema);
