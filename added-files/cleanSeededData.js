const mongoose = require("mongoose");
const CashFlowTransaction = require("../models/cashFlowTransaction");
const BusinessExpense = require("../models/businessExpense");
require('dotenv').config();

// Connect to MongoDB
mongoose.connect("mongodb+srv://mongo-api:7TZYsdhwiXhiKRp9@cluster0.18pi3.mongodb.net/Wrencos?retryWrites=true&w=majority")
  .then(() => console.log("MongoDB connected for cleaning"))
  .catch(err => console.log("MongoDB connection error:", err));

const cleanSeededData = async () => {
  try {
    console.log("🧹 Cleaning seeded/mock data...");

    // Get all transactions before cleaning
    const totalBefore = await CashFlowTransaction.countDocuments();
    console.log(`📊 Total transactions before cleaning: ${totalBefore}`);

    // Remove transactions that are clearly seeded/automated
    // These are identifiable by:
    // 1. automated: true flag
    // 2. Specific seeded categories: rent, utilities, operating_expenses, payroll, investment_income, other_income
    // 3. Round numbers that match seeding patterns
    
    console.log("🗑️ Removing automated transactions...");
    const automatedResult = await CashFlowTransaction.deleteMany({ automated: true });
    console.log(`✅ Removed ${automatedResult.deletedCount} automated transactions`);

    console.log("🗑️ Removing seeded monthly expenses...");
    const monthlyExpensesResult = await CashFlowTransaction.deleteMany({
      category: { $in: ['rent', 'utilities', 'operating_expenses', 'payroll'] }
    });
    console.log(`✅ Removed ${monthlyExpensesResult.deletedCount} monthly expense transactions`);

    console.log("🗑️ Removing seeded income transactions...");
    const seededIncomeResult = await CashFlowTransaction.deleteMany({
      category: { $in: ['investment_income', 'other_income'] },
      amount: { $in: [1500, 750] } // Specific seeded amounts
    });
    console.log(`✅ Removed ${seededIncomeResult.deletedCount} seeded income transactions`);

    // Remove any business expenses that might have been seeded
    console.log("🗑️ Removing seeded business expenses...");
    const businessExpenseResult = await BusinessExpense.deleteMany({});
    console.log(`✅ Removed ${businessExpenseResult.deletedCount} business expense records`);

    // Get remaining transactions
    const totalAfter = await CashFlowTransaction.countDocuments();
    console.log(`📊 Total transactions after cleaning: ${totalAfter}`);
    console.log(`🧹 Removed ${totalBefore - totalAfter} total records`);

    // Show remaining transaction categories
    const remainingCategories = await CashFlowTransaction.aggregate([
      {
        $group: {
          _id: { category: "$category", type: "$type" },
          count: { $sum: 1 },
          totalAmount: { $sum: "$amount" }
        }
      },
      { $sort: { "_id.type": 1, "_id.category": 1 } }
    ]);

    console.log("\n📋 Remaining transaction categories:");
    remainingCategories.forEach(cat => {
      console.log(`  ${cat._id.type}: ${cat._id.category} - ${cat.count} transactions, $${cat.totalAmount.toFixed(2)}`);
    });

    console.log("\n✅ Data cleaning completed!");
    console.log("💡 Only real transactions (from manual entry or actual business operations) remain");
    
  } catch (error) {
    console.error("❌ Error cleaning data:", error);
  } finally {
    mongoose.connection.close();
  }
};

cleanSeededData();
