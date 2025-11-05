// Simple test server to verify Node.js is working
// Run: node server/test-server.js
// Visit: http://localhost:5000

const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Test server is working!',
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    platform: process.platform
  });
});

app.get('/api/test', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'API endpoint is working',
    path: req.path
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Test server running on port ${PORT}`);
  console.log(`🌐 Access at: http://localhost:${PORT}`);
}).on('error', (err) => {
  console.error('❌ Failed to start test server:', err.message);
  if (err.code === 'EADDRINUSE') {
    console.error(`   Port ${PORT} is already in use`);
  }
  process.exit(1);
});

