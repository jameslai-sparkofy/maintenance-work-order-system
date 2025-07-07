// Debug script to test server functionality
const express = require('express');
const nodemailer = require('nodemailer');

console.log('🔍 Testing nodemailer...');
try {
    const transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
            user: 'ethereal.user@ethereal.email',
            pass: 'ethereal.pass'
        }
    });
    console.log('✅ Nodemailer transporter created successfully');
} catch (error) {
    console.error('❌ Nodemailer error:', error.message);
}

console.log('🔍 Testing express...');
try {
    const app = express();
    console.log('✅ Express app created successfully');
} catch (error) {
    console.error('❌ Express error:', error.message);
}

console.log('🔍 Module versions:');
console.log('- Node.js:', process.version);
console.log('- Express:', require('express/package.json').version);
console.log('- Nodemailer:', require('nodemailer/package.json').version);

console.log('\n🚀 Starting main application...');
require('./src/main/js/app.js');