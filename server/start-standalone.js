#!/usr/bin/env node
/**
 * Standalone Server Startup Script
 * 
 * This script starts the Express server in standalone mode (not serverless).
 * Use this for traditional hosting (VPS, Render.com, Railway.app, etc.)
 * 
 * Usage:
 *   node start-standalone.js
 *   OR
 *   npm start (if package.json points here)
 */

const path = require('path');
require('dotenv').config();

// Set environment for standalone mode
process.env.SERVE_CLIENT = 'false'; // Don't serve client in standalone mode
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

// Ensure we're not in serverless mode
delete process.env.VERCEL;
delete process.env.AWS_LAMBDA_FUNCTION_NAME;

console.log('🚀 Starting Mangohick Fire Reporting API Server (Standalone Mode)');
console.log('📍 Environment:', process.env.NODE_ENV);
console.log('📍 Port:', process.env.PORT || 5000);
console.log('📍 Serve Client:', process.env.SERVE_CLIENT || 'false');

// Check critical environment variables
const requiredEnvVars = ['JWT_SECRET', 'DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASS'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingVars.forEach(varName => {
    console.error(`   - ${varName}`);
  });
  console.error('\nPlease set these in your .env file or environment variables.');
  process.exit(1);
}

// Start the server
try {
  require('./index.js');
} catch (error) {
  console.error('❌ Failed to start server:', error);
  console.error('Stack:', error.stack);
  process.exit(1);
}

