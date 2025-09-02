const mongoose = require("mongoose");
const CashFlowTransaction = require("../models/cashFlowTransaction");
require('dotenv').config();

mongoose.connect("mongodb+srv://mongo-api:7TZYsdhwiXhiKRp9@cluster0.18pi3.mongodb.net/Wrencos?retryWrites=true&w=majority")
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log("MongoDB connection error:", err));

const removeRemainingSeededData = async () => {
  try {
    console.log("🧹 Removing remaining seeded marketing data...");

    // Remove marketing transactions that match seeded patterns
    const result = await CashFlowTransaction.deleteMany({
      category: 'marketing',
      description: { $regex: /Marketing expense -/ }
    });

    console.log(`✅ Removed ${result.deletedCount} seeded marketing transactions`);

    // Show remaining transactions
    const remaining = await CashFlowTransaction.find({}).sort({ date: -1 });
    console.log("\n📊 Remaining transactions:");
    remaining.forEach((t, i) => {
      console.log(`${i+1}. ${t.date.toISOString().split('T')[0]} | ${t.type} | ${t.category} | $${t.amount} | ${t.description}`);
    });
    console.log(`\nTotal remaining: ${remaining.length} transactions`);

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    mongoose.connection.close();
  }
};

removeRemainingSeededData();
