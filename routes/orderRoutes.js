const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");
const auth = require("../middleware/auth");
const role = require("../middleware/role");

/**
 * @swagger
 * tags:
 *   name: Orders
 *   description: Order management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Order:
 *       type: object
 *       required:
 *         - user
 *         - products
 *         - paymentMethod
 *       properties:
 *         user:
 *           type: string
 *           description: The user ID
 *         products:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               productId:
 *                 type: string
 *                 description: The product ID
 *               quantity:
 *                 type: integer
 *                 description: The quantity of the product
 *         paymentMethod:
 *           type: string
 *           enum: ["cash", "credit_card", "paypal"]
 *           description: The payment method
 *         status:
 *           type: string
 *           enum: ["pending", "processing", "shipped", "delivered"]
 *           description: The order status
 *         totalPrice:
 *           type: number
 *           description: The total price of the order
 *       example:
 *         user: "60d0fe4f5311236168a109ca"
 *         products:
 *           - productId: "60d0fe4f5311236168a109cb"
 *             quantity: 2
 *         paymentMethod: "credit_card"
 *         status: "pending"
 *         totalPrice: 100.0
 */

/**
 * @swagger
 * /orders:
 *   get:
 *     summary: Retrieve a list of orders
 *     tags: [Orders]
 *     responses:
 *       200:
 *         description: A list of orders
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Order'
 */
router.get("/", auth, role(["admin", "customer"]), orderController.getAllOrders);

/**
 * @swagger
 * /orders:
 *   post:
 *     summary: Create a new order
 *     tags: [Orders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Order'
 *     responses:
 *       201:
 *         description: The created order
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Order'
 */
router.post("/", auth, role(["customer"]), orderController.createOrder);

/**
 * @swagger
 * /orders/{id}:
 *   put:
 *     summary: Update an existing order
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Order'
 *     responses:
 *       200:
 *         description: The updated order
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Order'
 *       404:
 *         description: Order not found
 */
router.put("/:id", auth, role(["admin"]), orderController.updateOrderStatus);

/**
 * @swagger
 * /orders/{id}:
 *   delete:
 *     summary: Delete an order
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The order ID
 *     responses:
 *       204:
 *         description: No content
 *       404:
 *         description: Order not found
 */
router.delete("/:id", auth, role(["customer"]), orderController.deleteOrderByCustomer);

/**
 * @swagger
 * /orders/admin/{id}:
 *   delete:
 *     summary: Delete an order
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The order ID
 *     responses:
 *       204:
 *         description: No content
 *       404:
 *         description: Order not found
 */
router.delete("/admin/:id", auth, role(["admin"]), orderController.deleteOrderByAdmin);

/**
 * @swagger
 * /orders/user/{id}:
 *   get:
 *     summary: Retrieve orders by user ID or username
 *     tags: [Orders]
 *     parameters:
 *       - in: query
 *         name: id
 *         schema:
 *           type: string
 *         required: false
 *         description: The user ID
 *       - in: query
 *         name: username
 *         schema:
 *           type: string
 *         required: false
 *         description: The username
 *     responses:
 *       200:
 *         description: A list of orders
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Order'
 */
router.get("/user/:id", auth, role(["admin", "customer"]), orderController.getOrdersByUserId);

/**
 * @swagger
 * /orders/order/{id}:
 *   get:
 *     summary: Retrieve an order by order ID
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The order ID
 *     responses:
 *       200:
 *         description: The order details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Order'
 *       404:
 *         description: Order not found
 */
router.get("/order/:id", auth, role(["admin", "customer"]), orderController.getOrderByOrderId);

module.exports = router;