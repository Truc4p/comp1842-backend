const axios = require('axios');

const API_URL = 'http://localhost:3000/api';

// Test function to verify our cash flow APIs
const testCashFlowAPIs = async () => {
  try {
    console.log("🧪 Testing Cash Flow APIs...\n");

    // Test 1: Dashboard endpoint
    console.log("1. Testing /api/cashflow/dashboard");
    const dashboardResponse = await axios.get(`${API_URL}/cashflow/dashboard?period=30`, {
      headers: {
        'x-auth-token': 'test-token' // You might need a real token
      }
    });
    console.log("✅ Dashboard Response:", dashboardResponse.data);
    console.log("");

    // Test 2: History endpoint  
    console.log("2. Testing /api/cashflow/history");
    const historyResponse = await axios.get(`${API_URL}/cashflow/history?period=7`, {
      headers: {
        'x-auth-token': 'test-token'
      }
    });
    console.log("✅ History Response:", historyResponse.data);
    console.log("");

    // Test 3: Categories endpoint
    console.log("3. Testing /api/cashflow/categories");
    const categoriesResponse = await axios.get(`${API_URL}/cashflow/categories?period=30`, {
      headers: {
        'x-auth-token': 'test-token'
      }
    });
    console.log("✅ Categories Response:", categoriesResponse.data);
    console.log("");

    // Test 4: Forecast endpoint
    console.log("4. Testing /api/cashflow/forecast");
    const forecastResponse = await axios.get(`${API_URL}/cashflow/forecast?days=90`, {
      headers: {
        'x-auth-token': 'test-token'
      }
    });
    console.log("✅ Forecast Response:", forecastResponse.data.summary);
    console.log("");

  } catch (error) {
    console.error("❌ Error testing APIs:", error.response?.data || error.message);
  }
};

// Run the tests
testCashFlowAPIs();
