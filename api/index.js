// Vercel API route that imports the Express app from server
// This ensures dependencies are correctly resolved

// For Vercel's @vercel/node, we need to ensure the app is exported correctly
// The server/index.js exports the app when VERCEL env var is set
module.exports = require('../server/index.js');

