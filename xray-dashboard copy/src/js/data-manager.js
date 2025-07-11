class DataManager {
    constructor() {
        this.data = []
        this.storageKey = 'xray-dashboard-data'
        this.storageVersion = '1.0'
        this.columnMapping = {
            0: 'metrc_tag',
            1: 'invoice_to',
            2: 'customer',
            7: 'invoice_weight',
            9: 'invoice_number',
            10: 'paid_date',
            11: 'tests_failed',
            12: 'lab',
            22: 'compliance_status'
        }
    }

    saveDataToStorage() {
        try {
            const dataToSave = {
                version: this.storageVersion,
                timestamp: new Date().toISOString(),
                records: this.data,
                recordCount: this.data.length
            }
            
            localStorage.setItem(this.storageKey, JSON.stringify(dataToSave))
            window.uiManager?.showSaveIndicator()
            console.log(`Data saved to localStorage: ${this.data.length} records`)
            
        } catch (error) {
            console.error('Error saving to localStorage:', error)
            window.uiManager?.showToast('Warning: Data could not be saved automatically', 'error')
        }
    }
    
    loadDataFromStorage() {
        try {
            const savedData = localStorage.getItem(this.storageKey)
            if (!savedData) {
                console.log('No saved data found in localStorage')
                return false
            }
            
            const parsedData = JSON.parse(savedData)
            
            if (parsedData.version && parsedData.records && Array.isArray(parsedData.records)) {
                this.data = parsedData.records
                console.log(`Data loaded from localStorage: ${this.data.length} records`)
                
                if (this.data.length > 0) {
                    window.uiManager?.showToast(`Welcome back! Loaded ${this.data.length} saved records`, 'success')
                }
                
                return true
            } else {
                console.log('Invalid data structure in localStorage, starting fresh')
                return false
            }
            
        } catch (error) {
            console.error('Error loading from localStorage:', error)
            window.uiManager?.showToast('Warning: Could not load saved data', 'error')
            return false
        }
    }
    
    clearAllData() {
        if (confirm('Are you sure you want to clear ALL data? This cannot be undone!')) {
            try {
                localStorage.removeItem(this.storageKey)
                this.data = []
                window.uiManager?.updateTables()
                window.uiManager?.updateStats()
                window.uiManager?.showToast('All data cleared successfully', 'success')
                console.log('All data cleared from localStorage')
            } catch (error) {
                console.error('Error clearing localStorage:', error)
                window.uiManager?.showToast('Error clearing data', 'error')
            }
        }
    }
    
    autoSave() {
        if (this.autoSave.timeout) {
            clearTimeout(this.autoSave.timeout)
        }
        this.autoSave.timeout = setTimeout(() => {
            this.saveDataToStorage()
        }, 500)
    }

    createSampleData() {
        const sampleRecords = [
            {
                id: 1001,
                customer: "Blue Sky Lab LLC",
                invoice_to: "Blue Sky",
                metrc_tag: "1A40D030000891D000000658",
                invoice_weight: "2.50",
                weight_input_value: "2.50",
                weight_unit: "lbs",
                invoice_number: "INV-2024-001",
                payment_method: "Check",
                payment_details: "Check #1234",
                paid_status: "Paid",
                paid_date: "2024-06-20",
                tests_failed: "None",
                lab: "CATLAB",
                compliance_status: "Passed Testing",
                date_created: "2024-06-15"
            },
            {
                id: 1002,
                customer: "Dreamscape Farms SP LLC",
                invoice_to: "Dreamscape Farms",
                metrc_tag: "1A40D030000891D000000659",
                invoice_weight: "1.75",
                weight_input_value: "1.75",
                weight_unit: "lbs",
                invoice_number: "",
                payment_method: "",
                payment_details: "",
                paid_status: "Not Paid",
                paid_date: "",
                tests_failed: "Total Yeast & Mold",
                lab: "MCR",
                compliance_status: "Failed Testing",
                date_created: "2024-06-16"
            }
        ]
        
        this.data = [...sampleRecords]
        window.uiManager?.updateTables()
        window.uiManager?.updateStats()
        this.autoSave()
        window.uiManager?.showToast('Sample data created successfully! 2 records added.', 'success')
    }

    handleExcelUpload(event) {
        const file = event.target.files[0]
        if (!file) return

        window.uiManager?.showToast('Processing Excel file...', 'info')
        
        const reader = new FileReader()
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result)
                const workbook = XLSX.read(data, { type: 'array' })
                const worksheet = workbook.Sheets[workbook.SheetNames[0]]
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
                    header: 1,
                    defval: '',
                    raw: false 
                })
                
                let newRecordsCount = 0
                
                for (let i = 1; i < jsonData.length; i++) {
                    const row = jsonData[i]
                    
                    if (!row || !row[0] || row[0].toString().trim() === '') {
                        continue
                    }
                    
                    const newRecord = {
                        id: Date.now() + i,
                        date_created: new Date().toISOString().split('T')[0]
                    }
                    
                    Object.keys(this.columnMapping).forEach(colIndex => {
                        const fieldName = this.columnMapping[colIndex]
                        const cellValue = row[parseInt(colIndex)]
                        
                        if (cellValue && cellValue.toString().trim()) {
                            newRecord[fieldName] = cellValue.toString().trim()
                        }
                    })
                    
                    // Set defaults
                    newRecord.customer = newRecord.customer || ''
                    newRecord.invoice_to = newRecord.invoice_to || ''
                    newRecord.metrc_tag = newRecord.metrc_tag || ''
                    newRecord.invoice_weight = newRecord.invoice_weight || ''
                    newRecord.weight_unit = 'lbs'
                    newRecord.weight_input_value = newRecord.invoice_weight
                    newRecord.invoice_number = newRecord.invoice_number || ''
                    newRecord.payment_method = newRecord.payment_method || ''
                    newRecord.payment_details = newRecord.payment_details || ''
                    newRecord.tests_failed = newRecord.tests_failed || ''
                    newRecord.lab = newRecord.lab || ''
                    newRecord.compliance_status = newRecord.compliance_status || 'Not Set'
                    newRecord.paid_status = newRecord.paid_date ? 'Paid' : 'Not Paid'
                    
                    this.data.push(newRecord)
                    newRecordsCount++
                }
                
                window.uiManager?.updateTables()
                window.uiManager?.updateStats()
                this.autoSave()
                
                window.uiManager?.showToast(`Excel import complete! ${newRecordsCount} records added and saved.`, 'success')
                event.target.value = ''
                
            } catch (error) {
                console.error('Error processing Excel file:', error)
                window.uiManager?.showToast('Error processing Excel file: ' + error.message, 'error')
            }
        }
        
        reader.readAsArrayBuffer(file)
    }

    updateRecordField(recordId, fieldName, value) {
        const record = this.data.find(r => r.id == recordId)
        if (record) {
            record[fieldName] = value
            
            if (fieldName === 'paid_date') {
                record.paid_status = value ? 'Paid' : 'Not Paid'
            }
            
            window.uiManager?.updateTables()
            window.uiManager?.updateStats()
            this.autoSave()
        }
    }

    deleteRecord(recordId) {
        if (confirm('Are you sure you want to delete this record?')) {
            this.data = this.data.filter(r => r.id != recordId)
            window.uiManager?.updateTables()
            window.uiManager?.updateStats()
            this.autoSave()
            window.uiManager?.showToast('Record deleted successfully', 'success')
        }
    }

    addRecord(recordData) {
        const newRecord = {
            id: Date.now(),
            customer: recordData.customer || '',
            invoice_to: recordData.invoice_to || '',
            metrc_tag: recordData.metrc_tag || '',
            invoice_weight: window.utils?.convertToPounds(recordData.invoice_weight, recordData.weight_unit),
            weight_input_value: recordData.invoice_weight || '',
            weight_unit: recordData.weight_unit || 'lbs',
            invoice_number: '',
            payment_method: '',
            payment_details: '',
            lab: '',
            tests_failed: '',
            date_created: new Date().toISOString().split('T')[0],
            paid_status: 'Not Paid',
            paid_date: '',
            compliance_status: 'Not Set'
        }
        
        this.data.unshift(newRecord)
        window.uiManager?.updateTables()
        window.uiManager?.updateStats()
        this.autoSave()
        
        return newRecord
    }

    exportToExcel() {
        try {
            const exportData = this.data.map(record => ({
                'Date Created': record.date_created,
                'Customer': record.customer,
                'Invoice To': record.invoice_to,
                'METRC Tag': record.metrc_tag,
                'Invoice Weight (lbs)': record.invoice_weight,
                'Weight Input': `${record.weight_input_value || record.invoice_weight} ${record.weight_unit || 'lbs'}`,
                'Invoice #': record.invoice_number,
                'Payment Method': record.payment_method,
                'Payment Details': record.payment_details,
                'Paid Status': record.paid_status,
                'Paid Date': record.paid_date,
                'Tests Failed': record.tests_failed,
                'Lab': record.lab,
                'Compliance Status': record.compliance_status
            }))

            const ws = XLSX.utils.json_to_sheet(exportData)
            const wb = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(wb, ws, "X-Ray Tracking")
            XLSX.writeFile(wb, `xray-tracking-${new Date().toISOString().split('T')[0]}.xlsx`)
            window.uiManager?.showToast('Data exported successfully', 'success')
        } catch (error) {
            console.error('Error exporting data:', error)
            window.uiManager?.showToast('Error exporting data', 'error')
        }
    }

    getStats() {
        const total = this.data.length
        const paid = this.data.filter(r => r.paid_status === 'Paid').length
        const unpaid = this.data.filter(r => r.paid_status === 'Not Paid').length
        const passed = this.data.filter(r => r.compliance_status?.includes('Passed')).length
        const pending = this.data.filter(r => r.compliance_status === 'Not Set' || !r.compliance_status).length

        return { total, paid, unpaid, passed, pending }
    }

    showDebugInfo() {
        console.log('Dashboard Data:', this.data)
        console.log('Total Records:', this.data.length)
        console.log('localStorage Data:', localStorage.getItem(this.storageKey))
        
        let info = `Total Records: ${this.data.length}\n\n`
        
        try {
            const savedData = localStorage.getItem(this.storageKey)
            if (savedData) {
                const parsed = JSON.parse(savedData)
                info += `Storage: ${parsed.recordCount} records saved at ${parsed.timestamp}\n\n`
            } else {
                info += 'Storage: No saved data found\n\n'
            }
        } catch (e) {
            info += 'Storage: Error reading saved data\n\n'
        }
        
        if (this.data.length > 0) {
            info += 'First few records:\n'
            this.data.slice(0, 3).forEach((record, index) => {
                info += `\nRecord ${index + 1}:\n`
                info += `- Customer: ${record.customer}\n`
                info += `- METRC Tag: ${record.metrc_tag}\n`
            })
        } else {
            info += 'No records found. Try uploading an Excel file, adding records manually, or creating sample data.'
        }
        
        alert(info + '\n\nCheck console for detailed data')
    }
}

// Global instance
window.dataManager = new DataManager()