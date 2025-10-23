const mongoose = require('mongoose');
const axios = require('axios');
const fs = require('fs');
const os = require('os');

class HealthCheckService {
  constructor() {
    this.checks = new Map();
    this.registerDefaultChecks();
  }

  registerDefaultChecks() {
    // Database health check
    this.registerCheck('database', async () => {
      try {
        const db = mongoose.connection;
        if (db.readyState !== 1) {
          return { status: 'unhealthy', message: 'Database not connected' };
        }
        
        // Test database query
        await db.db.admin().ping();
        return { status: 'healthy', message: 'Database connected' };
      } catch (error) {
        return { status: 'unhealthy', message: `Database error: ${error.message}` };
      }
    });

    // Memory usage check
    this.registerCheck('memory', async () => {
      try {
        const memUsage = process.memoryUsage();
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;
        const memUsagePercent = (usedMem / totalMem) * 100;
        
        if (memUsagePercent > 90) {
          return { 
            status: 'unhealthy', 
            message: `High memory usage: ${memUsagePercent.toFixed(2)}%`,
            details: {
              heapUsed: memUsage.heapUsed,
              heapTotal: memUsage.heapTotal,
              external: memUsage.external,
              rss: memUsage.rss
            }
          };
        } else if (memUsagePercent > 75) {
          return { 
            status: 'warning', 
            message: `Moderate memory usage: ${memUsagePercent.toFixed(2)}%`,
            details: {
              heapUsed: memUsage.heapUsed,
              heapTotal: memUsage.heapTotal,
              external: memUsage.external,
              rss: memUsage.rss
            }
          };
        }
        
        return { 
          status: 'healthy', 
          message: `Memory usage: ${memUsagePercent.toFixed(2)}%`,
          details: {
            heapUsed: memUsage.heapUsed,
            heapTotal: memUsage.heapTotal,
            external: memUsage.external,
            rss: memUsage.rss
          }
        };
      } catch (error) {
        return { status: 'unhealthy', message: `Memory check error: ${error.message}` };
      }
    });

    // Disk space check
    this.registerCheck('disk', async () => {
      try {
        const stats = fs.statSync('.');
        const diskUsage = await this.getDiskUsage();
        
        if (diskUsage.percent > 90) {
          return { 
            status: 'unhealthy', 
            message: `High disk usage: ${diskUsage.percent.toFixed(2)}%`,
            details: diskUsage
          };
        } else if (diskUsage.percent > 75) {
          return { 
            status: 'warning', 
            message: `Moderate disk usage: ${diskUsage.percent.toFixed(2)}%`,
            details: diskUsage
          };
        }
        
        return { 
          status: 'healthy', 
          message: `Disk usage: ${diskUsage.percent.toFixed(2)}%`,
          details: diskUsage
        };
      } catch (error) {
        return { status: 'unhealthy', message: `Disk check error: ${error.message}` };
      }
    });

    // External API checks
    this.registerCheck('vphib', async () => {
      try {
        const response = await axios.get(process.env.VPHIB_API_URL + '/health', {
          timeout: 5000,
          headers: {
            'Authorization': `Bearer ${process.env.VPHIB_API_KEY}`
          }
        });
        
        if (response.status === 200) {
          return { status: 'healthy', message: 'VPHIB API accessible' };
        } else {
          return { status: 'unhealthy', message: `VPHIB API returned status ${response.status}` };
        }
      } catch (error) {
        return { status: 'unhealthy', message: `VPHIB API error: ${error.message}` };
      }
    });

    this.registerCheck('vdfp', async () => {
      try {
        const response = await axios.get(process.env.VDFP_API_URL + '/health', {
          timeout: 5000,
          headers: {
            'Authorization': `Bearer ${process.env.VDFP_API_KEY}`
          }
        });
        
        if (response.status === 200) {
          return { status: 'healthy', message: 'VDFP API accessible' };
        } else {
          return { status: 'unhealthy', message: `VDFP API returned status ${response.status}` };
        }
      } catch (error) {
        return { status: 'unhealthy', message: `VDFP API error: ${error.message}` };
      }
    });

    // Google API check
    this.registerCheck('google', async () => {
      try {
        const response = await axios.get('https://www.googleapis.com/oauth2/v1/tokeninfo', {
          timeout: 5000,
          params: {
            access_token: process.env.GOOGLE_ACCESS_TOKEN
          }
        });
        
        if (response.status === 200) {
          return { status: 'healthy', message: 'Google API accessible' };
        } else {
          return { status: 'unhealthy', message: `Google API returned status ${response.status}` };
        }
      } catch (error) {
        return { status: 'unhealthy', message: `Google API error: ${error.message}` };
      }
    });
  }

  // Register a custom health check
  registerCheck(name, checkFunction) {
    this.checks.set(name, checkFunction);
  }

  // Run all health checks
  async runAllChecks() {
    const results = {};
    const startTime = Date.now();
    
    for (const [name, checkFunction] of this.checks) {
      try {
        const checkStartTime = Date.now();
        const result = await checkFunction();
        const checkDuration = Date.now() - checkStartTime;
        
        results[name] = {
          ...result,
          duration: checkDuration,
          timestamp: new Date().toISOString()
        };
      } catch (error) {
        results[name] = {
          status: 'unhealthy',
          message: `Check failed: ${error.message}`,
          duration: 0,
          timestamp: new Date().toISOString()
        };
      }
    }
    
    const totalDuration = Date.now() - startTime;
    const overallStatus = this.calculateOverallStatus(results);
    
    return {
      status: overallStatus,
      duration: totalDuration,
      timestamp: new Date().toISOString(),
      checks: results
    };
  }

  // Run a specific health check
  async runCheck(name) {
    const checkFunction = this.checks.get(name);
    if (!checkFunction) {
      throw new Error(`Health check '${name}' not found`);
    }
    
    const startTime = Date.now();
    try {
      const result = await checkFunction();
      const duration = Date.now() - startTime;
      
      return {
        ...result,
        duration,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: `Check failed: ${error.message}`,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Calculate overall system status
  calculateOverallStatus(results) {
    const statuses = Object.values(results).map(result => result.status);
    
    if (statuses.includes('unhealthy')) {
      return 'unhealthy';
    } else if (statuses.includes('warning')) {
      return 'warning';
    } else {
      return 'healthy';
    }
  }

  // Get system metrics
  async getSystemMetrics() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    const uptime = process.uptime();
    
    return {
      memory: {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external,
        rss: memUsage.rss
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      uptime: uptime,
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      pid: process.pid
    };
  }

  // Get disk usage (simplified)
  async getDiskUsage() {
    try {
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);
      
      const { stdout } = await execAsync('df -h .');
      const lines = stdout.trim().split('\n');
      const dataLine = lines[1].split(/\s+/);
      
      const total = this.parseSize(dataLine[1]);
      const used = this.parseSize(dataLine[2]);
      const available = this.parseSize(dataLine[3]);
      const percent = parseFloat(dataLine[4].replace('%', ''));
      
      return {
        total,
        used,
        available,
        percent
      };
    } catch (error) {
      // Fallback for Windows or if df command fails
      return {
        total: 0,
        used: 0,
        available: 0,
        percent: 0
      };
    }
  }

  // Parse size string (e.g., "1G", "500M")
  parseSize(sizeStr) {
    const units = { K: 1024, M: 1024 * 1024, G: 1024 * 1024 * 1024, T: 1024 * 1024 * 1024 * 1024 };
    const match = sizeStr.match(/^(\d+(?:\.\d+)?)([KMGTP])?$/);
    
    if (match) {
      const value = parseFloat(match[1]);
      const unit = match[2] || 'B';
      return value * (units[unit] || 1);
    }
    
    return 0;
  }

  // Get application metrics
  async getApplicationMetrics() {
    try {
      const NemsisRecord = mongoose.model('NemsisRecord');
      const NfirsRecord = mongoose.model('NfirsRecord');
      const NerisRecord = mongoose.model('NerisRecord');
      const User = mongoose.model('User');
      
      const metrics = {
        records: {
          nemsis: await NemsisRecord.countDocuments(),
          nfirs: await NfirsRecord.countDocuments(),
          neris: await NerisRecord.countDocuments(),
          total: 0
        },
        users: {
          total: await User.countDocuments(),
          active: await User.countDocuments({ isActive: true })
        },
        database: {
          collections: await mongoose.connection.db.listCollections().toArray()
        }
      };
      
      metrics.records.total = metrics.records.nemsis + metrics.records.nfirs + metrics.records.neris;
      
      return metrics;
    } catch (error) {
      return {
        error: error.message
      };
    }
  }

  // Get performance metrics
  getPerformanceMetrics() {
    return {
      responseTime: {
        average: 0, // This would be calculated from actual request logs
        p95: 0,
        p99: 0
      },
      throughput: {
        requestsPerSecond: 0,
        recordsPerHour: 0
      },
      errorRate: {
        total: 0,
        byEndpoint: {}
      }
    };
  }
}

module.exports = HealthCheckService;