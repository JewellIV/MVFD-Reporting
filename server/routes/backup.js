const express = require('express');
const { body, validationResult } = require('express-validator');
const { auth, requireRole } = require('../middleware/auth');
const BackupService = require('../services/backup/BackupService');

const router = express.Router();
const backupService = new BackupService();

// Create full backup
router.post('/full', auth, requireRole(['admin']), async (req, res) => {
  try {
    const result = await backupService.createFullBackup();
    
    if (result.success) {
      res.json({
        message: 'Full backup created successfully',
        backupPath: result.backupPath,
        size: result.size,
        timestamp: result.timestamp
      });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Create full backup error:', error);
    res.status(500).json({ error: 'Server error creating full backup' });
  }
});

// Create incremental backup
router.post('/incremental', auth, requireRole(['admin']), [
  body('lastBackupTime').isISO8601().withMessage('Valid last backup time is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { lastBackupTime } = req.body;
    const result = await backupService.createIncrementalBackup(lastBackupTime);
    
    if (result.success) {
      res.json({
        message: 'Incremental backup created successfully',
        backupPath: result.backupPath,
        size: result.size,
        timestamp: result.timestamp
      });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Create incremental backup error:', error);
    res.status(500).json({ error: 'Server error creating incremental backup' });
  }
});

// Restore from backup
router.post('/restore', auth, requireRole(['admin']), [
  body('backupPath').notEmpty().withMessage('Backup path is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { backupPath } = req.body;
    const result = await backupService.restoreFromBackup(backupPath);
    
    if (result.success) {
      res.json({
        message: 'Backup restored successfully',
        restoredCollections: result.restoredCollections,
        timestamp: result.timestamp
      });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Restore backup error:', error);
    res.status(500).json({ error: 'Server error restoring backup' });
  }
});

// List available backups
router.get('/list', auth, requireRole(['admin', 'officer']), async (req, res) => {
  try {
    const backups = backupService.listBackups();
    res.json({ backups });
  } catch (error) {
    console.error('List backups error:', error);
    res.status(500).json({ error: 'Server error listing backups' });
  }
});

// Delete old backups
router.delete('/cleanup', auth, requireRole(['admin']), [
  body('keepDays').optional().isInt({ min: 1, max: 365 }).withMessage('Keep days must be between 1 and 365')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { keepDays = 30 } = req.body;
    const result = await backupService.deleteOldBackups(keepDays);
    
    res.json({
      message: 'Old backups cleaned up successfully',
      deleted: result.deleted,
      kept: result.kept
    });
  } catch (error) {
    console.error('Delete old backups error:', error);
    res.status(500).json({ error: 'Server error deleting old backups' });
  }
});

// Download backup
router.get('/download/:backupName', auth, requireRole(['admin', 'officer']), async (req, res) => {
  try {
    const { backupName } = req.params;
    const backups = backupService.listBackups();
    const backup = backups.find(b => b.name === backupName);
    
    if (!backup) {
      return res.status(404).json({ error: 'Backup not found' });
    }

    res.download(backup.path, backup.name);
  } catch (error) {
    console.error('Download backup error:', error);
    res.status(500).json({ error: 'Server error downloading backup' });
  }
});

// Get backup status
router.get('/status', auth, requireRole(['admin', 'officer']), async (req, res) => {
  try {
    const backups = backupService.listBackups();
    const latestBackup = backups[0];
    
    const status = {
      totalBackups: backups.length,
      latestBackup: latestBackup ? {
        name: latestBackup.name,
        size: latestBackup.size,
        created: latestBackup.created
      } : null,
      totalSize: backups.reduce((sum, backup) => sum + backup.size, 0),
      lastBackupTime: latestBackup ? latestBackup.created : null
    };

    res.json(status);
  } catch (error) {
    console.error('Get backup status error:', error);
    res.status(500).json({ error: 'Server error getting backup status' });
  }
});

module.exports = router;