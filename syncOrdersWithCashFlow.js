const mongoose = require("mongoose");
const CashFlowTransaction = require("./models/cashFlowTransaction");
const Order = require("./models/order");
const { generateOrderTransactions } = require("./middleware/cashFlowAutomation");
require('dotenv').config();

mongoose.connect("mongodb+srv://mongo-api:7TZYsdhwiXhiKRp9@cluster0.18pi3.mongodb.net/Wrencos?retryWrites=true&w=majority")
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log("MongoDB connection error:", err));

const syncOrdersWithCashFlow = async () => {
  try {
    console.log("🔄 Syncing completed orders with cash flow transactions...\n");

    // Get all completed orders
    const completedOrders = await Order.find({ status: 'completed' }).sort({ orderDate: -1 });
    console.log(`📦 Found ${completedOrders.length} completed orders`);

    // Check which orders already have cash flow transactions
    const existingTransactions = await CashFlowTransaction.find({ 
      category: 'product_sales',
      automated: true 
    });

    console.log(`💰 Found ${existingTransactions.length} automated product_sales transactions\n`);

    let processedCount = 0;
    let skippedCount = 0;

    for (const order of completedOrders) {
      // Check if this order already has cash flow transactions
      // We'll assume it doesn't have any for now and process all
      try {
        console.log(`Processing order ${order._id} from ${order.orderDate.toISOString().split('T')[0]} - $${order.totalPrice}`);
        
        // Generate cash flow transactions for this order
        const transactions = await generateOrderTransactions(order);
        
        console.log(`✅ Generated ${transactions.length} transactions for order ${order._id}`);
        processedCount++;
        
      } catch (error) {
        console.error(`❌ Error processing order ${order._id}:`, error.message);
        skippedCount++;
      }
    }

    console.log(`\n📊 Sync Results:`);
    console.log(`✅ Processed: ${processedCount} orders`);
    console.log(`⚠️ Skipped: ${skippedCount} orders`);

    // Show final totals
    const finalTransactions = await CashFlowTransaction.find({});
    const finalTotal = await CashFlowTransaction.aggregate([
      { $match: { type: 'inflow' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    console.log(`\n💰 Final cash flow inflows: $${finalTotal[0]?.total || 0}`);
    console.log(`📝 Total transactions: ${finalTransactions.length}`);

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    mongoose.connection.close();
  }
};

syncOrdersWithCashFlow();
