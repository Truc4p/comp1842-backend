require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/product');
const Category = require('../models/category'); // Import Category model

async function updateProductsWithCOGS() {
  try {
    // Connect to MongoDB Atlas (same as investigation script)
    await mongoose.connect("mongodb+srv://mongo-api:7TZYsdhwiXhiKRp9@cluster0.18pi3.mongodb.net/Wrencos?retryWrites=true&w=majority");
    console.log('🔗 Connected to MongoDB Atlas');
    
    console.log('🔍 Fetching existing products...\n');
    
    const products = await Product.find({}).populate('category');
    console.log(`📦 Found ${products.length} products:`);
    
    if (products.length === 0) {
      console.log('   ❌ No products found');
      process.exit(0);
    }
    
    // Display current products
    products.forEach((product, i) => {
      console.log(`${i+1}. ${product.name} - Price: $${product.price} - Current COGS: $${product.cogs || 0} - Cost: $${product.cost || 0}`);
    });
    
    console.log('\n💼 Adding realistic COGS data to products...');
    
    // Add realistic COGS data based on product prices
    // Typically COGS is 40-70% of selling price for cosmetic products
    const updatedProducts = [];
    
    for (const product of products) {
      const price = product.price;
      
      // Calculate realistic COGS based on product price ranges
      let cogs, cost, margin;
      
      if (price <= 50) {
        // Lower-end products: 60-70% COGS
        cogs = Math.round(price * (0.60 + Math.random() * 0.10) * 100) / 100;
        cost = Math.round(cogs * 0.85 * 100) / 100; // Cost is typically lower than COGS
      } else if (price <= 150) {
        // Mid-range products: 50-60% COGS  
        cogs = Math.round(price * (0.50 + Math.random() * 0.10) * 100) / 100;
        cost = Math.round(cogs * 0.80 * 100) / 100;
      } else {
        // High-end products: 40-50% COGS
        cogs = Math.round(price * (0.40 + Math.random() * 0.10) * 100) / 100;
        cost = Math.round(cogs * 0.75 * 100) / 100;
      }
      
      margin = Math.round(((price - cogs) / price * 100) * 100) / 100;
      
      // Update the product
      const updatedProduct = await Product.findByIdAndUpdate(
        product._id,
        {
          cost: cost,
          cogs: cogs,
          margin: margin
        },
        { new: true }
      );
      
      updatedProducts.push(updatedProduct);
      console.log(`   ✅ ${product.name}: Cost: $${cost}, COGS: $${cogs}, Margin: ${margin}%`);
    }
    
    console.log(`\n🎉 Successfully updated ${updatedProducts.length} products with COGS data!`);
    
    // Show summary
    const totalValue = updatedProducts.reduce((sum, p) => sum + p.price, 0);
    const totalCogs = updatedProducts.reduce((sum, p) => sum + p.cogs, 0);
    const avgMargin = updatedProducts.reduce((sum, p) => sum + p.margin, 0) / updatedProducts.length;
    
    console.log(`\n📊 Product Portfolio Summary:`);
    console.log(`   Total Products: ${updatedProducts.length}`);
    console.log(`   Total Retail Value: $${totalValue.toFixed(2)}`);
    console.log(`   Total COGS: $${totalCogs.toFixed(2)}`);
    console.log(`   Average Margin: ${avgMargin.toFixed(2)}%`);
    console.log(`   Total Potential Profit: $${(totalValue - totalCogs).toFixed(2)}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

updateProductsWithCOGS();
