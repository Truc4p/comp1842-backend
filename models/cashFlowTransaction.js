const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const CashFlowTransactionSchema = new Schema({
  type: {
    type: String,
    enum: ['inflow', 'outflow'],
    required: true
  },
  category: {
    type: String,
    enum: [
      // Inflows
      'product_sales', 'service_revenue', 'investment_income', 'other_income',
      // Outflows  
      'operating_expenses', 'cost_of_goods_sold', 'payroll', 'marketing', 
      'taxes', 'rent', 'utilities', 'shipping_costs', 'refunds'
    ],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  description: {
    type: String,
    trim: true
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: false // Not all transactions are order-related
  },
  date: {
    type: Date,
    default: Date.now
  },
  automated: {
    type: Boolean,
    default: false // True for system-generated, false for manual entries
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // For manual entries by admin users
  }
}, {
  timestamps: true // Adds createdAt and updatedAt automatically
});

// Index for better query performance
CashFlowTransactionSchema.index({ date: -1, type: 1 });
CashFlowTransactionSchema.index({ category: 1, date: -1 });
CashFlowTransactionSchema.index({ orderId: 1 });

// Virtual for formatted amount
CashFlowTransactionSchema.virtual('formattedAmount').get(function() {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(this.amount);
});

// Ensure virtual fields are serialized
CashFlowTransactionSchema.set('toJSON', { virtuals: true });

const CashFlowTransaction = mongoose.model("CashFlowTransaction", CashFlowTransactionSchema);
module.exports = CashFlowTransaction;
