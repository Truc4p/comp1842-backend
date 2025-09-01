const mongoose = require("mongoose");
const CashFlowTransaction = require("./models/cashFlowTransaction");
const Order = require("./models/order");
require('dotenv').config();

mongoose.connect("mongodb+srv://mongo-api:7TZYsdhwiXhiKRp9@cluster0.18pi3.mongodb.net/Wrencos?retryWrites=true&w=majority")
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log("MongoDB connection error:", err));

const removeArtificialTransactions = async () => {
  try {
    console.log("🧹 Removing artificial automated transactions...\n");

    // Remove all automated transactions (these were artificially generated)
    console.log("🗑️ Removing automated cash flow transactions...");
    const automatedResult = await CashFlowTransaction.deleteMany({ 
      automated: true 
    });
    console.log(`✅ Removed ${automatedResult.deletedCount} artificial automated transactions`);

    // Show what remains (should only be your manual entries)
    const remaining = await CashFlowTransaction.find({}).sort({ date: -1 });
    console.log("\n📊 Remaining transactions (manual entries only):");
    remaining.forEach((t, i) => {
      console.log(`${i+1}. ${t.date.toISOString().split('T')[0]} | ${t.type} | ${t.category} | $${t.amount} | ${t.description} | automated: ${t.automated || false}`);
    });

    console.log(`\n📊 Total remaining: ${remaining.length} transactions`);

    // Check totals
    const manualTotal = await CashFlowTransaction.aggregate([
      { $match: { type: 'inflow' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const orderTotal = await Order.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } }
    ]);

    console.log(`\n💰 Manual cash flow entries: $${manualTotal[0]?.total || 0}`);
    console.log(`📦 Completed orders (not in cash flow): $${orderTotal[0]?.total || 0}`);
    console.log("\n✅ All artificial data removed!");
    console.log("💡 Now showing only your actual manual transactions");

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    mongoose.connection.close();
  }
};

removeArtificialTransactions();
