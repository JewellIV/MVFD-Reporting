// Vercel API route that imports the Express app from server
// This ensures dependencies are correctly resolved
const app = require('../server/index.js');

// Export the app for Vercel
module.exports = app;

