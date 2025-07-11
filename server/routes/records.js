const express = require('express');
const router = express.Router();
const Record = require('../models/Record');

// GET /api/records - Get all records with optional filtering
router.get('/', async (req, res) => {
  try {
    const filters = {};
    
    // Extract query parameters for filtering
    if (req.query.customer) filters.customer = req.query.customer;
    if (req.query.metrc_tag) filters.metrc_tag = req.query.metrc_tag;
    if (req.query.compliance_status) filters.compliance_status = req.query.compliance_status;
    if (req.query.date_from) filters.date_from = req.query.date_from;
    if (req.query.date_to) filters.date_to = req.query.date_to;

    const records = await Record.findAll(filters);
    
    res.json({
      success: true,
      data: records.map(record => record.toJSON()),
      count: records.length
    });
  } catch (error) {
    console.error('Error fetching records:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch records',
      message: error.message
    });
  }
});

// GET /api/records/stats - Get dashboard statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await Record.getStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics',
      message: error.message
    });
  }
});

// GET /api/records/:id - Get single record
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid record ID'
      });
    }

    const record = await Record.findById(id);
    
    if (!record) {
      return res.status(404).json({
        success: false,
        error: 'Record not found'
      });
    }

    res.json({
      success: true,
      data: record.toJSON()
    });
  } catch (error) {
    console.error('Error fetching record:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch record',
      message: error.message
    });
  }
});

// POST /api/records - Create new record
router.post('/', async (req, res) => {
  try {
    const recordData = req.body;
    
    // Basic validation
    if (!recordData.customer || !recordData.metrc_tag) {
      return res.status(400).json({
        success: false,
        error: 'Customer and METRC tag are required'
      });
    }

    const record = new Record(recordData);
    const id = await record.save();

    res.status(201).json({
      success: true,
      data: record.toJSON(),
      message: 'Record created successfully'
    });
  } catch (error) {
    console.error('Error creating record:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create record',
      message: error.message
    });
  }
});

// POST /api/records/bulk - Create multiple records
router.post('/bulk', async (req, res) => {
  try {
    const { records } = req.body;
    
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Records array is required and cannot be empty'
      });
    }

    const results = await Record.bulkCreate(records);
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    res.status(201).json({
      success: true,
      data: results,
      summary: {
        total: records.length,
        successful,
        failed
      },
      message: `Bulk import completed: ${successful} successful, ${failed} failed`
    });
  } catch (error) {
    console.error('Error bulk creating records:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to bulk create records',
      message: error.message
    });
  }
});

// PUT /api/records/:id - Update record
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid record ID'
      });
    }

    const existingRecord = await Record.findById(id);
    if (!existingRecord) {
      return res.status(404).json({
        success: false,
        error: 'Record not found'
      });
    }

    // Update record with new data
    Object.assign(existingRecord, req.body);
    existingRecord.date_updated = new Date().toISOString().split('T')[0];
    
    const updated = await existingRecord.save();
    
    if (updated) {
      res.json({
        success: true,
        data: existingRecord.toJSON(),
        message: 'Record updated successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to update record'
      });
    }
  } catch (error) {
    console.error('Error updating record:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update record',
      message: error.message
    });
  }
});

// DELETE /api/records/:id - Delete record
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid record ID'
      });
    }

    const deleted = await Record.delete(id);
    
    if (deleted) {
      res.json({
        success: true,
        message: 'Record deleted successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Record not found'
      });
    }
  } catch (error) {
    console.error('Error deleting record:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete record',
      message: error.message
    });
  }
});

// DELETE /api/records - Bulk delete records
router.delete('/', async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Array of record IDs is required'
      });
    }

    const results = [];
    let deletedCount = 0;

    for (const id of ids) {
      try {
        const deleted = await Record.delete(parseInt(id));
        if (deleted) {
          deletedCount++;
          results.push({ id, success: true });
        } else {
          results.push({ id, success: false, error: 'Record not found' });
        }
      } catch (error) {
        results.push({ id, success: false, error: error.message });
      }
    }

    res.json({
      success: true,
      data: results,
      summary: {
        total: ids.length,
        deleted: deletedCount,
        failed: ids.length - deletedCount
      },
      message: `Bulk delete completed: ${deletedCount} deleted, ${ids.length - deletedCount} failed`
    });
  } catch (error) {
    console.error('Error bulk deleting records:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to bulk delete records',
      message: error.message
    });
  }
});

module.exports = router;