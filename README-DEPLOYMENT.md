# X-Ray Dashboard - Multi-User Deployment Guide

This guide will help you deploy the X-Ray Dashboard for multi-user access with persistent server-side storage.

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose installed
- Port 3001 available (and optionally port 80 for nginx)

### 1-Command Deployment
```bash
./deploy.sh
```

This script will:
- Build the Docker images
- Set up the database
- Start all services
- Run health checks
- Optionally seed sample data

## 📋 Manual Deployment

### 1. Install Dependencies
```bash
cd server
npm install
```

### 2. Configure Environment
```bash
cp server/.env.example server/.env
# Edit server/.env with your settings
```

### 3. Run Database Migration
```bash
cd server
npm run migrate
```

### 4. Start Services

#### Development Mode
```bash
# Backend API
cd server
npm run dev

# Frontend (serve static files via API server)
# Access at http://localhost:3001
```

#### Production Mode with Docker
```bash
docker-compose up -d
# Access at http://localhost:3001
```

#### Production Mode with Nginx
```bash
docker-compose --profile production up -d
# Access at http://localhost (port 80)
```

## 🌐 Hosting Options

### Option 1: Heroku (Easy)
1. Create a new Heroku app
2. Add the Heroku Postgres addon (optional, SQLite works too)
3. Set environment variables
4. Deploy using Git

```bash
# Set up Heroku
heroku create your-xray-dashboard
heroku config:set NODE_ENV=production
heroku config:set PORT=3001

# Deploy
git push heroku main
```

### Option 2: Railway (Easy)
1. Connect your GitHub repository to Railway
2. Railway will automatically detect the Node.js app
3. Set environment variables in Railway dashboard
4. Deploy automatically on git push

### Option 3: DigitalOcean/Linode/AWS (Self-hosted)
1. Create a VPS instance
2. Install Docker and Docker Compose
3. Clone your repository
4. Run `./deploy.sh production`
5. Set up domain and SSL if needed

### Option 4: Render (Easy)
1. Connect your GitHub repository to Render
2. Create a new Web Service
3. Set build command: `cd server && npm install`
4. Set start command: `cd server && npm start`
5. Set environment variables

## 🔧 Configuration

### Environment Variables
```bash
# Server Configuration
PORT=3001                    # Server port
NODE_ENV=production         # Environment mode

# Database
DB_PATH=./data/xray-dashboard.db    # SQLite database path

# File Uploads
UPLOAD_DIR=./uploads        # Upload directory
MAX_FILE_SIZE=10485760     # Max file size (10MB)

# CORS
FRONTEND_URL=http://localhost:3001  # Frontend URL for CORS

# Security
SECRET_KEY=your-secret-key  # Secret key for security
```

### Database Options
- **SQLite** (default): Simple file-based database, perfect for small to medium deployments
- **PostgreSQL**: For larger deployments, set `DATABASE_URL` environment variable
- **MySQL**: Also supported with proper connection string

## 📊 Data Management

### Backup Database
```bash
# Manual backup
docker-compose exec xray-dashboard node server/scripts/backup.js

# Automated backup (add to cron)
0 2 * * * docker-compose exec xray-dashboard node server/scripts/backup.js
```

### Data Migration
The application automatically migrates localStorage data to the server on first load. Users can also export/import Excel files.

### Scaling
- **Single instance**: Good for up to 50 concurrent users
- **Load balancer**: Use nginx for multiple instances
- **Database**: Move to PostgreSQL for better performance
- **File storage**: Use cloud storage (S3, etc.) for uploads

## 🔒 Security

### Production Security Checklist
- [ ] Set strong `SECRET_KEY`
- [ ] Enable HTTPS with SSL certificates
- [ ] Configure firewall (only ports 80/443 open)
- [ ] Regular database backups
- [ ] Update Docker images regularly
- [ ] Monitor logs for suspicious activity

### SSL Setup (Production)
```bash
# Using Let's Encrypt with Certbot
certbot --nginx -d your-domain.com

# Or place certificates in ./ssl/ directory
# Update nginx.conf to enable HTTPS
```

## 🔄 Updates & Maintenance

### Zero-Downtime Updates
```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose build
docker-compose up -d

# Database migrations run automatically
```

### Monitoring
- Health check: `http://your-domain/api/health`
- Logs: `docker-compose logs -f`
- Database stats: Available in the dashboard

## 🆘 Troubleshooting

### Common Issues

**Service won't start**
```bash
# Check logs
docker-compose logs xray-dashboard

# Check port conflicts
netstat -tulpn | grep :3001
```

**Database issues**
```bash
# Reset database
rm -rf data/
docker-compose exec xray-dashboard node server/scripts/migrate.js
```

**File upload issues**
```bash
# Check permissions
ls -la uploads/
chmod 755 uploads/
```

**API connection issues**
- Check firewall settings
- Verify CORS configuration
- Check network connectivity

### Performance Optimization
- Enable gzip compression (included in nginx config)
- Use CDN for static files
- Database indexing (automatically created)
- Regular database cleanup

## 🎯 URL Access

Once deployed, users can access the dashboard at:
- **Development**: `http://localhost:3001`
- **Production**: `http://your-domain.com`

All data is automatically saved to the server and shared between all users in real-time.

## 📞 Support

For deployment issues or questions:
1. Check the logs: `docker-compose logs -f`
2. Verify environment configuration
3. Test API endpoints: `curl http://localhost:3001/api/health`
4. Review this documentation

The dashboard maintains backward compatibility - existing localStorage data will be automatically migrated to the server on first load.