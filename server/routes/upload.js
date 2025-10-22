const express = require('express');
const axios = require('axios');
const { auth, requireRole } = require('../middleware/auth');
const NemsisRecord = require('../models/NemsisRecord');
const NfirsRecord = require('../models/NfirsRecord');

const router = express.Router();

// Upload NEMSIS records to Virginia state
router.post('/virginia/nemsis', auth, requireRole(['admin', 'officer']), async (req, res) => {
  try {
    const { recordIds, startDate, endDate } = req.body;
    
    let records;
    if (recordIds && recordIds.length > 0) {
      records = await NemsisRecord.find({
        _id: { $in: recordIds },
        'quality.status': 'Approved'
      });
    } else {
      const query = { 'quality.status': 'Approved' };
      if (startDate || endDate) {
        query['incident.incidentDate'] = {};
        if (startDate) query['incident.incidentDate'].$gte = new Date(startDate);
        if (endDate) query['incident.incidentDate'].$lte = new Date(endDate);
      }
      records = await NemsisRecord.find(query);
    }

    if (records.length === 0) {
      return res.status(400).json({ error: 'No approved records found for upload' });
    }

    // Convert records to Virginia state format
    const vaFormatData = convertToVirginiaFormat(records, 'nemsis');
    
    // Upload to Virginia state system
    const uploadResult = await uploadToVirginiaState(vaFormatData, 'nemsis');
    
    // Update record sync status
    for (const record of records) {
      record.syncStatus = uploadResult.success ? 'Synced' : 'Error';
      if (!uploadResult.success) {
        record.quality.validationErrors = uploadResult.errors || [];
      }
      await record.save();
    }

    res.json({
      message: 'Virginia state upload completed',
      totalRecords: records.length,
      success: uploadResult.success,
      errors: uploadResult.errors || []
    });

  } catch (error) {
    console.error('Virginia NEMSIS upload error:', error);
    res.status(500).json({ error: 'Server error uploading to Virginia state' });
  }
});

// Upload NFIRS records to Virginia state
router.post('/virginia/nfirs', auth, requireRole(['admin', 'officer']), async (req, res) => {
  try {
    const { recordIds, startDate, endDate } = req.body;
    
    let records;
    if (recordIds && recordIds.length > 0) {
      records = await NfirsRecord.find({
        _id: { $in: recordIds },
        'quality.status': 'Approved'
      });
    } else {
      const query = { 'quality.status': 'Approved' };
      if (startDate || endDate) {
        query.incidentDate = {};
        if (startDate) query.incidentDate.$gte = new Date(startDate);
        if (endDate) query.incidentDate.$lte = new Date(endDate);
      }
      records = await NfirsRecord.find(query);
    }

    if (records.length === 0) {
      return res.status(400).json({ error: 'No approved records found for upload' });
    }

    // Convert records to Virginia state format
    const vaFormatData = convertToVirginiaFormat(records, 'nfirs');
    
    // Upload to Virginia state system
    const uploadResult = await uploadToVirginiaState(vaFormatData, 'nfirs');
    
    // Update record sync status
    for (const record of records) {
      record.syncStatus = uploadResult.success ? 'Synced' : 'Error';
      if (!uploadResult.success) {
        record.quality.validationErrors = uploadResult.errors || [];
      }
      await record.save();
    }

    res.json({
      message: 'Virginia state upload completed',
      totalRecords: records.length,
      success: uploadResult.success,
      errors: uploadResult.errors || []
    });

  } catch (error) {
    console.error('Virginia NFIRS upload error:', error);
    res.status(500).json({ error: 'Server error uploading to Virginia state' });
  }
});

// Upload NEMSIS records to federal system
router.post('/federal/nemsis', auth, requireRole(['admin', 'officer']), async (req, res) => {
  try {
    const { recordIds, startDate, endDate } = req.body;
    
    let records;
    if (recordIds && recordIds.length > 0) {
      records = await NemsisRecord.find({
        _id: { $in: recordIds },
        'quality.status': 'Approved'
      });
    } else {
      const query = { 'quality.status': 'Approved' };
      if (startDate || endDate) {
        query['incident.incidentDate'] = {};
        if (startDate) query['incident.incidentDate'].$gte = new Date(startDate);
        if (endDate) query['incident.incidentDate'].$lte = new Date(endDate);
      }
      records = await NemsisRecord.find(query);
    }

    if (records.length === 0) {
      return res.status(400).json({ error: 'No approved records found for upload' });
    }

    // Convert records to federal NEMSIS format
    const federalFormatData = convertToFederalFormat(records, 'nemsis');
    
    // Upload to federal system
    const uploadResult = await uploadToFederalSystem(federalFormatData, 'nemsis');
    
    // Update record sync status
    for (const record of records) {
      record.syncStatus = uploadResult.success ? 'Synced' : 'Error';
      if (!uploadResult.success) {
        record.quality.validationErrors = uploadResult.errors || [];
      }
      await record.save();
    }

    res.json({
      message: 'Federal upload completed',
      totalRecords: records.length,
      success: uploadResult.success,
      errors: uploadResult.errors || []
    });

  } catch (error) {
    console.error('Federal NEMSIS upload error:', error);
    res.status(500).json({ error: 'Server error uploading to federal system' });
  }
});

// Upload NFIRS records to federal system
router.post('/federal/nfirs', auth, requireRole(['admin', 'officer']), async (req, res) => {
  try {
    const { recordIds, startDate, endDate } = req.body;
    
    let records;
    if (recordIds && recordIds.length > 0) {
      records = await NfirsRecord.find({
        _id: { $in: recordIds },
        'quality.status': 'Approved'
      });
    } else {
      const query = { 'quality.status': 'Approved' };
      if (startDate || endDate) {
        query.incidentDate = {};
        if (startDate) query.incidentDate.$gte = new Date(startDate);
        if (endDate) query.incidentDate.$lte = new Date(endDate);
      }
      records = await NfirsRecord.find(query);
    }

    if (records.length === 0) {
      return res.status(400).json({ error: 'No approved records found for upload' });
    }

    // Convert records to federal format
    const federalFormatData = convertToFederalFormat(records, 'nfirs');
    
    // Upload to federal system
    const uploadResult = await uploadToFederalSystem(federalFormatData, 'nfirs');
    
    // Update record sync status
    for (const record of records) {
      record.syncStatus = uploadResult.success ? 'Synced' : 'Error';
      if (!uploadResult.success) {
        record.quality.validationErrors = uploadResult.errors || [];
      }
      await record.save();
    }

    res.json({
      message: 'Federal upload completed',
      totalRecords: records.length,
      success: uploadResult.success,
      errors: uploadResult.errors || []
    });

  } catch (error) {
    console.error('Federal NFIRS upload error:', error);
    res.status(500).json({ error: 'Server error uploading to federal system' });
  }
});

// Get upload status
router.get('/status', auth, async (req, res) => {
  try {
    const nemsisStats = await NemsisRecord.aggregate([
      {
        $group: {
          _id: '$syncStatus',
          count: { $sum: 1 }
        }
      }
    ]);

    const nfirsStats = await NfirsRecord.aggregate([
      {
        $group: {
          _id: '$syncStatus',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      nemsis: nemsisStats,
      nfirs: nfirsStats
    });
  } catch (error) {
    console.error('Get upload status error:', error);
    res.status(500).json({ error: 'Server error fetching upload status' });
  }
});

// Helper function to convert records to Virginia state format
function convertToVirginiaFormat(records, type) {
  if (type === 'nemsis') {
    return records.map(record => ({
      recordId: record.recordId,
      agencyId: record.agencyId,
      incidentNumber: record.incident.incidentNumber,
      incidentDate: record.incident.incidentDate.toISOString(),
      incidentType: record.incident.incidentType,
      location: {
        address: record.incident.location.address,
        city: record.incident.location.city,
        state: record.incident.location.state,
        zipCode: record.incident.location.zipCode,
        county: record.incident.location.county
      },
      patient: {
        age: record.patient.demographics.age,
        gender: record.patient.demographics.gender,
        race: record.patient.demographics.race,
        ethnicity: record.patient.demographics.ethnicity
      },
      clinical: {
        chiefComplaint: record.clinical.chiefComplaint,
        primaryImpression: record.clinical.primaryImpression,
        vitalSigns: record.clinical.vitalSigns
      },
      transport: record.transport,
      crew: record.crew
    }));
  } else if (type === 'nfirs') {
    return records.map(record => ({
      incidentNumber: record.incidentNumber,
      incidentDate: record.incidentDate.toISOString(),
      incidentType: record.incidentType,
      location: {
        address: record.location.address,
        city: record.location.city,
        state: record.location.state,
        zipCode: record.location.zipCode,
        county: record.location.county
      },
      loss: record.loss,
      cause: record.cause,
      personnel: record.personnel,
      apparatus: record.apparatus
    }));
  }
}

// Helper function to convert records to federal format
function convertToFederalFormat(records, type) {
  if (type === 'nemsis') {
    // Convert to NEMSIS 3.5 XML format
    return {
      version: '3.5',
      agencyId: 'MANGOHICK-VFD-001',
      records: records.map(record => ({
        recordId: record.recordId,
        incident: record.incident,
        patient: record.patient,
        clinical: record.clinical,
        transport: record.transport,
        crew: record.crew
      }))
    };
  } else if (type === 'nfirs') {
    // Convert to NFIRS XML format
    return {
      version: '5.0',
      agencyId: 'MANGOHICK-VFD-001',
      records: records.map(record => ({
        incidentNumber: record.incidentNumber,
        incidentDate: record.incidentDate,
        incidentType: record.incidentType,
        location: record.location,
        loss: record.loss,
        cause: record.cause,
        personnel: record.personnel,
        apparatus: record.apparatus
      }))
    };
  }
}

// Helper function to upload to Virginia state system
async function uploadToVirginiaState(data, type) {
  try {
    const response = await axios.post(
      `${process.env.VA_STATE_API_URL}/${type}`,
      data,
      {
        headers: {
          'Authorization': `Bearer ${process.env.VA_STATE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    return {
      success: true,
      response: response.data
    };
  } catch (error) {
    console.error('Virginia state upload error:', error);
    return {
      success: false,
      errors: [error.message]
    };
  }
}

// Helper function to upload to federal system
async function uploadToFederalSystem(data, type) {
  try {
    const response = await axios.post(
      `${process.env.FEDERAL_API_URL}/${type}`,
      data,
      {
        headers: {
          'Authorization': `Bearer ${process.env.FEDERAL_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    return {
      success: true,
      response: response.data
    };
  } catch (error) {
    console.error('Federal system upload error:', error);
    return {
      success: false,
      errors: [error.message]
    };
  }
}

module.exports = router;