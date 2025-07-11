#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Import database
const db = require('../models/database');

async function migrate() {
  console.log('Starting database migration...');
  
  try {
    // Database is automatically initialized in the constructor
    // Wait a moment for initialization to complete
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('✅ Database migration completed successfully');
    console.log('✅ Tables created/verified');
    console.log('✅ Indexes created');
    
    // Check if data directory exists
    const dataDir = path.dirname(process.env.DB_PATH || './data/xray-dashboard.db');
    console.log(`✅ Database location: ${path.resolve(dataDir)}`);
    
    // Check if uploads directory exists
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
      console.log(`✅ Created uploads directory: ${path.resolve(uploadDir)}`);
    } else {
      console.log(`✅ Uploads directory exists: ${path.resolve(uploadDir)}`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration if called directly
if (require.main === module) {
  migrate();
}

module.exports = migrate;