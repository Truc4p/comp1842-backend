/**
 * 🚀 SIMPLE SYNC SCRIPT
 * 
 * This creates an API endpoint to sync completed orders.
 * Run this and then call the endpoint.
 */

const express = require('express');
const mongoose = require('mongoose');
const { syncCompletedOrdersTocashFlow } = require('./middleware/cleanOrderIntegration');

// Create temporary router for sync
const router = express.Router();

router.get('/sync-orders', async (req, res) => {
  try {
    console.log('🔄 API: Starting order sync...');
    
    const result = await syncCompletedOrdersTocashFlow();
    
    console.log('✅ API: Sync complete');
    
    res.json({
      success: true,
      message: 'Orders synced successfully',
      ...result
    });
    
  } catch (error) {
    console.error('❌ API: Sync failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
