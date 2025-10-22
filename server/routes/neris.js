const express = require('express');
const { body, validationResult } = require('express-validator');
const NerisRecord = require('../models/NerisRecord');
const { auth, requireRole } = require('../middleware/auth');
const VDFPIntegration = require('../services/virginia/VDFPIntegration');

const router = express.Router();

// Get all NERIS records
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, startDate, endDate, incidentType } = req.query;
    const query = { createdBy: req.user._id };

    if (status) query['quality.status'] = status;
    if (incidentType) query['core.incidentTypes'] = incidentType;
    if (startDate || endDate) {
      query['core.incidentDate'] = {};
      if (startDate) query['core.incidentDate'].$gte = new Date(startDate);
      if (endDate) query['core.incidentDate'].$lte = new Date(endDate);
    }

    const records = await NerisRecord.find(query)
      .sort({ 'core.incidentDate': -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('createdBy', 'firstName lastName badgeNumber');

    const total = await NerisRecord.countDocuments(query);

    res.json({
      records,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get NERIS records error:', error);
    res.status(500).json({ error: 'Server error fetching records' });
  }
});

// Get single NERIS record
router.get('/:id', auth, async (req, res) => {
  try {
    const record = await NerisRecord.findById(req.params.id)
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
    console.error('Get NERIS record error:', error);
    res.status(500).json({ error: 'Server error fetching record' });
  }
});

// Create new NERIS record
router.post('/', auth, [
  body('core.incidentNumber').notEmpty().withMessage('Incident number is required'),
  body('core.incidentDate').isISO8601().withMessage('Valid incident date is required'),
  body('core.incidentTypes').isArray().withMessage('Incident types must be an array'),
  body('location.coordinates.latitude').isNumeric().withMessage('Latitude is required'),
  body('location.coordinates.longitude').isNumeric().withMessage('Longitude is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Check if incident number already exists
    const existingRecord = await NerisRecord.findOne({ 
      'core.incidentNumber': req.body.core.incidentNumber 
    });

    if (existingRecord) {
      return res.status(400).json({ error: 'Incident number already exists' });
    }

    const recordData = {
      ...req.body,
      createdBy: req.user._id,
      agencyId: 'MANGOHICK-VFD-001'
    };

    const record = new NerisRecord(recordData);
    await record.save();

    res.status(201).json(record);
  } catch (error) {
    console.error('Create NERIS record error:', error);
    res.status(500).json({ error: 'Server error creating record' });
  }
});

// Update NERIS record
router.put('/:id', auth, async (req, res) => {
  try {
    const record = await NerisRecord.findById(req.params.id);

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
    console.error('Update NERIS record error:', error);
    res.status(500).json({ error: 'Server error updating record' });
  }
});

// Delete NERIS record
router.delete('/:id', auth, requireRole(['admin', 'officer']), async (req, res) => {
  try {
    const record = await NerisRecord.findById(req.params.id);

    if (!record) {
      return res.status(404).json({ error: 'Record not found' });
    }

    await NerisRecord.findByIdAndDelete(req.params.id);

    res.json({ message: 'Record deleted successfully' });
  } catch (error) {
    console.error('Delete NERIS record error:', error);
    res.status(500).json({ error: 'Server error deleting record' });
  }
});

// Submit record for review
router.post('/:id/submit', auth, async (req, res) => {
  try {
    const record = await NerisRecord.findById(req.params.id);

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
    console.error('Submit NERIS record error:', error);
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
    const record = await NerisRecord.findById(req.params.id);

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
    console.error('Review NERIS record error:', error);
    res.status(500).json({ error: 'Server error reviewing record' });
  }
});

// Submit to VDFP
router.post('/:id/submit-vdfp', auth, requireRole(['admin', 'officer']), async (req, res) => {
  try {
    const record = await NerisRecord.findById(req.params.id);

    if (!record) {
      return res.status(404).json({ error: 'Record not found' });
    }

    if (record.quality.status !== 'Approved') {
      return res.status(400).json({ error: 'Record must be approved before submission' });
    }

    const vdfpIntegration = new VDFPIntegration();
    const result = await vdfpIntegration.submitNerisRecord(record.toObject());

    if (result.success) {
      record.syncStatus = 'Synced';
      record.lastModifiedBy = req.user._id;
      await record.save();
    }

    res.json(result);
  } catch (error) {
    console.error('VDFP submission error:', error);
    res.status(500).json({ error: 'Server error submitting to VDFP' });
  }
});

// Get GIS data for location
router.get('/gis/location/:lat/:lng', auth, async (req, res) => {
  try {
    const { lat, lng } = req.params;
    
    // This would integrate with your GIS service
    // For now, return mock data
    const gisData = {
      address: {
        streetNumber: '123',
        streetName: 'Main St',
        streetType: 'Street',
        city: 'Richmond',
        state: 'VA',
        zipCode: '23219',
        country: 'US'
      },
      parcel: {
        parcelId: 'PARCEL-' + Math.random().toString(36).substr(2, 9),
        owner: 'Property Owner',
        propertyType: 'Residential',
        landUse: 'Single Family',
        buildingValue: 250000,
        landValue: 50000,
        totalValue: 300000,
        yearBuilt: 1995,
        squareFootage: 2000,
        stories: 2
      },
      census: {
        tract: '1234.56',
        blockGroup: '1',
        block: '1234',
        county: 'Richmond City',
        state: 'VA'
      }
    };

    res.json(gisData);
  } catch (error) {
    console.error('GIS data error:', error);
    res.status(500).json({ error: 'Server error fetching GIS data' });
  }
});

// Get weather data for location
router.get('/weather/:lat/:lng', auth, async (req, res) => {
  try {
    const { lat, lng } = req.params;
    
    // This would integrate with National Weather Service API
    // For now, return mock data
    const weatherData = {
      temperature: 72,
      temperatureUnit: 'F',
      windSpeed: '10 mph',
      windDirection: 'NW',
      shortForecast: 'Partly Cloudy',
      detailedForecast: 'Partly cloudy with a chance of rain',
      icon: 'https://api.weather.gov/icons/land/day/sct',
      timestamp: new Date().toISOString()
    };

    res.json(weatherData);
  } catch (error) {
    console.error('Weather data error:', error);
    res.status(500).json({ error: 'Server error fetching weather data' });
  }
});

// Export NERIS data
router.get('/export/:format', auth, requireRole(['admin', 'officer']), async (req, res) => {
  try {
    const { format } = req.params;
    const { startDate, endDate, status } = req.query;

    const query = {};
    if (startDate || endDate) {
      query['core.incidentDate'] = {};
      if (startDate) query['core.incidentDate'].$gte = new Date(startDate);
      if (endDate) query['core.incidentDate'].$lte = new Date(endDate);
    }
    if (status) query['quality.status'] = status;

    const records = await NerisRecord.find(query)
      .populate('createdBy', 'firstName lastName badgeNumber');

    if (format === 'xml') {
      // Convert to NERIS XML format
      const xml = convertToNerisXML(records);
      res.setHeader('Content-Type', 'application/xml');
      res.setHeader('Content-Disposition', 'attachment; filename="neris-export.xml"');
      res.send(xml);
    } else if (format === 'csv') {
      // Convert to CSV format
      const csv = convertToCSV(records);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="neris-export.csv"');
      res.send(csv);
    } else {
      res.status(400).json({ error: 'Invalid format. Use xml or csv' });
    }
  } catch (error) {
    console.error('Export NERIS data error:', error);
    res.status(500).json({ error: 'Server error exporting data' });
  }
});

// Helper function to convert records to NERIS XML format
function convertToNerisXML(records) {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<NERISDataSet>\n';
  
  records.forEach(record => {
    xml += '  <Incident>\n';
    xml += `    <IncidentNumber>${record.core.incidentNumber}</IncidentNumber>\n`;
    xml += `    <IncidentDate>${record.core.incidentDate.toISOString()}</IncidentDate>\n`;
    xml += `    <IncidentTypes>${record.core.incidentTypes.join(',')}</IncidentTypes>\n`;
    xml += `    <Latitude>${record.location.coordinates.latitude}</Latitude>\n`;
    xml += `    <Longitude>${record.location.coordinates.longitude}</Longitude>\n`;
    // Add more fields as needed
    xml += '  </Incident>\n';
  });
  
  xml += '</NERISDataSet>';
  return xml;
}

// Helper function to convert records to CSV format
function convertToCSV(records) {
  const headers = [
    'IncidentNumber', 'IncidentDate', 'IncidentTypes', 'Latitude', 'Longitude',
    'Address', 'City', 'State', 'ZipCode', 'Status'
  ];
  
  let csv = headers.join(',') + '\n';
  
  records.forEach(record => {
    const row = [
      record.core.incidentNumber,
      record.core.incidentDate.toISOString(),
      record.core.incidentTypes.join(';'),
      record.location.coordinates.latitude,
      record.location.coordinates.longitude,
      record.location.address?.streetName || '',
      record.location.address?.city || '',
      record.location.address?.state || '',
      record.location.address?.zipCode || '',
      record.quality.status || ''
    ];
    csv += row.join(',') + '\n';
  });
  
  return csv;
}

module.exports = router;