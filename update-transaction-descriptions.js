const mongoose = require('mongoose');
const CashFlowTransaction = require('./models/cashFlowTransaction');

// MongoDB connection string - using the same Atlas connection as the app
const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://mongo-api:7TZYsdhwiXhiKRp9@cluster0.18pi3.mongodb.net/Wrencos?retryWrites=true&w=majority";

/**
 * Update existing cash flow transaction descriptions to use consistent short format
 */
async function updateTransactionDescriptions() {
    try {
        console.log('🔄 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

                 // Find transactions that need updating to short format
         const oldFormatTransactions = await CashFlowTransaction.find({
             $or: [
                 { description: { $regex: /^Revenue from order [a-f0-9]{24}/ } },
                 { description: { $regex: /^Shipping cost for order [a-f0-9]{24}/ } },
                 { description: { $regex: /^Order #[a-f0-9]{6} - \d+ items$/ } },
                 { description: { $regex: /^Shipping cost for order #[a-f0-9]{6}$/ } }
             ]
         });

        console.log(`📊 Found ${oldFormatTransactions.length} transactions to update`);

        if (oldFormatTransactions.length === 0) {
            console.log('✅ No transactions need updating');
            return;
        }

        let updatedCount = 0;
        const updateResults = [];

                 for (const transaction of oldFormatTransactions) {
             try {
                 let newDescription = transaction.description;

                 // Update revenue transaction descriptions - remove item count
                 const revenueMatch1 = transaction.description.match(/^Revenue from order ([a-f0-9]{24}) - (\d+) items?$/);
                 const revenueMatch2 = transaction.description.match(/^Revenue from order ([a-f0-9]{24})$/);
                 
                 if (revenueMatch1) {
                     const orderId = revenueMatch1[1];
                     const shortId = orderId.slice(-6);
                     newDescription = `Order #${shortId}`;
                 } else if (revenueMatch2) {
                     const orderId = revenueMatch2[1];
                     const shortId = orderId.slice(-6);
                     newDescription = `Order #${shortId}`;
                 }

                 // Update shipping cost descriptions - remove "Shipping cost for" prefix
                 const shippingMatch1 = transaction.description.match(/^Shipping cost for order ([a-f0-9]{24})$/);
                 const shippingMatch2 = transaction.description.match(/^Shipping cost for order #([a-f0-9]{6})$/);
                 
                 if (shippingMatch1) {
                     const orderId = shippingMatch1[1];
                     const shortId = orderId.slice(-6);
                     newDescription = `Order #${shortId}`;
                 } else if (shippingMatch2) {
                     const shortId = shippingMatch2[1];
                     newDescription = `Order #${shortId}`;
                 }

                 // Update existing "Order #xxx - Y items" format to just "Order #xxx"
                 const orderWithItemsMatch = transaction.description.match(/^Order #([a-f0-9]{6}) - \d+ items$/);
                 if (orderWithItemsMatch) {
                     const shortId = orderWithItemsMatch[1];
                     newDescription = `Order #${shortId}`;
                 }

                if (newDescription !== transaction.description) {
                    await CashFlowTransaction.findByIdAndUpdate(
                        transaction._id,
                        { description: newDescription }
                    );

                    updatedCount++;
                    updateResults.push({
                        id: transaction._id,
                        old: transaction.description,
                        new: newDescription,
                        success: true
                    });

                    console.log(`✅ Updated: "${transaction.description}" → "${newDescription}"`);
                }
            } catch (error) {
                console.error(`❌ Error updating transaction ${transaction._id}:`, error);
                updateResults.push({
                    id: transaction._id,
                    old: transaction.description,
                    error: error.message,
                    success: false
                });
            }
        }

        console.log(`\n🎉 Update complete!`);
        console.log(`✅ Successfully updated: ${updatedCount} transactions`);
        console.log(`❌ Failed updates: ${updateResults.filter(r => !r.success).length}`);

        // Show summary
        if (updatedCount > 0) {
            console.log('\n📋 Sample updates:');
            updateResults.filter(r => r.success).slice(0, 5).forEach(result => {
                console.log(`   "${result.old}" → "${result.new}"`);
            });
        }

    } catch (error) {
        console.error('❌ Script error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
}

// Run the script
if (require.main === module) {
    updateTransactionDescriptions()
        .then(() => {
            console.log('✅ Script completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Script failed:', error);
            process.exit(1);
        });
}

module.exports = { updateTransactionDescriptions };
