const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

class HIPAACompliance {
  constructor() {
    this.encryptionKey = process.env.ENCRYPTION_KEY || this.generateEncryptionKey();
    this.algorithm = 'aes-256-gcm';
    this.auditLog = [];
  }

  // Generate encryption key
  generateEncryptionKey() {
    return crypto.randomBytes(32).toString('hex');
  }

  // Encrypt ePHI data
  encryptEPHI(data) {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipher(this.algorithm, this.encryptionKey);
      cipher.setAAD(Buffer.from('ePHI', 'utf8'));
      
      let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      return {
        encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
        algorithm: this.algorithm
      };
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  // Decrypt ePHI data
  decryptEPHI(encryptedData) {
    try {
      const decipher = crypto.createDecipher(
        encryptedData.algorithm,
        this.encryptionKey
      );
      
      decipher.setAAD(Buffer.from('ePHI', 'utf8'));
      decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
      
      let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return JSON.parse(decrypted);
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  // Identify ePHI elements in NEMSIS data
  identifyEPHIElements(nemsisData) {
    const ephiElements = [
      'ePatient.01', // Patient Age
      'ePatient.02', // Patient Gender
      'ePatient.03', // Patient Race
      'ePatient.04', // Patient Ethnicity
      'ePatient.05', // Patient Weight
      'ePatient.06', // Patient Height
      'ePatient.07', // Patient Date of Birth
      'ePatient.08', // Patient Social Security Number
      'ePatient.09', // Patient Driver License Number
      'ePatient.10', // Patient Medical Record Number
      'ePatient.11', // Patient Name
      'ePatient.12', // Patient Address
      'ePatient.13', // Patient Phone Number
      'ePatient.14', // Patient Insurance Information
      'ePatient.15', // Patient Emergency Contact
      'ePatient.16', // Patient Emergency Contact Phone
      'ePatient.17', // Patient Emergency Contact Relationship
      'ePatient.18', // Patient Emergency Contact Address
      'ePatient.19', // Patient Emergency Contact City
      'ePatient.20', // Patient Emergency Contact State
      'ePatient.21', // Patient Emergency Contact Zip
      'ePatient.22', // Patient Emergency Contact Country
      'ePatient.23', // Patient Emergency Contact Phone 2
      'ePatient.24', // Patient Emergency Contact Phone 3
      'ePatient.25', // Patient Emergency Contact Email
      'ePatient.26', // Patient Emergency Contact Email 2
      'ePatient.27', // Patient Emergency Contact Email 3
      'ePatient.28', // Patient Emergency Contact Notes
      'ePatient.29', // Patient Emergency Contact Notes 2
      'ePatient.30', // Patient Emergency Contact Notes 3
    ];

    const ephiData = {};
    
    for (const element of ephiElements) {
      if (this.getElementValue(nemsisData, element)) {
        ephiData[element] = this.getElementValue(nemsisData, element);
      }
    }

    return ephiData;
  }

  // Get element value from nested object
  getElementValue(data, elementPath) {
    const path = elementPath.split('.');
    let current = data;
    
    for (const key of path) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return null;
      }
    }
    
    return current;
  }

  // Create audit log entry
  createAuditLogEntry(action, userId, resourceId, details = {}) {
    const auditEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      action,
      userId,
      resourceId,
      details,
      ipAddress: details.ipAddress || 'unknown',
      userAgent: details.userAgent || 'unknown',
      sessionId: details.sessionId || 'unknown'
    };

    this.auditLog.push(auditEntry);
    
    // In a real implementation, this would be stored in a secure database
    console.log('AUDIT LOG:', JSON.stringify(auditEntry, null, 2));
    
    return auditEntry;
  }

  // Get audit log entries
  getAuditLogEntries(filters = {}) {
    let filteredLog = this.auditLog;

    if (filters.userId) {
      filteredLog = filteredLog.filter(entry => entry.userId === filters.userId);
    }

    if (filters.action) {
      filteredLog = filteredLog.filter(entry => entry.action === filters.action);
    }

    if (filters.resourceId) {
      filteredLog = filteredLog.filter(entry => entry.resourceId === filters.resourceId);
    }

    if (filters.startDate) {
      filteredLog = filteredLog.filter(entry => 
        new Date(entry.timestamp) >= new Date(filters.startDate)
      );
    }

    if (filters.endDate) {
      filteredLog = filteredLog.filter(entry => 
        new Date(entry.timestamp) <= new Date(filters.endDate)
      );
    }

    return filteredLog.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  // Role-based access control (RBAC)
  checkAccess(userRole, resourceType, action) {
    const permissions = {
      admin: {
        nemsis: ['create', 'read', 'update', 'delete', 'export'],
        nfirs: ['create', 'read', 'update', 'delete', 'export'],
        roster: ['create', 'read', 'update', 'delete', 'export'],
        audit: ['read', 'export']
      },
      officer: {
        nemsis: ['create', 'read', 'update', 'delete'],
        nfirs: ['create', 'read', 'update', 'delete'],
        roster: ['read', 'update'],
        audit: ['read']
      },
      firefighter: {
        nemsis: ['create', 'read', 'update'],
        nfirs: ['create', 'read', 'update'],
        roster: ['read'],
        audit: []
      },
      emt: {
        nemsis: ['create', 'read', 'update'],
        nfirs: ['read'],
        roster: ['read'],
        audit: []
      },
      paramedic: {
        nemsis: ['create', 'read', 'update'],
        nfirs: ['read'],
        roster: ['read'],
        audit: []
      }
    };

    const userPermissions = permissions[userRole];
    if (!userPermissions) {
      return false;
    }

    const resourcePermissions = userPermissions[resourceType];
    if (!resourcePermissions) {
      return false;
    }

    return resourcePermissions.includes(action);
  }

  // Minimum necessary principle
  filterEPHIData(data, userRole, purpose) {
    const ephiData = this.identifyEPHIElements(data);
    const filteredData = { ...data };

    // Remove ePHI elements based on role and purpose
    if (userRole === 'firefighter' && purpose === 'incident-reporting') {
      // Firefighters only need basic patient info for incident reporting
      const allowedElements = ['ePatient.01', 'ePatient.02']; // Age and Gender only
      
      for (const element in ephiData) {
        if (!allowedElements.includes(element)) {
          this.removeElement(filteredData, element);
        }
      }
    } else if (userRole === 'emt' && purpose === 'patient-care') {
      // EMTs need more patient info for care
      const allowedElements = [
        'ePatient.01', 'ePatient.02', 'ePatient.03', 'ePatient.04',
        'ePatient.05', 'ePatient.06', 'ePatient.07'
      ];
      
      for (const element in ephiData) {
        if (!allowedElements.includes(element)) {
          this.removeElement(filteredData, element);
        }
      }
    }

    return filteredData;
  }

  // Remove element from nested object
  removeElement(data, elementPath) {
    const path = elementPath.split('.');
    let current = data;
    
    for (let i = 0; i < path.length - 1; i++) {
      if (current && typeof current === 'object' && path[i] in current) {
        current = current[path[i]];
      } else {
        return;
      }
    }
    
    if (current && typeof current === 'object') {
      delete current[path[path.length - 1]];
    }
  }

  // Data breach detection
  detectDataBreach(auditLog) {
    const breaches = [];
    
    // Check for unauthorized access attempts
    const unauthorizedAccess = auditLog.filter(entry => 
      entry.action === 'ACCESS_DENIED' && 
      entry.details.reason === 'INSUFFICIENT_PERMISSIONS'
    );
    
    if (unauthorizedAccess.length > 10) {
      breaches.push({
        type: 'UNAUTHORIZED_ACCESS_ATTEMPT',
        severity: 'HIGH',
        count: unauthorizedAccess.length,
        description: 'Multiple unauthorized access attempts detected'
      });
    }
    
    // Check for unusual access patterns
    const accessByUser = {};
    auditLog.forEach(entry => {
      if (entry.action === 'READ' || entry.action === 'UPDATE') {
        if (!accessByUser[entry.userId]) {
          accessByUser[entry.userId] = [];
        }
        accessByUser[entry.userId].push(entry);
      }
    });
    
    for (const [userId, accesses] of Object.entries(accessByUser)) {
      if (accesses.length > 100) { // Threshold for unusual activity
        breaches.push({
          type: 'UNUSUAL_ACCESS_PATTERN',
          severity: 'MEDIUM',
          userId,
          count: accesses.length,
          description: 'Unusual access pattern detected for user'
        });
      }
    }
    
    return breaches;
  }

  // Generate compliance report
  generateComplianceReport(startDate, endDate) {
    const report = {
      period: { startDate, endDate },
      generatedAt: new Date().toISOString(),
      summary: {
        totalAccessEvents: 0,
        ephiAccessEvents: 0,
        unauthorizedAccessAttempts: 0,
        dataBreaches: 0
      },
      details: {
        accessByUser: {},
        accessByResource: {},
        ephiAccess: [],
        securityIncidents: []
      }
    };

    const filteredLog = this.auditLog.filter(entry => {
      const entryDate = new Date(entry.timestamp);
      return entryDate >= new Date(startDate) && entryDate <= new Date(endDate);
    });

    // Analyze audit log
    filteredLog.forEach(entry => {
      report.summary.totalAccessEvents++;
      
      if (entry.details.ephiAccess) {
        report.summary.ephiAccessEvents++;
        report.details.ephiAccess.push(entry);
      }
      
      if (entry.action === 'ACCESS_DENIED') {
        report.summary.unauthorizedAccessAttempts++;
      }
      
      // Group by user
      if (!report.details.accessByUser[entry.userId]) {
        report.details.accessByUser[entry.userId] = 0;
      }
      report.details.accessByUser[entry.userId]++;
      
      // Group by resource
      if (!report.details.accessByResource[entry.resourceId]) {
        report.details.accessByResource[entry.resourceId] = 0;
      }
      report.details.accessByResource[entry.resourceId]++;
    });

    // Detect breaches
    const breaches = this.detectDataBreach(filteredLog);
    report.summary.dataBreaches = breaches.length;
    report.details.securityIncidents = breaches;

    return report;
  }
}

module.exports = HIPAACompliance;