const express = require('express');
const { body, validationResult } = require('express-validator');
const NemsisRecord = require('../models/NemsisRecord');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get all NEMSIS records
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, startDate, endDate } = req.query;
    const query = { createdBy: req.user._id };

    if (status) query['quality.status'] = status;
    if (startDate || endDate) {
      query['incident.incidentDate'] = {};
      if (startDate) query['incident.incidentDate'].$gte = new Date(startDate);
      if (endDate) query['incident.incidentDate'].$lte = new Date(endDate);
    }

    const records = await NemsisRecord.find(query)
      .sort({ 'incident.incidentDate': -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('createdBy', 'firstName lastName badgeNumber');

    const total = await NemsisRecord.countDocuments(query);

    res.json({
      records,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get NEMSIS records error:', error);
    res.status(500).json({ error: 'Server error fetching records' });
  }
});

// Get single NEMSIS record
router.get('/:id', auth, async (req, res) => {
  try {
    const record = await NemsisRecord.findById(req.params.id)
      .populate('createdBy', 'firstName lastName badgeNumber')
      .populate('lastModifiedBy', 'firstName lastName badgeNumber');

    if (!record) {
      return res.status(404).json({ error: 'Record not found' });
    }

    // Check if user has access to this record
    if (record.createdBy._id.toString() !== req.user._id.toString() && 
        !['admin', 'officer'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(record);
  } catch (error) {
    console.error('Get NEMSIS record error:', error);
    res.status(500).json({ error: 'Server error fetching record' });
  }
});

// Create new NEMSIS record
router.post('/', auth, [
  body('incident.incidentNumber').notEmpty().withMessage('Incident number is required'),
  body('incident.incidentDate').isISO8601().withMessage('Valid incident date is required'),
  body('incident.incidentType').notEmpty().withMessage('Incident type is required'),
  body('patient.demographics.age').isNumeric().withMessage('Age must be numeric'),
  body('patient.demographics.gender').isIn(['M', 'F', 'U']).withMessage('Valid gender is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Generate unique record ID
    const recordId = `NEMSIS-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const recordData = {
      ...req.body,
      recordId,
      createdBy: req.user._id,
      agencyId: 'MANGOHICK-VFD-001'
    };

    const record = new NemsisRecord(recordData);
    await record.save();

    res.status(201).json(record);
  } catch (error) {
    console.error('Create NEMSIS record error:', error);
    res.status(500).json({ error: 'Server error creating record' });
  }
});

// Update NEMSIS record
router.put('/:id', auth, async (req, res) => {
  try {
    const record = await NemsisRecord.findById(req.params.id);

    if (!record) {
      return res.status(404).json({ error: 'Record not found' });
    }

    // Check if user has access to this record
    if (record.createdBy.toString() !== req.user._id.toString() && 
        !['admin', 'officer'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Update record
    Object.assign(record, req.body);
    record.lastModifiedBy = req.user._id;
    record.version += 1;

    await record.save();

    res.json(record);
  } catch (error) {
    console.error('Update NEMSIS record error:', error);
    res.status(500).json({ error: 'Server error updating record' });
  }
});

// Delete NEMSIS record
router.delete('/:id', auth, requireRole(['admin', 'officer']), async (req, res) => {
  try {
    const record = await NemsisRecord.findById(req.params.id);

    if (!record) {
      return res.status(404).json({ error: 'Record not found' });
    }

    await NemsisRecord.findByIdAndDelete(req.params.id);

    res.json({ message: 'Record deleted successfully' });
  } catch (error) {
    console.error('Delete NEMSIS record error:', error);
    res.status(500).json({ error: 'Server error deleting record' });
  }
});

// Submit record for review
router.post('/:id/submit', auth, async (req, res) => {
  try {
    const record = await NemsisRecord.findById(req.params.id);

    if (!record) {
      return res.status(404).json({ error: 'Record not found' });
    }

    if (record.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    record.quality.status = 'Pending Review';
    record.lastModifiedBy = req.user._id;
    await record.save();

    res.json({ message: 'Record submitted for review', record });
  } catch (error) {
    console.error('Submit NEMSIS record error:', error);
    res.status(500).json({ error: 'Server error submitting record' });
  }
});

// Approve/reject record
router.post('/:id/review', auth, requireRole(['admin', 'officer']), [
  body('action').isIn(['approve', 'reject']).withMessage('Action must be approve or reject'),
  body('comments').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { action, comments } = req.body;
    const record = await NemsisRecord.findById(req.params.id);

    if (!record) {
      return res.status(404).json({ error: 'Record not found' });
    }

    record.quality.status = action === 'approve' ? 'Approved' : 'Rejected';
    record.quality.reviewedBy = req.user._id;
    record.quality.reviewDate = new Date();
    record.lastModifiedBy = req.user._id;

    if (comments) {
      record.quality.comments = comments;
    }

    await record.save();

    res.json({ message: `Record ${action}d successfully`, record });
  } catch (error) {
    console.error('Review NEMSIS record error:', error);
    res.status(500).json({ error: 'Server error reviewing record' });
  }
});

// Export NEMSIS data for state/federal upload
router.get('/export/:format', auth, requireRole(['admin', 'officer']), async (req, res) => {
  try {
    const { format } = req.params;
    const { startDate, endDate, status } = req.query;

    const query = {};
    if (startDate || endDate) {
      query['incident.incidentDate'] = {};
      if (startDate) query['incident.incidentDate'].$gte = new Date(startDate);
      if (endDate) query['incident.incidentDate'].$lte = new Date(endDate);
    }
    if (status) query['quality.status'] = status;

    const records = await NemsisRecord.find(query)
      .populate('createdBy', 'firstName lastName badgeNumber');

    if (format === 'xml') {
      // Convert to NEMSIS XML format
      const xml = convertToNemsisXML(records);
      res.setHeader('Content-Type', 'application/xml');
      res.setHeader('Content-Disposition', 'attachment; filename="nemsis-export.xml"');
      res.send(xml);
    } else if (format === 'csv') {
      // Convert to CSV format
      const csv = convertToCSV(records);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="nemsis-export.csv"');
      res.send(csv);
    } else {
      res.status(400).json({ error: 'Invalid format. Use xml or csv' });
    }
  } catch (error) {
    console.error('Export NEMSIS data error:', error);
    res.status(500).json({ error: 'Server error exporting data' });
  }
});

// Helper function to convert records to NEMSIS XML format
function convertToNemsisXML(records) {
  // This is a simplified XML conversion
  // In a real implementation, you would use a proper XML library
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<NEMSISDataSet>\n';
  
  records.forEach(record => {
    xml += '  <Record>\n';
    xml += `    <RecordID>${record.recordId}</RecordID>\n`;
    xml += `    <AgencyID>${record.agencyId}</AgencyID>\n`;
    xml += `    <IncidentNumber>${record.incident.incidentNumber}</IncidentNumber>\n`;
    xml += `    <IncidentDate>${record.incident.incidentDate.toISOString()}</IncidentDate>\n`;
    // Add more fields as needed
    xml += '  </Record>\n';
  });
  
  xml += '</NEMSISDataSet>';
  return xml;
}

// Helper function to convert records to CSV format
function convertToCSV(records) {
  const headers = [
    'RecordID', 'AgencyID', 'IncidentNumber', 'IncidentDate', 'IncidentType',
    'PatientAge', 'PatientGender', 'ChiefComplaint', 'PrimaryImpression'
  ];
  
  let csv = headers.join(',') + '\n';
  
  records.forEach(record => {
    const row = [
      record.recordId,
      record.agencyId,
      record.incident.incidentNumber,
      record.incident.incidentDate.toISOString(),
      record.incident.incidentType,
      record.patient.demographics.age,
      record.patient.demographics.gender,
      record.clinical.chiefComplaint || '',
      record.clinical.primaryImpression || ''
    ];
    csv += row.join(',') + '\n';
  });
  
  return csv;
}

module.exports = router;