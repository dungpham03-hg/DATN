/**
 * Microsoft OAuth Configuration Verification
 * 
 * Script này giúp kiểm tra cấu hình Microsoft OAuth có đúng không
 */

require('dotenv').config();

console.log('🔍 Kiểm tra cấu hình Microsoft OAuth...\n');

const requiredVars = [
  'MICROSOFT_CLIENT_ID',
  'MICROSOFT_CLIENT_SECRET',
  'MICROSOFT_CALLBACK_URL',
  'MICROSOFT_TENANT_ID'
];

let allValid = true;

requiredVars.forEach(varName => {
  const value = process.env[varName];
  
  if (!value || value.trim() === '') {
    console.error(`❌ ${varName}: CHƯA ĐƯỢC CẤU HÌNH`);
    allValid = false;
  } else if (varName === 'MICROSOFT_CLIENT_SECRET') {
    console.log(`✅ ${varName}: ${value.substring(0, 10)}...${value.substring(value.length - 5)}`);
  } else {
    console.log(`✅ ${varName}: ${value}`);
  }
});

console.log('\n📋 Tóm tắt:');

if (allValid) {
  console.log('✅ Tất cả biến môi trường đã được cấu hình!');
  console.log('\n🎯 Tiếp theo:');
  console.log('1. Kiểm tra Redirect URI trong Azure Portal:');
  console.log(`   - ${process.env.MICROSOFT_CALLBACK_URL}`);
  console.log('2. Verify callback URL trong app registration');
  console.log('3. Test login với Microsoft');
} else {
  console.log('❌ Còn thiếu một số biến môi trường!');
  console.log('\n📝 Hướng dẫn:');
  console.log('1. Vào Azure Portal (https://portal.azure.com)');
  console.log('2. Tạo App Registration mới');
  console.log('3. Lấy Client ID và tạo Client Secret');
  console.log('4. Thêm Redirect URI:');
  console.log(`   ${process.env.MICROSOFT_CALLBACK_URL || 'http://localhost:5000/api/auth/microsoft/callback'}`);
  console.log('5. Cập nhật file server/.env với thông tin đã lấy');
  console.log('\n📖 Xem chi tiết trong file: MICROSOFT_OAUTH_SETUP.md');
}

console.log('\n✨ Kiểm tra hoàn tất!');
