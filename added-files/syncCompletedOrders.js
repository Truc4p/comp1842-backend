require('dotenv').config();
const mongoose = require('mongoose');
const { syncCompletedOrdersTocashFlow } = require('../middleware/cleanOrderIntegration');

/**
 * 🚀 SYNC COMPLETED ORDERS TO CASH FLOW
 * 
 * This script will:
 * 1. Find all completed orders
 * 2. Create clean revenue transactions for them
 * 3. Show before/after totals
 */

async function syncOrders() {
  try {
    console.log('🔄 Starting clean order-to-cashflow sync...\n');
    
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected\n');
    
    // Get current state
    const CashFlowTransaction = require('../models/cashFlowTransaction');
    const Order = require('../models/order');
    
    const beforeTransactions = await CashFlowTransaction.find({});
    const beforeTotal = beforeTransactions.reduce((sum, t) => 
      sum + (t.type === 'inflow' ? t.amount : -t.amount), 0
    );
    
    const allOrders = await Order.find({ status: 'completed' });
    const totalOrderValue = allOrders.reduce((sum, o) => sum + o.totalPrice, 0);
    
    console.log('📊 BEFORE SYNC:');
    console.log(`💰 Cash flow balance: $${beforeTotal}`);
    console.log(`📦 Completed orders: ${allOrders.length} orders worth $${totalOrderValue}`);
    console.log(`⚠️  Gap: $${totalOrderValue - beforeTotal} in untracked revenue\n`);
    
    // Run the sync
    console.log('🚀 Running sync...\n');
    const result = await syncCompletedOrdersTocashFlow();
    
    // Get after state
    const afterTransactions = await CashFlowTransaction.find({});
    const afterTotal = afterTransactions.reduce((sum, t) => 
      sum + (t.type === 'inflow' ? t.amount : -t.amount), 0
    );
    
    console.log('\n📊 SYNC RESULTS:');
    console.log(`✅ Orders synced: ${result.synced}`);
    console.log(`❌ Failed: ${result.failed}`);
    console.log(`💰 Revenue added: $${result.totalRevenue}\n`);
    
    console.log('📊 AFTER SYNC:');
    console.log(`💰 Cash flow balance: $${afterTotal}`);
    console.log(`📈 Increase: $${afterTotal - beforeTotal}`);
    console.log(`🎯 Now tracking: ${afterTransactions.length} total transactions\n`);
    
    if (result.failed > 0) {
      console.log('❌ FAILED ORDERS:');
      result.results.filter(r => !r.success).forEach(r => {
        console.log(`   Order ${r.orderId}: ${r.error}`);
      });
    }
    
    console.log('✅ Clean revenue integration complete!\n');
    console.log('💡 From now on, when you mark orders as "completed",');
    console.log('   they will automatically create clean revenue transactions');
    console.log('   without any artificial COGS or shipping costs.');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Sync failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  syncOrders();
}

module.exports = { syncOrders };
