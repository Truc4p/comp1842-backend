require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./models/product');

async function removeProductCOGS() {
  try {
    // Connect to MongoDB Atlas
    await mongoose.connect("mongodb+srv://mongo-api:7TZYsdhwiXhiKRp9@cluster0.18pi3.mongodb.net/Wrencos?retryWrites=true&w=majority");
    console.log('🔗 Connected to MongoDB Atlas');
    
    console.log('🔍 Checking products with COGS fields...\n');
    
    // Check if any products have COGS fields
    const productsWithCOGS = await Product.find({
      $or: [
        { cost: { $exists: true } },
        { cogs: { $exists: true } },
        { margin: { $exists: true } }
      ]
    });
    
    console.log(`📦 Found ${productsWithCOGS.length} products with COGS fields:`);
    
    if (productsWithCOGS.length === 0) {
      console.log('   ✅ No products have COGS fields - they are already clean!');
      process.exit(0);
    }
    
    // Display products with COGS fields
    productsWithCOGS.forEach((product, i) => {
      console.log(`${i+1}. ${product.name}`);
      console.log(`   Price: $${product.price}`);
      if (product.cost !== undefined) console.log(`   Cost: $${product.cost}`);
      if (product.cogs !== undefined) console.log(`   COGS: $${product.cogs}`);
      if (product.margin !== undefined) console.log(`   Margin: ${product.margin}%`);
      console.log('');
    });
    
    console.log('🧹 Removing COGS fields from all products...\n');
    
    // Remove COGS fields from all products
    const result = await Product.updateMany(
      {},
      {
        $unset: {
          cost: "",
          cogs: "",
          margin: ""
        }
      }
    );
    
    console.log(`✅ Successfully removed COGS fields from ${result.modifiedCount} products!`);
    console.log(`📊 Update result: matched ${result.matchedCount}, modified ${result.modifiedCount}`);
    
    // Verify the removal
    console.log('\n🔍 Verifying removal...');
    const productsAfterCleanup = await Product.find({
      $or: [
        { cost: { $exists: true } },
        { cogs: { $exists: true } },
        { margin: { $exists: true } }
      ]
    });
    
    if (productsAfterCleanup.length === 0) {
      console.log('   ✅ All COGS fields successfully removed!');
      
      // Show a few products to confirm they only have basic fields
      const sampleProducts = await Product.find({}).limit(3);
      console.log('\n📋 Sample products after cleanup:');
      sampleProducts.forEach((product, i) => {
        console.log(`${i+1}. ${product.name} - Price: $${product.price} - Stock: ${product.stockQuantity}`);
      });
      
    } else {
      console.log(`   ⚠️  Warning: ${productsAfterCleanup.length} products still have COGS fields`);
    }
    
    console.log('\n🎉 Product cleanup completed! Products are now back to their original state.');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

removeProductCOGS();
