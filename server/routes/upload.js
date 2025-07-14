const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');
const router = express.Router();
const Record = require('../models/Record');
const db = require('../models/database');

// Ensure upload directory exists (use /tmp for cloud deployments)
const uploadDir = process.env.UPLOAD_DIR || (process.env.NODE_ENV === 'production' ? '/tmp/uploads' : './uploads');

try {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log(`Created upload directory: ${uploadDir}`);
  }
} catch (error) {
  console.error('Error creating upload directory:', error);
  // Fallback to /tmp
  if (uploadDir !== '/tmp') {
    console.log('Falling back to /tmp for uploads');
  }
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${timestamp}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB default
  },
  fileFilter: (req, file, cb) => {
    // Allow Excel files by extension (more reliable than MIME type)
    const allowedExtensions = ['.xlsx', '.xls', '.csv'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    if (allowedExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel (.xlsx, .xls) and CSV files are allowed'), false);
    }
  }
});

// Column mapping (matches frontend)
const columnMapping = {
  0: 'metrc_tag_full',   // Column A - contains METRC tag and possibly item name
  1: 'invoice_to',
  2: 'customer',
  7: 'invoice_weight',
  9: 'invoice_number',
  10: 'paid_date',
  11: 'tests_failed',
  12: 'lab',
  22: 'compliance_status'
};

// Process Excel data with direct cell access (matches frontend logic)
function processExcelDataDirect(worksheet) {
  console.log('Starting Excel data processing...');
  const records = [];
  let rowIndex = 2; // Start from row 2 (skip header)
  
  try {
    while (true) {
      // Check if we've reached the end by looking for empty key cells
      const metrcCell = worksheet[XLSX.utils.encode_cell({ r: rowIndex - 1, c: 0 })];
      const customerCell = worksheet[XLSX.utils.encode_cell({ r: rowIndex - 1, c: 2 })];
      
      if (!metrcCell && !customerCell) {
        console.log(`Finished processing at row ${rowIndex}, found ${records.length} records`);
        break; // No more data
      }
    
    const record = {
      id: Date.now() + Math.random(), // Temporary ID for frontend compatibility
      date_created: new Date().toISOString().split('T')[0],
      date_updated: new Date().toISOString().split('T')[0]
    };
    
    // Extract data using column mapping
    try {
      for (const [colIndex, fieldName] of Object.entries(columnMapping)) {
        const cell = worksheet[XLSX.utils.encode_cell({ r: rowIndex - 1, c: parseInt(colIndex) })];
        let value = cell ? cell.v : '';
        
        // Handle special cases
        if (fieldName === 'metrc_tag_full') {
          // Extract METRC tag from full text and item name
          const fullText = String(value || '').trim();
          
          // Extract 16-character METRC tag
          const metrcMatch = fullText.match(/[A-Z0-9]{16}/);
          record.metrc_tag = metrcMatch ? metrcMatch[0] : '';
          record.metrc_tag_full = fullText;
          
          // Extract item name (everything after METRC tag)
          if (metrcMatch) {
            const afterMetrc = fullText.substring(fullText.indexOf(metrcMatch[0]) + 16).trim();
            record.apex_invoice_note = fullText; // Store full text in apex_invoice_note
          } else {
            record.apex_invoice_note = fullText;
          }
        } else if (fieldName === 'invoice_weight') {
          record[fieldName] = parseFloat(value) || 0;
        } else if (fieldName === 'tests_failed') {
          record[fieldName] = parseInt(value) || 0;
        } else {
          record[fieldName] = String(value || '').trim();
        }
      }
    } catch (error) {
      console.error(`Error processing row ${rowIndex}:`, error);
      // Skip this row and continue
      rowIndex++;
      continue;
    }
    
    // Only add record if it has required fields
    if (record.customer && record.customer.trim()) {
      records.push(record);
    }
    
    rowIndex++;
    
    // Safety limit to prevent infinite loops
    if (rowIndex > 10000) {
      console.warn('Reached maximum row limit (10000) during Excel processing');
      break;
    }
  }
  
  } catch (error) {
    console.error('Error in processExcelDataDirect:', error);
    throw new Error(`Excel processing failed: ${error.message}`);
  }
  
  console.log(`Excel processing complete: ${records.length} records extracted`);
  return records;
}

// POST /api/upload/excel - Upload and process Excel file
router.post('/excel', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      console.error('Multer upload error:', err);
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            error: 'File too large. Maximum size is 10MB.'
          });
        }
        return res.status(400).json({
          success: false,
          error: `Upload error: ${err.message}`
        });
      }
      return res.status(400).json({
        success: false,
        error: err.message
      });
    }
    next();
  });
}, async (req, res) => {
  console.log('Excel upload request received');
  
  try {
    if (!req.file) {
      console.log('No file in request');
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    console.log('File received:', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path
    });

    const filePath = req.file.path;
    const fileInfo = {
      filename: req.file.filename,
      original_name: req.file.originalname,
      file_path: filePath,
      file_size: req.file.size,
      mime_type: req.file.mimetype
    };

    console.log(`Processing Excel file: ${req.file.originalname}`);

    // Read and process Excel file
    let workbook, sheetName, worksheet;
    
    try {
      console.log('Reading Excel workbook...');
      workbook = XLSX.readFile(filePath);
      console.log('Workbook sheets:', workbook.SheetNames);
      
      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        throw new Error('No worksheets found in Excel file');
      }
      
      sheetName = workbook.SheetNames[0];
      worksheet = workbook.Sheets[sheetName];
      console.log('Using worksheet:', sheetName);
      
      if (!worksheet) {
        throw new Error('Selected worksheet is empty or invalid');
      }
    } catch (error) {
      console.error('Error reading Excel file:', error);
      return res.status(400).json({
        success: false,
        error: `Error reading Excel file: ${error.message}`
      });
    }

    // Process data using the same logic as frontend
    let records;
    try {
      console.log('Processing Excel data...');
      records = processExcelDataDirect(worksheet);
      console.log(`Processed ${records.length} records from Excel`);
    } catch (error) {
      console.error('Error processing Excel data:', error);
      return res.status(400).json({
        success: false,
        error: `Error processing Excel data: ${error.message}`
      });
    }

    if (records.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid records found in Excel file'
      });
    }

    console.log(`Extracted ${records.length} records from Excel file`);

    // Save records to database
    let results, successful, failed;
    try {
      console.log('Saving records to database...');
      results = await Record.bulkCreate(records);
      successful = results.filter(r => r.success).length;
      failed = results.filter(r => !r.success).length;
      console.log(`Database save complete: ${successful} successful, ${failed} failed`);
    } catch (error) {
      console.error('Error saving to database:', error);
      return res.status(500).json({
        success: false,
        error: `Database error: ${error.message}`
      });
    }

    // Log upload to database
    try {
      await db.run(
        'INSERT INTO uploads (filename, original_name, file_path, file_size, mime_type, records_imported) VALUES (?, ?, ?, ?, ?, ?)',
        [fileInfo.filename, fileInfo.original_name, fileInfo.file_path, fileInfo.file_size, fileInfo.mime_type, successful]
      );
    } catch (logError) {
      console.error('Error logging upload:', logError);
    }

    res.json({
      success: true,
      data: {
        file: fileInfo,
        importResults: results,
        summary: {
          totalRecords: records.length,
          successful,
          failed,
          errors: results.filter(r => !r.success).map(r => r.error)
        }
      },
      message: `Excel file processed successfully: ${successful} records imported, ${failed} failed`
    });

  } catch (error) {
    console.error('Error processing Excel upload:', error);
    
    // Clean up uploaded file on error
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.error('Error cleaning up file:', cleanupError);
      }
    }

    res.status(500).json({
      success: false,
      error: 'Failed to process Excel file',
      message: error.message
    });
  }
});

// GET /api/upload/history - Get upload history
router.get('/history', async (req, res) => {
  try {
    const uploads = await db.query(`
      SELECT * FROM uploads 
      ORDER BY upload_date DESC 
      LIMIT 50
    `);

    res.json({
      success: true,
      data: uploads
    });
  } catch (error) {
    console.error('Error fetching upload history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch upload history',
      message: error.message
    });
  }
});

// GET /api/upload/export - Export records to Excel
router.get('/export', async (req, res) => {
  try {
    const filters = {};
    
    // Extract query parameters for filtering
    if (req.query.customer) filters.customer = req.query.customer;
    if (req.query.metrc_tag) filters.metrc_tag = req.query.metrc_tag;
    if (req.query.compliance_status) filters.compliance_status = req.query.compliance_status;
    if (req.query.date_from) filters.date_from = req.query.date_from;
    if (req.query.date_to) filters.date_to = req.query.date_to;

    const records = await Record.findAll(filters);
    
    if (records.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No records found to export'
      });
    }

    // Convert records to export format
    const exportData = records.map(record => ({
      'METRC Tag': record.metrc_tag,
      'Customer': record.customer,
      'Invoice To': record.invoice_to,
      'Invoice Weight': record.invoice_weight,
      'Invoice Number': record.invoice_number,
      'Paid Date': record.paid_date,
      'Tests Failed': record.tests_failed,
      'Lab': record.lab,
      'Compliance Status': record.compliance_status,
      'Apex Invoice Note': record.apex_invoice_note,
      'Date Created': record.date_created,
      'Date Updated': record.date_updated
    }));

    // Create workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);
    XLSX.utils.book_append_sheet(wb, ws, 'X-Ray Records');

    // Generate filename
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `xray-records-export-${timestamp}.xlsx`;

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Write and send file
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.send(buffer);

  } catch (error) {
    console.error('Error exporting records:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export records',
      message: error.message
    });
  }
});

module.exports = router;