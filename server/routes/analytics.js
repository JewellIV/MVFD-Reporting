const express = require('express');
const { body, validationResult } = require('express-validator');
const { auth, requireRole } = require('../middleware/auth');
const AnalyticsService = require('../services/analytics/AnalyticsService');

const router = express.Router();
const analyticsService = new AnalyticsService();

// Get user analytics
router.get('/user/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;

    // Check if user has access to this data
    if (req.user._id.toString() !== userId && !['admin', 'officer'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const analytics = analyticsService.getUserAnalytics(
      userId,
      startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      endDate || new Date().toISOString()
    );

    res.json(analytics);
  } catch (error) {
    console.error('Get user analytics error:', error);
    res.status(500).json({ error: 'Server error fetching user analytics' });
  }
});

// Get system analytics
router.get('/system', auth, requireRole(['admin', 'officer']), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const analytics = await analyticsService.getSystemAnalytics(
      startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      endDate || new Date().toISOString()
    );

    res.json(analytics);
  } catch (error) {
    console.error('Get system analytics error:', error);
    res.status(500).json({ error: 'Server error fetching system analytics' });
  }
});

// Get performance metrics
router.get('/performance', auth, requireRole(['admin', 'officer']), async (req, res) => {
  try {
    const metrics = analyticsService.getPerformanceMetrics();
    res.json(metrics);
  } catch (error) {
    console.error('Get performance metrics error:', error);
    res.status(500).json({ error: 'Server error fetching performance metrics' });
  }
});

// Generate compliance report
router.post('/compliance-report', auth, requireRole(['admin', 'officer']), [
  body('startDate').isISO8601().withMessage('Valid start date is required'),
  body('endDate').isISO8601().withMessage('Valid end date is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { startDate, endDate } = req.body;
    
    const report = await analyticsService.generateComplianceReport(startDate, endDate);
    
    res.json(report);
  } catch (error) {
    console.error('Generate compliance report error:', error);
    res.status(500).json({ error: 'Server error generating compliance report' });
  }
});

// Export analytics data
router.get('/export/:format', auth, requireRole(['admin', 'officer']), async (req, res) => {
  try {
    const { format } = req.params;
    const { startDate, endDate, type } = req.query;

    let data;
    if (type === 'system') {
      data = await analyticsService.getSystemAnalytics(
        startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        endDate || new Date().toISOString()
      );
    } else if (type === 'compliance') {
      data = await analyticsService.generateComplianceReport(
        startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        endDate || new Date().toISOString()
      );
    } else {
      return res.status(400).json({ error: 'Invalid type. Use system or compliance' });
    }

    const exportedData = analyticsService.exportAnalyticsData(format, data);

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="analytics-${type}-${new Date().toISOString().split('T')[0]}.csv"`);
    } else if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="analytics-${type}-${new Date().toISOString().split('T')[0]}.json"`);
    } else if (format === 'xml') {
      res.setHeader('Content-Type', 'application/xml');
      res.setHeader('Content-Disposition', `attachment; filename="analytics-${type}-${new Date().toISOString().split('T')[0]}.xml"`);
    }

    res.send(exportedData);
  } catch (error) {
    console.error('Export analytics error:', error);
    res.status(500).json({ error: 'Server error exporting analytics data' });
  }
});

// Track user action
router.post('/track', auth, [
  body('action').notEmpty().withMessage('Action is required'),
  body('data').optional().isObject()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { action, data } = req.body;
    
    analyticsService.trackUserAction(req.user._id, action, data);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Track user action error:', error);
    res.status(500).json({ error: 'Server error tracking user action' });
  }
});

module.exports = router;