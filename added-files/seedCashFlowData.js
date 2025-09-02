const mongoose = require("mongoose");
const CashFlowTransaction = require("../models/cashFlowTransaction");
const BusinessExpense = require("../models/businessExpense");
require('dotenv').config();

// Connect to MongoDB
mongoose.connect("mongodb+srv://mongo-api:7TZYsdhwiXhiKRp9@cluster0.18pi3.mongodb.net/Wrencos?retryWrites=true&w=majority")
  .then(() => console.log("MongoDB connected for seeding"))
  .catch(err => console.log("MongoDB connection error:", err));

const seedCashFlowData = async () => {
  try {
    console.log("🌱 Seeding cash flow data...");

    // Check if data already exists
    const existingTransactions = await CashFlowTransaction.countDocuments();
    if (existingTransactions > 0) {
      console.log("✅ Cash flow data already exists, skipping seeding");
      return;
    }

    // Create sample business expenses (simplified, we'll skip business expenses for now)
    console.log("✅ Skipping business expenses for now");

    // Create sample cash flow transactions
    const cashFlowTransactions = [];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30); // 30 days ago

    // Generate daily transactions for the last 30 days
    for (let i = 0; i < 30; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);

      // Simulate daily sales (inflows)
      const dailySales = Math.random() * 3000 + 500; // $500-$3500 per day
      cashFlowTransactions.push({
        type: 'inflow',
        category: 'product_sales',
        amount: Math.round(dailySales * 100) / 100,
        description: `Daily sales revenue - ${date.toDateString()}`,
        date: date,
        automated: true
      });

      // Simulate COGS (45% of sales)
      const cogs = dailySales * 0.45;
      cashFlowTransactions.push({
        type: 'outflow',
        category: 'cost_of_goods_sold',
        amount: Math.round(cogs * 100) / 100,
        description: `Cost of goods sold - ${date.toDateString()}`,
        date: date,
        automated: true
      });

      // Simulate shipping costs (random between $50-200 per day)
      const shippingCosts = Math.random() * 150 + 50;
      cashFlowTransactions.push({
        type: 'outflow',
        category: 'shipping_costs',
        amount: Math.round(shippingCosts * 100) / 100,
        description: `Shipping costs - ${date.toDateString()}`,
        date: date,
        automated: true
      });

      // Occasional marketing expenses
      if (Math.random() > 0.8) { // 20% chance
        const marketingCost = Math.random() * 300 + 100;
        cashFlowTransactions.push({
          type: 'outflow',
          category: 'marketing',
          amount: Math.round(marketingCost * 100) / 100,
          description: `Marketing expense - ${date.toDateString()}`,
          date: date,
          automated: false
        });
      }
    }

    // Add monthly recurring expenses
    const monthlyExpenses = [
      { category: 'rent', amount: 2500, description: 'Monthly office rent' },
      { category: 'utilities', amount: 350, description: 'Monthly utilities' },
      { category: 'operating_expenses', amount: 299, description: 'Software subscriptions' },
      { category: 'payroll', amount: 8500, description: 'Employee salaries' }
    ];

    const currentMonth = new Date();
    currentMonth.setDate(1); // First day of current month

    monthlyExpenses.forEach(expense => {
      cashFlowTransactions.push({
        type: 'outflow',
        category: expense.category,
        amount: expense.amount,
        description: expense.description,
        date: currentMonth,
        automated: false
      });
    });

    // Add some manual investment income
    cashFlowTransactions.push({
      type: 'inflow',
      category: 'investment_income',
      amount: 1500,
      description: 'Investment returns',
      date: new Date(currentMonth.getTime() + 15 * 24 * 60 * 60 * 1000), // 15th of month
      automated: false
    });

    // Add other income
    cashFlowTransactions.push({
      type: 'inflow',
      category: 'other_income',
      amount: 750,
      description: 'Consultation services',
      date: new Date(currentMonth.getTime() + 20 * 24 * 60 * 60 * 1000), // 20th of month
      automated: false
    });

    await CashFlowTransaction.insertMany(cashFlowTransactions);
    console.log(`✅ Created ${cashFlowTransactions.length} sample cash flow transactions`);

    console.log("🎉 Cash flow data seeding completed successfully!");
    
    // Calculate and display summary
    const totalInflows = await CashFlowTransaction.aggregate([
      { $match: { type: 'inflow' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    const totalOutflows = await CashFlowTransaction.aggregate([
      { $match: { type: 'outflow' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const inflows = totalInflows[0]?.total || 0;
    const outflows = totalOutflows[0]?.total || 0;
    const balance = inflows - outflows;

    console.log("\n📊 Summary:");
    console.log(`💰 Total Inflows: $${inflows.toFixed(2)}`);
    console.log(`💸 Total Outflows: $${outflows.toFixed(2)}`);
    console.log(`🏦 Current Balance: $${balance.toFixed(2)}`);
    
  } catch (error) {
    console.error("❌ Error seeding cash flow data:", error);
  } finally {
    mongoose.connection.close();
    console.log("📝 Database connection closed");
  }
};

// Run the seeding function
seedCashFlowData();
