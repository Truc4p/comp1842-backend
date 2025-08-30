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
    const { 
      name, 
      categoryId, 
      price, 
      description, 
      stockQuantity,
      ingredients,
      skinType,
      benefits,
      tags,
      usage,
      skinConcerns
    } = req.body;
    const image = req.file ? req.file.path : null;

    // Debug logging
    console.log('Raw request body fields:');
    console.log('ingredients:', ingredients);
    console.log('skinType:', skinType);
    console.log('benefits:', benefits);
    console.log('tags:', tags);
    console.log('usage:', usage);
    console.log('skinConcerns:', skinConcerns);

    // Parse JSON strings for array fields
    const parsedIngredients = ingredients ? JSON.parse(ingredients) : [];
    const parsedSkinType = skinType ? JSON.parse(skinType) : [];
    const parsedBenefits = benefits ? JSON.parse(benefits) : [];
    const parsedTags = tags ? JSON.parse(tags) : [];
    const parsedSkinConcerns = skinConcerns ? JSON.parse(skinConcerns) : [];

    console.log('Parsed fields:');
    console.log('parsedIngredients:', parsedIngredients);
    console.log('parsedSkinType:', parsedSkinType);
    console.log('parsedBenefits:', parsedBenefits);
    console.log('parsedTags:', parsedTags);
    console.log('parsedSkinConcerns:', parsedSkinConcerns);

    const product = new Product({ 
      name, 
      category: categoryId, 
      image, 
      price, 
      description, 
      stockQuantity,
      ingredients: parsedIngredients,
      skinType: parsedSkinType,
      benefits: parsedBenefits,
      tags: parsedTags,
      usage,
      skinConcerns: parsedSkinConcerns
    });
    
    console.log('Product object before save:', product);
    await product.save();
    console.log('Product saved successfully:', product._id);
    res.status(201).json(product);
  } catch (err) {
    console.error("Error creating product:", err);
    // If product creation fails and we have uploaded file, clean it up
    if (req.file) {
      deleteImageFile(req.file.path);
    }
    res.status(500).send("Server Error");
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const { 
      name, 
      categoryId, 
      price, 
      description, 
      stockQuantity,
      ingredients,
      skinType,
      benefits,
      tags,
      usage,
      skinConcerns
    } = req.body;
    const newImage = req.file ? req.file.path : null;

    // First, get the current product to access the old image path
    const currentProduct = await Product.findById(req.params.id);
    if (!currentProduct) {
      // If new image was uploaded but product not found, clean up the uploaded file
      if (newImage) {
        deleteImageFile(newImage);
      }
      return res.status(404).send("Product not found");
    }

    // Parse JSON strings for array fields
    const parsedIngredients = ingredients ? JSON.parse(ingredients) : [];
    const parsedSkinType = skinType ? JSON.parse(skinType) : [];
    const parsedBenefits = benefits ? JSON.parse(benefits) : [];
    const parsedTags = tags ? JSON.parse(tags) : [];
    const parsedSkinConcerns = skinConcerns ? JSON.parse(skinConcerns) : [];

    const updateData = { 
      name, 
      category: categoryId, 
      price, 
      description, 
      stockQuantity,
      ingredients: parsedIngredients,
      skinType: parsedSkinType,
      benefits: parsedBenefits,
      tags: parsedTags,
      usage,
      skinConcerns: parsedSkinConcerns
    };
    
    // If new image is uploaded, handle the old image deletion
    if (newImage) {
      // Set the new image path
      updateData.image = newImage;
    }

    // Update the product in database
    const product = await Product.findByIdAndUpdate(req.params.id, updateData, { new: true });
    
    // Only delete the old image after successful database update
    if (newImage && currentProduct.image) {
      deleteImageFile(currentProduct.image);
    }
    
    res.json(product);
  } catch (err) {
    console.error("Error updating product:", err);
    
    // If database update failed and we have new image, clean it up
    if (req.file) {
      deleteImageFile(req.file.path);
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

    // Delete the associated image file if it exists
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