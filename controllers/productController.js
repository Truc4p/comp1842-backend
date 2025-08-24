const Product = require("../models/product");
const fs = require("fs");
const path = require("path");

// Utility function to delete old image file
const deleteImageFile = (imagePath) => {
  if (imagePath) {
    const fullPath = path.join(__dirname, '../', imagePath);
    fs.unlink(fullPath, (err) => {
      if (err) {
        console.error('Error deleting old image file:', err);
      } else {
        console.log('Old image file deleted successfully:', imagePath);
      }
    });
  }
};

// Utility function to delete multiple image files
const deleteImageFiles = (imagePaths) => {
  if (imagePaths && Array.isArray(imagePaths)) {
    imagePaths.forEach(imagePath => {
      deleteImageFile(imagePath);
    });
  }
};

exports.getAllProducts = async (req, res) => {
  try {
    const products = await Product.find().populate("category");
    res.json(products);
  } catch (err) {
    res.status(500).send("Server Error");
  }
};

exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate("category");
    if (product) {
      res.json(product);
    } else {
      res.status(404).send("Product not found");
    }
  } catch (err) {
    res.status(500).send("Server Error");
  }
};

exports.createProduct = async (req, res) => {
  try {
    const { name, categoryId, price, description, stockQuantity } = req.body;
    const images = req.files ? req.files.map(file => file.path) : [];

    // Set the first image as the main image for backward compatibility
    const image = images.length > 0 ? images[0] : null;

    const product = new Product({ 
      name, 
      category: categoryId, 
      images, 
      image, // Set backward compatibility field
      price, 
      description, 
      stockQuantity 
    });
    await product.save();
    res.status(201).json(product);
  } catch (err) {
    // If product creation fails and we have uploaded files, clean them up
    if (req.files && req.files.length > 0) {
      deleteImageFiles(req.files.map(file => file.path));
    }
    res.status(500).send("Server Error");
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const { name, categoryId, price, description, stockQuantity } = req.body;
    const newImages = req.files ? req.files.map(file => file.path) : [];

    // First, get the current product to access the old image paths
    const currentProduct = await Product.findById(req.params.id);
    if (!currentProduct) {
      // If new images were uploaded but product not found, clean up the uploaded files
      if (newImages.length > 0) {
        deleteImageFiles(newImages);
      }
      return res.status(404).send("Product not found");
    }

    const updateData = { name, category: categoryId, price, description, stockQuantity };
    
    // If new images are uploaded, handle the old images deletion
    if (newImages.length > 0) {
      // Set the new image paths
      updateData.images = newImages;
      // Set the first image as the main image for backward compatibility
      updateData.image = newImages[0];
    }

    // Update the product in database
    const product = await Product.findByIdAndUpdate(req.params.id, updateData, { new: true });
    
    // Only delete the old images after successful database update
    if (newImages.length > 0) {
      if (currentProduct.images && currentProduct.images.length > 0) {
        deleteImageFiles(currentProduct.images);
      }
      // Handle backward compatibility - delete old single image if it exists
      if (currentProduct.image) {
        deleteImageFile(currentProduct.image);
      }
    }
    
    res.json(product);
  } catch (err) {
    console.error("Error updating product:", err);
    
    // If database update failed and we have new images, clean them up
    if (req.files && req.files.length > 0) {
      deleteImageFiles(req.files.map(file => file.path));
    }
    
    res.status(500).send("Server Error");
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).send("Product not found");
    }

    // Delete the associated image files if they exist
    if (product.images && product.images.length > 0) {
      deleteImageFiles(product.images);
    }
    
    // Handle backward compatibility - delete old single image if it exists
    if (product.image) {
      deleteImageFile(product.image);
    }

    // Delete the product from database
    await Product.findByIdAndDelete(req.params.id);
    res.status(204).send();
  } catch (err) {
    console.error("Error deleting product:", err);
    res.status(500).send("Server Error");
  }
};