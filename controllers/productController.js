const Product = require("../models/product");

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
    const image = req.file ? req.file.path : null;

    const product = new Product({
      name: {
        en: name.en,
        vi: name.vi,
      },
      category: categoryId,
      image,
      price,
      description: {
        en: description.en,
        vi: description.vi,
      },
      stockQuantity,
    });

    // Log the product object
    console.log("Product to be saved:", product);

    await product.save();
    res.status(201).json(product);
  } catch (err) {
    console.error("Error creating product:", err); // Log the error
    res.status(500).send("Server Error");
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const { name, categoryId, price, description, stockQuantity } = req.body;
    const image = req.file ? req.file.path : null;

    const updateData = {
      name: {
        en: name.en,
        vi: name.vi,
      },
      category: categoryId,
      price,
      description: {
        en: description.en,
        vi: description.vi,
      },
      stockQuantity,
    };
    if (image) {
      updateData.image = image;
    }

    const product = await Product.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (product) {
      res.json(product);
    } else {
      res.status(404).send("Product not found");
    }
  } catch (err) {
    console.error("Error updating product:", err); // Log the error
    res.status(500).send("Server Error");
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (product) {
      res.status(204).send();
    } else {
      res.status(404).send("Product not found");
    }
  } catch (err) {
    console.error("Error deleting product:", err); // Log the error
    res.status(500).send("Server Error");
  }
};