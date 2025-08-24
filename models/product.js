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
  // Deprecated: keeping for backward compatibility
  image: {
    type: String,
    required: false,
  },
  images: {
    type: [String], // Array of strings to store multiple image URLs or paths
    required: false, // Set to true if images are mandatory
    default: []
  },
  description: {
    type: String,
    required: false,
  },
  price: {
    type: Number,
    required: true,
  },
  stockQuantity: {
    type: Number,
    required: true,
    default: 0,
  },
});

// Virtual to handle backward compatibility
productSchema.virtual('allImages').get(function() {
  const images = [...this.images];
  if (this.image && !images.includes(this.image)) {
    images.unshift(this.image);
  }
  return images;
});

// Ensure virtual fields are serialized
productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });

const Product = mongoose.model("Product", productSchema);

module.exports = Product;