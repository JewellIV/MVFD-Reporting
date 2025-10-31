const { Op } = require('sequelize');
const NemsisRecord = require('../../models/NemsisRecord');
const NfirsRecord = require('../../models/NfirsRecord');
const NerisRecord = require('../../models/NerisRecord');
const User = require('../../models/User');

class AnalyticsService {
  constructor() {
    this.metrics = new Map();
  }

  // Track user action
  trackUserAction(userId, action, data = {}) {
    const timestamp = new Date();
    const metric = {
      userId,
      action,
      data,
      timestamp
    };

    if (!this.metrics.has(userId)) {
      this.metrics.set(userId, []);
    }
    
    this.metrics.get(userId).push(metric);
  }

  // Get user analytics
  getUserAnalytics(userId, startDate, endDate) {
    const userMetrics = this.metrics.get(userId) || [];
    
    const filteredMetrics = userMetrics.filter(metric => {
      const metricDate = new Date(metric.timestamp);
      return metricDate >= new Date(startDate) && metricDate <= new Date(endDate);
    });

    const analytics = {
      totalActions: filteredMetrics.length,
      actionsByType: {},
      dailyActivity: {},
      mostUsedFeatures: [],
      averageSessionDuration: 0,
      dataQualityScore: 0
    };

    // Group by action type
    filteredMetrics.forEach(metric => {
      if (!analytics.actionsByType[metric.action]) {
        analytics.actionsByType[metric.action] = 0;
      }
      analytics.actionsByType[metric.action]++;
    });

    // Group by day
    filteredMetrics.forEach(metric => {
      const day = metric.timestamp.toISOString().split('T')[0];
      if (!analytics.dailyActivity[day]) {
        analytics.dailyActivity[day] = 0;
      }
      analytics.dailyActivity[day]++;
    });

    // Calculate most used features
    const featureCounts = {};
    filteredMetrics.forEach(metric => {
      if (metric.data.feature) {
        if (!featureCounts[metric.data.feature]) {
          featureCounts[metric.data.feature] = 0;
        }
        featureCounts[metric.data.feature]++;
      }
    });

    analytics.mostUsedFeatures = Object.entries(featureCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([feature, count]) => ({ feature, count }));

    return analytics;
  }

  // Get system analytics
  async getSystemAnalytics(startDate, endDate) {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);

      const analytics = {
        totalRecords: 0,
        recordsByType: {},
        recordsByStatus: {},
        recordsByMonth: {},
        userActivity: {},
        dataQualityMetrics: {},
        responseTimeMetrics: {},
        complianceMetrics: {}
      };

      const whereBetween = { createdAt: { [Op.between]: [start, end] } };

      const [nemsisCount, nfirsCount, nerisCount] = await Promise.all([
        NemsisRecord.count({ where: whereBetween }),
        NfirsRecord.count({ where: whereBetween }),
        NerisRecord.count({ where: whereBetween })
      ]);

      analytics.totalRecords = nemsisCount + nfirsCount + nerisCount;
      analytics.recordsByType = { nemsis: nemsisCount, nfirs: nfirsCount, neris: nerisCount };

      // Leave other detailed aggregations empty for now (not trivial with JSON fields)
      return analytics;
    } catch (error) {
      console.error('System analytics error:', error);
      throw error;
    }
  }

  // Get performance metrics
  getPerformanceMetrics() {
    const metrics = {
      responseTime: {
        average: 0,
        p95: 0,
        p99: 0
      },
      errorRate: {
        total: 0,
        byEndpoint: {}
      },
      throughput: {
        requestsPerSecond: 0,
        recordsPerHour: 0
      },
      systemHealth: {
        database: 'healthy',
        cache: 'healthy',
        externalAPIs: 'healthy'
      }
    };

    // This would be populated by actual performance monitoring
    return metrics;
  }

  // Generate compliance report
  async generateComplianceReport(startDate, endDate) {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);

      const whereBetween = { createdAt: { [Op.between]: [start, end] } };

      const [nemsisTotal, nfirsTotal, nerisTotal] = await Promise.all([
        NemsisRecord.count({ where: whereBetween }),
        NfirsRecord.count({ where: whereBetween }),
        NerisRecord.count({ where: whereBetween })
      ]);

      const report = {
        period: { startDate, endDate },
        generatedAt: new Date().toISOString(),
        summary: {
          totalRecords: nemsisTotal + nfirsTotal + nerisTotal,
          compliantRecords: 0,
          nonCompliantRecords: nemsisTotal + nfirsTotal + nerisTotal,
          complianceRate: 0
        },
        details: {
          nemsis: { total: nemsisTotal, compliant: 0, nonCompliant: nemsisTotal, complianceRate: 0 },
          nfirs: { total: nfirsTotal, compliant: 0, nonCompliant: nfirsTotal, complianceRate: 0 },
          neris: { total: nerisTotal, compliant: 0, nonCompliant: nerisTotal, complianceRate: 0 }
        }
      };

      return report;
    } catch (error) {
      console.error('Compliance report error:', error);
      throw error;
    }
  }

  // Export analytics data
  exportAnalyticsData(format, data) {
    if (format === 'csv') {
      return this.convertToCSV(data);
    } else if (format === 'json') {
      return JSON.stringify(data, null, 2);
    } else if (format === 'xml') {
      return this.convertToXML(data);
    } else {
      throw new Error('Unsupported format');
    }
  }

  convertToCSV(data) {
    // Simple CSV conversion
    const headers = Object.keys(data);
    const rows = [headers.join(',')];
    
    if (Array.isArray(data)) {
      data.forEach(item => {
        const row = headers.map(header => item[header] || '');
        rows.push(row.join(','));
      });
    }
    
    return rows.join('\n');
  }

  convertToXML(data) {
    // Simple XML conversion
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<analytics>\n';
    
    if (Array.isArray(data)) {
      data.forEach((item, index) => {
        xml += `  <item id="${index}">\n`;
        Object.entries(item).forEach(([key, value]) => {
          xml += `    <${key}>${value}</${key}>\n`;
        });
        xml += '  </item>\n';
      });
    } else {
      Object.entries(data).forEach(([key, value]) => {
        xml += `  <${key}>${value}</${key}>\n`;
      });
    }
    
    xml += '</analytics>';
    return xml;
  }
}

module.exports = AnalyticsService;