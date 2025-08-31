const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const BusinessExpenseSchema = new Schema({
  category: {
    type: String,
    enum: ['rent', 'utilities', 'payroll', 'marketing', 'shipping', 'equipment', 'software', 'other'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  frequency: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'],
    required: function() {
      return this.isRecurring;
    }
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  vendor: {
    type: String,
    trim: true
  },
  invoiceNumber: {
    type: String,
    trim: true
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'credit_card', 'bank_transfer', 'check', 'other'],
    default: 'other'
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'overdue', 'cancelled'],
    default: 'pending'
  },
  dueDate: {
    type: Date
  },
  nextOccurrence: {
    type: Date,
    required: function() {
      return this.isRecurring;
    }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Index for better query performance
BusinessExpenseSchema.index({ date: -1, category: 1 });
BusinessExpenseSchema.index({ isRecurring: 1, nextOccurrence: 1 });
BusinessExpenseSchema.index({ status: 1, dueDate: 1 });

// Virtual for formatted amount
BusinessExpenseSchema.virtual('formattedAmount').get(function() {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(this.amount);
});

// Method to calculate next occurrence date
BusinessExpenseSchema.methods.calculateNextOccurrence = function() {
  if (!this.isRecurring || !this.frequency) return null;
  
  const nextDate = new Date(this.date);
  
  switch (this.frequency) {
    case 'daily':
      nextDate.setDate(nextDate.getDate() + 1);
      break;
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    case 'quarterly':
      nextDate.setMonth(nextDate.getMonth() + 3);
      break;
    case 'yearly':
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      break;
    default:
      return null;
  }
  
  return nextDate;
};

// Pre-save middleware to set next occurrence
BusinessExpenseSchema.pre('save', function(next) {
  if (this.isRecurring && this.frequency && !this.nextOccurrence) {
    this.nextOccurrence = this.calculateNextOccurrence();
  }
  next();
});

// Ensure virtual fields are serialized
BusinessExpenseSchema.set('toJSON', { virtuals: true });

const BusinessExpense = mongoose.model("BusinessExpense", BusinessExpenseSchema);
module.exports = BusinessExpense;
