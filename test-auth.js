// Test script để kiểm tra authentication
const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api';

async function testAuth() {
  console.log('🧪 Testing Authentication...\n');
  
  // Test 1: Test endpoint không cần auth
  console.log('1. Testing public endpoint...');
  try {
    const response = await axios.get(`${API_BASE_URL}/auth/test-token`);
    console.log('✅ Public endpoint works:', response.data);
  } catch (error) {
    console.log('❌ Public endpoint failed:', error.message);
  }
  
  // Test 2: Test endpoint với token
  console.log('\n2. Testing with token...');
  const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1MDdmMWY3N2JjZjg2Y2Q3OTk0MzkwMTEiLCJpYXQiOjE3MzU2MjQ4MDAsImV4cCI6MTczNTcxMTIwMH0.test';
  
  try {
    const response = await axios.get(`${API_BASE_URL}/auth/test-token`, {
      headers: {
        'Authorization': `Bearer ${testToken}`
      }
    });
    console.log('✅ Token endpoint works:', response.data);
  } catch (error) {
    console.log('❌ Token endpoint failed:', error.message);
  }
  
  // Test 3: Test /me endpoint
  console.log('\n3. Testing /me endpoint...');
  try {
    const response = await axios.get(`${API_BASE_URL}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${testToken}`
      }
    });
    console.log('✅ /me endpoint works:', response.data);
  } catch (error) {
    console.log('❌ /me endpoint failed:', error.response?.status, error.response?.data);
  }
  
  // Test 4: Test domain validation with company domains
  console.log('\n4. Testing company domain validation...');
  const testDomains = [
    'test@ep.techcorp.vn',
    'test@ma.techcorp.vn',
    'test@st.techcorp.vn',
    'test@te.techcorp.vn',
    'test@ad.techcorp.vn'
  ];

  for (const email of testDomains) {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/validate-domain`, {
        email
      });
      console.log(`✅ ${email} validation works:`, response.data.role, response.data.department);
    } catch (error) {
      console.log(`❌ ${email} validation failed:`, error.response?.data);
    }
  }

  // Test 5: Test domain login with company email
  console.log('\n5. Testing domain login with company email...');
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/login-with-domain`, {
      email: 'john.doe@ma.techcorp.vn',
      fullName: 'John Doe'
    });
    console.log('✅ Domain login works:', {
      user: response.data.user.email,
      role: response.data.user.role,
      department: response.data.user.department,
      hasToken: !!response.data.token
    });
  } catch (error) {
    console.log('❌ Domain login failed:', error.response?.data);
  }
}

testAuth().catch(console.error);
