const express = require('express');
const axios = require('axios');
const { auth, requireRole } = require('../middleware/auth');
const NemsisRecord = require('../models/NemsisRecord');
const NfirsRecord = require('../models/NfirsRecord');

const router = express.Router();

// Sync CAD incidents to NEMSIS records
router.post('/sync/incidents', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.body;
    
    // Get CAD incidents from external system
    const cadIncidents = await fetchCADIncidents(startDate, endDate);
    
    const syncResults = [];
    
    for (const incident of cadIncidents) {
      try {
        // Check if incident already exists
        const existingRecord = await NemsisRecord.findOne({
          'incident.incidentNumber': incident.incidentNumber
        });
        
        if (existingRecord) {
          syncResults.push({
            incidentNumber: incident.incidentNumber,
            status: 'exists',
            message: 'Record already exists'
          });
          continue;
        }
        
        // Create new NEMSIS record from CAD data
        const recordId = `CAD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        const nemsisRecord = new NemsisRecord({
          recordId,
          agencyId: 'MANGOHICK-VFD-001',
          incident: {
            incidentNumber: incident.incidentNumber,
            incidentDate: new Date(incident.incidentDate),
            incidentType: incident.incidentType,
            location: {
              address: incident.address,
              city: incident.city,
              state: incident.state,
              zipCode: incident.zipCode,
              latitude: incident.latitude,
              longitude: incident.longitude
            },
            responseMode: incident.responseMode,
            dispatchTime: incident.dispatchTime ? new Date(incident.dispatchTime) : null,
            enRouteTime: incident.enRouteTime ? new Date(incident.enRouteTime) : null,
            arrivalTime: incident.arrivalTime ? new Date(incident.arrivalTime) : null,
            clearTime: incident.clearTime ? new Date(incident.clearTime) : null
          },
          crew: incident.crew || [],
          createdBy: req.user._id,
          syncStatus: 'Synced'
        });
        
        await nemsisRecord.save();
        
        syncResults.push({
          incidentNumber: incident.incidentNumber,
          status: 'created',
          recordId: nemsisRecord._id
        });
        
      } catch (error) {
        syncResults.push({
          incidentNumber: incident.incidentNumber,
          status: 'error',
          error: error.message
        });
      }
    }
    
    res.json({
      message: 'CAD sync completed',
      totalProcessed: cadIncidents.length,
      results: syncResults
    });
    
  } catch (error) {
    console.error('CAD sync error:', error);
    res.status(500).json({ error: 'Server error during CAD sync' });
  }
});

// Sync CAD fire incidents to NFIRS records
router.post('/sync/fire-incidents', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.body;
    
    // Get CAD fire incidents from external system
    const cadFireIncidents = await fetchCADFireIncidents(startDate, endDate);
    
    const syncResults = [];
    
    for (const incident of cadFireIncidents) {
      try {
        // Check if incident already exists
        const existingRecord = await NfirsRecord.findOne({
          incidentNumber: incident.incidentNumber
        });
        
        if (existingRecord) {
          syncResults.push({
            incidentNumber: incident.incidentNumber,
            status: 'exists',
            message: 'Record already exists'
          });
          continue;
        }
        
        // Create new NFIRS record from CAD data
        const nfirsRecord = new NfirsRecord({
          incidentNumber: incident.incidentNumber,
          incidentDate: new Date(incident.incidentDate),
          alarmTime: incident.alarmTime ? new Date(incident.alarmTime) : null,
          arrivalTime: incident.arrivalTime ? new Date(incident.arrivalTime) : null,
          controlledTime: incident.controlledTime ? new Date(incident.controlledTime) : null,
          lastUnitClearedTime: incident.lastUnitClearedTime ? new Date(incident.lastUnitClearedTime) : null,
          location: {
            address: incident.address,
            city: incident.city,
            state: incident.state || 'VA',
            zipCode: incident.zipCode,
            county: incident.county,
            latitude: incident.latitude,
            longitude: incident.longitude
          },
          incidentType: incident.incidentType,
          incidentTypeCode: incident.incidentTypeCode,
          actionTaken: incident.actionTaken || [],
          suppressionApparatus: incident.suppressionApparatus || [],
          personnel: incident.personnel || [],
          apparatus: incident.apparatus || [],
          createdBy: req.user._id,
          syncStatus: 'Synced'
        });
        
        await nfirsRecord.save();
        
        syncResults.push({
          incidentNumber: incident.incidentNumber,
          status: 'created',
          recordId: nfirsRecord._id
        });
        
      } catch (error) {
        syncResults.push({
          incidentNumber: incident.incidentNumber,
          status: 'error',
          error: error.message
        });
      }
    }
    
    res.json({
      message: 'CAD fire incidents sync completed',
      totalProcessed: cadFireIncidents.length,
      results: syncResults
    });
    
  } catch (error) {
    console.error('CAD fire incidents sync error:', error);
    res.status(500).json({ error: 'Server error during CAD fire incidents sync' });
  }
});

// Get CAD system status
router.get('/status', auth, async (req, res) => {
  try {
    const cadStatus = await checkCADSystemStatus();
    
    res.json({
      status: cadStatus.connected ? 'connected' : 'disconnected',
      lastSync: cadStatus.lastSync,
      totalIncidents: cadStatus.totalIncidents,
      pendingSync: cadStatus.pendingSync
    });
    
  } catch (error) {
    console.error('CAD status check error:', error);
    res.status(500).json({ error: 'Server error checking CAD status' });
  }
});

// Manual sync trigger
router.post('/sync/manual', auth, requireRole(['admin', 'officer']), async (req, res) => {
  try {
    const { syncType, dateRange } = req.body;
    
    let result;
    
    switch (syncType) {
      case 'nemsis':
        result = await syncCADToNEMSIS(dateRange);
        break;
      case 'nfirs':
        result = await syncCADToNFIRS(dateRange);
        break;
      case 'both':
        const nemsisResult = await syncCADToNEMSIS(dateRange);
        const nfirsResult = await syncCADToNFIRS(dateRange);
        result = {
          nemsis: nemsisResult,
          nfirs: nfirsResult
        };
        break;
      default:
        return res.status(400).json({ error: 'Invalid sync type' });
    }
    
    res.json({
      message: 'Manual sync completed',
      result
    });
    
  } catch (error) {
    console.error('Manual CAD sync error:', error);
    res.status(500).json({ error: 'Server error during manual sync' });
  }
});

// Helper function to fetch CAD incidents
async function fetchCADIncidents(startDate, endDate) {
  try {
    const response = await axios.get(`${process.env.CAD_SYSTEM_URL}/incidents`, {
      headers: {
        'Authorization': `Bearer ${process.env.CAD_API_KEY}`,
        'Content-Type': 'application/json'
      },
      params: {
        startDate,
        endDate,
        department: 'MANGOHICK-VFD'
      }
    });
    
    return response.data.incidents || [];
  } catch (error) {
    console.error('Error fetching CAD incidents:', error);
    throw new Error('Failed to fetch CAD incidents');
  }
}

// Helper function to fetch CAD fire incidents
async function fetchCADFireIncidents(startDate, endDate) {
  try {
    const response = await axios.get(`${process.env.CAD_SYSTEM_URL}/fire-incidents`, {
      headers: {
        'Authorization': `Bearer ${process.env.CAD_API_KEY}`,
        'Content-Type': 'application/json'
      },
      params: {
        startDate,
        endDate,
        department: 'MANGOHICK-VFD'
      }
    });
    
    return response.data.incidents || [];
  } catch (error) {
    console.error('Error fetching CAD fire incidents:', error);
    throw new Error('Failed to fetch CAD fire incidents');
  }
}

// Helper function to check CAD system status
async function checkCADSystemStatus() {
  try {
    const response = await axios.get(`${process.env.CAD_SYSTEM_URL}/status`, {
      headers: {
        'Authorization': `Bearer ${process.env.CAD_API_KEY}`
      },
      timeout: 5000
    });
    
    return {
      connected: true,
      lastSync: response.data.lastSync,
      totalIncidents: response.data.totalIncidents,
      pendingSync: response.data.pendingSync
    };
  } catch (error) {
    console.error('CAD system status check failed:', error);
    return {
      connected: false,
      lastSync: null,
      totalIncidents: 0,
      pendingSync: 0
    };
  }
}

// Helper function to sync CAD to NEMSIS
async function syncCADToNEMSIS(dateRange) {
  const cadIncidents = await fetchCADIncidents(dateRange.startDate, dateRange.endDate);
  const results = [];
  
  for (const incident of cadIncidents) {
    try {
      const existingRecord = await NemsisRecord.findOne({
        'incident.incidentNumber': incident.incidentNumber
      });
      
      if (existingRecord) {
        results.push({
          incidentNumber: incident.incidentNumber,
          status: 'exists'
        });
        continue;
      }
      
      const recordId = `CAD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const nemsisRecord = new NemsisRecord({
        recordId,
        agencyId: 'MANGOHICK-VFD-001',
        incident: {
          incidentNumber: incident.incidentNumber,
          incidentDate: new Date(incident.incidentDate),
          incidentType: incident.incidentType,
          location: {
            address: incident.address,
            city: incident.city,
            state: incident.state,
            zipCode: incident.zipCode,
            latitude: incident.latitude,
            longitude: incident.longitude
          },
          responseMode: incident.responseMode,
          dispatchTime: incident.dispatchTime ? new Date(incident.dispatchTime) : null,
          enRouteTime: incident.enRouteTime ? new Date(incident.enRouteTime) : null,
          arrivalTime: incident.arrivalTime ? new Date(incident.arrivalTime) : null,
          clearTime: incident.clearTime ? new Date(incident.clearTime) : null
        },
        crew: incident.crew || [],
        syncStatus: 'Synced'
      });
      
      await nemsisRecord.save();
      
      results.push({
        incidentNumber: incident.incidentNumber,
        status: 'created',
        recordId: nemsisRecord._id
      });
      
    } catch (error) {
      results.push({
        incidentNumber: incident.incidentNumber,
        status: 'error',
        error: error.message
      });
    }
  }
  
  return {
    totalProcessed: cadIncidents.length,
    results
  };
}

// Helper function to sync CAD to NFIRS
async function syncCADToNFIRS(dateRange) {
  const cadFireIncidents = await fetchCADFireIncidents(dateRange.startDate, dateRange.endDate);
  const results = [];
  
  for (const incident of cadFireIncidents) {
    try {
      const existingRecord = await NfirsRecord.findOne({
        incidentNumber: incident.incidentNumber
      });
      
      if (existingRecord) {
        results.push({
          incidentNumber: incident.incidentNumber,
          status: 'exists'
        });
        continue;
      }
      
      const nfirsRecord = new NfirsRecord({
        incidentNumber: incident.incidentNumber,
        incidentDate: new Date(incident.incidentDate),
        alarmTime: incident.alarmTime ? new Date(incident.alarmTime) : null,
        arrivalTime: incident.arrivalTime ? new Date(incident.arrivalTime) : null,
        controlledTime: incident.controlledTime ? new Date(incident.controlledTime) : null,
        lastUnitClearedTime: incident.lastUnitClearedTime ? new Date(incident.lastUnitClearedTime) : null,
        location: {
          address: incident.address,
          city: incident.city,
          state: incident.state || 'VA',
          zipCode: incident.zipCode,
          county: incident.county,
          latitude: incident.latitude,
          longitude: incident.longitude
        },
        incidentType: incident.incidentType,
        incidentTypeCode: incident.incidentTypeCode,
        actionTaken: incident.actionTaken || [],
        suppressionApparatus: incident.suppressionApparatus || [],
        personnel: incident.personnel || [],
        apparatus: incident.apparatus || [],
        syncStatus: 'Synced'
      });
      
      await nfirsRecord.save();
      
      results.push({
        incidentNumber: incident.incidentNumber,
        status: 'created',
        recordId: nfirsRecord._id
      });
      
    } catch (error) {
      results.push({
        incidentNumber: incident.incidentNumber,
        status: 'error',
        error: error.message
      });
    }
  }
  
  return {
    totalProcessed: cadFireIncidents.length,
    results
  };
}

module.exports = router;