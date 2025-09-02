const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Import the model
const CashFlowTransaction = require('../models/cashFlowTransaction');

async function checkTransactions() {
  try {
    console.log('Checking all cash flow transactions...');
    
    // Get all transactions, sorted by most recent
    const transactions = await CashFlowTransaction.find({})
      .sort({ date: -1 })
      .limit(20);
    
    console.log(`Found ${transactions.length} transactions:`);
    
    transactions.forEach((transaction, index) => {
      console.log(`${index + 1}. ${transaction.date.toISOString().split('T')[0]} - ${transaction.type} - $${transaction.amount} - ${transaction.description || 'No description'}`);
    });
    
    // Get transactions from today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todayTransactions = await CashFlowTransaction.find({
      date: {
        $gte: today,
        $lt: tomorrow
      }
    }).sort({ date: -1 });
    
    console.log(`\nTransactions from today (${today.toDateString()}):`);
    todayTransactions.forEach((transaction, index) => {
      console.log(`${index + 1}. ${transaction.date.toISOString()} - ${transaction.type} - $${transaction.amount} - ${transaction.description || 'No description'}`);
    });
    
    // Check manual transactions specifically
    const manualTransactions = await CashFlowTransaction.find({
      description: { $regex: /manual/i }
    }).sort({ date: -1 });
    
    console.log(`\nManual transactions:`);
    manualTransactions.forEach((transaction, index) => {
      console.log(`${index + 1}. ${transaction.date.toISOString()} - ${transaction.type} - $${transaction.amount} - ${transaction.description}`);
    });
    
  } catch (error) {
    console.error('Error checking transactions:', error);
  } finally {
    mongoose.connection.close();
  }
}

checkTransactions();
