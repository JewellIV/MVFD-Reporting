# Mangohick Volunteer Fire Department Reporting System

A comprehensive, enterprise-grade incident reporting platform built for Virginia public safety agencies, featuring full NEMSIS 3.5 and NFIRS/NERIS compliance with advanced offline capabilities, CAD integration, and state/federal data submission.

## 🚒 System Overview

This platform provides a unified solution for both Fire and Emergency Medical Services (EMS) operations, eliminating data silos and providing a comprehensive view of incidents from initial response to patient disposition. Built with modern architectural principles, it supports cloud-native deployment, API-first design, and microservices architecture.

## ✨ Key Features

### 🔥 Fire Incident Reporting
- **NERIS-Native Architecture**: Built from the ground up for the new National Emergency Response Information System
- **NFIRS 5.0 Legacy Support**: Dual-module architecture supporting the transition from NFIRS to NERIS
- **GIS Foundation**: All incident data is geocoded with mandatory geographic coordinates
- **Operational Data Capture**: Rich capture of suppression tactics, ventilation efforts, and contamination reduction

### 🚑 EMS Patient Care Reporting
- **NEMSIS 3.5 Compliance**: Full implementation of the latest National EMS Information System standard
- **XSD + Schematron Validation**: Two-layer validation ensuring data integrity and compliance
- **Virginia State Integration**: Custom validation rules and data quality scoring for VPHIB submission
- **HIPAA Compliance**: End-to-end encryption and audit logging for ePHI protection

### 📱 Advanced Field Operations
- **Progressive Web App (PWA)**: Full offline capability with local data storage and background sync
- **Voice Transcription**: AI-powered voice commands for hands-free data entry
- **AI Assistant**: Protocol compliance checking and clinical decision support
- **Real-time Data Augmentation**: Weather, GIS, and parcel data integration

### 🔗 System Integration
- **Multi-Protocol CAD Gateway**: Support for APCO EIDD, NENA i3, and vendor-specific APIs
- **Google Integration**: Roster synchronization and incident data export to Google Sheets
- **Virginia Hub Integration**: Automated submission to VPHIB (EMS) and VDFP (Fire)
- **Federal Upload**: Direct submission to national NERIS and NEMSIS repositories

## 🏗️ Architecture

### Backend (Node.js/Express)
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT-based with role-based access control
- **Validation**: NEMSIS v3.5 XSD and Schematron validation engine
- **Compliance**: HIPAA/CJIS compliance with encryption and audit logging
- **Integration**: Multi-protocol CAD gateway and state/federal submission modules

### Frontend (React/TypeScript)
- **PWA**: Service Workers for offline functionality
- **State Management**: React Query for server state
- **UI Framework**: Tailwind CSS with Headless UI components
- **Voice**: Web Speech API integration
- **AI**: Clinical decision support and protocol compliance

### Data Models
- **NEMSIS 3.5**: Complete implementation with v3.5 structural changes
- **NERIS v1.0**: GIS-centric data model with modular incident types
- **NFIRS 5.0**: Legacy support through sunset period
- **Offline Storage**: IndexedDB for local data persistence

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- MongoDB 5.0+
- Google Cloud Platform account (for Google integration)
- Virginia VPHIB and VDFP API credentials

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/mangohick-vfd/reporting-system.git
   cd reporting-system
   ```

2. **Install dependencies**
   ```bash
   npm run install-all
   ```

3. **Configure environment variables**
   ```bash
   cp server/.env.example server/.env
   # Edit server/.env with your configuration
   ```

4. **Start the development servers**
   ```bash
   npm run dev
   ```

5. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

### Production Deployment

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Configure production environment**
   - Set up MongoDB Atlas or self-hosted MongoDB
   - Configure Google Cloud Platform credentials
   - Set up Virginia state API credentials
   - Configure CAD system integration

3. **Deploy to cloud platform**
   - AWS GovCloud (recommended for government compliance)
   - Azure Government
   - Google Cloud Platform

## 📋 Compliance & Certification

### NEMSIS v3.5 Compliance
- ✅ XSD validation engine
- ✅ Schematron business rule validation
- ✅ Virginia state-specific validation rules
- ✅ ePHI encryption and audit logging
- ✅ Data quality scoring system

### NERIS v1.0 Compatibility
- ✅ GIS-centric data model
- ✅ Multi-incident type support
- ✅ Operational tactics capture
- ✅ API integration ready
- ✅ Vendor compatibility badge eligible

### HIPAA Compliance
- ✅ Administrative safeguards
- ✅ Physical safeguards
- ✅ Technical safeguards
- ✅ Audit logging
- ✅ Role-based access control
- ✅ Data encryption (AES-256)

## 🔧 Configuration

### CAD Integration
The system supports multiple CAD vendors through a flexible adapter architecture:

- **CentralSquare**: Direct API integration
- **Hexagon**: REST API and webhook support
- **Tyler Technologies**: Custom API integration
- **ZOLL**: Specialized EMS CAD integration
- **APCO EIDD**: Standards-based integration
- **NENA i3**: Next Generation 9-1-1 support

### Google Integration
- **Authentication**: OAuth 2.0 flow
- **Roster Sync**: Bidirectional synchronization
- **Incident Export**: Automated data export
- **Sheets Integration**: Real-time data updates

### Virginia State Integration
- **VPHIB**: NEMSIS v3.5 XML submission
- **VDFP**: NERIS v1.0 API submission
- **Validation**: State-specific business rules
- **Quality Scoring**: Automated compliance monitoring

## 📊 Data Flow

1. **CAD Dispatch**: Initial incident data received via CAD Integration Gateway
2. **Field Response**: First responders use mobile PWA for data entry
3. **Offline Mode**: Data stored locally when connectivity is unavailable
4. **Sync Process**: Background synchronization when connectivity restored
5. **Validation**: Multi-layer validation (XSD + Schematron + Business Rules)
6. **Review Process**: Quality assurance and approval workflow
7. **State Submission**: Automated submission to Virginia hubs
8. **Federal Upload**: Direct submission to national repositories

## 🔒 Security Features

- **End-to-End Encryption**: All ePHI encrypted in transit and at rest
- **Audit Logging**: Comprehensive audit trail for all data access
- **Role-Based Access**: Granular permissions based on user roles
- **Session Management**: Secure session handling with timeout
- **Data Masking**: ePHI masking based on user permissions
- **Breach Detection**: Automated detection of suspicious activity

## 📱 Mobile & Offline Support

- **Progressive Web App**: Native app-like experience
- **Offline Storage**: IndexedDB for local data persistence
- **Background Sync**: Automatic synchronization when online
- **Voice Commands**: Hands-free data entry
- **GPS Integration**: Automatic location capture
- **Camera Integration**: Photo capture for incident documentation

## 🤖 AI & Automation Features

- **Voice Transcription**: Real-time speech-to-text
- **Protocol Compliance**: Automated protocol checking
- **Clinical Decision Support**: AI-powered recommendations
- **Data Quality**: Automated data validation and scoring
- **Predictive Analytics**: Trend analysis and reporting
- **Smart Forms**: Dynamic form generation based on incident type

## 📈 Reporting & Analytics

- **Real-time Dashboard**: Live incident monitoring
- **Custom Reports**: Configurable reporting system
- **Data Export**: Multiple format support (XML, CSV, PDF)
- **Trend Analysis**: Historical data analysis
- **Performance Metrics**: Response time and quality metrics
- **Compliance Reports**: Automated compliance reporting

## 🛠️ Development

### Project Structure
```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/         # Application pages
│   │   ├── services/      # API and service layer
│   │   └── contexts/      # React contexts
│   └── public/            # Static assets and PWA files
├── server/                # Node.js backend
│   ├── routes/            # API routes
│   ├── models/            # Database models
│   ├── services/          # Business logic services
│   └── middleware/        # Express middleware
└── docs/                  # Documentation
```

### API Documentation
- **Swagger UI**: Available at `/api/docs` in development
- **OpenAPI Spec**: Generated from route definitions
- **Postman Collection**: Available in `/docs/postman/`

### Testing
```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:e2e
```

## 📞 Support & Contact

- **Technical Support**: support@mangohick-vfd.org
- **Documentation**: https://docs.mangohick-vfd.org
- **Issue Tracker**: https://github.com/mangohick-vfd/reporting-system/issues
- **Emergency Support**: 24/7 support available for critical issues

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Virginia Department of Fire Programs (VDFP)
- Virginia Office of EMS (OEMS)
- National EMS Information System (NEMSIS) Technical Assistance Center
- US Fire Administration (USFA)
- Mangohick Volunteer Fire Department

---

**Built with ❤️ for the Mangohick Volunteer Fire Department and Virginia's public safety community.**