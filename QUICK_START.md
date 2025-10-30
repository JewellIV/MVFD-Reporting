# Quick Start Guide - NERIS Implementation Testing

## ✅ What's Ready

The NERIS framework has been successfully implemented! All tests passed:
- ✅ 128 incident types loaded
- ✅ Fire, Medical, Hazard modules working
- ✅ Validator initialized
- ✅ Schema service running

## 🚀 How to Start Testing

### Option 1: Test the NERIS Framework (Quick Test)
```bash
npm run test-neris
```

This will verify all components are working.

### Option 2: Start the Server Only
```bash
cd server
npm run dev
```

The server will start on port 5000.

### Option 3: Start Both Server and Client
```bash
npm run dev
```

This starts both server (port 5000) and client (port 3000).

## 🔍 Test the API Endpoints

Once the server is running, you can test these endpoints:

### Get Incident Types (No Auth Required for Testing)
```bash
curl http://localhost:5000/api/neris/incident-types
```

### Get Fire Module Schema
```bash
curl http://localhost:5000/api/neris/schema/incident/mod_fire
```

### Get Value Sets
```bash
curl http://localhost:5000/api/neris/value-set/type_unit
```

## 📊 Summary

| Component | Status | Details |
|-----------|--------|---------|
| Schema Files | ✅ Complete | All NERIS schemas loaded |
| Parser Service | ✅ Working | Reading CSV/YML files |
| Validator | ✅ Working | Validating records |
| Data Model | ✅ Updated | NERIS-compliant structure |
| API Endpoints | ✅ Ready | All endpoints available |

## 🎯 What You Can Do Now

1. **View Incident Types**: Access all 128 NERIS incident types
2. **Get Schema Fields**: Query any module's field definitions
3. **Validate Data**: Validate NERIS records against framework rules
4. **Map Dispatch Codes**: Set up mappings from CAD codes to incident types

## 📚 Documentation

- **NERIS_TESTING.md** - Complete testing guide with examples
- **NERIS Framework** - Official docs at https://github.com/ulfsri/neris-framework

## ⚠️ Note

The server requires database configuration. Make sure you have:
1. MySQL database set up
2. `.env` file configured in `server/` directory
3. Database credentials in `.env`

See `server/env.example` for required configuration.

## 🆘 Troubleshooting

If you get "concurrently is not recognized":
```bash
npm install concurrently
```

If the server won't start:
```bash
cd server
node index.js
```
Check the console for any database connection errors.
