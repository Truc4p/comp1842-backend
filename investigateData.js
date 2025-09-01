const mongoose = require("mongoose");
const CashFlowTransaction = require("./models/cashFlowTransaction");
const Order = require("./models/order");
require('dotenv').config();

mongoose.connect("mongodb+srv://mongo-api:7TZYsdhwiXhiKRp9@cluster0.18pi3.mongodb.net/Wrencos?retryWrites=true&w=majority")
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log("MongoDB connection error:", err));

const investigateData = async () => {
  try {
    console.log("🔍 Investigating current data...\n");

    // Check cash flow transactions
    console.log("💰 CASH FLOW TRANSACTIONS:");
    const transactions = await CashFlowTransaction.find({}).sort({ date: -1 });
    transactions.forEach((t, i) => {
      console.log(`${i+1}. ${t.date.toISOString().split('T')[0]} | ${t.type} | ${t.category} | $${t.amount} | ${t.description || 'No description'} | automated: ${t.automated || false}`);
    });
    console.log(`Total: ${transactions.length} transactions\n`);

    // Check orders
    console.log("🛒 ORDERS:");
    const orders = await Order.find({}).sort({ orderDate: -1 }).limit(10);
    orders.forEach((order, i) => {
      console.log(`${i+1}. ${order.orderDate.toISOString().split('T')[0]} | $${order.totalPrice} | ${order.status} | ${order.products?.length || 0} items`);
    });
    console.log(`Total orders: ${await Order.countDocuments()}\n`);

    // Check if orders are being converted to cash flow
    const orderTotal = await Order.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, totalRevenue: { $sum: "$totalPrice" } } }
    ]);
    
    const cashFlowTotal = await CashFlowTransaction.aggregate([
      { $match: { type: 'inflow' } },
      { $group: { _id: null, totalInflows: { $sum: "$amount" } } }
    ]);

    console.log(`💸 Completed orders total: $${orderTotal[0]?.totalRevenue || 0}`);
    console.log(`💰 Cash flow inflows total: $${cashFlowTotal[0]?.totalInflows || 0}`);
    
    if (orderTotal[0]?.totalRevenue !== cashFlowTotal[0]?.totalInflows) {
      console.log("⚠️  MISMATCH: Orders and cash flow don't match!");
    }

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    mongoose.connection.close();
  }
};

investigateData();
