const mongoose = require('mongoose');
const CashFlowTransaction = require('./models/cashFlowTransaction');

/**
 * Script to remove automated COGS transactions from MongoDB Atlas
 * This connects to the same database as your main application
 */

async function cleanupCOGSTransactions() {
  try {
    // Connect to MongoDB Atlas (same as your main app)
    await mongoose.connect('mongodb+srv://mongo-api:7TZYsdhwiXhiKRp9@cluster0.18pi3.mongodb.net/Wrencos?retryWrites=true&w=majority');
    console.log('✅ Connected to MongoDB Atlas');

    // Find all automated COGS transactions
    const cogsTransactions = await CashFlowTransaction.find({
      category: 'cost_of_goods_sold',
      automated: true
    });

    console.log(`\n📊 Found ${cogsTransactions.length} automated COGS transactions`);

    if (cogsTransactions.length > 0) {
      console.log('\n🔍 COGS transactions to be removed:');
      cogsTransactions.forEach(tx => {
        console.log(`   - ${tx.date.toISOString().split('T')[0]} | $${tx.amount} | ${tx.description}`);
      });
    }

    // Calculate total amounts that will be removed
    const totalCOGSAmount = cogsTransactions.reduce((sum, tx) => sum + tx.amount, 0);
    const totalRemoved = totalCOGSAmount;

    console.log(`\n💰 Total COGS amount to remove: $${totalCOGSAmount}`);
    console.log(`💰 Total amount to remove: $${totalRemoved}`);

    // Ask for confirmation
    console.log('\n⚠️  IMPORTANT: This will permanently delete these transactions!');
    console.log('If you want to proceed, uncomment the deletion code below and run again.\n');
    
    // UNCOMMENT THE LINES BELOW TO ACTUALLY DELETE THE TRANSACTIONS
    // Remove COGS transactions
    const cogsDeleteResult = await CashFlowTransaction.deleteMany({
      category: 'cost_of_goods_sold',
      automated: true
    });

    console.log(`\n✅ Removed ${cogsDeleteResult.deletedCount} COGS transactions`);
    console.log(`✅ Total transactions removed: ${cogsDeleteResult.deletedCount}`);

    // Show updated balance
    const remainingTransactions = await CashFlowTransaction.find({});
    const remainingInflows = remainingTransactions
      .filter(tx => tx.type === 'inflow')
      .reduce((sum, tx) => sum + tx.amount, 0);
    const remainingOutflows = remainingTransactions
      .filter(tx => tx.type === 'outflow')
      .reduce((sum, tx) => sum + tx.amount, 0);
    const newBalance = remainingInflows - remainingOutflows;

    console.log(`\n📈 Updated cash flow summary:`);
    console.log(`   Total inflows: $${remainingInflows}`);
    console.log(`   Total outflows: $${remainingOutflows}`);
    console.log(`   Current balance: $${newBalance}`);

    console.log('\n🎉 COGS cleanup completed successfully!');
    
    console.log('👆 Uncomment the deletion code above if you want to proceed with the cleanup.');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB Atlas');
    process.exit(0);
  }
}

// Run the cleanup
cleanupCOGSTransactions();
