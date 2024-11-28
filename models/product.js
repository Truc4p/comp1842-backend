const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  name: {
    en: {
      type: String,
      required: true,
    },
    vi: {
      type: String,
      required: true,
    },
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
    en: {
      type: String,
      required: false,
    },
    vi: {
      type: String,
      required: false,
    },
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

const Product = mongoose.model("Product", productSchema);

module.exports = Product;