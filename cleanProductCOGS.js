require('dotenv').config();
const mongoose = require('mongoose');

async function cleanProductCOGS() {
  try {
    // Connect to MongoDB Atlas
    await mongoose.connect("mongodb+srv://mongo-api:7TZYsdhwiXhiKRp9@cluster0.18pi3.mongodb.net/Wrencos?retryWrites=true&w=majority");
    console.log('🔗 Connected to MongoDB Atlas');
    
    // Get direct access to the products collection
    const db = mongoose.connection.db;
    const productsCollection = db.collection('products');
    
    console.log('🔍 Checking products collection directly...\n');
    
    // Find products with COGS fields
    const productsWithCOGS = await productsCollection.find({
      $or: [
        { cost: { $exists: true } },
        { cogs: { $exists: true } },
        { margin: { $exists: true } }
      ]
    }).toArray();
    
    console.log(`📦 Found ${productsWithCOGS.length} products with COGS fields:`);
    
    if (productsWithCOGS.length === 0) {
      console.log('   ✅ No products have COGS fields!');
      process.exit(0);
    }
    
    // Show what fields exist
    productsWithCOGS.forEach((product, i) => {
      console.log(`${i+1}. ${product.name}`);
      console.log(`   Price: $${product.price}`);
      if (product.cost !== undefined) console.log(`   Cost: $${product.cost}`);
      if (product.cogs !== undefined) console.log(`   COGS: $${product.cogs}`);
      if (product.margin !== undefined) console.log(`   Margin: ${product.margin}%`);
      console.log('');
    });
    
    console.log('🧹 Removing COGS fields using direct MongoDB operations...\n');
    
    // Use MongoDB's updateMany with $unset
    const result = await productsCollection.updateMany(
      {},
      {
        $unset: {
          cost: 1,
          cogs: 1,
          margin: 1
        }
      }
    );
    
    console.log(`📊 Update result:`);
    console.log(`   Matched: ${result.matchedCount} documents`);
    console.log(`   Modified: ${result.modifiedCount} documents`);
    console.log(`   Acknowledged: ${result.acknowledged}`);
    
    // Verify the removal
    console.log('\n🔍 Verifying removal...');
    const remainingCOGS = await productsCollection.find({
      $or: [
        { cost: { $exists: true } },
        { cogs: { $exists: true } },
        { margin: { $exists: true } }
      ]
    }).toArray();
    
    if (remainingCOGS.length === 0) {
      console.log('   ✅ All COGS fields successfully removed!');
      
      // Show sample products
      const sampleProducts = await productsCollection.find({}).limit(3).toArray();
      console.log('\n📋 Sample products after cleanup:');
      sampleProducts.forEach((product, i) => {
        const fieldNames = Object.keys(product);
        console.log(`${i+1}. ${product.name}`);
        console.log(`   Fields: ${fieldNames.join(', ')}`);
        console.log(`   Has COGS fields: ${fieldNames.some(f => ['cost', 'cogs', 'margin'].includes(f))}`);
        console.log('');
      });
      
    } else {
      console.log(`   ⚠️  Warning: ${remainingCOGS.length} products still have COGS fields`);
    }
    
    console.log('\n🎉 Direct MongoDB cleanup completed!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

cleanProductCOGS();
