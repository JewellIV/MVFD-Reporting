const mongoose = require('mongoose');

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
      const NemsisRecord = mongoose.model('NemsisRecord');
      const NfirsRecord = mongoose.model('NfirsRecord');
      const NerisRecord = mongoose.model('NerisRecord');
      const User = mongoose.model('User');

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

      // Count records by type
      const nemsisCount = await NemsisRecord.countDocuments({
        createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
      });
      const nfirsCount = await NfirsRecord.countDocuments({
        createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
      });
      const nerisCount = await NerisRecord.countDocuments({
        createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
      });

      analytics.totalRecords = nemsisCount + nfirsCount + nerisCount;
      analytics.recordsByType = {
        nemsis: nemsisCount,
        nfirs: nfirsCount,
        neris: nerisCount
      };

      // Count records by status
      const nemsisStatus = await NemsisRecord.aggregate([
        { $match: { createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) } } },
        { $group: { _id: '$quality.status', count: { $sum: 1 } } }
      ]);

      const nfirsStatus = await NfirsRecord.aggregate([
        { $match: { createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) } } },
        { $group: { _id: '$quality.status', count: { $sum: 1 } } }
      ]);

      const nerisStatus = await NerisRecord.aggregate([
        { $match: { createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) } } },
        { $group: { _id: '$quality.status', count: { $sum: 1 } } }
      ]);

      analytics.recordsByStatus = {
        nemsis: Object.fromEntries(nemsisStatus.map(item => [item._id, item.count])),
        nfirs: Object.fromEntries(nfirsStatus.map(item => [item._id, item.count])),
        neris: Object.fromEntries(nerisStatus.map(item => [item._id, item.count]))
      };

      // Monthly trends
      const monthlyData = await NemsisRecord.aggregate([
        { $match: { createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) } } },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]);

      analytics.recordsByMonth = monthlyData.map(item => ({
        month: `${item._id.year}-${item._id.month.toString().padStart(2, '0')}`,
        count: item.count
      }));

      // User activity
      const userActivity = await User.aggregate([
        {
          $lookup: {
            from: 'nemsisrecords',
            localField: '_id',
            foreignField: 'createdBy',
            as: 'nemsisRecords'
          }
        },
        {
          $lookup: {
            from: 'nfirsrecords',
            localField: '_id',
            foreignField: 'createdBy',
            as: 'nfirsRecords'
          }
        },
        {
          $lookup: {
            from: 'nerisrecords',
            localField: '_id',
            foreignField: 'createdBy',
            as: 'nerisRecords'
          }
        },
        {
          $project: {
            firstName: 1,
            lastName: 1,
            role: 1,
            totalRecords: {
              $add: [
                { $size: '$nemsisRecords' },
                { $size: '$nfirsRecords' },
                { $size: '$nerisRecords' }
              ]
            }
          }
        },
        { $sort: { totalRecords: -1 } },
        { $limit: 10 }
      ]);

      analytics.userActivity = userActivity;

      // Data quality metrics
      const qualityMetrics = await NemsisRecord.aggregate([
        { $match: { createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) } } },
        {
          $group: {
            _id: null,
            avgQualityScore: { $avg: '$quality.dataCompleteness' },
            minQualityScore: { $min: '$quality.dataCompleteness' },
            maxQualityScore: { $max: '$quality.dataCompleteness' },
            totalRecords: { $sum: 1 }
          }
        }
      ]);

      analytics.dataQualityMetrics = qualityMetrics[0] || {};

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
      const NemsisRecord = mongoose.model('NemsisRecord');
      const NfirsRecord = mongoose.model('NfirsRecord');
      const NerisRecord = mongoose.model('NerisRecord');

      const report = {
        period: { startDate, endDate },
        generatedAt: new Date().toISOString(),
        summary: {
          totalRecords: 0,
          compliantRecords: 0,
          nonCompliantRecords: 0,
          complianceRate: 0
        },
        details: {
          nemsis: {},
          nfirs: {},
          neris: {}
        }
      };

      // NEMSIS compliance
      const nemsisRecords = await NemsisRecord.find({
        createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
      });

      const nemsisCompliant = nemsisRecords.filter(record => 
        record.quality.nerisCompliance?.compliant === true
      );

      report.details.nemsis = {
        total: nemsisRecords.length,
        compliant: nemsisCompliant.length,
        nonCompliant: nemsisRecords.length - nemsisCompliant.length,
        complianceRate: nemsisRecords.length > 0 ? 
          (nemsisCompliant.length / nemsisRecords.length) * 100 : 0
      };

      // NFIRS compliance
      const nfirsRecords = await NfirsRecord.find({
        createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
      });

      const nfirsCompliant = nfirsRecords.filter(record => 
        record.quality.status === 'Approved'
      );

      report.details.nfirs = {
        total: nfirsRecords.length,
        compliant: nfirsCompliant.length,
        nonCompliant: nfirsRecords.length - nfirsCompliant.length,
        complianceRate: nfirsRecords.length > 0 ? 
          (nfirsCompliant.length / nfirsRecords.length) * 100 : 0
      };

      // NERIS compliance
      const nerisRecords = await NerisRecord.find({
        createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
      });

      const nerisCompliant = nerisRecords.filter(record => 
        record.quality.nerisCompliance?.compliant === true
      );

      report.details.neris = {
        total: nerisRecords.length,
        compliant: nerisCompliant.length,
        nonCompliant: nerisRecords.length - nerisCompliant.length,
        complianceRate: nerisRecords.length > 0 ? 
          (nerisCompliant.length / nerisRecords.length) * 100 : 0
      };

      // Overall summary
      report.summary.totalRecords = nemsisRecords.length + nfirsRecords.length + nerisRecords.length;
      report.summary.compliantRecords = nemsisCompliant.length + nfirsCompliant.length + nerisCompliant.length;
      report.summary.nonCompliantRecords = report.summary.totalRecords - report.summary.compliantRecords;
      report.summary.complianceRate = report.summary.totalRecords > 0 ? 
        (report.summary.compliantRecords / report.summary.totalRecords) * 100 : 0;

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