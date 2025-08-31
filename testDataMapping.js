// Test the data mapping without database connection first
console.log("🚀 Testing Phase 2 Data Mapping (Controller Validation)...");

try {
  const cashFlowController = require('./controllers/cashFlowController');
  
  console.log("✅ Controller loaded successfully!");
  console.log("📋 Available functions:", Object.keys(cashFlowController));
  
  if (cashFlowController.syncAllDataToFlowTransactions) {
    console.log("✅ syncAllDataToFlowTransactions function found!");
  } else {
    console.log("❌ syncAllDataToFlowTransactions function NOT found!");
  }
  
  // Now test with database connection
  const mongoose = require('mongoose');
  
  mongoose.connect('mongodb+srv://phamthanhtruc2005:MyOQQo8F69VUeEGq@cluster0.cknz0.mongodb.net/wrencos_db?retryWrites=true&w=majority', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  console.log("� Database connected, testing data mapping...");
  
  // Test syncing data for the last 30 days
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  
  console.log(`📅 Syncing data from ${startDate.toDateString()} to ${endDate.toDateString()}`);
  
  setTimeout(async () => {
    try {
      const results = await cashFlowController.syncAllDataToFlowTransactions(startDate, endDate);
      
      console.log("✅ Data mapping test completed!");
      console.log("📊 Results:", results);
      
      mongoose.disconnect();
      process.exit(0);
    } catch (error) {
      console.error("❌ Error testing data mapping:", error);
      mongoose.disconnect();
      process.exit(1);
    }
  }, 2000);
  
} catch (error) {
  console.error("❌ Error loading controller:", error);
  process.exit(1);
}
