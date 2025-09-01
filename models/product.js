const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
    required: true,
  },
  image: {
    type: String, // use String to store the URL or path of the image
    required: false, // Set to true if the image is mandatory
  },
  description: {
    type: String,
    required: false,
  },
  price: {
    type: Number,
    required: true,
  },
  // COGS (Cost of Goods Sold) fields for financial tracking
  cost: {
    type: Number,
    required: false,
    default: 0,
    min: 0,
    comment: "Actual cost to produce/acquire this product"
  },
  cogs: {
    type: Number,
    required: false,
    default: 0,
    min: 0,
    comment: "Cost of goods sold per unit (may include additional costs)"
  },
  margin: {
    type: Number,
    required: false,
    min: 0,
    max: 100,
    comment: "Profit margin percentage (calculated or manual)"
  },
  stockQuantity: {
    type: Number,
    required: true,
    default: 0,
  },
  // Additional fields for AI assistant
  ingredients: [{
    type: String,
    lowercase: true,
  }],
  skinType: [{
    type: String,
    enum: ['oily', 'dry', 'combination', 'sensitive', 'normal', 'all'],
    lowercase: true,
  }],
  benefits: [{
    type: String,
    lowercase: true,
  }],
  tags: [{
    type: String,
    lowercase: true,
  }],
  usage: {
    type: String,
  },
  skinConcerns: [{
    type: String,
    enum: ['acne', 'aging', 'dark-spots', 'wrinkles', 'dryness', 'sensitivity', 'dullness', 'pores', 'uneven-tone'],
    lowercase: true,
  }],
});

// Create text index for better search
productSchema.index({ 
  name: 'text', 
  description: 'text', 
  ingredients: 'text', 
  benefits: 'text', 
  tags: 'text',
  usage: 'text'
});

const Product = mongoose.model("Product", productSchema);

module.exports = Product;