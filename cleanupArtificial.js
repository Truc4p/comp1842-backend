require('dotenv').config();
const mongoose = require('mongoose');
const CashFlowTransaction = require('./models/cashFlowTransaction');

async function cleanupArtificialTransactions() {
  try {
    // Use the same MongoDB Atlas connection as the investigation script
    await mongoose.connect("mongodb+srv://mongo-api:7TZYsdhwiXhiKRp9@cluster0.18pi3.mongodb.net/Wrencos?retryWrites=true&w=majority");
    console.log('🔗 Connected to MongoDB Atlas');
    
    console.log('🔍 Searching for artificial COGS and shipping cost transactions...\n');
    
    // First check all automated transactions
    const allAutomated = await CashFlowTransaction.find({ automated: true }).sort({ date: -1 });
    console.log(`📊 Total automated transactions: ${allAutomated.length}`);
    
    // Check categories
    const cogsTransactions = await CashFlowTransaction.find({ 
      automated: true, 
      category: 'cost_of_goods_sold' 
    }).sort({ date: -1 });
    console.log(`   COGS transactions: ${cogsTransactions.length}`);
    
    const shippingTransactions = await CashFlowTransaction.find({ 
      automated: true, 
      category: 'shipping_costs' 
    }).sort({ date: -1 });
    console.log(`   Shipping transactions: ${shippingTransactions.length}`);
    
    // Find artificial transactions with these specific categories
    const artificialTransactions = await CashFlowTransaction.find({
      automated: true,
      $or: [
        { category: 'cost_of_goods_sold' },
        { category: 'shipping_costs' }
      ]
    }).sort({ date: -1 });
    
    console.log(`📊 Found ${artificialTransactions.length} artificial COGS/shipping transactions:`);
    if (artificialTransactions.length > 0) {
      artificialTransactions.forEach((t, i) => {
        console.log(`${i+1}. ${t.date.toISOString().split('T')[0]} | ${t.category} | $${t.amount} | ${t.description}`);
      });
      
      console.log('\n🗑️  Removing artificial transactions...');
      
      const deleteResult = await CashFlowTransaction.deleteMany({
        automated: true,
        $or: [
          { category: 'cost_of_goods_sold' },
          { category: 'shipping_costs' }
        ]
      });
      
      console.log(`✅ Removed ${deleteResult.deletedCount} artificial transactions`);
      
      // Count remaining transactions
      const remainingCount = await CashFlowTransaction.countDocuments();
      const automatedCount = await CashFlowTransaction.countDocuments({ automated: true });
      const manualCount = await CashFlowTransaction.countDocuments({ automated: false });
      
      console.log(`\n📈 Database Summary After Cleanup:`);
      console.log(`   Total transactions: ${remainingCount}`);
      console.log(`   Manual transactions: ${manualCount}`);
      console.log(`   Automated transactions: ${automatedCount}`);
      
    } else {
      console.log('   ✅ No artificial COGS/shipping transactions found to remove');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

cleanupArtificialTransactions();
