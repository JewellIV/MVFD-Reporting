const express = require('express');
const { body, validationResult } = require('express-validator');
const NemsisRecord = require('../models/NemsisRecord');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Get offline records (records marked as offline)
router.get('/offline', auth, async (req, res) => {
  try {
    const records = await NemsisRecord.find({
      createdBy: req.user._id,
      isOffline: true,
      syncStatus: { $in: ['Pending', 'Error'] }
    }).sort({ createdAt: -1 });

    res.json(records);
  } catch (error) {
    console.error('Get offline records error:', error);
    res.status(500).json({ error: 'Server error fetching offline records' });
  }
});

// Create offline record
router.post('/offline', auth, [
  body('incident.incidentNumber').notEmpty().withMessage('Incident number is required'),
  body('incident.incidentDate').isISO8601().withMessage('Valid incident date is required'),
  body('incident.incidentType').notEmpty().withMessage('Incident type is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Generate unique record ID for offline record
    const recordId = `OFFLINE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const recordData = {
      ...req.body,
      recordId,
      createdBy: req.user._id,
      agencyId: 'MANGOHICK-VFD-001',
      isOffline: true,
      syncStatus: 'Pending'
    };

    const record = new NemsisRecord(recordData);
    await record.save();

    res.status(201).json(record);
  } catch (error) {
    console.error('Create offline record error:', error);
    res.status(500).json({ error: 'Server error creating offline record' });
  }
});

// Sync offline records to server
router.post('/sync', auth, async (req, res) => {
  try {
    const { recordIds } = req.body;

    if (!Array.isArray(recordIds)) {
      return res.status(400).json({ error: 'Record IDs must be an array' });
    }

    const records = await NemsisRecord.find({
      _id: { $in: recordIds },
      createdBy: req.user._id,
      isOffline: true
    });

    const syncResults = [];

    for (const record of records) {
      try {
        // Validate record data
        const validationErrors = validateNemsisRecord(record);
        
        if (validationErrors.length > 0) {
          record.syncStatus = 'Error';
          record.quality.validationErrors = validationErrors;
          await record.save();
          
          syncResults.push({
            recordId: record._id,
            status: 'error',
            errors: validationErrors
          });
          continue;
        }

        // Mark as synced
        record.isOffline = false;
        record.syncStatus = 'Synced';
        record.quality.dataCompleteness = calculateDataCompleteness(record);
        await record.save();

        syncResults.push({
          recordId: record._id,
          status: 'success'
        });
      } catch (error) {
        record.syncStatus = 'Error';
        await record.save();
        
        syncResults.push({
          recordId: record._id,
          status: 'error',
          errors: [error.message]
        });
      }
    }

    res.json({
      message: 'Sync completed',
      results: syncResults
    });
  } catch (error) {
    console.error('Sync offline records error:', error);
    res.status(500).json({ error: 'Server error syncing records' });
  }
});

// Get sync status
router.get('/sync/status', auth, async (req, res) => {
  try {
    const stats = await NemsisRecord.aggregate([
      { $match: { createdBy: req.user._id } },
      {
        $group: {
          _id: '$syncStatus',
          count: { $sum: 1 }
        }
      }
    ]);

    const offlineStats = await NemsisRecord.aggregate([
      { $match: { createdBy: req.user._id, isOffline: true } },
      {
        $group: {
          _id: '$syncStatus',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      totalRecords: stats.reduce((sum, stat) => sum + stat.count, 0),
      syncStatus: stats,
      offlineStatus: offlineStats
    });
  } catch (error) {
    console.error('Get sync status error:', error);
    res.status(500).json({ error: 'Server error fetching sync status' });
  }
});

// Bulk sync all offline records
router.post('/sync/all', auth, async (req, res) => {
  try {
    const records = await NemsisRecord.find({
      createdBy: req.user._id,
      isOffline: true,
      syncStatus: 'Pending'
    });

    const syncResults = [];

    for (const record of records) {
      try {
        // Validate record data
        const validationErrors = validateNemsisRecord(record);
        
        if (validationErrors.length > 0) {
          record.syncStatus = 'Error';
          record.quality.validationErrors = validationErrors;
          await record.save();
          
          syncResults.push({
            recordId: record._id,
            status: 'error',
            errors: validationErrors
          });
          continue;
        }

        // Mark as synced
        record.isOffline = false;
        record.syncStatus = 'Synced';
        record.quality.dataCompleteness = calculateDataCompleteness(record);
        await record.save();

        syncResults.push({
          recordId: record._id,
          status: 'success'
        });
      } catch (error) {
        record.syncStatus = 'Error';
        await record.save();
        
        syncResults.push({
          recordId: record._id,
          status: 'error',
          errors: [error.message]
        });
      }
    }

    res.json({
      message: 'Bulk sync completed',
      totalProcessed: records.length,
      results: syncResults
    });
  } catch (error) {
    console.error('Bulk sync error:', error);
    res.status(500).json({ error: 'Server error during bulk sync' });
  }
});

// Helper function to validate NEMSIS record
function validateNemsisRecord(record) {
  const errors = [];

  // Required fields validation
  if (!record.recordId) errors.push('Record ID is required');
  if (!record.incident?.incidentNumber) errors.push('Incident number is required');
  if (!record.incident?.incidentDate) errors.push('Incident date is required');
  if (!record.incident?.incidentType) errors.push('Incident type is required');
  if (!record.patient?.demographics?.age) errors.push('Patient age is required');
  if (!record.patient?.demographics?.gender) errors.push('Patient gender is required');

  // Data type validation
  if (record.patient?.demographics?.age && isNaN(record.patient.demographics.age)) {
    errors.push('Patient age must be numeric');
  }

  if (record.patient?.demographics?.gender && 
      !['M', 'F', 'U'].includes(record.patient.demographics.gender)) {
    errors.push('Patient gender must be M, F, or U');
  }

  // Date validation
  if (record.incident?.incidentDate && isNaN(new Date(record.incident.incidentDate).getTime())) {
    errors.push('Invalid incident date format');
  }

  return errors;
}

// Helper function to calculate data completeness percentage
function calculateDataCompleteness(record) {
  const requiredFields = [
    'recordId',
    'incident.incidentNumber',
    'incident.incidentDate',
    'incident.incidentType',
    'patient.demographics.age',
    'patient.demographics.gender'
  ];

  let completedFields = 0;
  
  requiredFields.forEach(field => {
    const value = getNestedValue(record, field);
    if (value !== undefined && value !== null && value !== '') {
      completedFields++;
    }
  });

  return Math.round((completedFields / requiredFields.length) * 100);
}

// Helper function to get nested object values
function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

module.exports = router;