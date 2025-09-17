const BusinessExpense = require("../models/businessExpense");
const CashFlowTransaction = require("../models/cashFlowTransaction");
const Order = require("../models/order");
const Product = require("../models/product");

// Get comprehensive financial overview
const getFinancialOverview = async (req, res) => {
  try {
    const { period = "30" } = req.query;
    const days = parseInt(period);
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get cash flow data
    const cashFlowData = await getCashFlowSummary(startDate, endDate, days);
    
    // Get business expenses
    const businessExpenses = await getBusinessExpensesSummary(startDate, endDate);
    
    // Get profitability metrics
    const profitabilityMetrics = await getProfitabilityMetrics(startDate, endDate);
    
    // Get financial health indicators
    const healthIndicators = await getFinancialHealthIndicators();

    res.json({
      period: days,
      dateRange: {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0]
      },
      cashFlow: cashFlowData,
      businessExpenses: businessExpenses,
      profitability: profitabilityMetrics,
      healthIndicators: healthIndicators
    });
  } catch (error) {
    console.error("Error getting financial overview:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get business expenses with advanced filtering and analytics
const getBusinessExpenses = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      category, 
      status, 
      startDate, 
      endDate,
      isRecurring,
      vendor 
    } = req.query;

    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const skip = (pageNumber - 1) * limitNumber;

    const filterConditions = {};
    
    if (category) filterConditions.category = category;
    if (status) filterConditions.status = status;
    if (isRecurring !== undefined) filterConditions.isRecurring = isRecurring === 'true';
    if (vendor) filterConditions.vendor = new RegExp(vendor, 'i');
    
    if (startDate || endDate) {
      filterConditions.date = {};
      if (startDate) filterConditions.date.$gte = new Date(startDate);
      if (endDate) filterConditions.date.$lte = new Date(endDate);
    }

    const expenses = await BusinessExpense.find(filterConditions)
      .populate('createdBy', 'username')
      .sort({ date: -1 })
      .skip(skip)
      .limit(limitNumber);

    const totalExpenses = await BusinessExpense.countDocuments(filterConditions);
    const totalPages = Math.ceil(totalExpenses / limitNumber);

    // Get summary statistics
    const summaryStats = await BusinessExpense.aggregate([
      { $match: filterConditions },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          averageAmount: { $avg: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      expenses,
      pagination: {
        currentPage: pageNumber,
        totalPages,
        totalExpenses,
        hasNextPage: pageNumber < totalPages,
        hasPrevPage: pageNumber > 1
      },
      summary: summaryStats[0] || { totalAmount: 0, averageAmount: 0, count: 0 }
    });
  } catch (error) {
    console.error("Error getting business expenses:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Helper function to map business expense categories to cash flow transaction categories
const mapExpenseCategoryToCashFlow = (businessExpenseCategory) => {
  const categoryMapping = {
    'rent': 'rent',
    'utilities': 'utilities', 
    'payroll': 'payroll',
    'marketing': 'marketing',
    'shipping': 'shipping_costs',
    'equipment': 'operating_expenses',
    'software': 'operating_expenses',
    'other': 'operating_expenses'
  };
  
  return categoryMapping[businessExpenseCategory] || 'operating_expenses';
};

// Helper function to calculate next occurrence date
const calculateNextOccurrence = (date, frequency) => {
  if (!frequency) return null;
  
  const nextDate = new Date(date);
  
  switch (frequency) {
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

// Create business expense
const createBusinessExpense = async (req, res) => {
  try {
    const expenseData = {
      ...req.body,
      createdBy: req.user.id
    };

    // Handle recurring expense nextOccurrence calculation
    if (expenseData.isRecurring && expenseData.frequency && !expenseData.nextOccurrence) {
      expenseData.nextOccurrence = calculateNextOccurrence(expenseData.date || new Date(), expenseData.frequency);
    }

    const expense = new BusinessExpense(expenseData);
    await expense.save();

    // Also create a corresponding cash flow transaction with proper category mapping
    const cashFlowTransaction = new CashFlowTransaction({
      type: 'outflow',
      category: mapExpenseCategoryToCashFlow(expense.category),
      amount: expense.amount,
      description: `Business Expense: ${expense.description}`,
      date: expense.date,
      automated: false,
      businessExpenseId: expense._id
    });

    await cashFlowTransaction.save();

    res.status(201).json({
      expense,
      cashFlowTransaction,
      message: "Business expense and cash flow transaction created successfully"
    });
  } catch (error) {
    console.error("Error creating business expense:", error);
    
    // Handle validation errors with more specific messages
    if (error.name === 'ValidationError') {
      const validationErrors = Object.keys(error.errors).map(key => ({
        field: key,
        message: error.errors[key].message
      }));
      
      return res.status(400).json({ 
        message: "Validation failed",
        errors: validationErrors,
        error: error.message 
      });
    }
    
    res.status(400).json({ message: error.message });
  }
};

// Update business expense
const updateBusinessExpense = async (req, res) => {
  try {
    const { id } = req.params;
    
    const updateData = { ...req.body };
    
    // Handle recurring expense nextOccurrence calculation for updates
    if (updateData.isRecurring && updateData.frequency && !updateData.nextOccurrence) {
      updateData.nextOccurrence = calculateNextOccurrence(updateData.date || new Date(), updateData.frequency);
    }
    
    const expense = await BusinessExpense.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('createdBy', 'username');
    
    if (!expense) {
      return res.status(404).json({ message: "Business expense not found" });
    }

    // Update corresponding cash flow transaction if exists
    await CashFlowTransaction.findOneAndUpdate(
      { businessExpenseId: expense._id },
      {
        amount: expense.amount,
        description: `Business Expense: ${expense.description}`,
        category: mapExpenseCategoryToCashFlow(expense.category),
        date: expense.date
      }
    );
    
    res.json(expense);
  } catch (error) {
    console.error("Error updating business expense:", error);
    
    // Handle validation errors with more specific messages
    if (error.name === 'ValidationError') {
      const validationErrors = Object.keys(error.errors).map(key => ({
        field: key,
        message: error.errors[key].message
      }));
      
      return res.status(400).json({ 
        message: "Validation failed",
        errors: validationErrors,
        error: error.message 
      });
    }
    
    res.status(400).json({ message: error.message });
  }
};

// Delete business expense
const deleteBusinessExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const expense = await BusinessExpense.findByIdAndDelete(id);
    
    if (!expense) {
      return res.status(404).json({ message: "Business expense not found" });
    }

    // Delete corresponding cash flow transaction
    await CashFlowTransaction.deleteOne({ businessExpenseId: expense._id });
    
    res.json({ message: "Business expense deleted successfully" });
  } catch (error) {
    console.error("Error deleting business expense:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get expense categories breakdown
const getExpenseCategoriesBreakdown = async (req, res) => {
  try {
    const { period = "30" } = req.query;
    const days = parseInt(period);
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const breakdown = await BusinessExpense.aggregate([
      {
        $match: {
          date: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$category',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
          averageAmount: { $avg: '$amount' }
        }
      },
      { $sort: { totalAmount: -1 } }
    ]);

    res.json({
      breakdown,
      period: days,
      totalExpenses: breakdown.reduce((sum, cat) => sum + cat.totalAmount, 0)
    });
  } catch (error) {
    console.error("Error getting expense categories breakdown:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get recurring expenses
const getRecurringExpenses = async (req, res) => {
  try {
    const recurringExpenses = await BusinessExpense.find({
      isRecurring: true,
      status: { $ne: 'cancelled' }
    })
    .populate('createdBy', 'username')
    .sort({ nextOccurrence: 1 });

    // Calculate upcoming expenses for next 90 days
    const upcomingExpenses = [];
    const next90Days = new Date();
    next90Days.setDate(next90Days.getDate() + 90);

    recurringExpenses.forEach(expense => {
      if (expense.nextOccurrence && expense.nextOccurrence <= next90Days) {
        upcomingExpenses.push({
          ...expense.toObject(),
          daysUntilDue: Math.ceil((expense.nextOccurrence - new Date()) / (1000 * 60 * 60 * 24))
        });
      }
    });

    res.json({
      recurringExpenses,
      upcomingExpenses,
      totalRecurringMonthly: recurringExpenses
        .filter(e => e.frequency === 'monthly')
        .reduce((sum, e) => sum + e.amount, 0)
    });
  } catch (error) {
    console.error("Error getting recurring expenses:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Helper functions
const getCashFlowSummary = async (startDate, endDate, period) => {
  const inflowsResult = await CashFlowTransaction.aggregate([
    {
      $match: {
        type: 'inflow',
        date: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: null,
        totalInflows: { $sum: '$amount' }
      }
    }
  ]);

  const outflowsResult = await CashFlowTransaction.aggregate([
    {
      $match: {
        type: 'outflow',
        date: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: null,
        totalOutflows: { $sum: '$amount' }
      }
    }
  ]);

  const totalInflows = inflowsResult[0]?.totalInflows || 0;
  const totalOutflows = outflowsResult[0]?.totalOutflows || 0;
  const netCashFlow = totalInflows - totalOutflows;
  const cashBurnRate = totalOutflows / period;

  // Get current balance (all-time)
  const allTimeInflowsResult = await CashFlowTransaction.aggregate([
    { $match: { type: 'inflow' } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);

  const allTimeOutflowsResult = await CashFlowTransaction.aggregate([
    { $match: { type: 'outflow' } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);

  const currentBalance = (allTimeInflowsResult[0]?.total || 0) - (allTimeOutflowsResult[0]?.total || 0);
  const runway = cashBurnRate > 0 ? Math.floor(currentBalance / cashBurnRate) : null;

  return {
    totalInflows,
    totalOutflows,
    netCashFlow,
    currentBalance,
    cashBurnRate,
    runway,
    period
  };
};

const getBusinessExpensesSummary = async (startDate, endDate) => {
  const expensesResult = await BusinessExpense.aggregate([
    {
      $match: {
        date: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: '$category',
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 },
        averageAmount: { $avg: '$amount' }
      }
    },
    { $sort: { totalAmount: -1 } }
  ]);

  const totalBusinessExpenses = expensesResult.reduce((sum, cat) => sum + cat.totalAmount, 0);

  return {
    byCategory: expensesResult,
    totalAmount: totalBusinessExpenses,
    totalCount: expensesResult.reduce((sum, cat) => sum + cat.count, 0)
  };
};

const getProfitabilityMetrics = async (startDate, endDate) => {
  // Get revenue from completed orders
  const revenueResult = await Order.aggregate([
    {
      $match: {
        status: 'completed',
        orderDate: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$totalPrice' },
        orderCount: { $sum: 1 }
      }
    }
  ]);

  // Get total expenses (business expenses + other outflows)
  const expensesResult = await BusinessExpense.aggregate([
    {
      $match: {
        date: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: null,
        totalExpenses: { $sum: '$amount' }
      }
    }
  ]);

  // Get other cash flow outflows
  const otherOutflowsResult = await CashFlowTransaction.aggregate([
    {
      $match: {
        type: 'outflow',
        date: { $gte: startDate, $lte: endDate },
        businessExpenseId: { $exists: false }
      }
    },
    {
      $group: {
        _id: null,
        totalOtherOutflows: { $sum: '$amount' }
      }
    }
  ]);

  const revenue = revenueResult[0]?.totalRevenue || 0;
  const businessExpenses = expensesResult[0]?.totalExpenses || 0;
  const otherExpenses = otherOutflowsResult[0]?.totalOtherOutflows || 0;
  const totalExpenses = businessExpenses + otherExpenses;
  const grossProfit = revenue - totalExpenses;
  const profitMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;

  return {
    revenue,
    businessExpenses,
    otherExpenses,
    totalExpenses,
    grossProfit,
    profitMargin,
    orderCount: revenueResult[0]?.orderCount || 0
  };
};

const getFinancialHealthIndicators = async () => {
  // Current ratio approximation (Current Assets / Current Liabilities)
  // For a better approximation, we'll use cash balance + pending receivables as assets
  // and pending expenses + recent outflows as liabilities
  
  // Calculate current cash position (total inflows - total outflows)
  const cashPosition = await CashFlowTransaction.aggregate([
    {
      $group: {
        _id: '$type',
        total: { $sum: '$amount' }
      }
    }
  ]);
  
  const totalInflows = cashPosition.find(item => item._id === 'inflow')?.total || 0;
  const totalOutflows = cashPosition.find(item => item._id === 'outflow')?.total || 0;
  const currentCashBalance = totalInflows - totalOutflows;
  
  // Current Assets = Cash Balance (assuming positive) + any receivables
  const currentAssets = Math.max(currentCashBalance, 0);
  
  // Current Liabilities = Pending expenses (immediate obligations)
  const pendingExpensesForLiabilities = await BusinessExpense.aggregate([
    { $match: { status: 'pending' } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
  
  const currentLiabilities = pendingExpensesForLiabilities[0]?.total || 0;
  const currentRatio = currentLiabilities > 0 ? currentAssets / currentLiabilities : 
    (currentAssets > 0 ? 999 : 1); // Very high ratio if assets exist but no liabilities

  // Debt-to-equity ratio approximation
  const pendingExpensesResult = await BusinessExpense.aggregate([
    { $match: { status: 'pending' } },
    { 
      $group: { 
        _id: null, 
        total: { $sum: '$amount' },
        count: { $sum: 1 }
      } 
    }
  ]);

  const totalDebt = pendingExpensesResult[0]?.total || 0;
  const pendingExpenseCount = pendingExpensesResult[0]?.count || 0;
  const equity = currentAssets - currentLiabilities;
  const debtToEquityRatio = equity > 0 ? totalDebt / equity : 0;

  // Working capital
  const workingCapital = currentAssets - currentLiabilities;

  // Debug logging
  console.log('💪 Financial Health Debug:', {
    totalInflows: totalInflows,
    totalOutflows: totalOutflows,
    currentCashBalance: currentCashBalance,
    currentAssets: currentAssets,
    currentLiabilities: currentLiabilities,
    currentRatio: currentRatio,
    workingCapital: workingCapital,
    pendingExpenseCount: pendingExpenseCount,
    totalPendingExpenses: totalDebt
  });

  return {
    currentRatio,
    currentAssets,
    currentLiabilities,
    debtToEquityRatio,
    workingCapital,
    totalPendingExpenses: totalDebt,
    pendingExpenseCount
  };
};

// Get expense trends and forecasting
const getExpenseTrends = async (req, res) => {
  try {
    const { period = "90" } = req.query;
    const days = parseInt(period);
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get daily expense trends
    const dailyTrends = await BusinessExpense.aggregate([
      {
        $match: {
          date: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
            category: "$category"
          },
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: "$_id.date",
          categories: {
            $push: {
              category: "$_id.category",
              amount: "$totalAmount",
              count: "$count"
            }
          },
          dailyTotal: { $sum: "$totalAmount" }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Get monthly recurring expense forecast
    const recurringExpenses = await BusinessExpense.find({
      isRecurring: true,
      status: { $ne: 'cancelled' }
    });

    const monthlyRecurringTotal = recurringExpenses
      .filter(e => e.frequency === 'monthly')
      .reduce((sum, e) => sum + e.amount, 0);

    res.json({
      dailyTrends,
      monthlyRecurringTotal,
      totalRecurringExpenses: recurringExpenses.length,
      period: days
    });
  } catch (error) {
    console.error("Error getting expense trends:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get vendor analysis
const getVendorAnalysis = async (req, res) => {
  try {
    const { period = "90" } = req.query;
    const days = parseInt(period);
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const vendorAnalysis = await BusinessExpense.aggregate([
      {
        $match: {
          date: { $gte: startDate, $lte: endDate },
          vendor: { $exists: true, $ne: null, $ne: "" }
        }
      },
      {
        $group: {
          _id: '$vendor',
          totalSpent: { $sum: '$amount' },
          transactionCount: { $sum: 1 },
          averageTransaction: { $avg: '$amount' },
          categories: { $addToSet: '$category' },
          lastTransaction: { $max: '$date' }
        }
      },
      { $sort: { totalSpent: -1 } }
    ]);

    res.json({
      vendorAnalysis,
      period: days,
      totalVendors: vendorAnalysis.length,
      totalVendorSpending: vendorAnalysis.reduce((sum, v) => sum + v.totalSpent, 0)
    });
  } catch (error) {
    console.error("Error getting vendor analysis:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get financial performance metrics
const getFinancialPerformance = async (req, res) => {
  try {
    const { period = "30" } = req.query;
    const days = parseInt(period);
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get current period metrics
    const currentMetrics = await getProfitabilityMetrics(startDate, endDate);
    
    // Get previous period for comparison
    const prevEndDate = new Date(startDate);
    const prevStartDate = new Date(prevEndDate);
    prevStartDate.setDate(prevStartDate.getDate() - days);
    const previousMetrics = await getProfitabilityMetrics(prevStartDate, prevEndDate);

    // Calculate growth rates with proper handling of zero previous values
    const revenueGrowth = previousMetrics.revenue > 0 
      ? ((currentMetrics.revenue - previousMetrics.revenue) / previousMetrics.revenue) * 100 
      : currentMetrics.revenue > 0 ? 100 : 0; // 100% growth from 0 to any positive amount

    const expenseGrowth = previousMetrics.totalExpenses > 0 
      ? ((currentMetrics.totalExpenses - previousMetrics.totalExpenses) / previousMetrics.totalExpenses) * 100 
      : currentMetrics.totalExpenses > 0 ? 100 : 0; // 100% growth from 0 to any positive amount
    
    // Debug logging
    console.log('📊 Performance Debug:', {
      previousExpenses: previousMetrics.totalExpenses,
      currentExpenses: currentMetrics.totalExpenses,
      calculatedExpenseGrowth: expenseGrowth
    });

    const profitGrowth = previousMetrics.grossProfit !== 0 
      ? ((currentMetrics.grossProfit - previousMetrics.grossProfit) / Math.abs(previousMetrics.grossProfit)) * 100 
      : currentMetrics.grossProfit > 0 ? 100 : currentMetrics.grossProfit < 0 ? -100 : 0;

    res.json({
      current: currentMetrics,
      previous: previousMetrics,
      growth: {
        revenue: revenueGrowth,
        expenses: expenseGrowth,
        profit: profitGrowth
      },
      period: days
    });
  } catch (error) {
    console.error("Error getting financial performance:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  getFinancialOverview,
  getBusinessExpenses,
  createBusinessExpense,
  updateBusinessExpense,
  deleteBusinessExpense,
  getExpenseCategoriesBreakdown,
  getRecurringExpenses,
  getExpenseTrends,
  getVendorAnalysis,
  getFinancialPerformance
};
