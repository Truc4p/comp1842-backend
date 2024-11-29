const Order = require("../models/order");
const Product = require("../models/product");
const User = require("../models/user");

// Admin Operation: Get all Orders
exports.getAllOrders = async (req, res) => {
  const user = req.user;

  if (user.role == "admin") {
    try {
      const orders = await Order.find().populate("user").populate("products.productId");
      return res.json(orders);
    } catch (err) {
      return res.status(500).send("Server Error");
    }
  } else {
    try {
      const orders = await Order.find({ user: user.id }).populate("user").populate("products.productId");
      return res.json(orders);
    } catch (err) {
      return res.status(500).send("Server Error");
    }
  }
};

// User Operation: Create an Order
exports.createOrder = async (req, res) => {
  try {
    const { products, paymentMethod } = req.body;
    console.log("Products from request body:", products);
    console.log("Payment method from request body:", paymentMethod);

    if (!products || !paymentMethod) {
      return res.status(400).send({ error: 'Products and payment method are required' });
    }

    const userId = req.user.id;
    console.log("User ID from request:", userId);

    const user = req.user;
    console.log("User:", user);

    const order = new Order({
      user: userId,
      products,
      paymentMethod,
      orderDate: new Date(),
    });

    await order.save();
    console.log("Order to be saved:", order);
    res.status(201).send(order);
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).send({ error: 'Internal Server Error' });
  }
};

// User Operation: Edit an Order
exports.updateOrder = async (req, res) => {
  try {
    const { products } = req.body;
    const orderId = req.params.id;

    const userId = req.user.id;
    console.log("User ID from request:", userId);

    const user = req.user;
    console.log("User:", user);

    console.log("Request Body:", req.body);
    console.log("Order ID:", orderId);
    console.log("User ID:", userId);

    const order = await Order.findOneAndUpdate(
      { _id: orderId, user: userId },
      { products },
      { new: true }
    );

    if (order) {
      console.log("Order updated successfully:", order);
      res.json(order);
    } else {
      console.log("Order not found");
      res.status(404).send("Order not found");
    }
  } catch (err) {
    console.error("Error updating order:", err);
    res.status(500).send("Server Error");
  }
};

// User Operation: Delete an Order
exports.deleteOrder = async (req, res) => {
  try {
    const orderId = req.params.id;
    const userId = req.user.id;

    console.log("Order ID:", orderId);
    console.log("User ID:", userId);

    const order = await Order.findOneAndDelete({ _id: orderId, user: userId });

    if (order) {
      console.log("Order deleted successfully:", order);
      res.status(204).send();
    } else {
      console.log("Order not found");
      res.status(404).send("Order not found");
    }
  } catch (err) {
    console.error("Error deleting order:", err);
    res.status(500).send("Server Error");
  }
};

// User Operation: Get all Orders by User ID
exports.getOrdersByUser = async (req, res) => {
  try {
    const { id, username } = req.query;

    let user;
    if (id) {
      user = await User.findById(id);
    } else if (username) {
      user = await User.findOne({ username });
    }

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    const orders = await Order.find({ user: user._id }).populate("products.productId");
    res.json(orders);
  } catch (err) {
    res.status(500).send("Server Error");
  }
};

