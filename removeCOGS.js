require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./models/product');
const Category = require('./models/category');

async function removeCOGSFromProducts() {
  try {
    // Connect to MongoDB Atlas
    await mongoose.connect("mongodb+srv://mongo-api:7TZYsdhwiXhiKRp9@cluster0.18pi3.mongodb.net/Wrencos?retryWrites=true&w=majority");
    console.log('🔗 Connected to MongoDB Atlas');
    
    console.log('🔍 Removing COGS fields from products...\n');
    
    // Remove COGS fields from all products
    const result = await Product.updateMany(
      {}, // Match all products
      { 
        $unset: { 
          cost: "",
          cogs: "", 
          margin: "" 
        } 
      }
    );
    
    console.log(`✅ Successfully removed COGS fields from ${result.modifiedCount} products`);
    
    // Verify the cleanup
    const products = await Product.find({}).limit(3);
    console.log('\n📦 Sample products after cleanup:');
    products.forEach((product, i) => {
      console.log(`${i+1}. ${product.name} - Price: $${product.price}`);
      console.log(`   Cost: ${product.cost || 'undefined'}, COGS: ${product.cogs || 'undefined'}, Margin: ${product.margin || 'undefined'}`);
    });
    
    console.log('\n🎉 COGS fields successfully removed from all products!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

removeCOGSFromProducts();
