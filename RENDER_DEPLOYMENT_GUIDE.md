# Render.com Deployment Guide

Quick guide for deploying the backend to Render.com

## ✅ Prerequisites

- GitHub account with your code
- Render.com account (free tier available)
- MySQL database credentials (already have these)

---

## 🚀 Step 1: Connect GitHub to Render

1. Go to https://render.com
2. Sign up/Sign in
3. Click "New" → "Web Service"
4. Connect your GitHub repository
5. Select `MVFD-Reporting` repository

---

## ⚙️ Step 2: Configure Web Service

### Basic Settings:
- **Name**: `mangohick-reporting-api`
- **Environment**: `Node`
- **Region**: Choose closest to you
- **Branch**: `main`

### Build & Deploy:
- **Root Directory**: `server`
- **Build Command**: `npm install`
- **Start Command**: `npm start`

---

## 🔐 Step 3: Add Environment Variables

Click "Add Environment Variable" and add these:

```
NODE_ENV=production
PORT=10000
DB_HOST=sdb-86.hosting.stackcp.net
DB_PORT=3306
DB_NAME=Reporting-35313030ad32
DB_USER=Reporting-35313030ad32
DB_PASSWORD=T43$cK6Q!Mr$
JWT_SECRET=MVFD2024SecureJWTSecretKeyForProductionUseOnly32+
JWT_EXPIRE=24h
ENCRYPTION_KEY=MVFD2024EncryptionKey32C
CLIENT_URL=https://reporting.mangohickfire.com
CORS_ORIGIN=https://reporting.mangohickfire.com
```

**Note**: Change `CLIENT_URL` and `CORS_ORIGIN` to your actual domain!

---

## 🚀 Step 4: Deploy

1. Scroll to bottom
2. Click "Create Web Service"
3. Wait for build (takes 2-5 minutes)
4. Get your URL: `https://your-app.onrender.com`

---

## ✅ Step 5: Test

```bash
# Test health endpoint
curl https://your-app.onrender.com/api/health

# Should return:
# {"status":"OK","timestamp":"...","service":"Mangohick Fire Reporting API"}
```

---

## 🔧 Step 6: Update Frontend API URL

1. Edit `client/production.env`
2. Change: `REACT_APP_API_URL=https://your-app.onrender.com/api`
3. Rebuild frontend: `build-for-cpanel.bat`
4. Re-upload to cPanel

---

## 🐛 Troubleshooting

### Build Fails

**Check**: Render build logs

**Common Issues**:
- Missing dependencies → Check `server/package.json`
- Wrong root directory → Should be `server`
- Wrong build command → Should be `npm install`

### Server Won't Start

**Check**: Runtime logs

**Common Issues**:
- Database connection failed → Check MySQL credentials
- Port conflicts → Render sets PORT automatically
- Missing environment variables → Double-check all variables

### "Module not found" Errors

**Solution**: The compatibility layer is loading all models. If you see errors, check:
1. All model files exist in `server/models/`
2. Model names match exactly: `NerisRecord`, `NemsisRecord`, etc.

### Database Connection Errors

**Check**:
1. MySQL host allows connections from Render's IPs
2. Credentials are correct
3. Database exists and has permissions
4. Firewall rules allow port 3306

---

## 📊 Monitoring

### View Logs:
1. Go to Render dashboard
2. Click on your web service
3. Click "Logs" tab

### Auto-Deploy:
- Every push to `main` branch triggers new deployment
- Or manually trigger from dashboard

---

## 💰 Free Tier Limitations

Render free tier has:
- ✅ 750 hours/month (enough for one server)
- ⚠️ Sleeps after 15 min of inactivity
- ⚠️ ~30 sec wake time

**For production**: Consider Render paid plan or another hosting

---

## 🔒 Security Tips

1. ✅ Never commit `.env` files
2. ✅ Use strong JWT_SECRET (32+ characters)
3. ✅ Restrict CORS to your domain only
4. ✅ Enable SSL/HTTPS
5. ✅ Regular backups

---

## 🎯 Next Steps

After deployment:
1. Test all API endpoints
2. Update frontend with new API URL
3. Test login flow
4. Monitor for errors
5. Set up database backups

---

## 📞 Support

**Render Support**: https://render.com/docs
**This Project**: Check `CRITICAL_DEPLOYMENT_FIX.md` for known issues

---

## ✅ Deployment Checklist

- [ ] GitHub repo connected
- [ ] Root directory set to `server`
- [ ] Build command: `npm install`
- [ ] Start command: `npm start`
- [ ] All environment variables added
- [ ] Deployed successfully
- [ ] Health endpoint works
- [ ] Database connects
- [ ] Frontend updated with API URL
- [ ] End-to-end testing complete

---

**Your backend is now live on Render.com!** 🎉


