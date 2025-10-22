const express = require('express');
const { body, validationResult } = require('express-validator');
const NfirsRecord = require('../models/NfirsRecord');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get all NFIRS records
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, startDate, endDate, incidentType } = req.query;
    const query = { createdBy: req.user._id };

    if (status) query['quality.status'] = status;
    if (incidentType) query.incidentType = incidentType;
    if (startDate || endDate) {
      query.incidentDate = {};
      if (startDate) query.incidentDate.$gte = new Date(startDate);
      if (endDate) query.incidentDate.$lte = new Date(endDate);
    }

    const records = await NfirsRecord.find(query)
      .sort({ incidentDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('createdBy', 'firstName lastName badgeNumber');

    const total = await NfirsRecord.countDocuments(query);

    res.json({
      records,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get NFIRS records error:', error);
    res.status(500).json({ error: 'Server error fetching records' });
  }
});

// Get single NFIRS record
router.get('/:id', auth, async (req, res) => {
  try {
    const record = await NfirsRecord.findById(req.params.id)
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
    console.error('Get NFIRS record error:', error);
    res.status(500).json({ error: 'Server error fetching record' });
  }
});

// Create new NFIRS record
router.post('/', auth, [
  body('incidentNumber').notEmpty().withMessage('Incident number is required'),
  body('incidentDate').isISO8601().withMessage('Valid incident date is required'),
  body('incidentType').notEmpty().withMessage('Incident type is required'),
  body('location.address').notEmpty().withMessage('Address is required'),
  body('location.city').notEmpty().withMessage('City is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Check if incident number already exists
    const existingRecord = await NfirsRecord.findOne({ 
      incidentNumber: req.body.incidentNumber 
    });

    if (existingRecord) {
      return res.status(400).json({ error: 'Incident number already exists' });
    }

    const recordData = {
      ...req.body,
      createdBy: req.user._id
    };

    const record = new NfirsRecord(recordData);
    await record.save();

    res.status(201).json(record);
  } catch (error) {
    console.error('Create NFIRS record error:', error);
    res.status(500).json({ error: 'Server error creating record' });
  }
});

// Update NFIRS record
router.put('/:id', auth, async (req, res) => {
  try {
    const record = await NfirsRecord.findById(req.params.id);

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
    console.error('Update NFIRS record error:', error);
    res.status(500).json({ error: 'Server error updating record' });
  }
});

// Delete NFIRS record
router.delete('/:id', auth, requireRole(['admin', 'officer']), async (req, res) => {
  try {
    const record = await NfirsRecord.findById(req.params.id);

    if (!record) {
      return res.status(404).json({ error: 'Record not found' });
    }

    await NfirsRecord.findByIdAndDelete(req.params.id);

    res.json({ message: 'Record deleted successfully' });
  } catch (error) {
    console.error('Delete NFIRS record error:', error);
    res.status(500).json({ error: 'Server error deleting record' });
  }
});

// Submit record for review
router.post('/:id/submit', auth, async (req, res) => {
  try {
    const record = await NfirsRecord.findById(req.params.id);

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
    console.error('Submit NFIRS record error:', error);
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
    const record = await NfirsRecord.findById(req.params.id);

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
    console.error('Review NFIRS record error:', error);
    res.status(500).json({ error: 'Server error reviewing record' });
  }
});

// Get incident statistics
router.get('/stats/overview', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const query = { createdBy: req.user._id };

    if (startDate || endDate) {
      query.incidentDate = {};
      if (startDate) query.incidentDate.$gte = new Date(startDate);
      if (endDate) query.incidentDate.$lte = new Date(endDate);
    }

    const stats = await NfirsRecord.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalIncidents: { $sum: 1 },
          totalPropertyLoss: { $sum: '$loss.propertyLoss' },
          totalContentLoss: { $sum: '$loss.contentLoss' },
          totalInjuries: { $sum: { $add: ['$loss.injuries.civilian', '$loss.injuries.firefighter'] } },
          totalFatalities: { $sum: { $add: ['$loss.lossOfLife.civilian', '$loss.lossOfLife.firefighter'] } },
          averageResponseTime: { $avg: '$suppressionApparatus.responseTime' }
        }
      }
    ]);

    const incidentTypes = await NfirsRecord.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$incidentType',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      overview: stats[0] || {
        totalIncidents: 0,
        totalPropertyLoss: 0,
        totalContentLoss: 0,
        totalInjuries: 0,
        totalFatalities: 0,
        averageResponseTime: 0
      },
      incidentTypes
    });
  } catch (error) {
    console.error('Get NFIRS stats error:', error);
    res.status(500).json({ error: 'Server error fetching statistics' });
  }
});

// Export NFIRS data for state upload
router.get('/export/:format', auth, requireRole(['admin', 'officer']), async (req, res) => {
  try {
    const { format } = req.params;
    const { startDate, endDate, status } = req.query;

    const query = {};
    if (startDate || endDate) {
      query.incidentDate = {};
      if (startDate) query.incidentDate.$gte = new Date(startDate);
      if (endDate) query.incidentDate.$lte = new Date(endDate);
    }
    if (status) query['quality.status'] = status;

    const records = await NfirsRecord.find(query)
      .populate('createdBy', 'firstName lastName badgeNumber');

    if (format === 'xml') {
      // Convert to NFIRS XML format
      const xml = convertToNfirsXML(records);
      res.setHeader('Content-Type', 'application/xml');
      res.setHeader('Content-Disposition', 'attachment; filename="nfirs-export.xml"');
      res.send(xml);
    } else if (format === 'csv') {
      // Convert to CSV format
      const csv = convertToCSV(records);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="nfirs-export.csv"');
      res.send(csv);
    } else {
      res.status(400).json({ error: 'Invalid format. Use xml or csv' });
    }
  } catch (error) {
    console.error('Export NFIRS data error:', error);
    res.status(500).json({ error: 'Server error exporting data' });
  }
});

// Helper function to convert records to NFIRS XML format
function convertToNfirsXML(records) {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<NFIRSDataSet>\n';
  
  records.forEach(record => {
    xml += '  <Incident>\n';
    xml += `    <IncidentNumber>${record.incidentNumber}</IncidentNumber>\n`;
    xml += `    <IncidentDate>${record.incidentDate.toISOString()}</IncidentDate>\n`;
    xml += `    <IncidentType>${record.incidentType}</IncidentType>\n`;
    xml += `    <Address>${record.location.address}</Address>\n`;
    xml += `    <City>${record.location.city}</City>\n`;
    xml += `    <State>${record.location.state}</State>\n`;
    xml += `    <ZipCode>${record.location.zipCode}</ZipCode>\n`;
    // Add more fields as needed
    xml += '  </Incident>\n';
  });
  
  xml += '</NFIRSDataSet>';
  return xml;
}

// Helper function to convert records to CSV format
function convertToCSV(records) {
  const headers = [
    'IncidentNumber', 'IncidentDate', 'IncidentType', 'Address', 'City', 'State', 'ZipCode',
    'PropertyLoss', 'ContentLoss', 'TotalLoss', 'CivilianInjuries', 'FirefighterInjuries'
  ];
  
  let csv = headers.join(',') + '\n';
  
  records.forEach(record => {
    const row = [
      record.incidentNumber,
      record.incidentDate.toISOString(),
      record.incidentType,
      record.location.address,
      record.location.city,
      record.location.state,
      record.location.zipCode,
      record.loss.propertyLoss || 0,
      record.loss.contentLoss || 0,
      record.loss.totalLoss || 0,
      record.loss.injuries.civilian || 0,
      record.loss.injuries.firefighter || 0
    ];
    csv += row.join(',') + '\n';
  });
  
  return csv;
}

module.exports = router;