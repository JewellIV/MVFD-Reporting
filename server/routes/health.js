const express = require('express');
const { auth, requireRole } = require('../middleware/auth');
const HealthCheckService = require('../services/monitoring/HealthCheckService');

const router = express.Router();
const healthCheckService = new HealthCheckService();

// Basic health check (public endpoint)
router.get('/', async (req, res) => {
  try {
    const result = await healthCheckService.runAllChecks();
    
    const statusCode = result.status === 'healthy' ? 200 : 
                      result.status === 'warning' ? 200 : 503;
    
    res.status(statusCode).json(result);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      message: 'Health check failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Detailed health check (requires authentication)
router.get('/detailed', auth, async (req, res) => {
  try {
    const [healthResult, systemMetrics, appMetrics, performanceMetrics] = await Promise.all([
      healthCheckService.runAllChecks(),
      healthCheckService.getSystemMetrics(),
      healthCheckService.getApplicationMetrics(),
      healthCheckService.getPerformanceMetrics()
    ]);
    
    const detailedResult = {
      ...healthResult,
      system: systemMetrics,
      application: appMetrics,
      performance: performanceMetrics
    };
    
    const statusCode = healthResult.status === 'healthy' ? 200 : 
                      healthResult.status === 'warning' ? 200 : 503;
    
    res.status(statusCode).json(detailedResult);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      message: 'Detailed health check failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Specific health check
router.get('/:checkName', auth, async (req, res) => {
  try {
    const { checkName } = req.params;
    const result = await healthCheckService.runCheck(checkName);
    
    const statusCode = result.status === 'healthy' ? 200 : 
                      result.status === 'warning' ? 200 : 503;
    
    res.status(statusCode).json(result);
  } catch (error) {
    res.status(404).json({
      status: 'unhealthy',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// System metrics (admin only)
router.get('/metrics/system', auth, requireRole(['admin', 'officer']), async (req, res) => {
  try {
    const metrics = await healthCheckService.getSystemMetrics();
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Application metrics (admin only)
router.get('/metrics/application', auth, requireRole(['admin', 'officer']), async (req, res) => {
  try {
    const metrics = await healthCheckService.getApplicationMetrics();
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Performance metrics (admin only)
router.get('/metrics/performance', auth, requireRole(['admin', 'officer']), async (req, res) => {
  try {
    const metrics = healthCheckService.getPerformanceMetrics();
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Register custom health check (admin only)
router.post('/register', auth, requireRole(['admin']), async (req, res) => {
  try {
    const { name, checkFunction } = req.body;
    
    if (!name || !checkFunction) {
      return res.status(400).json({ error: 'Name and checkFunction are required' });
    }
    
    // Note: In a real implementation, you'd need to validate and safely execute the checkFunction
    // This is a simplified example
    healthCheckService.registerCheck(name, eval(`(${checkFunction})`));
    
    res.json({ message: `Health check '${name}' registered successfully` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;