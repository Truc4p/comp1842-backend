const CashFlowTransaction = require("../models/cashFlowTransaction");
const BusinessExpense = require("../models/businessExpense");
const Order = require("../models/order");
const cron = require("node-cron");

/**
 * 🚀 PHASE 4: Automated Transaction Generation Middleware
 * 
 * This middleware handles:
 * 1. Order completion hooks - automatically generate cash flow transactions
 * 2. Recurring expenses - automated monthly/weekly business expenses
 */

// 📈 Order Completion Hook - Generate Cash Flow Transactions
const generateOrderTransactions = async (order) => {
  try {
    console.log(`🔄 Generating automated transactions for order ${order._id}`);
    
    // 1. Create INFLOW transaction: Product Sales Revenue
    const revenueTransaction = new CashFlowTransaction({
      type: 'inflow',
      category: 'product_sales',
      amount: order.totalPrice,
      description: `Order #${order._id.toString().slice(-6)}`,
      orderId: order._id,
      date: new Date(),
      automated: true
    });
    await revenueTransaction.save();


    // 3. Create OUTFLOW transaction: Shipping Costs
    const shippingCost = calculateShippingCost(order);
    const shippingTransaction = new CashFlowTransaction({
      type: 'outflow',
      category: 'shipping_costs',
      amount: shippingCost,
      description: `Order #${order._id.toString().slice(-6)}`,
      orderId: order._id,
      date: new Date(),
      automated: true
    });
    await shippingTransaction.save();

    console.log(`✅ Generated 2 automated transactions for order ${order._id}:`, {
      revenue: revenueTransaction.amount,
      shipping: shippingTransaction.amount,
    });

    return {
      revenue: revenueTransaction,
      shipping: shippingTransaction
    };
  } catch (error) {
    console.error(`❌ Error generating transactions for order ${order._id}:`, error);
    throw error;
  }
};

// 💰 Calculate shipping cost based on order value and complexity
const calculateShippingCost = (order) => {
  const baseShipping = 10; // Base shipping cost
  const itemCount = order.products.reduce((total, product) => total + product.quantity, 0);
  
  // Add $2 for each additional item beyond the first
  const additionalItemCost = Math.max(0, itemCount - 1) * 2;
  
  // Premium shipping for high-value orders (>$200)
  const premiumCost = order.totalPrice > 200 ? 5 : 0;
  
  return baseShipping + additionalItemCost + premiumCost;
};

// 🔄 Recurring Expenses Automation
const recurringExpenseTemplates = [
  {
    category: 'rent',
    amount: 2500,
    description: 'Monthly office rent',
    frequency: 'monthly',
    dayOfMonth: 1
  },
  {
    category: 'utilities',
    amount: 300,
    description: 'Monthly utilities (electricity, internet, water)',
    frequency: 'monthly',
    dayOfMonth: 5
  },
  {
    category: 'payroll',
    amount: 8000,
    description: 'Monthly staff salaries',
    frequency: 'monthly',
    dayOfMonth: 15
  },
  {
    category: 'marketing',
    amount: 1200,
    description: 'Monthly digital marketing spend',
    frequency: 'monthly',
    dayOfMonth: 10
  },
  {
    category: 'operating_expenses',
    amount: 500,
    description: 'Software subscriptions and licenses',
    frequency: 'monthly',
    dayOfMonth: 1
  }
];

// 📅 Generate recurring expense transactions
const generateRecurringExpenses = async () => {
  try {
    console.log("🔄 Checking for recurring expenses to generate...");
    const today = new Date();
    const currentDay = today.getDate();
    
    for (const template of recurringExpenseTemplates) {
      if (template.dayOfMonth === currentDay) {
        // Check if we already created this expense this month
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        
        const existingTransaction = await CashFlowTransaction.findOne({
          category: template.category,
          automated: true,
          date: { $gte: startOfMonth, $lte: endOfMonth },
          description: template.description
        });

        if (!existingTransaction) {
          const recurringTransaction = new CashFlowTransaction({
            type: 'outflow',
            category: template.category,
            amount: template.amount,
            description: template.description,
            date: today,
            automated: true
          });
          
          await recurringTransaction.save();
          console.log(`✅ Generated recurring expense: ${template.category} - $${template.amount}`);
        } else {
          console.log(`⏭️  Recurring expense already exists: ${template.category}`);
        }
      }
    }
  } catch (error) {
    console.error("❌ Error generating recurring expenses:", error);
  }
};

// 🕐 Schedule recurring expense checks
const initializeRecurringExpenses = () => {
  // Run daily at 9:00 AM to check for recurring expenses
  cron.schedule('0 9 * * *', async () => {
    console.log("⏰ Running daily recurring expense check...");
    await generateRecurringExpenses();
  });
  
  console.log("✅ Recurring expense scheduler initialized - checks daily at 9:00 AM");
};

// 📊 Manual trigger for recurring expenses (for testing)
const triggerRecurringExpenses = async (req, res) => {
  try {
    await generateRecurringExpenses();
    res.json({
      success: true,
      message: "Recurring expenses check completed",
      timestamp: new Date()
    });
  } catch (error) {
    console.error("Error triggering recurring expenses:", error);
    res.status(500).json({
      success: false,
      message: "Error generating recurring expenses",
      error: error.message
    });
  }
};

// 🔍 Get automation statistics
const getAutomationStats = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    
    const automatedTransactions = await CashFlowTransaction.find({
      automated: true,
      date: { $gte: startDate }
    });

    const stats = {
      totalAutomatedTransactions: automatedTransactions.length,
      orderBasedTransactions: automatedTransactions.filter(t => t.orderId).length,
      recurringExpenses: automatedTransactions.filter(t => !t.orderId).length,
      totalAutomatedInflows: automatedTransactions
        .filter(t => t.type === 'inflow')
        .reduce((sum, t) => sum + t.amount, 0),
      totalAutomatedOutflows: automatedTransactions
        .filter(t => t.type === 'outflow')
        .reduce((sum, t) => sum + t.amount, 0),
      categoryBreakdown: {}
    };

    // Group by category
    automatedTransactions.forEach(transaction => {
      if (!stats.categoryBreakdown[transaction.category]) {
        stats.categoryBreakdown[transaction.category] = {
          count: 0,
          totalAmount: 0
        };
      }
      stats.categoryBreakdown[transaction.category].count++;
      stats.categoryBreakdown[transaction.category].totalAmount += transaction.amount;
    });

    res.json(stats);
  } catch (error) {
    console.error("Error getting automation stats:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  generateOrderTransactions,
  calculateShippingCost,
  generateRecurringExpenses,
  initializeRecurringExpenses,
  triggerRecurringExpenses,
  getAutomationStats
};
