const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get all roster members
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, role, isActive, search } = req.query;
    const query = {};

    // Apply filters
    if (role) query.role = role;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { badgeNumber: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-password')
      .sort({ lastName: 1, firstName: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    res.json({
      users,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get roster error:', error);
    res.status(500).json({ error: 'Server error fetching roster' });
  }
});

// Get single roster member
router.get('/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get roster member error:', error);
    res.status(500).json({ error: 'Server error fetching roster member' });
  }
});

// Create new roster member
router.post('/', auth, requireRole(['admin', 'officer']), [
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('role').isIn(['admin', 'officer', 'firefighter', 'emt', 'paramedic']).withMessage('Valid role is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { firstName, lastName, email, role, badgeNumber, certifications } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { badgeNumber }]
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User with this email or badge number already exists' });
    }

    // Generate username and temporary password
    const username = generateUsername(firstName, lastName);
    const tempPassword = 'temp_' + Math.random().toString(36).substr(2, 9);

    const user = new User({
      firstName,
      lastName,
      email,
      username,
      password: tempPassword,
      role,
      badgeNumber,
      certifications: certifications || [],
      department: 'Mangohick Volunteer Fire Department'
    });

    await user.save();

    res.status(201).json({
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        username: user.username,
        role: user.role,
        badgeNumber: user.badgeNumber,
        department: user.department
      },
      tempPassword
    });
  } catch (error) {
    console.error('Create roster member error:', error);
    res.status(500).json({ error: 'Server error creating roster member' });
  }
});

// Update roster member
router.put('/:id', auth, requireRole(['admin', 'officer']), [
  body('firstName').optional().notEmpty().withMessage('First name cannot be empty'),
  body('lastName').optional().notEmpty().withMessage('Last name cannot be empty'),
  body('email').optional().isEmail().withMessage('Valid email is required'),
  body('role').optional().isIn(['admin', 'officer', 'firefighter', 'emt', 'paramedic']).withMessage('Valid role is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check for duplicate email or badge number
    if (req.body.email || req.body.badgeNumber) {
      const existingUser = await User.findOne({
        _id: { $ne: req.params.id },
        $or: [
          ...(req.body.email ? [{ email: req.body.email }] : []),
          ...(req.body.badgeNumber ? [{ badgeNumber: req.body.badgeNumber }] : [])
        ]
      });

      if (existingUser) {
        return res.status(400).json({ error: 'User with this email or badge number already exists' });
      }
    }

    // Update user
    Object.assign(user, req.body);
    await user.save();

    res.json({
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        username: user.username,
        role: user.role,
        badgeNumber: user.badgeNumber,
        department: user.department,
        certifications: user.certifications,
        isActive: user.isActive
      }
    });
  } catch (error) {
    console.error('Update roster member error:', error);
    res.status(500).json({ error: 'Server error updating roster member' });
  }
});

// Deactivate roster member
router.put('/:id/deactivate', auth, requireRole(['admin', 'officer']), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.isActive = false;
    await user.save();

    res.json({ message: 'User deactivated successfully' });
  } catch (error) {
    console.error('Deactivate roster member error:', error);
    res.status(500).json({ error: 'Server error deactivating roster member' });
  }
});

// Reactivate roster member
router.put('/:id/reactivate', auth, requireRole(['admin', 'officer']), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.isActive = true;
    await user.save();

    res.json({ message: 'User reactivated successfully' });
  } catch (error) {
    console.error('Reactivate roster member error:', error);
    res.status(500).json({ error: 'Server error reactivating roster member' });
  }
});

// Delete roster member
router.delete('/:id', auth, requireRole(['admin']), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await User.findByIdAndDelete(req.params.id);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete roster member error:', error);
    res.status(500).json({ error: 'Server error deleting roster member' });
  }
});

// Get roster statistics
router.get('/stats/overview', auth, async (req, res) => {
  try {
    const stats = await User.aggregate([
      {
        $group: {
          _id: null,
          totalMembers: { $sum: 1 },
          activeMembers: {
            $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
          },
          inactiveMembers: {
            $sum: { $cond: [{ $eq: ['$isActive', false] }, 1, 0] }
          }
        }
      }
    ]);

    const roleStats = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const certificationStats = await User.aggregate([
      { $unwind: '$certifications' },
      {
        $group: {
          _id: '$certifications.type',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      overview: stats[0] || {
        totalMembers: 0,
        activeMembers: 0,
        inactiveMembers: 0
      },
      roles: roleStats,
      certifications: certificationStats
    });
  } catch (error) {
    console.error('Get roster stats error:', error);
    res.status(500).json({ error: 'Server error fetching roster statistics' });
  }
});

// Export roster to CSV
router.get('/export/csv', auth, requireRole(['admin', 'officer']), async (req, res) => {
  try {
    const users = await User.find({}).select('-password -googleTokens');

    const headers = [
      'First Name', 'Last Name', 'Email', 'Username', 'Badge Number', 'Role',
      'Department', 'Certifications', 'Active Status', 'Last Login', 'Created Date'
    ];

    const csvData = users.map(user => [
      user.firstName,
      user.lastName,
      user.email,
      user.username,
      user.badgeNumber || '',
      user.role,
      user.department,
      user.certifications.map(cert => cert.type).join('; '),
      user.isActive ? 'Yes' : 'No',
      user.lastLogin ? user.lastLogin.toISOString().split('T')[0] : '',
      user.createdAt.toISOString().split('T')[0]
    ]);

    const csv = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="roster-export.csv"');
    res.send(csv);
  } catch (error) {
    console.error('Export roster CSV error:', error);
    res.status(500).json({ error: 'Server error exporting roster' });
  }
});

// Helper function to generate username
function generateUsername(firstName, lastName) {
  const base = `${firstName.toLowerCase()}${lastName.toLowerCase()}`;
  return base.replace(/[^a-z0-9]/g, '');
}

module.exports = router;