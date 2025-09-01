require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./models/product');

async function removeProductCOGSForce() {
  try {
    // Connect to MongoDB Atlas
    await mongoose.connect("mongodb+srv://mongo-api:7TZYsdhwiXhiKRp9@cluster0.18pi3.mongodb.net/Wrencos?retryWrites=true&w=majority");
    console.log('🔗 Connected to MongoDB Atlas');
    
    console.log('🔍 Checking products with COGS fields...\n');
    
    // Get all products and manually remove COGS fields
    const allProducts = await Product.find({});
    console.log(`📦 Found ${allProducts.length} total products`);
    
    let updatedCount = 0;
    
    for (const product of allProducts) {
      let needsUpdate = false;
      const updateData = {};
      
      // Check which COGS fields exist and prepare to remove them
      if (product.cost !== undefined) {
        updateData.cost = undefined;
        needsUpdate = true;
      }
      if (product.cogs !== undefined) {
        updateData.cogs = undefined;
        needsUpdate = true;
      }
      if (product.margin !== undefined) {
        updateData.margin = undefined;
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        console.log(`🧹 Cleaning ${product.name}...`);
        
        // Use findByIdAndUpdate with $unset for each field
        await Product.findByIdAndUpdate(
          product._id,
          {
            $unset: {
              cost: 1,
              cogs: 1,
              margin: 1
            }
          }
        );
        updatedCount++;
      }
    }
    
    console.log(`\n✅ Successfully cleaned ${updatedCount} products!`);
    
    // Verify the removal
    console.log('\n🔍 Final verification...');
    const productsWithCOGS = await Product.find({
      $or: [
        { cost: { $exists: true } },
        { cogs: { $exists: true } },
        { margin: { $exists: true } }
      ]
    });
    
    if (productsWithCOGS.length === 0) {
      console.log('   ✅ All COGS fields successfully removed!');
      
      // Show sample products to confirm
      const sampleProducts = await Product.find({}).limit(3);
      console.log('\n📋 Sample products after cleanup:');
      sampleProducts.forEach((product, i) => {
        console.log(`${i+1}. ${product.name}`);
        console.log(`   Price: $${product.price}`);
        console.log(`   Stock: ${product.stockQuantity}`);
        console.log(`   Category: ${product.category}`);
        console.log(`   Has cost field: ${product.cost !== undefined}`);
        console.log(`   Has cogs field: ${product.cogs !== undefined}`);
        console.log(`   Has margin field: ${product.margin !== undefined}`);
        console.log('');
      });
      
    } else {
      console.log(`   ⚠️  Warning: ${productsWithCOGS.length} products still have COGS fields`);
      productsWithCOGS.forEach(product => {
        console.log(`   - ${product.name} still has: ${Object.keys(product.toObject()).filter(k => ['cost', 'cogs', 'margin'].includes(k)).join(', ')}`);
      });
    }
    
    console.log('\n🎉 Product cleanup completed!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

removeProductCOGSForce();
