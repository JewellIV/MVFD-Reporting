const axios = require('axios');
const { Expo } = require('expo-server-sdk');

class NotificationService {
  constructor() {
    this.expo = new Expo();
    this.pushTokens = new Map();
  }

  // Register push token for user
  registerPushToken(userId, token) {
    this.pushTokens.set(userId, token);
  }

  // Send push notification
  async sendPushNotification(userId, title, body, data = {}) {
    try {
      const token = this.pushTokens.get(userId);
      if (!token) {
        console.log('No push token found for user:', userId);
        return { success: false, error: 'No push token' };
      }

      if (!Expo.isExpoPushToken(token)) {
        console.log('Invalid push token:', token);
        return { success: false, error: 'Invalid push token' };
      }

      const message = {
        to: token,
        sound: 'default',
        title,
        body,
        data
      };

      const chunks = this.expo.chunkPushNotifications([message]);
      const tickets = [];

      for (const chunk of chunks) {
        try {
          const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
          tickets.push(...ticketChunk);
        } catch (error) {
          console.error('Error sending push notification:', error);
        }
      }

      return { success: true, tickets };
    } catch (error) {
      console.error('Push notification error:', error);
      return { success: false, error: error.message };
    }
  }

  // Send email notification
  async sendEmailNotification(to, subject, body, htmlBody = null) {
    try {
      // This would integrate with your email service (SendGrid, AWS SES, etc.)
      const emailData = {
        to,
        subject,
        text: body,
        html: htmlBody || body
      };

      // Placeholder for email service integration
      console.log('Email notification:', emailData);
      
      return { success: true, messageId: 'mock-message-id' };
    } catch (error) {
      console.error('Email notification error:', error);
      return { success: false, error: error.message };
    }
  }

  // Send SMS notification
  async sendSMSNotification(to, message) {
    try {
      // This would integrate with your SMS service (Twilio, AWS SNS, etc.)
      const smsData = {
        to,
        message
      };

      // Placeholder for SMS service integration
      console.log('SMS notification:', smsData);
      
      return { success: true, messageId: 'mock-sms-id' };
    } catch (error) {
      console.error('SMS notification error:', error);
      return { success: false, error: error.message };
    }
  }

  // Send incident alert
  async sendIncidentAlert(incidentData, recipients) {
    try {
      const title = `New Incident: ${incidentData.incidentType}`;
      const body = `Location: ${incidentData.location.address}\nTime: ${incidentData.dispatchTime}`;
      
      const notifications = [];
      
      for (const recipient of recipients) {
        if (recipient.notificationPreferences.push) {
          const pushResult = await this.sendPushNotification(
            recipient.userId,
            title,
            body,
            { incidentId: incidentData.id, type: 'incident' }
          );
          notifications.push({ type: 'push', result: pushResult });
        }
        
        if (recipient.notificationPreferences.email) {
          const emailResult = await this.sendEmailNotification(
            recipient.email,
            title,
            body
          );
          notifications.push({ type: 'email', result: emailResult });
        }
        
        if (recipient.notificationPreferences.sms) {
          const smsResult = await this.sendSMSNotification(
            recipient.phone,
            body
          );
          notifications.push({ type: 'sms', result: smsResult });
        }
      }
      
      return { success: true, notifications };
    } catch (error) {
      console.error('Incident alert error:', error);
      return { success: false, error: error.message };
    }
  }

  // Send sync status notification
  async sendSyncStatusNotification(userId, status, details) {
    try {
      const title = 'Data Sync Status';
      const body = `Sync ${status}: ${details}`;
      
      return await this.sendPushNotification(userId, title, body, {
        type: 'sync',
        status,
        details
      });
    } catch (error) {
      console.error('Sync status notification error:', error);
      return { success: false, error: error.message };
    }
  }

  // Send validation error notification
  async sendValidationErrorNotification(userId, recordId, errors) {
    try {
      const title = 'Record Validation Errors';
      const body = `Record ${recordId} has ${errors.length} validation errors`;
      
      return await this.sendPushNotification(userId, title, body, {
        type: 'validation',
        recordId,
        errors
      });
    } catch (error) {
      console.error('Validation error notification error:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = NotificationService;