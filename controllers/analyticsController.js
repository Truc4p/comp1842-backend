const Order = require("../models/order");
const Product = require("../models/product");
const User = require("../models/user");
const Category = require("../models/category");

// Get overall dashboard statistics
const getDashboardStats = async (req, res) => {
  try {
    // Get total counts
    const totalOrders = await Order.countDocuments(); // Count all orders regardless of status
    const totalProducts = await Product.countDocuments();
    const totalUsers = await User.countDocuments();
    const totalCategories = await Category.countDocuments();

    // Get revenue statistics - only from completed orders
    const completedOrders = await Order.find({ status: "completed" });
    const totalRevenue = completedOrders.reduce((sum, order) => sum + order.totalPrice, 0);
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Get recent orders count (last 30 days) - include all statuses
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentOrders = await Order.countDocuments({
      orderDate: { $gte: thirtyDaysAgo }
    });

    // Get low stock products
    const lowStockProducts = await Product.countDocuments({ stockQuantity: { $lt: 10 } });

    res.json({
      totalOrders,
      totalProducts,
      totalUsers,
      totalCategories,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      averageOrderValue: Math.round(averageOrderValue * 100) / 100,
      recentOrders,
      lowStockProducts
    });
  } catch (error) {
    console.error("Error getting dashboard stats:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get sales analytics
const getSalesAnalytics = async (req, res) => {
  try {
    const { period = "30" } = req.query;
    const days = parseInt(period);
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get orders within the period - include all statuses to show actual order activity
    const orders = await Order.find({
      orderDate: { $gte: startDate, $lte: endDate }
      // Removed status: "completed" filter to show all orders
    });

    // Group by date
    const salesByDate = {};
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      salesByDate[dateStr] = { revenue: 0, orders: 0 };
    }

    orders.forEach(order => {
      const dateStr = order.orderDate.toISOString().split('T')[0];
      if (salesByDate[dateStr]) {
        // Only count revenue for completed orders, but count all orders
        if (order.status === "completed") {
          salesByDate[dateStr].revenue += order.totalPrice;
        }
        salesByDate[dateStr].orders += 1;
      }
    });

    // Convert to array format for charts
    const salesData = Object.entries(salesByDate).map(([date, data]) => ({
      date,
      revenue: Math.round(data.revenue * 100) / 100,
      orders: data.orders
    }));

    // Calculate totals
    const totalRevenue = salesData.reduce((sum, day) => sum + day.revenue, 0);
    const totalOrders = salesData.reduce((sum, day) => sum + day.orders, 0);

    res.json({
      period: days,
      salesData,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalOrders,
      averageDailyRevenue: Math.round(totalRevenue / days * 100) / 100
    });
  } catch (error) {
    console.error("Error getting sales analytics:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get product analytics
const getProductAnalytics = async (req, res) => {
  try {
    // Debug: counts to help diagnose Unknown Category
    const [orphanCount, categoryDocsCount] = await Promise.all([
      Product.countDocuments({ $or: [ { category: { $exists: false } }, { category: null } ] }),
      Category.countDocuments(),
    ]);
    console.log("[Analytics] getProductAnalytics: counts", { orphanCount, categoryDocsCount });

    // Get top selling products
    const topProducts = await Order.aggregate([
      { $unwind: "$products" },
      {
        $group: {
          _id: "$products.productId",
          totalSold: { $sum: "$products.quantity" },
          totalRevenue: { $sum: { $multiply: ["$products.price", "$products.quantity"] } }
        }
      },
      { $sort: { totalSold: -1 } },
      { $limit: 10 }
    ]);
    console.log("[Analytics] getProductAnalytics: topProducts count", topProducts.length);

    // Get product details for top products
    const topProductsWithDetails = await Promise.all(
      topProducts.map(async (product) => {
        const productDetails = await Product.findById(product._id);
        return {
          productId: product._id,
          name: productDetails ? productDetails.name : "Unknown Product",
          totalSold: product.totalSold,
          totalRevenue: Math.round(product.totalRevenue * 100) / 100
        };
      })
    );

    // Get category distribution with names via lookup
    const categoryDistribution = await Product.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } },
      {
        $lookup: {
          from: "categories",
          localField: "_id",
          foreignField: "_id",
          as: "category"
        }
      },
      { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          categoryId: "$_id",
          name: { $ifNull: ["$category.name", "Unknown Category"] },
          count: 1
        }
      },
      { $sort: { count: -1 } }
    ]);
    console.log("[Analytics] getProductAnalytics: categoryDistribution sample", categoryDistribution.slice(0, 5));

    // Get low stock products
    const lowStockProducts = await Product.find({ stockQuantity: { $lt: 10 } })
      .select('name stockQuantity price')
      .sort({ stockQuantity: 1 })
      .limit(10);

    res.json({
      topProducts: topProductsWithDetails,
      categoryDistribution,
      lowStockProducts
    });
  } catch (error) {
    console.error("Error getting product analytics:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get user analytics
const getUserAnalytics = async (req, res) => {
  try {
    // Get user registration over time
    const { period = "30" } = req.query;
    const days = parseInt(period);
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const users = await User.find({
      createdAt: { $gte: startDate, $lte: endDate }
    });

    // Group by date
    const registrationsByDate = {};
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      registrationsByDate[dateStr] = 0;
    }

    users.forEach(user => {
      const dateStr = user.createdAt.toISOString().split('T')[0];
      if (registrationsByDate[dateStr]) {
        registrationsByDate[dateStr]++;
      }
    });

    // Convert to array format
    const registrationData = Object.entries(registrationsByDate).map(([date, count]) => ({
      date,
      registrations: count
    }));

    // Get top customers by order value
    const topCustomers = await Order.aggregate([
      {
        $group: {
          _id: "$user",
          totalSpent: { $sum: "$totalPrice" },
          orderCount: { $sum: 1 }
        }
      },
      { $sort: { totalSpent: -1 } },
      { $limit: 10 }
    ]);

    // Get customer details
    const topCustomersWithDetails = await Promise.all(
      topCustomers.map(async (customer) => {
        const userDetails = await User.findById(customer._id);
        return {
          userId: customer._id,
          username: userDetails ? userDetails.username : "Unknown User",
          totalSpent: Math.round(customer.totalSpent * 100) / 100,
          orderCount: customer.orderCount
        };
      })
    );

    res.json({
      period: days,
      registrationData,
      topCustomers: topCustomersWithDetails,
      totalNewUsers: users.length
    });
  } catch (error) {
    console.error("Error getting user analytics:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get order analytics
const getOrderAnalytics = async (req, res) => {
  try {
    // Get order status distribution
    const orderStatusDistribution = await Order.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Get payment method distribution
    const paymentMethodDistribution = await Order.aggregate([
      {
        $group: {
          _id: "$paymentMethod",
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Get average order value by status
    const averageOrderValueByStatus = await Order.aggregate([
      {
        $group: {
          _id: "$status",
          averageValue: { $avg: "$totalPrice" },
          count: { $sum: 1 }
        }
      },
      { $sort: { averageValue: -1 } }
    ]);

    // Get recent orders
    const recentOrders = await Order.find()
      .sort({ orderDate: -1 })
      .limit(10)
      .populate('user', 'username')
      .populate('products.productId', 'name price');

    res.json({
      orderStatusDistribution,
      paymentMethodDistribution,
      averageOrderValueByStatus: averageOrderValueByStatus.map(item => ({
        status: item._id,
        averageValue: Math.round(item.averageValue * 100) / 100,
        count: item.count
      })),
      recentOrders
    });
  } catch (error) {
    console.error("Error getting order analytics:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  getDashboardStats,
  getSalesAnalytics,
  getProductAnalytics,
  getUserAnalytics,
  getOrderAnalytics
};
