const express = require('express');
const { body, validationResult } = require('express-validator');
const { auth, requireRole } = require('../middleware/auth');
const NotificationService = require('../services/notification/NotificationService');

const router = express.Router();
const notificationService = new NotificationService();

// Register push token
router.post('/register-token', auth, [
  body('token').notEmpty().withMessage('Push token is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { token } = req.body;
    
    notificationService.registerPushToken(req.user._id, token);
    
    res.json({ message: 'Push token registered successfully' });
  } catch (error) {
    console.error('Register push token error:', error);
    res.status(500).json({ error: 'Server error registering push token' });
  }
});

// Send push notification
router.post('/push', auth, requireRole(['admin', 'officer']), [
  body('userId').notEmpty().withMessage('User ID is required'),
  body('title').notEmpty().withMessage('Title is required'),
  body('body').notEmpty().withMessage('Body is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { userId, title, body, data } = req.body;
    
    const result = await notificationService.sendPushNotification(userId, title, body, data);
    
    if (result.success) {
      res.json({ message: 'Push notification sent successfully', tickets: result.tickets });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Send push notification error:', error);
    res.status(500).json({ error: 'Server error sending push notification' });
  }
});

// Send email notification
router.post('/email', auth, requireRole(['admin', 'officer']), [
  body('to').isEmail().withMessage('Valid email address is required'),
  body('subject').notEmpty().withMessage('Subject is required'),
  body('body').notEmpty().withMessage('Body is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { to, subject, body, htmlBody } = req.body;
    
    const result = await notificationService.sendEmailNotification(to, subject, body, htmlBody);
    
    if (result.success) {
      res.json({ message: 'Email notification sent successfully', messageId: result.messageId });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Send email notification error:', error);
    res.status(500).json({ error: 'Server error sending email notification' });
  }
});

// Send SMS notification
router.post('/sms', auth, requireRole(['admin', 'officer']), [
  body('to').notEmpty().withMessage('Phone number is required'),
  body('message').notEmpty().withMessage('Message is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { to, message } = req.body;
    
    const result = await notificationService.sendSMSNotification(to, message);
    
    if (result.success) {
      res.json({ message: 'SMS notification sent successfully', messageId: result.messageId });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Send SMS notification error:', error);
    res.status(500).json({ error: 'Server error sending SMS notification' });
  }
});

// Send incident alert
router.post('/incident-alert', auth, requireRole(['admin', 'officer']), [
  body('incidentData').isObject().withMessage('Incident data is required'),
  body('recipients').isArray().withMessage('Recipients must be an array')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { incidentData, recipients } = req.body;
    
    const result = await notificationService.sendIncidentAlert(incidentData, recipients);
    
    if (result.success) {
      res.json({ message: 'Incident alert sent successfully', notifications: result.notifications });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Send incident alert error:', error);
    res.status(500).json({ error: 'Server error sending incident alert' });
  }
});

// Send sync status notification
router.post('/sync-status', auth, [
  body('status').isIn(['success', 'error', 'warning']).withMessage('Status must be success, error, or warning'),
  body('details').notEmpty().withMessage('Details are required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { status, details } = req.body;
    
    const result = await notificationService.sendSyncStatusNotification(req.user._id, status, details);
    
    if (result.success) {
      res.json({ message: 'Sync status notification sent successfully' });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Send sync status notification error:', error);
    res.status(500).json({ error: 'Server error sending sync status notification' });
  }
});

// Send validation error notification
router.post('/validation-error', auth, [
  body('recordId').notEmpty().withMessage('Record ID is required'),
  body('errors').isArray().withMessage('Errors must be an array')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { recordId, errors } = req.body;
    
    const result = await notificationService.sendValidationErrorNotification(req.user._id, recordId, errors);
    
    if (result.success) {
      res.json({ message: 'Validation error notification sent successfully' });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Send validation error notification error:', error);
    res.status(500).json({ error: 'Server error sending validation error notification' });
  }
});

module.exports = router;