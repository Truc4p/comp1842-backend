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
    const { products, paymentMethod, status, totalPrice } = req.body;
    console.log("Products from request body:", products);
    console.log("Payment method from request body:", paymentMethod);
    console.log("Status from request body:", status);
    console.log("Total price from request body:", totalPrice);

    if (!products || !paymentMethod || !totalPrice) {
      return res.status(400).send({ error: 'Products, payment method, and total price are required' });
    }

    const userId = req.user.id;
    console.log("User ID from request:", userId);

    const user = req.user;
    console.log("User:", user);

    const order = new Order({
      user: userId,
      products,
      paymentMethod,
      status: status || "pending",
      totalPrice,
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

// // User Operation: Edit an Order
// exports.updateOrder = async (req, res) => {
//   try {
//     const { products, status, totalPrice } = req.body;
//     const orderId = req.params.id;
//     console.log("order ID from request body:", orderId);

//     const userId = req.user.id;
//     console.log("Admin ID from request:", userId);

//     const user = req.user;
//     console.log("Admin:", user);

//     const updateData = { products, status, totalPrice };

//     let query = { _id: orderId };
//     if (user.role !== 'admin') {
//       query.user = userId;
//     }

//     const order = await Order.findOneAndUpdate(query, updateData, { new: true });

//     if (order) {
//       console.log("Order updated successfully:", order);
//       res.json(order);
//     } else {
//       console.log("Order not found");
//       res.status(404).send("Order not found");
//     }
//   } catch (err) {
//     console.error("Error updating order:", err);
//     res.status(500).send("Server Error");
//   }
// };

// User Operation: Update Order Status
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const orderId = req.params.id;

    console.log("Order ID:", orderId);
    console.log("New status:", status);

    const userId = req.user.id;
    console.log("User ID:", userId);

    const user = req.user;
    console.log("User:", user);

    // Define the query
    let query = { _id: orderId };
    if (user.role !== 'admin') {
      query.user = userId;
    }
    
    const order = await Order.findOneAndUpdate(query, { status }, { new: true });

    if (order) {
      console.log("Order status updated successfully:", order);
      res.json(order);
    } else {
      console.log("Order not found");
      res.status(404).send("Order not found");
    }
  } catch (err) {
    console.error("Error updating order status:", err);
    res.status(500).send("Server Error");
  }
};

// User Operation: Delete an Order
exports.deleteOrderByCustomer = async (req, res) => {
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

// User Operation: Delete an Order
exports.deleteOrderByAdmin = async (req, res) => {
  try {
    const orderId = req.params.id;

    console.log("Order ID:", orderId);

    const order = await Order.findOneAndDelete({ _id: orderId });

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

// User Operation: Get all Orders by Username or User ID
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

// User Operation: Get an Order by OrderID
exports.getOrderByOrderId = async (req, res) => {
  try {
    const orderId = req.params.id;

    console.log("Order ID:", orderId);

    const order = await Order.findOne({ _id: orderId }).populate("products.productId");

    if (order) {
      console.log("Order retrieved successfully:", order);
      res.json(order);
    } else {
      console.log("Order not found");
      res.status(404).send("Order not found");
    }
  } catch (err) {
    console.error("Error retrieving order:", err);
    res.status(500).send("Server Error");
  }
};

// User Operation: Get all Orders by User ID
exports.getOrdersByUserId = async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    const orders = await Order.find({ user: user._id }).populate("products.productId");
    res.json(orders);
  } catch (err) {
    res.status(500).send("Server Error");
  }
};