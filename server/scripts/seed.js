#!/usr/bin/env node

require('dotenv').config();
const Record = require('../models/Record');

async function seed() {
  console.log('Starting database seeding...');
  
  try {
    // Check if records already exist
    const existingRecords = await Record.findAll();
    
    if (existingRecords.length > 0) {
      console.log(`Database already has ${existingRecords.length} records. Skipping seed.`);
      process.exit(0);
    }
    
    // Sample data for testing
    const sampleRecords = [
      {
        metrc_tag: '1A40D03000005DD1',
        metrc_tag_full: '1A40D03000005DD1000053021 Theory Wellness Premium Flower',
        customer: 'Theory Wellness',
        invoice_to: 'Theory Wellness Inc.',
        invoice_weight: 15.5,
        invoice_number: 'INV-2024-001',
        paid_date: '',
        tests_failed: 0,
        lab: 'MCR Labs',
        compliance_status: 'Pending',
        apex_invoice_note: '1A40D03000005DD1000053021 Theory Wellness Premium Flower\nBatch: TW-240301\nStrain: Blue Dream',
        date_created: '2024-01-15',
        date_updated: '2024-01-15'
      },
      {
        metrc_tag: '1A40D03000005DD2',
        metrc_tag_full: '1A40D03000005DD2000053022 Green Thumb Industries Concentrate',
        customer: 'Green Thumb Industries',
        invoice_to: 'GTI Holdings Inc.',
        invoice_weight: 8.25,
        invoice_number: 'INV-2024-002',
        paid_date: '2024-01-20',
        tests_failed: 0,
        lab: 'ProVerde Labs',
        compliance_status: 'Passed',
        apex_invoice_note: '1A40D03000005DD2000053022 Green Thumb Industries Concentrate\nProduct: Live Resin\nTHC: 78.5%',
        date_created: '2024-01-16',
        date_updated: '2024-01-20'
      },
      {
        metrc_tag: '1A40D03000005DD3',
        metrc_tag_full: '1A40D03000005DD3000053023 Curaleaf Edibles',
        customer: 'Curaleaf',
        invoice_to: 'Curaleaf Holdings Inc.',
        invoice_weight: 12.0,
        invoice_number: 'INV-2024-003',
        paid_date: '',
        tests_failed: 1,
        lab: 'Steep Hill Labs',
        compliance_status: 'Failed',
        apex_invoice_note: '1A40D03000005DD3000053023 Curaleaf Edibles\nProduct: Gummies 10mg\nFailed: Pesticide residue',
        date_created: '2024-01-17',
        date_updated: '2024-01-18'
      }
    ];
    
    console.log(`Creating ${sampleRecords.length} sample records...`);
    
    const results = await Record.bulkCreate(sampleRecords);
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`✅ Seeding completed: ${successful} records created, ${failed} failed`);
    
    if (failed > 0) {
      const errors = results.filter(r => !r.success).map(r => r.error);
      console.log('❌ Errors:', errors);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Run seeding if called directly
if (require.main === module) {
  seed();
}

module.exports = seed;