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

    // Calculate starting balance (balance at the beginning of the period)
    const startingBalance = currentBalance - netCashFlow;

    // Calculate cash burn rate (daily average outflows)
    const cashBurnRate = totalOutflows / period;

    // Calculate runway (days remaining at current burn rate)
    const runway = cashBurnRate > 0 ? Math.floor(currentBalance / cashBurnRate) : null;

    return {
      totalInflows,
      totalOutflows,
      netCashFlow,
      currentBalance,
      startingBalance,
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
    // Include today as the last day and ensure exactly `days` entries
    // Example: days=7 -> startDate is 6 days before today
    startDate.setDate(startDate.getDate() - (days - 1));

    console.log(`📊 Dashboard request - Period: ${days} days, Date range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);

    // Debug: Check total transaction count
    const totalTransactions = await CashFlowTransaction.countDocuments({});
    const manualTransactions = await CashFlowTransaction.countDocuments({ automated: false });
    const recentTransactions = await CashFlowTransaction.find({}).sort({ date: -1 }).limit(3);
    
    console.log(`🔍 Transaction counts - Total: ${totalTransactions}, Manual: ${manualTransactions}, Automated: ${totalTransactions - manualTransactions}`);
    console.log(`🔍 Most recent transactions:`, recentTransactions.map(tx => `${tx.type} $${tx.amount} (${tx.automated ? 'auto' : 'manual'})`));

    const dashboardData = await calculateDashboardData(startDate, endDate, days);
    
    // Add detailed balance breakdown for debugging
    const allTimeInflows = await CashFlowTransaction.aggregate([
      { $match: { type: 'inflow' } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]);
    
    const allTimeOutflows = await CashFlowTransaction.aggregate([
      { $match: { type: 'outflow' } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]);

    dashboardData.balanceBreakdown = {
      totalInflows: allTimeInflows[0]?.total || 0,
      totalOutflows: allTimeOutflows[0]?.total || 0,
      inflowCount: allTimeInflows[0]?.count || 0,
      outflowCount: allTimeOutflows[0]?.count || 0,
      currentBalance: (allTimeInflows[0]?.total || 0) - (allTimeOutflows[0]?.total || 0)
    };
    
    console.log(`📈 Dashboard calculated:`, {
      currentBalance: dashboardData.currentBalance,
      netCashFlow: dashboardData.netCashFlow,
      startingBalance: dashboardData.startingBalance,
      totalInflows: dashboardData.totalInflows,
      totalOutflows: dashboardData.totalOutflows,
      balanceBreakdown: dashboardData.balanceBreakdown
    });

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
    console.log("💰 Creating new transaction:", req.body);
    
    const transaction = new CashFlowTransaction(req.body);
    await transaction.save();
    
    console.log("✅ Transaction saved successfully:", {
      id: transaction._id,
      type: transaction.type,
      amount: transaction.amount,
      category: transaction.category,
      automated: transaction.automated,
      date: transaction.date
    });
    
    // Check total count after save
    const totalCount = await CashFlowTransaction.countDocuments({});
    const manualCount = await CashFlowTransaction.countDocuments({ automated: false });
    console.log(`📊 Updated counts - Total: ${totalCount}, Manual: ${manualCount}`);
    
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

// Debug: Compare orders vs transactions
const compareOrdersVsTransactions = async (req, res) => {
  try {
    const Order = require("../models/order");
    
    // Get all completed orders
    const completedOrders = await Order.find({ status: 'completed' })
      .sort({ orderDate: -1 })
      .select('_id totalPrice orderDate user products status')
      .populate('user', 'username');

    // Get all product sales transactions
    const productSalesTransactions = await CashFlowTransaction.find({ 
      category: 'product_sales',
      type: 'inflow'
    })
    .sort({ date: -1 })
    .select('amount date description orderId automated');

    // Get transactions linked to orders
    const transactionsWithOrders = await CashFlowTransaction.find({
      category: 'product_sales',
      type: 'inflow',
      orderId: { $exists: true }
    });

    // Get transactions without order links
    const transactionsWithoutOrders = await CashFlowTransaction.find({
      category: 'product_sales', 
      type: 'inflow',
      $or: [
        { orderId: { $exists: false } },
        { orderId: null }
      ]
    });

    // Check which orders have corresponding transactions
    const ordersWithTransactions = [];
    const ordersWithoutTransactions = [];
    const multipleTransactionsPerOrder = [];

    for (const order of completedOrders) {
      const orderTransactions = productSalesTransactions.filter(tx => 
        tx.orderId && tx.orderId.toString() === order._id.toString()
      );
      
      if (orderTransactions.length === 0) {
        ordersWithoutTransactions.push(order);
      } else if (orderTransactions.length === 1) {
        ordersWithTransactions.push({
          order,
          transaction: orderTransactions[0]
        });
      } else {
        multipleTransactionsPerOrder.push({
          order,
          transactions: orderTransactions
        });
      }
    }

    const totalOrderRevenue = completedOrders.reduce((sum, order) => sum + (order.totalPrice || 0), 0);
    const totalTransactionRevenue = productSalesTransactions.reduce((sum, tx) => sum + (tx.amount || 0), 0);

    res.json({
      summary: {
        completedOrders: completedOrders.length,
        productSalesTransactions: productSalesTransactions.length,
        totalOrderRevenue,
        totalTransactionRevenue,
        revenueDifference: totalTransactionRevenue - totalOrderRevenue
      },
      analysis: {
        ordersWithTransactions: ordersWithTransactions.length,
        ordersWithoutTransactions: ordersWithoutTransactions.length,
        multipleTransactionsPerOrder: multipleTransactionsPerOrder.length,
        transactionsWithoutOrders: transactionsWithoutOrders.length
      },
      details: {
        completedOrders: completedOrders.map(order => ({
          id: order._id,
          customer: order.user?.username || 'Unknown',
          amount: order.totalPrice,
          date: order.orderDate,
          products: order.products?.length || 0
        })),
        productSalesTransactions: productSalesTransactions.map(tx => ({
          id: tx._id,
          amount: tx.amount,
          date: tx.date,
          orderId: tx.orderId,
          automated: tx.automated,
          description: tx.description
        })),
        ordersWithoutTransactions: ordersWithoutTransactions.map(order => ({
          id: order._id,
          customer: order.user?.username || 'Unknown',
          amount: order.totalPrice,
          date: order.orderDate
        })),
        transactionsWithoutOrders: transactionsWithoutOrders.map(tx => ({
          id: tx._id,
          amount: tx.amount,
          date: tx.date,
          description: tx.description,
          automated: tx.automated
        })),
        multipleTransactionsPerOrder: multipleTransactionsPerOrder.map(item => ({
          order: {
            id: item.order._id,
            amount: item.order.totalPrice,
            customer: item.order.user?.username || 'Unknown'
          },
          transactions: item.transactions.map(tx => ({
            id: tx._id,
            amount: tx.amount,
            date: tx.date
          }))
        }))
      }
    });
  } catch (error) {
    console.error("Error comparing orders vs transactions:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get detailed balance breakdown
const getBalanceBreakdown = async (req, res) => {
  try {
    // Get all inflow transactions
    const inflowTransactions = await CashFlowTransaction.find({ type: 'inflow' })
      .sort({ date: -1 })
      .select('amount category description date automated');

    // Get all outflow transactions  
    const outflowTransactions = await CashFlowTransaction.find({ type: 'outflow' })
      .sort({ date: -1 })
      .select('amount category description date automated');

    // Calculate totals
    const totalInflows = inflowTransactions.reduce((sum, tx) => sum + tx.amount, 0);
    const totalOutflows = outflowTransactions.reduce((sum, tx) => sum + tx.amount, 0);
    const currentBalance = totalInflows - totalOutflows;

    // Group by category
    const inflowsByCategory = {};
    const outflowsByCategory = {};

    inflowTransactions.forEach(tx => {
      if (!inflowsByCategory[tx.category]) {
        inflowsByCategory[tx.category] = { total: 0, count: 0, transactions: [] };
      }
      inflowsByCategory[tx.category].total += tx.amount;
      inflowsByCategory[tx.category].count += 1;
      inflowsByCategory[tx.category].transactions.push(tx);
    });

    outflowTransactions.forEach(tx => {
      if (!outflowsByCategory[tx.category]) {
        outflowsByCategory[tx.category] = { total: 0, count: 0, transactions: [] };
      }
      outflowsByCategory[tx.category].total += tx.amount;
      outflowsByCategory[tx.category].count += 1;
      outflowsByCategory[tx.category].transactions.push(tx);
    });

    res.json({
      summary: {
        totalInflows,
        totalOutflows,
        currentBalance,
        inflowCount: inflowTransactions.length,
        outflowCount: outflowTransactions.length
      },
      inflowsByCategory,
      outflowsByCategory,
      // Return full lists for UI to show all transactions
      allInflows: inflowTransactions,
      allOutflows: outflowTransactions
    });
  } catch (error) {
    console.error("Error getting balance breakdown:", error);
    res.status(500).json({ message: "Internal server error" });
  }
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
  getBalanceBreakdown,
  compareOrdersVsTransactions,
  mapProductSalesRevenue,
  mapCostOfGoodsSold,
  mapShippingCosts,
  mapOperatingExpenses,
  mapRefunds
};
