const { generateOrderTransactions, generateRecurringExpenses } = require("../middleware/cashFlowAutomation");
const CashFlowTransaction = require("../models/cashFlowTransaction");
const Order = require("../models/order");

/**
 * 🧪 PHASE 4 AUTOMATION TESTING SCRIPT
 * 
 * This script tests the automated cash flow generation features:
 * 1. Order completion automation
 * 2. Recurring expenses automation
 */

// Test data for order automation
const testOrder = {
  _id: "test-order-001",
  totalPrice: 150.00,
  products: [
    { productId: "product-1", quantity: 2, price: 50 },
    { productId: "product-2", quantity: 1, price: 50 }
  ],
  user: "test-user-001",
  status: "completed"
};

async function testOrderAutomation() {
  console.log("\n🧪 Testing Order Automation...");
  
  try {
    // Test automated transaction generation for order completion
    const transactions = await generateOrderTransactions(testOrder);
    
    console.log("✅ Order automation test successful!");
    console.log("Generated transactions:", {
      revenue: {
        type: transactions.revenue.type,
        category: transactions.revenue.category,
        amount: transactions.revenue.amount,
        description: transactions.revenue.description
      },
      cogs: {
        type: transactions.cogs.type,
        category: transactions.cogs.category,
        amount: transactions.cogs.amount,
        description: transactions.cogs.description
      },
      shipping: {
        type: transactions.shipping.type,
        category: transactions.shipping.category,
        amount: transactions.shipping.amount,
        description: transactions.shipping.description
      }
    });
    
    const netProfit = transactions.revenue.amount - transactions.cogs.amount - transactions.shipping.amount;
    console.log(`💰 Net Profit: $${netProfit.toFixed(2)}`);
    
    return true;
  } catch (error) {
    console.error("❌ Order automation test failed:", error);
    return false;
  }
}

async function testRecurringExpenses() {
  console.log("\n🧪 Testing Recurring Expenses...");
  
  try {
    // Count transactions before generating recurring expenses
    const beforeCount = await CashFlowTransaction.countDocuments({ automated: true, orderId: { $exists: false } });
    
    // Generate recurring expenses
    await generateRecurringExpenses();
    
    // Count transactions after generating recurring expenses
    const afterCount = await CashFlowTransaction.countDocuments({ automated: true, orderId: { $exists: false } });
    
    console.log(`✅ Recurring expenses test completed!`);
    console.log(`📊 Recurring transactions before: ${beforeCount}`);
    console.log(`📊 Recurring transactions after: ${afterCount}`);
    console.log(`➕ New recurring transactions: ${afterCount - beforeCount}`);
    
    return true;
  } catch (error) {
    console.error("❌ Recurring expenses test failed:", error);
    return false;
  }
}

async function runAutomationTests() {
  console.log("🚀 Starting Phase 4 Automation Tests...");
  
  const orderTest = await testOrderAutomation();
  const recurringTest = await testRecurringExpenses();
  
  console.log("\n📊 Test Results Summary:");
  console.log(`Order Automation: ${orderTest ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Recurring Expenses: ${recurringTest ? '✅ PASS' : '❌ FAIL'}`);
  
  if (orderTest && recurringTest) {
    console.log("🎉 All automation tests passed!");
  } else {
    console.log("⚠️  Some automation tests failed. Check logs above.");
  }
}

// Export for use in testing
module.exports = {
  testOrderAutomation,
  testRecurringExpenses,
  runAutomationTests
};

// Run tests if this file is executed directly
if (require.main === module) {
  runAutomationTests().catch(console.error);
}
