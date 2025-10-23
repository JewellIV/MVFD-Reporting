const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const mongoose = require('mongoose');

const execAsync = promisify(exec);

class BackupService {
  constructor() {
    this.backupDir = process.env.BACKUP_DIR || './backups';
    this.ensureBackupDirectory();
  }

  ensureBackupDirectory() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  // Create full database backup
  async createFullBackup() {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupName = `full-backup-${timestamp}`;
      const backupPath = path.join(this.backupDir, backupName);

      // Create backup directory
      fs.mkdirSync(backupPath, { recursive: true });

      // Export all collections
      const collections = await this.getCollections();
      const exportPromises = collections.map(collection => 
        this.exportCollection(collection, backupPath)
      );

      await Promise.all(exportPromises);

      // Create metadata file
      const metadata = {
        type: 'full',
        timestamp: new Date().toISOString(),
        collections: collections,
        version: process.env.APP_VERSION || '1.0.0',
        database: process.env.MONGODB_URI || 'mongodb://localhost:27017/mangohick-fire'
      };

      fs.writeFileSync(
        path.join(backupPath, 'metadata.json'),
        JSON.stringify(metadata, null, 2)
      );

      // Compress backup
      const compressedPath = `${backupPath}.tar.gz`;
      await execAsync(`tar -czf "${compressedPath}" -C "${this.backupDir}" "${backupName}"`);

      // Remove uncompressed directory
      await execAsync(`rm -rf "${backupPath}"`);

      return {
        success: true,
        backupPath: compressedPath,
        size: this.getFileSize(compressedPath),
        timestamp: metadata.timestamp
      };

    } catch (error) {
      console.error('Full backup error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Create incremental backup
  async createIncrementalBackup(lastBackupTime) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupName = `incremental-backup-${timestamp}`;
      const backupPath = path.join(this.backupDir, backupName);

      // Create backup directory
      fs.mkdirSync(backupPath, { recursive: true });

      // Export only modified collections
      const collections = await this.getCollections();
      const modifiedCollections = await this.getModifiedCollections(collections, lastBackupTime);
      
      const exportPromises = modifiedCollections.map(collection => 
        this.exportCollection(collection, backupPath, lastBackupTime)
      );

      await Promise.all(exportPromises);

      // Create metadata file
      const metadata = {
        type: 'incremental',
        timestamp: new Date().toISOString(),
        lastBackupTime: lastBackupTime,
        collections: modifiedCollections,
        version: process.env.APP_VERSION || '1.0.0'
      };

      fs.writeFileSync(
        path.join(backupPath, 'metadata.json'),
        JSON.stringify(metadata, null, 2)
      );

      // Compress backup
      const compressedPath = `${backupPath}.tar.gz`;
      await execAsync(`tar -czf "${compressedPath}" -C "${this.backupDir}" "${backupName}"`);

      // Remove uncompressed directory
      await execAsync(`rm -rf "${backupPath}"`);

      return {
        success: true,
        backupPath: compressedPath,
        size: this.getFileSize(compressedPath),
        timestamp: metadata.timestamp
      };

    } catch (error) {
      console.error('Incremental backup error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Restore from backup
  async restoreFromBackup(backupPath) {
    try {
      // Extract backup
      const extractPath = path.join(this.backupDir, 'restore-temp');
      await execAsync(`tar -xzf "${backupPath}" -C "${this.backupDir}"`);

      // Read metadata
      const metadataPath = path.join(extractPath, 'metadata.json');
      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));

      // Restore collections
      const restorePromises = metadata.collections.map(collection => 
        this.importCollection(collection, extractPath)
      );

      await Promise.all(restorePromises);

      // Clean up
      await execAsync(`rm -rf "${extractPath}"`);

      return {
        success: true,
        restoredCollections: metadata.collections,
        timestamp: metadata.timestamp
      };

    } catch (error) {
      console.error('Restore error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get list of collections
  async getCollections() {
    try {
      const db = mongoose.connection.db;
      const collections = await db.listCollections().toArray();
      return collections.map(col => col.name);
    } catch (error) {
      console.error('Get collections error:', error);
      return [];
    }
  }

  // Get modified collections since last backup
  async getModifiedCollections(collections, lastBackupTime) {
    try {
      const modifiedCollections = [];
      
      for (const collectionName of collections) {
        const collection = mongoose.connection.db.collection(collectionName);
        const count = await collection.countDocuments({
          $or: [
            { createdAt: { $gt: new Date(lastBackupTime) } },
            { updatedAt: { $gt: new Date(lastBackupTime) } }
          ]
        });
        
        if (count > 0) {
          modifiedCollections.push(collectionName);
        }
      }
      
      return modifiedCollections;
    } catch (error) {
      console.error('Get modified collections error:', error);
      return collections; // Fallback to all collections
    }
  }

  // Export collection to JSON
  async exportCollection(collectionName, backupPath, lastBackupTime = null) {
    try {
      const collection = mongoose.connection.db.collection(collectionName);
      const query = lastBackupTime ? {
        $or: [
          { createdAt: { $gt: new Date(lastBackupTime) } },
          { updatedAt: { $gt: new Date(lastBackupTime) } }
        ]
      } : {};
      
      const documents = await collection.find(query).toArray();
      const filePath = path.join(backupPath, `${collectionName}.json`);
      
      fs.writeFileSync(filePath, JSON.stringify(documents, null, 2));
      
      return {
        collection: collectionName,
        documentCount: documents.length,
        filePath: filePath
      };
    } catch (error) {
      console.error(`Export collection ${collectionName} error:`, error);
      throw error;
    }
  }

  // Import collection from JSON
  async importCollection(collectionName, backupPath) {
    try {
      const filePath = path.join(backupPath, `${collectionName}.json`);
      
      if (!fs.existsSync(filePath)) {
        console.log(`Collection file not found: ${filePath}`);
        return { collection: collectionName, imported: 0 };
      }
      
      const documents = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const collection = mongoose.connection.db.collection(collectionName);
      
      // Clear existing data
      await collection.deleteMany({});
      
      // Insert documents
      if (documents.length > 0) {
        await collection.insertMany(documents);
      }
      
      return {
        collection: collectionName,
        imported: documents.length
      };
    } catch (error) {
      console.error(`Import collection ${collectionName} error:`, error);
      throw error;
    }
  }

  // List available backups
  listBackups() {
    try {
      const files = fs.readdirSync(this.backupDir);
      const backups = files
        .filter(file => file.endsWith('.tar.gz'))
        .map(file => {
          const filePath = path.join(this.backupDir, file);
          const stats = fs.statSync(filePath);
          return {
            name: file,
            path: filePath,
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime
          };
        })
        .sort((a, b) => b.created - a.created);
      
      return backups;
    } catch (error) {
      console.error('List backups error:', error);
      return [];
    }
  }

  // Delete old backups
  async deleteOldBackups(keepDays = 30) {
    try {
      const backups = this.listBackups();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - keepDays);
      
      const oldBackups = backups.filter(backup => backup.created < cutoffDate);
      
      for (const backup of oldBackups) {
        fs.unlinkSync(backup.path);
        console.log(`Deleted old backup: ${backup.name}`);
      }
      
      return {
        deleted: oldBackups.length,
        kept: backups.length - oldBackups.length
      };
    } catch (error) {
      console.error('Delete old backups error:', error);
      return { deleted: 0, kept: 0, error: error.message };
    }
  }

  // Get file size
  getFileSize(filePath) {
    try {
      const stats = fs.statSync(filePath);
      return stats.size;
    } catch (error) {
      return 0;
    }
  }

  // Schedule automatic backups
  scheduleBackups() {
    // Full backup every Sunday at 2 AM
    const fullBackupCron = '0 2 * * 0';
    
    // Incremental backup every day at 3 AM
    const incrementalBackupCron = '0 3 * * 1-6';
    
    // This would integrate with a cron job scheduler
    console.log('Backup schedule configured:');
    console.log(`Full backup: ${fullBackupCron}`);
    console.log(`Incremental backup: ${incrementalBackupCron}`);
  }
}

module.exports = BackupService;