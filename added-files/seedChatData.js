require('dotenv').config();
const mongoose = require('mongoose');
const FAQ = require('../models/faq');
const Product = require('../models/product');
const Category = require('../models/category');

// Connect to MongoDB
const connectDB = require('../db');

async function seedDatabase() {
  try {
    await connectDB();
    console.log('Connected to MongoDB');

    // Clear existing data
    await FAQ.deleteMany({});
    console.log('Cleared existing FAQs');

    // Seed FAQs
    const faqs = [
      {
        question: "What skin type are Wrencos products suitable for?",
        answer: "Wrencos products are formulated for all skin types including sensitive, oily, dry, combination, and normal skin. Each product specifies its recommended skin types in the description.",
        category: "products",
        tags: ["skin type", "suitability", "general"],
        priority: 10
      },
      {
        question: "How do I determine my skin type?",
        answer: "To determine your skin type, wash your face with a gentle cleanser and wait 30 minutes. If your skin feels tight and looks flaky, you have dry skin. If it's shiny all over, you have oily skin. If only your T-zone is oily, you have combination skin. If you rarely break out and your skin feels comfortable, you have normal skin.",
        category: "skincare",
        tags: ["skin type", "consultation", "guide"],
        priority: 9
      },
      {
        question: "What is your return policy?",
        answer: "We offer a 30-day return policy for unopened products in original packaging. For opened products, we accept returns within 14 days if you're not satisfied. Please contact our customer service for return authorization.",
        category: "returns",
        tags: ["return", "policy", "refund"],
        priority: 8
      },
      {
        question: "How long does shipping take?",
        answer: "Standard shipping takes 3-5 business days within the country. Express shipping is available for 1-2 business days delivery. International shipping takes 7-14 business days depending on the destination.",
        category: "shipping",
        tags: ["shipping", "delivery", "timeline"],
        priority: 8
      },
      {
        question: "Are Wrencos products cruelty-free?",
        answer: "Yes! All Wrencos products are 100% cruelty-free. We never test on animals and only work with suppliers who share our commitment to ethical practices.",
        category: "products",
        tags: ["cruelty-free", "ethics", "animals"],
        priority: 7
      },
      {
        question: "What ingredients should I avoid if I have sensitive skin?",
        answer: "If you have sensitive skin, avoid products with alcohol, artificial fragrances, sulfates, and harsh acids like glycolic acid. Look for gentle ingredients like hyaluronic acid, ceramides, and niacinamide.",
        category: "skincare",
        tags: ["sensitive skin", "ingredients", "avoid"],
        priority: 7
      },
      {
        question: "How should I layer my skincare products?",
        answer: "Apply products from thinnest to thickest consistency: cleanser, toner, serum, moisturizer, and sunscreen (in the morning). Wait 30 seconds between each layer for better absorption.",
        category: "skincare",
        tags: ["routine", "layering", "order"],
        priority: 6
      },
      {
        question: "Do you offer international shipping?",
        answer: "Yes, we ship to most countries worldwide. Shipping costs and delivery times vary by destination. Some restrictions may apply to certain products due to local regulations.",
        category: "shipping",
        tags: ["international", "worldwide", "shipping"],
        priority: 6
      },
      {
        question: "What is the shelf life of Wrencos products?",
        answer: "Unopened Wrencos products have a shelf life of 2-3 years. Once opened, most products should be used within 6-12 months. Check the PAO (Period After Opening) symbol on the packaging for specific guidance.",
        category: "products",
        tags: ["shelf life", "expiry", "storage"],
        priority: 5
      },
      {
        question: "Can I use multiple serums together?",
        answer: "Yes, you can use multiple serums, but introduce them gradually. Use different serums at different times (morning/evening) or on alternate days to avoid irritation. Always patch test new combinations.",
        category: "skincare",
        tags: ["serums", "combination", "layering"],
        priority: 5
      }
      ,
      {
        question: "How do I change my shipping address after placing an order?",
        answer: "If your order hasn't shipped yet, contact customer service as soon as possible with your order number and the new address. We'll attempt to update it before dispatch. Once shipped, the address cannot be changed and you'll need to follow the carrier's instructions or request a return.",
        category: "orders",
        tags: ["address", "change", "shipping"],
        priority: 9
      },
      {
        question: "Can I cancel or modify my order after it's been placed?",
        answer: "Orders can be canceled or modified within 30 minutes of placement while they are still in 'processing' status. Please contact customer support immediately with your order number. If the order has already been packed or shipped, you'll need to process a return instead.",
        category: "orders",
        tags: ["cancel", "modify", "order status"],
        priority: 9
      },
      {
        question: "How do I start a return?",
        answer: "To start a return, open the Orders page in your account, select the order and the item(s) you'd like to return, and click 'Request Return'. Follow the instructions to print a return label or arrange carrier pickup. If you don't have an account, contact our support team with your order number.",
        category: "returns",
        tags: ["start return", "return label", "process"],
        priority: 8
      },
      {
        question: "When will I receive my refund?",
        answer: "Refunds are processed within 3-7 business days after we receive and inspect the returned item. The exact time for the funds to appear depends on your payment provider and bank.",
        category: "returns",
        tags: ["refund", "timeline", "returns"],
        priority: 8
      },
      {
        question: "Are return shipping costs covered?",
        answer: "Return shipping costs are covered for items returned due to our error (wrong or damaged items). For voluntary returns, customers are responsible for return shipping unless a return promotion or free return policy is in effect for that order.",
        category: "returns",
        tags: ["return shipping", "costs", "policy"],
        priority: 7
      },
      {
        question: "How long does standard shipping cost and delivery take?",
        answer: "Standard shipping cost depends on your location and order weight; rates are calculated at checkout. Delivery typically takes 3-5 business days within the country. You can view exact shipping costs and options at checkout before placing your order.",
        category: "shipping",
        tags: ["cost", "shipping rates", "delivery time"],
        priority: 8
      },
      {
        question: "How can I track my order?",
        answer: "After your order ships, we'll email you a tracking number and carrier link. You can also go to your Orders page, open the order, and click 'Track Shipment' to view the latest updates.",
        category: "orders",
        tags: ["track", "tracking", "shipment"],
        priority: 10
      },
      {
        question: "Why haven't I received my package?",
        answer: "First, check around your delivery location (porch, garage, neighbor). If you still can't find it, contact the carrier with the tracking number. If the carrier confirms loss or can't locate it, contact our customer support and we'll open an investigation.",
        category: "orders",
        tags: ["missing", "delivered", "investigation"],
        priority: 9
      },
      {
        question: "How do I choose the right product size or variant?",
        answer: "Product pages include size/variant information and usage guidance. Check the size chart (if available) and the product description for recommended usage. If you're unsure, use our product filters by skin type or contact our support for personalized advice.",
        category: "products",
        tags: ["size", "variant", "fit"],
        priority: 7
      },
      {
        question: "Are product samples available?",
        answer: "We occasionally offer samples with qualifying purchases or as part of promotions. When samples are available they are shown on the product page or applied automatically at checkout for eligible orders.",
        category: "products",
        tags: ["samples", "trial", "promotion"],
        priority: 6
      }
    ];

    await FAQ.insertMany(faqs);
    console.log('✅ Seeded FAQs successfully');

    // Update existing products with additional fields for better AI search
    const existingProducts = await Product.find();
    
    if (existingProducts.length > 0) {
      // Sample data for enhancing existing products
      const productEnhancements = [
        {
          ingredients: ["hyaluronic acid", "vitamin c", "niacinamide"],
          skinType: ["all", "dry", "normal"],
          benefits: ["hydration", "brightening", "anti-aging"],
          tags: ["serum", "daily use", "morning routine"],
          skinConcerns: ["dryness", "dullness", "aging"],
          usage: "Apply 2-3 drops to clean face morning and evening"
        },
        {
          ingredients: ["retinol", "peptides", "ceramides"],
          skinType: ["normal", "combination", "oily"],
          benefits: ["anti-aging", "wrinkle reduction", "firming"],
          tags: ["night cream", "anti-aging", "mature skin"],
          skinConcerns: ["wrinkles", "aging", "loss of firmness"],
          usage: "Apply to face and neck every evening after cleansing"
        },
        {
          ingredients: ["salicylic acid", "tea tree oil", "zinc"],
          skinType: ["oily", "combination", "acne-prone"],
          benefits: ["acne control", "pore minimizing", "oil control"],
          tags: ["acne treatment", "oily skin", "spot treatment"],
          skinConcerns: ["acne", "pores", "oiliness"],
          usage: "Apply to affected areas twice daily after cleansing"
        }
      ];

      // Update first few products with enhanced data
      for (let i = 0; i < Math.min(existingProducts.length, productEnhancements.length); i++) {
        await Product.findByIdAndUpdate(
          existingProducts[i]._id,
          productEnhancements[i],
          { new: true }
        );
      }
      
      console.log('✅ Enhanced existing products with AI-friendly data');
    }

    console.log('🎉 Database seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the seeding
if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;
