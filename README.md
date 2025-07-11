# X-Ray & Compliance Tracking Dashboard

A multi-user web application for tracking X-Ray testing and compliance records in the cannabis industry.

![Dashboard Preview](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)
![Version](https://img.shields.io/badge/Version-1.0.0-blue)
![License](https://img.shields.io/badge/License-MIT-yellow)

## 🚀 Live Demo

**Deploy instantly to the cloud:**
- [![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template)
- [Deploy to Render](https://render.com/deploy)
- [Deploy to Heroku](https://heroku.com/deploy)

## ✨ Features

- **Multi-user collaboration** - Real-time data sharing
- **Excel import/export** - Bulk data processing
- **Interactive calendar** - Visual schedule management
- **Advanced filtering** - Find records quickly
- **Undo/Redo system** - Prevent accidental data loss
- **Auto-save** - Never lose your work
- **Responsive design** - Works on all devices
- **Cloud deployment** - Access from anywhere

## 🏃‍♂️ Quick Start

### Option 1: Cloud Deployment (Recommended)
```bash
# 1. Clone this repository
git clone https://github.com/YOUR_USERNAME/xray-dashboard.git
cd xray-dashboard

# 2. Deploy to Railway (or Render/Heroku)
./deploy-to-cloud.sh
```

### Option 2: Local Development
```bash
# 1. Set up the project
./setup.sh

# 2. Start the server
cd server
npm start

# 3. Open http://localhost:3001
```

## 🛠️ Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Node.js, Express.js
- **Database**: SQLite (production-ready)
- **File Processing**: SheetJS (Excel)
- **Deployment**: Docker, Railway, Render, Heroku

## 📊 Dashboard Overview

### Invoicing Tab
- Track customer invoices and payments
- METRC tag management
- Weight and compliance tracking
- Excel bulk import/export

### Testing Tab
- X-ray test results
- Lab information
- Pass/fail status tracking
- Compliance monitoring

### Calendar Tab
- Visual schedule view
- Interactive slot editing
- Customer and tag display
- Print-friendly layout

## 🌐 Multi-User Features

- **Real-time sync** - Changes appear instantly for all users
- **Persistent storage** - Data saved on server, not browser
- **Concurrent access** - Multiple users can work simultaneously
- **Automatic backups** - Data is continuously backed up
- **Global access** - Access from any device, anywhere

## 🔧 Configuration

### Environment Variables
```bash
NODE_ENV=production
PORT=3001
DB_PATH=./data/xray-dashboard.db
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
```

### Database
- SQLite for simplicity and reliability
- Automatic migrations
- Indexed for performance
- Easy backup and restore

## 📈 Deployment Options

### Railway (Recommended)
- $5/month free credit
- Automatic deployments
- Custom domains
- Zero configuration

### Render (Free Tier)
- Completely free
- Automatic HTTPS
- GitHub integration
- Custom domains on paid plans

### Heroku
- Most popular platform
- Extensive add-on ecosystem
- $5/month minimum

### Self-Hosted
- VPS with Docker
- Full control
- Custom configuration

## 🔒 Security

- HTTPS encryption
- CORS protection
- Input validation
- Rate limiting
- Secure file uploads
- Environment-based configuration

## 📖 Documentation

- [Cloud Deployment Guide](CLOUD-DEPLOYMENT.md)
- [Local Setup Guide](README-DEPLOYMENT.md)
- [API Documentation](server/README.md)

## 🆘 Support

If you need help:
1. Check the [deployment guide](CLOUD-DEPLOYMENT.md)
2. Review the [troubleshooting section](README-DEPLOYMENT.md#troubleshooting)
3. Test locally first: `npm start`

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 🎯 Roadmap

- [ ] Real-time notifications
- [ ] Advanced reporting
- [ ] API authentication
- [ ] Mobile app
- [ ] Advanced analytics

---

**Ready to deploy? Use the one-click deployment buttons above or run `./deploy-to-cloud.sh` for guided setup!**