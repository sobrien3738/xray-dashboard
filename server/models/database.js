const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class Database {
  constructor() {
    this.db = null;
    this.init();
  }

  init() {
    // Ensure data directory exists
    const dataDir = path.dirname(process.env.DB_PATH || './data/xray-dashboard.db');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const dbPath = process.env.DB_PATH || './data/xray-dashboard.db';
    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening database:', err.message);
      } else {
        console.log('Connected to SQLite database');
        this.createTables();
      }
    });
  }

  createTables() {
    const createRecordsTable = `
      CREATE TABLE IF NOT EXISTS records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        metrc_tag TEXT NOT NULL,
        metrc_tag_full TEXT,
        invoice_to TEXT,
        customer TEXT NOT NULL,
        invoice_weight REAL,
        invoice_number TEXT,
        paid_date TEXT,
        tests_failed INTEGER DEFAULT 0,
        lab TEXT,
        compliance_status TEXT,
        apex_invoice_note TEXT,
        date_created TEXT NOT NULL,
        date_updated TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    const createUploadsTable = `
      CREATE TABLE IF NOT EXISTS uploads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT NOT NULL,
        original_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        mime_type TEXT NOT NULL,
        records_imported INTEGER DEFAULT 0,
        upload_date DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    const createIndexes = [
      'CREATE INDEX IF NOT EXISTS idx_records_metrc_tag ON records(metrc_tag)',
      'CREATE INDEX IF NOT EXISTS idx_records_customer ON records(customer)',
      'CREATE INDEX IF NOT EXISTS idx_records_date_created ON records(date_created)',
      'CREATE INDEX IF NOT EXISTS idx_records_compliance_status ON records(compliance_status)'
    ];

    this.db.run(createRecordsTable, (err) => {
      if (err) {
        console.error('Error creating records table:', err.message);
      } else {
        console.log('Records table created/verified');
        // Create indexes after table is created
        createIndexes.forEach(indexSQL => {
          this.db.run(indexSQL, (err) => {
            if (err) console.error('Error creating index:', err.message);
          });
        });
      }
    });

    this.db.run(createUploadsTable, (err) => {
      if (err) console.error('Error creating uploads table:', err.message);
      else console.log('Uploads table created/verified');
    });
  }

  // Generic query method
  query(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // Generic run method for INSERT, UPDATE, DELETE
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ 
            lastID: this.lastID, 
            changes: this.changes 
          });
        }
      });
    });
  }

  // Get single record
  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  close() {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) {
          reject(err);
        } else {
          console.log('Database connection closed');
          resolve();
        }
      });
    });
  }
}

// Export singleton instance
module.exports = new Database();