const CashFlowTransaction = require("../models/cashFlowTransaction");
const Order = require("../models/order");

// Helper function to calculate dashboard data from real transactions
const calculateDashboardData = async (startDate, endDate, period) => {
  try {
    // Calculate total inflows for the period
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

    // Calculate total outflows for the period
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

    // Calculate current balance (all-time)
    const allTimeInflowsResult = await CashFlowTransaction.aggregate([
      { $match: { type: 'inflow' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const allTimeOutflowsResult = await CashFlowTransaction.aggregate([
      { $match: { type: 'outflow' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const currentBalance = (allTimeInflowsResult[0]?.total || 0) - (allTimeOutflowsResult[0]?.total || 0);

    // Calculate cash burn rate (daily average outflows)
    const cashBurnRate = totalOutflows / period;

    // Calculate runway (days remaining at current burn rate)
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
  } catch (error) {
    console.error("Error calculating dashboard data:", error);
    throw error;
  }
};

// Get cash flow dashboard
const getCashFlowDashboard = async (req, res) => {
  try {
    const { period = "30" } = req.query;
    const days = parseInt(period);
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const dashboardData = await calculateDashboardData(startDate, endDate, days);
    res.json(dashboardData);
  } catch (error) {
    console.error("Error getting cash flow dashboard:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get cash flow transactions with pagination and filtering
const getCashFlowTransactions = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      type, 
      category, 
      startDate, 
      endDate 
    } = req.query;

    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const skip = (pageNumber - 1) * limitNumber;

    const filterConditions = {};
    
    if (type && (type === 'inflow' || type === 'outflow')) {
      filterConditions.type = type;
    }
    
    if (category) {
      filterConditions.category = category;
    }
    
    if (startDate || endDate) {
      filterConditions.date = {};
      if (startDate) {
        filterConditions.date.$gte = new Date(startDate);
      }
      if (endDate) {
        filterConditions.date.$lte = new Date(endDate);
      }
    }

    const transactions = await CashFlowTransaction.find(filterConditions)
      .sort({ date: -1 })
      .skip(skip)
      .limit(limitNumber);

    const totalTransactions = await CashFlowTransaction.countDocuments(filterConditions);
    const totalPages = Math.ceil(totalTransactions / limitNumber);

    res.json({
      transactions,
      pagination: {
        currentPage: pageNumber,
        totalPages,
        totalTransactions,
        hasNextPage: pageNumber < totalPages,
        hasPrevPage: pageNumber > 1
      }
    });
  } catch (error) {
    console.error("Error getting cash flow transactions:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Enhanced dashboard that includes real-time data sync
const getCashFlowDashboardWithSync = async (req, res) => {
  try {
    const { period = "30", sync = "false" } = req.query;
    const days = parseInt(period);
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const dashboardData = await calculateDashboardData(startDate, endDate, days);
    
    res.json({
      ...dashboardData,
      syncEnabled: sync === "true"
    });
  } catch (error) {
    console.error("Error getting cash flow dashboard with sync:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getCashFlowHistory = async (req, res) => {
  try {
    const { period = "30" } = req.query;
    const days = parseInt(period);
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get daily cash flow data
    const dailyData = await CashFlowTransaction.aggregate([
      {
        $match: {
          date: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
            type: "$type"
          },
          total: { $sum: "$amount" }
        }
      },
      {
        $group: {
          _id: "$_id.date",
          inflows: {
            $sum: {
              $cond: [{ $eq: ["$_id.type", "inflow"] }, "$total", 0]
            }
          },
          outflows: {
            $sum: {
              $cond: [{ $eq: ["$_id.type", "outflow"] }, "$total", 0]
            }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Format the data and ensure all days in the period are represented
    const history = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayData = dailyData.find(d => d._id === dateStr);
      
      history.push({
        date: dateStr,
        inflows: dayData?.inflows || 0,
        outflows: dayData?.outflows || 0,
        netFlow: (dayData?.inflows || 0) - (dayData?.outflows || 0)
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }

    res.json({ history, period: days });
  } catch (error) {
    console.error("Error getting cash flow history:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getCashFlowByCategory = async (req, res) => {
  try {
    const { period = "30" } = req.query;
    const days = parseInt(period);
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get category breakdown data
    const categoryData = await CashFlowTransaction.aggregate([
      {
        $match: {
          date: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            category: "$category",
            type: "$type"
          },
          total: { $sum: "$amount" },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: "$_id.category",
          inflows: {
            $sum: {
              $cond: [{ $eq: ["$_id.type", "inflow"] }, "$total", 0]
            }
          },
          outflows: {
            $sum: {
              $cond: [{ $eq: ["$_id.type", "outflow"] }, "$total", 0]
            }
          },
          transactionCount: { $sum: "$count" }
        }
      },
      { $sort: { inflows: -1, outflows: -1 } }
    ]);

    // Separate inflows and outflows for easier frontend processing
    const inflows = categoryData
      .filter(item => item.inflows > 0)
      .map(item => ({
        category: item._id,
        amount: item.inflows,
        count: item.transactionCount
      }));

    const outflows = categoryData
      .filter(item => item.outflows > 0)
      .map(item => ({
        category: item._id,
        amount: item.outflows,
        count: item.transactionCount
      }));

    res.json({ 
      inflows, 
      outflows, 
      period: days,
      totalInflowAmount: inflows.reduce((sum, item) => sum + item.amount, 0),
      totalOutflowAmount: outflows.reduce((sum, item) => sum + item.amount, 0)
    });
  } catch (error) {
    console.error("Error getting cash flow by category:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getCashFlowForecast = async (req, res) => {
  try {
    const { days = "90" } = req.query; // Default to 3-month forecast
    const forecastDays = parseInt(days);
    
    // Get historical data for the last 30 days to calculate averages
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const historicalData = await calculateDashboardData(startDate, endDate, 30);
    
    // Calculate daily averages based on historical data
    const avgDailyInflow = historicalData.totalInflows / 30;
    const avgDailyOutflow = historicalData.totalOutflows / 30;

    // Generate forecast for the specified number of days
    const forecast = [];
    let currentBalance = historicalData.currentBalance;

    for (let i = 1; i <= forecastDays; i++) {
      const forecastDate = new Date();
      forecastDate.setDate(forecastDate.getDate() + i);
      
      // Project daily cash flow
      currentBalance += (avgDailyInflow - avgDailyOutflow);
      
      forecast.push({
        date: forecastDate.toISOString().split('T')[0],
        projectedBalance: Math.round(currentBalance * 100) / 100,
        projectedInflow: Math.round(avgDailyInflow * 100) / 100,
        projectedOutflow: Math.round(avgDailyOutflow * 100) / 100,
        netProjectedFlow: Math.round((avgDailyInflow - avgDailyOutflow) * 100) / 100
      });
    }

    // Calculate key forecast metrics
    const finalBalance = forecast[forecast.length - 1]?.projectedBalance || currentBalance;
    const totalProjectedInflows = avgDailyInflow * forecastDays;
    const totalProjectedOutflows = avgDailyOutflow * forecastDays;
    
    res.json({
      forecast,
      summary: {
        forecastPeriodDays: forecastDays,
        startingBalance: historicalData.currentBalance,
        projectedEndingBalance: Math.round(finalBalance * 100) / 100,
        totalProjectedInflows: Math.round(totalProjectedInflows * 100) / 100,
        totalProjectedOutflows: Math.round(totalProjectedOutflows * 100) / 100,
        netProjectedFlow: Math.round((totalProjectedInflows - totalProjectedOutflows) * 100) / 100
      },
      assumptions: {
        avgDailyInflow: Math.round(avgDailyInflow * 100) / 100,
        avgDailyOutflow: Math.round(avgDailyOutflow * 100) / 100,
        basedOnDays: 30,
        note: "Forecast based on 30-day historical average"
      }
    });
  } catch (error) {
    console.error("Error getting cash flow forecast:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const createCashFlowTransaction = async (req, res) => {
  try {
    const transaction = new CashFlowTransaction(req.body);
    await transaction.save();
    res.status(201).json(transaction);
  } catch (error) {
    console.error("Error creating cash flow transaction:", error);
    res.status(400).json({ message: error.message });
  }
};

const updateCashFlowTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const transaction = await CashFlowTransaction.findByIdAndUpdate(
      id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }
    
    res.json(transaction);
  } catch (error) {
    console.error("Error updating cash flow transaction:", error);
    res.status(400).json({ message: error.message });
  }
};

const generateTransactionFromOrder = async (order) => {
  try {
    // Create revenue transaction for the order
    const revenueTransaction = new CashFlowTransaction({
      type: 'inflow',
      category: 'product_sales',
      amount: order.totalPrice,
      description: `Revenue from order ${order._id}`,
      date: order.orderDate,
      orderId: order._id,
      automated: true
    });

    await revenueTransaction.save();

    // Create COGS transaction (assume 40% of sale price as cost)
    const cogsAmount = order.totalPrice * 0.4;
    const cogsTransaction = new CashFlowTransaction({
      type: 'outflow',
      category: 'cost_of_goods_sold',
      amount: cogsAmount,
      description: `Cost of goods for order ${order._id}`,
      date: order.orderDate,
      orderId: order._id,
      automated: true
    });

    await cogsTransaction.save();

    // Create shipping cost transaction (estimate $10 per order)
    const shippingTransaction = new CashFlowTransaction({
      type: 'outflow',
      category: 'shipping_costs',
      amount: 10,
      description: `Shipping cost for order ${order._id}`,
      date: order.orderDate,
      orderId: order._id,
      automated: true
    });

    await shippingTransaction.save();

    return {
      revenue: revenueTransaction,
      cogs: cogsTransaction,
      shipping: shippingTransaction
    };
  } catch (error) {
    console.error("Error generating transaction from order:", error);
    throw error;
  }
};

// Function to sync all completed orders to cash flow transactions
const syncOrdersToTransactions = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Build date filter
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.orderDate = {};
      if (startDate) dateFilter.orderDate.$gte = new Date(startDate);
      if (endDate) dateFilter.orderDate.$lte = new Date(endDate);
    }

    // Find completed orders that don't have associated cash flow transactions
    const completedOrders = await Order.find({
      status: 'completed',
      ...dateFilter
    });

    let syncedCount = 0;
    const results = [];

    for (const order of completedOrders) {
      // Check if transactions already exist for this order
      const existingTransactions = await CashFlowTransaction.find({
        orderId: order._id
      });

      if (existingTransactions.length === 0) {
        const transactions = await generateTransactionFromOrder(order);
        results.push({
          orderId: order._id,
          totalPrice: order.totalPrice,
          transactions: transactions
        });
        syncedCount++;
      }
    }

    res.json({
      message: `Successfully synced ${syncedCount} orders to cash flow transactions`,
      syncedCount,
      totalOrdersChecked: completedOrders.length,
      results
    });
  } catch (error) {
    console.error("Error syncing orders to transactions:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const syncAllDataToFlowTransactions = async (startDate, endDate) => {
  return { message: "syncAllDataToFlowTransactions placeholder" };
};

const mapProductSalesRevenue = async (startDate, endDate) => {
  return 0;
};

const mapCostOfGoodsSold = async (startDate, endDate) => {
  return 0;
};

const mapShippingCosts = async (startDate, endDate) => {
  return 0;
};

const mapOperatingExpenses = async (startDate, endDate) => {
  return 0;
};

const mapRefunds = async (startDate, endDate) => {
  return 0;
};

module.exports = {
  getCashFlowDashboard,
  getCashFlowDashboardWithSync,
  getCashFlowHistory,
  getCashFlowByCategory,
  getCashFlowForecast,
  createCashFlowTransaction,
  getCashFlowTransactions,
  updateCashFlowTransaction,
  generateTransactionFromOrder,
  syncOrdersToTransactions,
  syncAllDataToFlowTransactions,
  mapProductSalesRevenue,
  mapCostOfGoodsSold,
  mapShippingCosts,
  mapOperatingExpenses,
  mapRefunds
};
