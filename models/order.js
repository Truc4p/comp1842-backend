const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Product Schema (embedded within Order)
const ProductSchema = new Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId, // Assumes referencing another collection of Products
    required: true,
    ref: "Product",
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
});

// Order Schema
const OrderSchema = new Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId, // Refers to the User collection
    required: true,
    ref: "User",
  },
  products: [ProductSchema], // Array of products, each with quantity and price

  paymentMethod: {
    type: String,
    enum: ["cash", "credit_card", "paypal"],
    required: true,
  },
  
  orderDate: {
    type: Date,
    default: Date.now,
  },

  status: {
    type: String,
    enum: ["pending", "processing", "shipped", "delivered"],
    default: "pending",
  },

  totalPrice: {
    type: Number,
    required: true,
    default: 0,
  },
});

const Order = mongoose.model("Order", OrderSchema);
module.exports = Order;