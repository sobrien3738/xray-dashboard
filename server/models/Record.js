const db = require('./database');

class Record {
  constructor(data = {}) {
    this.id = data.id || null;
    this.metrc_tag = data.metrc_tag || '';
    this.metrc_tag_full = data.metrc_tag_full || '';
    this.invoice_to = data.invoice_to || '';
    this.customer = data.customer || '';
    this.invoice_weight = data.invoice_weight || 0;
    this.invoice_number = data.invoice_number || '';
    this.paid_date = data.paid_date || '';
    this.tests_failed = data.tests_failed || 0;
    this.lab = data.lab || '';
    this.compliance_status = data.compliance_status || '';
    this.apex_invoice_note = data.apex_invoice_note || '';
    this.date_created = data.date_created || new Date().toISOString().split('T')[0];
    this.date_updated = data.date_updated || new Date().toISOString().split('T')[0];
  }

  // Create new record
  async save() {
    const now = new Date().toISOString();
    
    if (this.id) {
      // Update existing record
      const sql = `
        UPDATE records SET 
          metrc_tag = ?, metrc_tag_full = ?, invoice_to = ?, customer = ?,
          invoice_weight = ?, invoice_number = ?, paid_date = ?, tests_failed = ?,
          lab = ?, compliance_status = ?, apex_invoice_note = ?, date_updated = ?,
          updated_at = ?
        WHERE id = ?
      `;
      
      const params = [
        this.metrc_tag, this.metrc_tag_full, this.invoice_to, this.customer,
        this.invoice_weight, this.invoice_number, this.paid_date, this.tests_failed,
        this.lab, this.compliance_status, this.apex_invoice_note, this.date_updated,
        now, this.id
      ];
      
      const result = await db.run(sql, params);
      return result.changes > 0;
    } else {
      // Create new record
      const sql = `
        INSERT INTO records (
          metrc_tag, metrc_tag_full, invoice_to, customer, invoice_weight,
          invoice_number, paid_date, tests_failed, lab, compliance_status,
          apex_invoice_note, date_created, date_updated, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const params = [
        this.metrc_tag, this.metrc_tag_full, this.invoice_to, this.customer,
        this.invoice_weight, this.invoice_number, this.paid_date, this.tests_failed,
        this.lab, this.compliance_status, this.apex_invoice_note, this.date_created,
        this.date_updated, now, now
      ];
      
      const result = await db.run(sql, params);
      this.id = result.lastID;
      return this.id;
    }
  }

  // Static methods
  static async findAll(filters = {}) {
    let sql = 'SELECT * FROM records';
    let params = [];
    let whereConditions = [];

    // Add filters
    if (filters.customer) {
      whereConditions.push('customer LIKE ?');
      params.push(`%${filters.customer}%`);
    }
    
    if (filters.metrc_tag) {
      whereConditions.push('metrc_tag LIKE ?');
      params.push(`%${filters.metrc_tag}%`);
    }
    
    if (filters.compliance_status) {
      whereConditions.push('compliance_status = ?');
      params.push(filters.compliance_status);
    }

    if (filters.date_from) {
      whereConditions.push('date_created >= ?');
      params.push(filters.date_from);
    }

    if (filters.date_to) {
      whereConditions.push('date_created <= ?');
      params.push(filters.date_to);
    }

    if (whereConditions.length > 0) {
      sql += ' WHERE ' + whereConditions.join(' AND ');
    }

    sql += ' ORDER BY date_created DESC, id DESC';

    const rows = await db.query(sql, params);
    return rows.map(row => new Record(row));
  }

  static async findById(id) {
    const sql = 'SELECT * FROM records WHERE id = ?';
    const row = await db.get(sql, [id]);
    return row ? new Record(row) : null;
  }

  static async delete(id) {
    const sql = 'DELETE FROM records WHERE id = ?';
    const result = await db.run(sql, [id]);
    return result.changes > 0;
  }

  static async bulkCreate(records) {
    const results = [];
    
    for (const recordData of records) {
      try {
        const record = new Record(recordData);
        const id = await record.save();
        results.push({ success: true, id, record: recordData });
      } catch (error) {
        results.push({ success: false, error: error.message, record: recordData });
      }
    }
    
    return results;
  }

  static async getStats() {
    const queries = {
      total: 'SELECT COUNT(*) as count FROM records',
      pending: 'SELECT COUNT(*) as count FROM records WHERE tests_failed = 0 AND (paid_date IS NULL OR paid_date = "")',
      passed: 'SELECT COUNT(*) as count FROM records WHERE tests_failed = 0',
      paid: 'SELECT COUNT(*) as count FROM records WHERE paid_date IS NOT NULL AND paid_date != ""',
      unpaid: 'SELECT COUNT(*) as count FROM records WHERE paid_date IS NULL OR paid_date = ""'
    };

    const stats = {};
    for (const [key, sql] of Object.entries(queries)) {
      const result = await db.get(sql);
      stats[key] = result.count;
    }

    return stats;
  }

  // Convert to plain object
  toJSON() {
    return {
      id: this.id,
      metrc_tag: this.metrc_tag,
      metrc_tag_full: this.metrc_tag_full,
      invoice_to: this.invoice_to,
      customer: this.customer,
      invoice_weight: this.invoice_weight,
      invoice_number: this.invoice_number,
      paid_date: this.paid_date,
      tests_failed: this.tests_failed,
      lab: this.lab,
      compliance_status: this.compliance_status,
      apex_invoice_note: this.apex_invoice_note,
      date_created: this.date_created,
      date_updated: this.date_updated
    };
  }
}

module.exports = Record;