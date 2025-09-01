const CashFlowTransaction = require("../models/cashFlowTransaction");

/**
 * 🚀 CLEAN REVENUE-ONLY INTEGRATION
 * 
 * Automatically creates cash flow entries for completed orders
 * WITHOUT artificial COGS or shipping costs.
 * Only records actual revenue when orders are completed.
 */

/**
 * Generate clean revenue transaction for completed order
 * @param {Object} order - The completed order object
 * @returns {Object} Created transaction
 */
const generateRevenueTransaction = async (order) => {
  try {
    console.log(`💰 Creating revenue transaction for completed order ${order._id}`);
    
    // Create INFLOW transaction: Actual Revenue Only
    const revenueTransaction = new CashFlowTransaction({
      type: 'inflow',
      category: 'product_sales',
      amount: order.totalPrice,
      description: `Order #${order._id.toString().slice(-6)} - ${order.products.length} items`,
      orderId: order._id,
      date: order.orderDate || new Date(), // Use actual order date
      automated: true // Mark as automated but clean
    });
    
    const savedTransaction = await revenueTransaction.save();
    
    console.log(`✅ Revenue transaction created: $${order.totalPrice} from order ${order._id}`);
    
    return {
      revenue: savedTransaction,
      message: `Revenue transaction created: $${order.totalPrice}`
    };
    
  } catch (error) {
    console.error(`❌ Error creating revenue transaction for order ${order._id}:`, error);
    throw error;
  }
};

/**
 * Sync all existing completed orders to cash flow
 * (One-time migration function)
 */
const syncCompletedOrdersTocashFlow = async () => {
  try {
    const Order = require("../models/order");
    
    console.log("🔄 Syncing existing completed orders to cash flow...");
    
    // Find completed orders that don't have cash flow transactions yet
    const completedOrders = await Order.find({ status: 'completed' });
    
    const existingTransactions = await CashFlowTransaction.find({ 
      orderId: { $exists: true },
      automated: true 
    });
    
    const existingOrderIds = existingTransactions.map(t => t.orderId?.toString());
    
    const ordersToSync = completedOrders.filter(order => 
      !existingOrderIds.includes(order._id.toString())
    );
    
    console.log(`📊 Found ${completedOrders.length} completed orders, ${ordersToSync.length} need syncing`);
    
    const results = [];
    for (const order of ordersToSync) {
      try {
        const transaction = await generateRevenueTransaction(order);
        results.push({
          orderId: order._id,
          amount: order.totalPrice,
          success: true,
          transaction: transaction.revenue._id
        });
      } catch (error) {
        console.error(`❌ Failed to sync order ${order._id}:`, error);
        results.push({
          orderId: order._id,
          amount: order.totalPrice,
          success: false,
          error: error.message
        });
      }
    }
    
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    console.log(`✅ Sync complete: ${successful.length} synced, ${failed.length} failed`);
    
    return {
      synced: successful.length,
      failed: failed.length,
      totalRevenue: successful.reduce((sum, r) => sum + r.amount, 0),
      results
    };
    
  } catch (error) {
    console.error("❌ Error in sync operation:", error);
    throw error;
  }
};

module.exports = {
  generateRevenueTransaction,
  syncCompletedOrdersTocashFlow
};
