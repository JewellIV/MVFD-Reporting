// Vercel API route handler
// This file must export a function or Express app for @vercel/node

// Set Vercel environment before requiring server
if (!process.env.VERCEL) {
  process.env.VERCEL = '1';
}

// Import the Express app from server
// server/index.js will export the app when VERCEL is detected
const app = require('../server/index.js');

// Ensure we export the Express app
// @vercel/node will automatically wrap it
module.exports = app;

// Log for debugging
console.log('API handler loaded, app type:', typeof app);

