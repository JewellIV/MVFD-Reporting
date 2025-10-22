const express = require('express');
const { google } = require('googleapis');
const { auth, requireRole } = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

// Initialize Google OAuth2 client
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Get Google OAuth URL
router.get('/auth/url', auth, (req, res) => {
  try {
    const scopes = [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email'
    ];

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: req.user._id.toString()
    });

    res.json({ authUrl });
  } catch (error) {
    console.error('Google auth URL error:', error);
    res.status(500).json({ error: 'Server error generating auth URL' });
  }
});

// Handle Google OAuth callback
router.get('/auth/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    
    if (!code || !state) {
      return res.status(400).json({ error: 'Missing authorization code or state' });
    }

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Get user info from Google
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data: userInfo } = await oauth2.userinfo.get();

    // Find user by ID from state
    const user = await User.findById(state);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update user with Google info
    user.googleId = userInfo.id;
    user.profilePicture = userInfo.picture;
    user.googleTokens = tokens;
    await user.save();

    res.json({
      message: 'Google account linked successfully',
      user: {
        id: user._id,
        name: user.fullName,
        email: user.email,
        googleId: user.googleId
      }
    });
  } catch (error) {
    console.error('Google auth callback error:', error);
    res.status(500).json({ error: 'Server error during Google authentication' });
  }
});

// Sync roster from Google Sheets
router.post('/sync/roster', auth, requireRole(['admin', 'officer']), async (req, res) => {
  try {
    const { spreadsheetId, sheetName = 'Roster' } = req.body;
    
    if (!spreadsheetId) {
      return res.status(400).json({ error: 'Spreadsheet ID is required' });
    }

    const user = await User.findById(req.user._id);
    if (!user.googleTokens) {
      return res.status(400).json({ error: 'Google account not linked' });
    }

    oauth2Client.setCredentials(user.googleTokens);

    // Get data from Google Sheets
    const sheets = google.sheets({ version: 'v4', auth: oauth2Client });
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:Z`
    });

    const rows = response.data.values;
    if (!rows || rows.length < 2) {
      return res.status(400).json({ error: 'No data found in spreadsheet' });
    }

    const headers = rows[0];
    const dataRows = rows.slice(1);

    const syncResults = [];

    for (const row of dataRows) {
      try {
        const rowData = {};
        headers.forEach((header, index) => {
          rowData[header.toLowerCase().replace(/\s+/g, '')] = row[index] || '';
        });

        // Map Google Sheets data to user fields
        const userData = {
          firstName: rowData.firstname || rowData.first_name || '',
          lastName: rowData.lastname || rowData.last_name || '',
          email: rowData.email || '',
          badgeNumber: rowData.badgenumber || rowData.badge_number || '',
          role: mapRole(rowData.role || rowData.position || ''),
          certifications: parseCertifications(rowData.certifications || ''),
          isActive: rowData.active !== 'false' && rowData.status !== 'inactive'
        };

        // Check if user exists by email or badge number
        let existingUser = null;
        if (userData.email) {
          existingUser = await User.findOne({ email: userData.email });
        }
        if (!existingUser && userData.badgeNumber) {
          existingUser = await User.findOne({ badgeNumber: userData.badgeNumber });
        }

        if (existingUser) {
          // Update existing user
          Object.assign(existingUser, userData);
          await existingUser.save();
          syncResults.push({
            name: `${userData.firstName} ${userData.lastName}`,
            status: 'updated',
            userId: existingUser._id
          });
        } else {
          // Create new user
          const newUser = new User({
            ...userData,
            username: generateUsername(userData.firstName, userData.lastName),
            password: 'temp_password_' + Math.random().toString(36).substr(2, 9)
          });
          await newUser.save();
          syncResults.push({
            name: `${userData.firstName} ${userData.lastName}`,
            status: 'created',
            userId: newUser._id
          });
        }
      } catch (error) {
        syncResults.push({
          name: 'Unknown',
          status: 'error',
          error: error.message
        });
      }
    }

    res.json({
      message: 'Roster sync completed',
      totalProcessed: dataRows.length,
      results: syncResults
    });

  } catch (error) {
    console.error('Google roster sync error:', error);
    res.status(500).json({ error: 'Server error syncing roster' });
  }
});

// Export roster to Google Sheets
router.post('/export/roster', auth, requireRole(['admin', 'officer']), async (req, res) => {
  try {
    const { spreadsheetId, sheetName = 'Exported Roster' } = req.body;
    
    const user = await User.findById(req.user._id);
    if (!user.googleTokens) {
      return res.status(400).json({ error: 'Google account not linked' });
    }

    oauth2Client.setCredentials(user.googleTokens);

    // Get all users
    const users = await User.find({ isActive: true }).select('-password');
    
    // Prepare data for Google Sheets
    const headers = [
      'First Name', 'Last Name', 'Email', 'Badge Number', 'Role', 
      'Department', 'Certifications', 'Last Login', 'Created Date'
    ];
    
    const dataRows = users.map(user => [
      user.firstName,
      user.lastName,
      user.email,
      user.badgeNumber || '',
      user.role,
      user.department,
      user.certifications.map(cert => cert.type).join(', '),
      user.lastLogin ? user.lastLogin.toISOString().split('T')[0] : '',
      user.createdAt.toISOString().split('T')[0]
    ]);

    const sheets = google.sheets({ version: 'v4', auth: oauth2Client });

    // Clear existing data
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: `${sheetName}!A:Z`
    });

    // Add new data
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A1`,
      valueInputOption: 'RAW',
      resource: {
        values: [headers, ...dataRows]
      }
    });

    res.json({
      message: 'Roster exported to Google Sheets successfully',
      spreadsheetId,
      sheetName,
      totalUsers: users.length
    });

  } catch (error) {
    console.error('Google roster export error:', error);
    res.status(500).json({ error: 'Server error exporting roster' });
  }
});

// Sync incident data to Google Sheets
router.post('/sync/incidents', auth, async (req, res) => {
  try {
    const { spreadsheetId, sheetName = 'Incidents', recordType = 'nemsis' } = req.body;
    
    if (!spreadsheetId) {
      return res.status(400).json({ error: 'Spreadsheet ID is required' });
    }

    const user = await User.findById(req.user._id);
    if (!user.googleTokens) {
      return res.status(400).json({ error: 'Google account not linked' });
    }

    oauth2Client.setCredentials(user.googleTokens);

    // Get incident data based on record type
    let records = [];
    if (recordType === 'nemsis') {
      records = await NemsisRecord.find({ createdBy: req.user._id })
        .populate('createdBy', 'firstName lastName badgeNumber');
    } else if (recordType === 'nfirs') {
      records = await NfirsRecord.find({ createdBy: req.user._id })
        .populate('createdBy', 'firstName lastName badgeNumber');
    }

    // Prepare data for Google Sheets
    const headers = recordType === 'nemsis' ? 
      ['Record ID', 'Incident Number', 'Incident Date', 'Incident Type', 'Patient Age', 'Patient Gender', 'Chief Complaint', 'Created By', 'Status'] :
      ['Incident Number', 'Incident Date', 'Incident Type', 'Address', 'City', 'Property Loss', 'Content Loss', 'Created By', 'Status'];
    
    const dataRows = records.map(record => {
      if (recordType === 'nemsis') {
        return [
          record.recordId,
          record.incident.incidentNumber,
          record.incident.incidentDate.toISOString().split('T')[0],
          record.incident.incidentType,
          record.patient?.demographics?.age || '',
          record.patient?.demographics?.gender || '',
          record.clinical?.chiefComplaint || '',
          record.createdBy?.fullName || '',
          record.quality?.status || ''
        ];
      } else {
        return [
          record.incidentNumber,
          record.incidentDate.toISOString().split('T')[0],
          record.incidentType,
          record.location?.address || '',
          record.location?.city || '',
          record.loss?.propertyLoss || 0,
          record.loss?.contentLoss || 0,
          record.createdBy?.fullName || '',
          record.quality?.status || ''
        ];
      }
    });

    const sheets = google.sheets({ version: 'v4', auth: oauth2Client });

    // Clear existing data
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: `${sheetName}!A:Z`
    });

    // Add new data
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A1`,
      valueInputOption: 'RAW',
      resource: {
        values: [headers, ...dataRows]
      }
    });

    res.json({
      message: `${recordType.toUpperCase()} incidents synced to Google Sheets successfully`,
      spreadsheetId,
      sheetName,
      totalRecords: records.length
    });

  } catch (error) {
    console.error('Google incidents sync error:', error);
    res.status(500).json({ error: 'Server error syncing incidents' });
  }
});

// Helper function to map role from Google Sheets
function mapRole(roleString) {
  const roleMap = {
    'chief': 'admin',
    'captain': 'officer',
    'lieutenant': 'officer',
    'officer': 'officer',
    'firefighter': 'firefighter',
    'emt': 'emt',
    'paramedic': 'paramedic'
  };
  
  const normalizedRole = roleString.toLowerCase().trim();
  return roleMap[normalizedRole] || 'firefighter';
}

// Helper function to parse certifications from string
function parseCertifications(certString) {
  if (!certString) return [];
  
  return certString.split(',').map(cert => ({
    type: cert.trim(),
    issueDate: new Date(),
    expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
    issuingAuthority: 'Unknown'
  }));
}

// Helper function to generate username
function generateUsername(firstName, lastName) {
  const base = `${firstName.toLowerCase()}${lastName.toLowerCase()}`;
  return base.replace(/[^a-z0-9]/g, '');
}

module.exports = router;