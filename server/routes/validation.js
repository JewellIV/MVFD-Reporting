const express = require('express');
const { body, validationResult } = require('express-validator');
const { auth } = require('../middleware/auth');
const NemsisValidator = require('../services/validation/nemsisValidator');
const HIPAACompliance = require('../services/compliance/hipaaCompliance');

const router = express.Router();

// Initialize services
const nemsisValidator = new NemsisValidator();
const hipaaCompliance = new HIPAACompliance();

// Validate NEMSIS record
router.post('/nemsis', auth, [
  body('recordData').isObject().withMessage('Record data is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { recordData, options = {} } = req.body;
    
    // Validate NEMSIS record
    const validationResult = await nemsisValidator.validateNemsisRecord(recordData, options);
    
    // Check for ePHI and apply HIPAA compliance
    const ephiElements = hipaaCompliance.identifyEPHIElements(recordData);
    if (Object.keys(ephiElements).length > 0) {
      // Log ePHI access
      hipaaCompliance.createAuditLogEntry(
        'EPHI_ACCESS',
        req.user._id,
        recordData.recordId || 'unknown',
        {
          ephiElements: Object.keys(ephiElements),
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          sessionId: req.sessionID
        }
      );
    }

    res.json(validationResult);
  } catch (error) {
    console.error('NEMSIS validation error:', error);
    res.status(500).json({ error: 'Server error validating NEMSIS record' });
  }
});

// Validate NFIRS record
router.post('/nfirs', auth, [
  body('recordData').isObject().withMessage('Record data is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { recordData } = req.body;
    
    // Basic NFIRS validation
    const validationResult = {
      valid: true,
      errors: [],
      warnings: [],
      dataQualityScore: 100,
      validationTime: Date.now()
    };

    // Required fields validation
    if (!recordData.incidentNumber) {
      validationResult.errors.push({
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Incident number is required',
        field: 'incidentNumber',
        severity: 'ERROR'
      });
    }

    if (!recordData.incidentDate) {
      validationResult.errors.push({
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Incident date is required',
        field: 'incidentDate',
        severity: 'ERROR'
      });
    }

    if (!recordData.incidentType) {
      validationResult.errors.push({
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Incident type is required',
        field: 'incidentType',
        severity: 'ERROR'
      });
    }

    if (!recordData.location?.address) {
      validationResult.errors.push({
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Address is required',
        field: 'location.address',
        severity: 'ERROR'
      });
    }

    // Data quality checks
    if (recordData.loss?.propertyLoss && recordData.loss.propertyLoss < 0) {
      validationResult.warnings.push({
        code: 'DATA_QUALITY_WARNING',
        message: 'Property loss should not be negative',
        field: 'loss.propertyLoss',
        severity: 'WARNING'
      });
    }

    if (recordData.loss?.contentLoss && recordData.loss.contentLoss < 0) {
      validationResult.warnings.push({
        code: 'DATA_QUALITY_WARNING',
        message: 'Content loss should not be negative',
        field: 'loss.contentLoss',
        severity: 'WARNING'
      });
    }

    // Calculate data quality score
    validationResult.dataQualityScore = Math.max(0, 100 - (validationResult.errors.length * 10) - (validationResult.warnings.length * 2));
    validationResult.valid = validationResult.errors.length === 0;

    res.json(validationResult);
  } catch (error) {
    console.error('NFIRS validation error:', error);
    res.status(500).json({ error: 'Server error validating NFIRS record' });
  }
});

// Validate NERIS record
router.post('/neris', auth, [
  body('recordData').isObject().withMessage('Record data is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { recordData } = req.body;
    
    // Basic NERIS validation
    const validationResult = {
      valid: true,
      errors: [],
      warnings: [],
      dataQualityScore: 100,
      validationTime: Date.now()
    };

    // Required fields validation
    if (!recordData.core?.incidentNumber) {
      validationResult.errors.push({
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Incident number is required',
        field: 'core.incidentNumber',
        severity: 'ERROR'
      });
    }

    if (!recordData.core?.incidentDate) {
      validationResult.errors.push({
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Incident date is required',
        field: 'core.incidentDate',
        severity: 'ERROR'
      });
    }

    if (!recordData.core?.incidentTypes || recordData.core.incidentTypes.length === 0) {
      validationResult.errors.push({
        code: 'MISSING_REQUIRED_FIELD',
        message: 'At least one incident type is required',
        field: 'core.incidentTypes',
        severity: 'ERROR'
      });
    }

    if (!recordData.location?.coordinates?.latitude || !recordData.location?.coordinates?.longitude) {
      validationResult.errors.push({
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Geographic coordinates are required for NERIS compliance',
        field: 'location.coordinates',
        severity: 'ERROR'
      });
    }

    // GIS validation
    if (recordData.location?.coordinates?.latitude) {
      const lat = parseFloat(recordData.location.coordinates.latitude);
      if (isNaN(lat) || lat < -90 || lat > 90) {
        validationResult.errors.push({
          code: 'INVALID_COORDINATE',
          message: 'Latitude must be between -90 and 90',
          field: 'location.coordinates.latitude',
          severity: 'ERROR'
        });
      }
    }

    if (recordData.location?.coordinates?.longitude) {
      const lng = parseFloat(recordData.location.coordinates.longitude);
      if (isNaN(lng) || lng < -180 || lng > 180) {
        validationResult.errors.push({
          code: 'INVALID_COORDINATE',
          message: 'Longitude must be between -180 and 180',
          field: 'location.coordinates.longitude',
          severity: 'ERROR'
        });
      }
    }

    // Incident types validation
    if (recordData.core?.incidentTypes && recordData.core.incidentTypes.length > 3) {
      validationResult.warnings.push({
        code: 'DATA_QUALITY_WARNING',
        message: 'NERIS allows maximum 3 incident types per event',
        field: 'core.incidentTypes',
        severity: 'WARNING'
      });
    }

    // Calculate data quality score
    validationResult.dataQualityScore = Math.max(0, 100 - (validationResult.errors.length * 10) - (validationResult.warnings.length * 2));
    validationResult.valid = validationResult.errors.length === 0;

    res.json(validationResult);
  } catch (error) {
    console.error('NERIS validation error:', error);
    res.status(500).json({ error: 'Server error validating NERIS record' });
  }
});

// Get validation rules
router.get('/rules/:type', auth, async (req, res) => {
  try {
    const { type } = req.params;
    
    let rules = {};
    
    switch (type) {
      case 'nemsis':
        rules = {
          requiredFields: [
            'eResponse.01', // Agency Number
            'eResponse.02', // Incident Number
            'eTimes.01',    // Dispatch Date/Time
            'ePatient.01',  // Patient Age
            'ePatient.02'   // Patient Gender
          ],
          dataTypes: {
            'ePatient.01': 'number',
            'ePatient.02': 'enum',
            'eTimes.01': 'datetime'
          },
          enums: {
            'ePatient.02': ['M', 'F', 'U']
          }
        };
        break;
      case 'nfirs':
        rules = {
          requiredFields: [
            'incidentNumber',
            'incidentDate',
            'incidentType',
            'location.address'
          ],
          dataTypes: {
            'incidentDate': 'datetime',
            'propertyLoss': 'number',
            'contentLoss': 'number'
          }
        };
        break;
      case 'neris':
        rules = {
          requiredFields: [
            'core.incidentNumber',
            'core.incidentDate',
            'core.incidentTypes',
            'location.coordinates.latitude',
            'location.coordinates.longitude'
          ],
          dataTypes: {
            'core.incidentDate': 'datetime',
            'location.coordinates.latitude': 'number',
            'location.coordinates.longitude': 'number'
          },
          constraints: {
            'location.coordinates.latitude': { min: -90, max: 90 },
            'location.coordinates.longitude': { min: -180, max: 180 },
            'core.incidentTypes': { maxLength: 3 }
          }
        };
        break;
      default:
        return res.status(400).json({ error: 'Invalid validation type' });
    }

    res.json(rules);
  } catch (error) {
    console.error('Get validation rules error:', error);
    res.status(500).json({ error: 'Server error fetching validation rules' });
  }
});

// Get audit log
router.get('/audit', auth, requireRole(['admin', 'officer']), async (req, res) => {
  try {
    const { startDate, endDate, userId, action } = req.query;
    
    const filters = {};
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    if (userId) filters.userId = userId;
    if (action) filters.action = action;
    
    const auditLog = hipaaCompliance.getAuditLogEntries(filters);
    
    res.json({
      auditLog,
      total: auditLog.length,
      filters
    });
  } catch (error) {
    console.error('Get audit log error:', error);
    res.status(500).json({ error: 'Server error fetching audit log' });
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
    
    const report = hipaaCompliance.generateComplianceReport(startDate, endDate);
    
    res.json(report);
  } catch (error) {
    console.error('Generate compliance report error:', error);
    res.status(500).json({ error: 'Server error generating compliance report' });
  }
});

module.exports = router;