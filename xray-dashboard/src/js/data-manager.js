class DataManager {
    constructor() {
        this.data = []
        this.storageKey = 'xray-dashboard-data'
        this.storageVersion = '1.0'
        this.maxRecords = 10000
        this.maxFileSize = 10 * 1024 * 1024 // 10MB
        this.columnMapping = {
            0: 'metrc_tag_full',   // Column A - contains METRC tag and possibly item name
            1: 'invoice_to',
            2: 'customer',
            7: 'invoice_weight',
            9: 'invoice_number',
            10: 'paid_date',
            11: 'tests_failed',
            12: 'lab',
            22: 'compliance_status'
        }
        this.errors = []
        this.validationRules = {
            customer: { required: true, maxLength: 200 },
            metrc_tag: { pattern: /^[A-Z0-9]{16}$/, message: 'METRC tag must be 16 alphanumeric characters' },
            invoice_weight: { type: 'number', min: 0, max: 1000 },
            email: { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email format' }
        }
        
        // Undo/Redo system
        this.undoStack = []
        this.redoStack = []
        this.maxUndoSteps = 50
        this.isUndoRedoing = false
    }

    saveDataToStorage() {
        try {
            // Check localStorage availability
            if (!this.isLocalStorageAvailable()) {
                throw new Error('localStorage is not available')
            }

            // Check data size limits
            const dataToSave = {
                version: this.storageVersion,
                timestamp: new Date().toISOString(),
                records: this.data,
                recordCount: this.data.length
            }
            
            const serializedData = JSON.stringify(dataToSave)
            const dataSize = new Blob([serializedData]).size
            
            // Check if data exceeds localStorage limits (typically 5-10MB)
            if (dataSize > 5 * 1024 * 1024) {
                throw new Error(`Data too large: ${(dataSize / 1024 / 1024).toFixed(2)}MB exceeds 5MB limit`)
            }
            
            // Create backup before saving
            this.createBackup()
            
            localStorage.setItem(this.storageKey, serializedData)
            window.uiManager?.showSaveIndicator()
            console.log(`Data saved to localStorage: ${this.data.length} records (${(dataSize / 1024).toFixed(2)}KB)`)
            
            // Clear any previous save errors
            this.clearError('save')
            
        } catch (error) {
            this.logError('save', error)
            console.error('Error saving to localStorage:', error)
            
            // Offer alternative save methods
            const message = error.message.includes('quota') || error.message.includes('large') 
                ? 'Storage full. Consider exporting data and clearing old records.'
                : 'Warning: Data could not be saved automatically. Consider exporting as backup.'
                
            window.uiManager?.showToast(message, 'error')
            
            // Attempt emergency export
            if (error.message.includes('quota')) {
                this.emergencyExport()
            }
        }
    }
    
    loadDataFromStorage() {
        try {
            if (!this.isLocalStorageAvailable()) {
                throw new Error('localStorage is not available')
            }

            const savedData = localStorage.getItem(this.storageKey)
            if (!savedData) {
                console.log('No saved data found in localStorage')
                return false
            }
            
            const parsedData = JSON.parse(savedData)
            
            // Validate data structure
            const validationResult = this.validateStorageData(parsedData)
            if (!validationResult.isValid) {
                throw new Error(`Invalid data structure: ${validationResult.errors.join(', ')}`)
            }
            
            // Check for version compatibility
            if (parsedData.version && parsedData.version !== this.storageVersion) {
                console.warn(`Version mismatch: saved=${parsedData.version}, current=${this.storageVersion}`)
                // Could implement migration logic here
            }
            
            // Sanitize and validate each record
            const sanitizedRecords = parsedData.records.map(record => this.sanitizeRecord(record))
            const validRecords = sanitizedRecords.filter(record => record !== null)
            
            if (validRecords.length !== parsedData.records.length) {
                const invalidCount = parsedData.records.length - validRecords.length
                console.warn(`Filtered out ${invalidCount} invalid records during load`)
                window.uiManager?.showToast(`Loaded ${validRecords.length} records (${invalidCount} invalid records skipped)`, 'info')
            }
            
            this.data = validRecords
            console.log(`Data loaded from localStorage: ${this.data.length} records`)
            
            if (this.data.length > 0) {
                window.uiManager?.showToast(`Welcome back! Loaded ${this.data.length} saved records`, 'success')
            }
            
            return true
            
        } catch (error) {
            this.logError('load', error)
            console.error('Error loading from localStorage:', error)
            
            // Try to recover from backup
            if (this.attemptBackupRecovery()) {
                window.uiManager?.showToast('Data recovered from backup', 'success')
                return true
            }
            
            window.uiManager?.showToast('Warning: Could not load saved data. Starting fresh.', 'error')
            return false
        }
    }
    
    clearAllData() {
        if (confirm('Are you sure you want to clear ALL data? This cannot be undone!')) {
            try {
                this.saveState('Clear all data')
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
                metrc_tag: "1A40D030000891D0", // First 16 characters
                apex_invoice_note: "1A40D030000891D000000658\nKUMIA2F7.040925", // Full tag + item
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
                metrc_tag: "1A40D030000891D0", // First 16 characters
                apex_invoice_note: "1A40D030000891D000000659\nBLSKI3G2.120424", // Full tag + item
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
        
        this.saveState('Create sample data')
        this.data = [...sampleRecords]
        window.uiManager?.updateTables()
        window.uiManager?.updateStats()
        this.autoSave()
        window.uiManager?.showToast('Sample data created successfully! 2 records added.', 'success')
    }

    handleExcelUpload(event) {
        const file = event.target.files[0]
        if (!file) return

        try {
            // Validate file
            const validationResult = this.validateFile(file)
            if (!validationResult.isValid) {
                window.uiManager?.showToast(`File validation failed: ${validationResult.errors.join(', ')}`, 'error')
                return
            }

            // Show loading overlay instead of toast
            window.uiManager?.showLoadingOverlay('Processing Excel file...')
            
            const reader = new FileReader()
            reader.onerror = () => {
                window.uiManager?.hideLoadingOverlay()
                this.logError('file-read', new Error('Failed to read file'))
                window.uiManager?.showToast('Error reading file', 'error')
            }
            
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result)
                    
                    if (!window.XLSX) {
                        throw new Error('XLSX library not loaded')
                    }
                    
                    const workbook = XLSX.read(data, { type: 'array' })
                    
                    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
                        throw new Error('No worksheets found in file')
                    }
                    
                    const worksheet = workbook.Sheets[workbook.SheetNames[0]]
                    
                    // Try multiple parsing methods to see if one captures Column G differently
                    console.log('\n🔍 TRYING MULTIPLE EXCEL PARSING METHODS:')
                    
                    // Check all sheets first
                    console.log('\n📄 CHECKING ALL SHEETS:')
                    console.log(`Available sheets: ${workbook.SheetNames.join(', ')}`)
                    
                    // Method 1: Standard parsing (current method)
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
                        header: 1,
                        defval: '',
                        raw: false,
                        range: 0 // Start from first row
                    })
                    
                    // Method 1.5: Try parsing with different options for better column detection
                    const jsonDataAlt = XLSX.utils.sheet_to_json(worksheet, { 
                        header: 1,
                        defval: '',
                        raw: false,
                        blankrows: false // Skip blank rows
                    })
                    console.log('Method 1 - Standard parsing:')
                    console.log(`  Total rows: ${jsonData.length}`)
                    console.log(`  Header row columns: ${jsonData[0] ? jsonData[0].length : 0}`)
                    if (jsonData.length > 1) {
                        const row1 = jsonData[1]
                        console.log(`  Data row columns: ${row1 ? row1.length : 0}`)
                        console.log(`  Row 1 Column G (index 6): "${row1[6] || 'EMPTY'}" (type: ${typeof row1[6]})`)
                    }
                    
                    console.log('Method 1.5 - Alternative parsing:')
                    console.log(`  Total rows: ${jsonDataAlt.length}`)
                    console.log(`  Header row columns: ${jsonDataAlt[0] ? jsonDataAlt[0].length : 0}`)
                    if (jsonDataAlt.length > 1) {
                        const row1Alt = jsonDataAlt[1]
                        console.log(`  Data row columns: ${row1Alt ? row1Alt.length : 0}`)
                        console.log(`  Row 1 Column G (index 6): "${row1Alt[6] || 'EMPTY'}" (type: ${typeof row1Alt[6]})`)
                    }
                    
                    // Check if Column A contains tab-separated data
                    if (jsonData.length > 1 && jsonData[1][0]) {
                        const firstDataCell = jsonData[1][0].toString()
                        if (firstDataCell.includes('\t')) {
                            console.log('🔍 DETECTED TAB-SEPARATED DATA IN COLUMN A!')
                            const tabSplit = firstDataCell.split('\t')
                            console.log(`Tab-split parts: ${tabSplit.length}`)
                            tabSplit.forEach((part, index) => {
                                console.log(`  Part ${index}: "${part}"`)
                            })
                            
                            // If we found tab-separated data, use the alternative jsonDataAlt
                            if (tabSplit.length > 6 && tabSplit[6]) {
                                console.log(`🎯 FOUND ITEM NAME in tab-separated data: "${tabSplit[6]}"`)
                            }
                        }
                    }
                    
                    // Show first 10 rows to look for pattern - SIMPLIFIED to avoid truncation
                    console.log('\n📋 FIRST 10 ROWS:')
                    for (let i = 0; i < Math.min(10, jsonData.length); i++) {
                        const row = jsonData[i]
                        const value = row && row[0] ? row[0] : 'EMPTY'
                        const isMetrcTag = /^[A-Z0-9]{16,}$/.test(value)
                        const hasTabs = value.toString().includes('\t')
                        console.log(`Row ${i}: "${value.substring(0, 50)}${value.length > 50 ? '...' : ''}" ${isMetrcTag ? '(METRC)' : '(OTHER)'} ${hasTabs ? '(HAS-TABS)' : ''}`)
                    }
                    
                    // Method 2: Raw parsing
                    const jsonDataRaw = XLSX.utils.sheet_to_json(worksheet, { 
                        header: 1,
                        defval: '',
                        raw: true 
                    })
                    console.log('Method 2 - Raw parsing:')
                    if (jsonDataRaw.length > 1) {
                        const row1Raw = jsonDataRaw[1]
                        console.log(`  Row 1 Column G (index 6): "${row1Raw[6] || 'EMPTY'}" (type: ${typeof row1Raw[6]})`)
                    }
                    
                    // Method 3: Object parsing with keys
                    const jsonDataObj = XLSX.utils.sheet_to_json(worksheet, { 
                        defval: '',
                        raw: false 
                    })
                    console.log('Method 3 - Object parsing:')
                    if (jsonDataObj.length > 0) {
                        const firstRecord = jsonDataObj[0]
                        console.log(`  First record keys: ${Object.keys(firstRecord).join(', ')}`)
                        Object.keys(firstRecord).forEach(key => {
                            console.log(`  "${key}": "${firstRecord[key]}"`)
                        })
                    }
                    
                    // Method 4: Direct cell access
                    console.log('Method 4 - Direct cell access:')
                    const range = XLSX.utils.decode_range(worksheet['!ref'])
                    console.log(`  Sheet range: ${worksheet['!ref']}`)
                    console.log(`  Range cols: ${range.s.c} to ${range.e.c}`)
                    console.log(`  Range rows: ${range.s.r} to ${range.e.r}`)
                    
                    // Check specific cells in Column G (column index 6)
                    for (let row = 0; row <= Math.min(5, range.e.r); row++) {
                        const cellAddress = XLSX.utils.encode_cell({r: row, c: 6}) // Column G
                        const cell = worksheet[cellAddress]
                        console.log(`  Cell ${cellAddress}: ${cell ? `"${cell.v}" (type: ${cell.t})` : 'EMPTY'}`)
                    }
                    
                    console.log('🔍 END PARSING METHODS\n')
                    
                    // Debug: Show header row and first few data rows from standard method
                    console.log('📊 STANDARD METHOD STRUCTURE:')
                    console.log(`Total rows: ${jsonData.length}`)
                    if (jsonData.length > 0) {
                        console.log('\nAll Columns in Header Row (Row 0):')
                        const maxHeaderCols = Math.max(jsonData[0].length, 20)
                        for (let i = 0; i < maxHeaderCols; i++) {
                            const colLetter = String.fromCharCode(65 + i)
                            const header = i < jsonData[0].length ? jsonData[0][i] : undefined
                            console.log(`  ${colLetter}${i}: "${header || 'EMPTY'}"`)
                        }
                        
                        if (jsonData.length > 1) {
                            console.log('\nAll Columns in First Data Row (Row 1):')
                            const maxDataCols = Math.max(jsonData[1].length, 20)
                            for (let i = 0; i < maxDataCols; i++) {
                                const colLetter = String.fromCharCode(65 + i)
                                const cell = i < jsonData[1].length ? jsonData[1][i] : undefined
                                console.log(`  ${colLetter}${i}: "${cell || 'EMPTY'}" (${typeof cell})`)
                            }
                        }
                        
                        if (jsonData.length > 2) {
                            console.log('\nAll Columns in Second Data Row (Row 2):')
                            const maxDataCols = Math.max(jsonData[2].length, 20)
                            for (let i = 0; i < maxDataCols; i++) {
                                const colLetter = String.fromCharCode(65 + i)
                                const cell = i < jsonData[2].length ? jsonData[2][i] : undefined
                                console.log(`  ${colLetter}${i}: "${cell || 'EMPTY'}" (${typeof cell})`)
                            }
                        }
                    }
                    console.log('📊 END STRUCTURE\n')
                    
                    if (!jsonData || jsonData.length <= 1) {
                        throw new Error('No data rows found in Excel file')
                    }
                    
                    // Since JSON parsing is failing but direct cell access works, use direct method
                    const results = this.processExcelDataDirect(worksheet)
                    
                    if (results.validRecords.length === 0) {
                        throw new Error('No valid records found in Excel file')
                    }
                    
                    // Check if adding these records would exceed limits
                    if (this.data.length + results.validRecords.length > this.maxRecords) {
                        throw new Error(`Import would exceed maximum records limit (${this.maxRecords})`)
                    }
                    
                    // Save state before adding records
                    this.saveState(`Excel import: ${results.validRecords.length} records`)
                    
                    // Add valid records
                    this.data.push(...results.validRecords)
                    
                    window.uiManager?.updateTables()
                    window.uiManager?.updateStats()
                    this.autoSave()
                    
                    // Prepare result message
                    let message = `Excel import complete! ${results.validRecords.length} records added`
                    if (results.invalidRecords.length > 0) {
                        message += `, ${results.invalidRecords.length} invalid records skipped`
                    }
                    
                    // Hide loading overlay and show success message
                    window.uiManager?.hideLoadingOverlay()
                    window.uiManager?.showToast(message, 'success')
                    
                    // Log validation errors if any
                    if (results.errors.length > 0) {
                        console.warn('Import validation errors:', results.errors)
                    }
                    
                    event.target.value = ''
                    
                } catch (error) {
                    window.uiManager?.hideLoadingOverlay()
                    this.logError('excel-import', error)
                    console.error('Error processing Excel file:', error)
                    window.uiManager?.showToast(`Error processing Excel file: ${error.message}`, 'error')
                    event.target.value = ''
                }
            }
            
            reader.readAsArrayBuffer(file)
            
        } catch (error) {
            window.uiManager?.hideLoadingOverlay()
            this.logError('file-upload', error)
            window.uiManager?.showToast(`File upload error: ${error.message}`, 'error')
        }
    }

    // Undo/Redo System
    saveState(action) {
        if (this.isUndoRedoing) return // Don't save state during undo/redo operations
        
        const state = {
            data: JSON.parse(JSON.stringify(this.data)), // Deep clone
            action: action,
            timestamp: new Date().toISOString()
        }
        
        this.undoStack.push(state)
        
        // Limit undo stack size
        if (this.undoStack.length > this.maxUndoSteps) {
            this.undoStack.shift()
        }
        
        // Clear redo stack when new action is performed
        this.redoStack = []
        
        this.updateUndoRedoUI()
    }

    undo() {
        if (this.undoStack.length === 0) return
        
        this.isUndoRedoing = true
        
        // Save current state to redo stack
        const currentState = {
            data: JSON.parse(JSON.stringify(this.data)),
            action: 'current',
            timestamp: new Date().toISOString()
        }
        this.redoStack.push(currentState)
        
        // Restore previous state
        const previousState = this.undoStack.pop()
        this.data = previousState.data
        
        // Update UI
        window.uiManager?.updateTables()
        window.uiManager?.updateStats()
        this.autoSave()
        
        window.uiManager?.showToast(`Undid: ${previousState.action}`, 'info')
        this.updateUndoRedoUI()
        
        this.isUndoRedoing = false
    }

    redo() {
        if (this.redoStack.length === 0) return
        
        this.isUndoRedoing = true
        
        // Save current state to undo stack
        const currentState = {
            data: JSON.parse(JSON.stringify(this.data)),
            action: 'undo',
            timestamp: new Date().toISOString()
        }
        this.undoStack.push(currentState)
        
        // Restore next state
        const nextState = this.redoStack.pop()
        this.data = nextState.data
        
        // Update UI
        window.uiManager?.updateTables()
        window.uiManager?.updateStats()
        this.autoSave()
        
        window.uiManager?.showToast(`Redid action`, 'info')
        this.updateUndoRedoUI()
        
        this.isUndoRedoing = false
    }

    updateUndoRedoUI() {
        const undoBtn = document.getElementById('undo-btn')
        const redoBtn = document.getElementById('redo-btn')
        const undoRedoInfo = document.getElementById('undo-redo-info')
        const undoRedoPanel = document.getElementById('undo-redo-panel')
        
        if (undoBtn) {
            undoBtn.disabled = this.undoStack.length === 0
        }
        
        if (redoBtn) {
            redoBtn.disabled = this.redoStack.length === 0
        }
        
        if (undoRedoInfo) {
            const lastAction = this.undoStack.length > 0 
                ? this.undoStack[this.undoStack.length - 1].action 
                : 'No actions'
            undoRedoInfo.textContent = `Last: ${lastAction}`
        }
        
        // Show panel if there are actions available
        if (undoRedoPanel) {
            if (this.undoStack.length > 0 || this.redoStack.length > 0) {
                undoRedoPanel.classList.add('show')
            } else {
                undoRedoPanel.classList.remove('show')
            }
        }
    }

    updateRecordField(recordId, fieldName, value) {
        // Save state before making changes
        this.saveState(`Update ${fieldName}`)
        
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
            this.saveState('Delete record')
            this.data = this.data.filter(r => r.id != recordId)
            window.uiManager?.updateTables()
            window.uiManager?.updateStats()
            this.autoSave()
            window.uiManager?.showToast('Record deleted successfully', 'success')
        }
    }

    addRecord(recordData) {
        try {
            // Validate input data
            const validationResult = this.validateRecord(recordData)
            if (!validationResult.isValid) {
                const errorMessage = `Validation failed: ${validationResult.errors.join(', ')}`
                window.uiManager?.showToast(errorMessage, 'error')
                throw new Error(errorMessage)
            }
            
            this.saveState('Add record')
            
            // Check record limits
            if (this.data.length >= this.maxRecords) {
                throw new Error(`Maximum records limit (${this.maxRecords}) reached`)
            }
            
            const newRecord = {
                id: Date.now(),
                customer: this.sanitizeString(recordData.customer) || '',
                invoice_to: this.sanitizeString(recordData.invoice_to) || '',
                metrc_tag: this.sanitizeString(recordData.metrc_tag) || '',
                apex_invoice_note: this.sanitizeString(recordData.apex_invoice_note) || '',
                invoice_weight: window.utils?.convertToPounds(recordData.invoice_weight, recordData.weight_unit) || '0',
                weight_input_value: recordData.invoice_weight || '',
                weight_unit: recordData.weight_unit || 'lbs',
                invoice_number: this.generateInvoiceNumber(),
                payment_method: '',
                payment_details: '',
                lab: '',
                tests_failed: '',
                date_created: new Date().toISOString().split('T')[0],
                paid_status: 'Not Paid',
                paid_date: '',
                compliance_status: 'Not Set'
            }
            
            // Final sanitization
            const sanitizedRecord = this.sanitizeRecord(newRecord)
            if (!sanitizedRecord) {
                throw new Error('Record sanitization failed')
            }
            
            this.data.unshift(sanitizedRecord)
            window.uiManager?.updateTables()
            window.uiManager?.updateStats()
            this.autoSave()
            
            return sanitizedRecord
            
        } catch (error) {
            this.logError('add-record', error)
            console.error('Error adding record:', error)
            throw error // Re-throw to let caller handle
        }
    }

    exportToExcel(dataToExport = null) {
        try {
            const sourceData = dataToExport || this.data
            const exportData = sourceData.map(record => ({
                'Date Created': record.date_created,
                'Customer': record.customer,
                'Invoice To': record.invoice_to,
                'METRC Tag': record.metrc_tag,
                'Apex Invoice Note': record.apex_invoice_note,
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

    // Autocomplete helper methods
    getUniqueCustomers() {
        const customers = new Set()
        this.data.forEach(record => {
            if (record.customer && record.customer.trim()) {
                customers.add(record.customer.trim())
            }
        })
        return Array.from(customers).sort()
    }

    getUniqueInvoiceTo() {
        const invoiceTo = new Set()
        this.data.forEach(record => {
            if (record.invoice_to && record.invoice_to.trim()) {
                invoiceTo.add(record.invoice_to.trim())
            }
        })
        return Array.from(invoiceTo).sort()
    }

    searchCustomers(query) {
        if (!query || query.length < 1) return []
        const customers = this.getUniqueCustomers()
        return customers.filter(customer => 
            customer.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 10) // Limit to 10 suggestions
    }

    searchInvoiceTo(query) {
        if (!query || query.length < 1) return []
        const invoiceTo = this.getUniqueInvoiceTo()
        return invoiceTo.filter(invoice => 
            invoice.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 10) // Limit to 10 suggestions
    }

    getAllCustomers() {
        return this.getUniqueCustomers().slice(0, 10) // Limit to 10 for dropdown
    }

    getAllInvoiceTo() {
        return this.getUniqueInvoiceTo().slice(0, 10) // Limit to 10 for dropdown
    }

    // Error handling and logging methods
    logError(context, error) {
        // Use centralized error reporter if available
        if (window.errorReporter) {
            return window.errorReporter.report(context, error, 'error')
        }
        
        // Fallback to local error logging
        const errorEntry = {
            context,
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString(),
            data: this.data.length
        }
        this.errors.push(errorEntry)
        
        // Keep only last 50 errors
        if (this.errors.length > 50) {
            this.errors = this.errors.slice(-50)
        }
    }
    
    clearError(context) {
        this.errors = this.errors.filter(err => err.context !== context)
    }
    
    // Validation methods
    isLocalStorageAvailable() {
        try {
            const testKey = 'localStorage-test'
            localStorage.setItem(testKey, 'test')
            localStorage.removeItem(testKey)
            return true
        } catch {
            return false
        }
    }
    
    validateFile(file) {
        const errors = []
        
        if (!file) {
            errors.push('No file selected')
            return { isValid: false, errors }
        }
        
        if (file.size > this.maxFileSize) {
            errors.push(`File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds ${this.maxFileSize / 1024 / 1024}MB limit`)
        }
        
        const allowedTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
            'text/csv'
        ]
        
        if (!allowedTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
            errors.push('Invalid file type. Please upload an Excel (.xlsx, .xls) or CSV file')
        }
        
        return { isValid: errors.length === 0, errors }
    }
    
    validateStorageData(data) {
        const errors = []
        
        if (!data || typeof data !== 'object') {
            errors.push('Invalid data format')
            return { isValid: false, errors }
        }
        
        if (!data.records || !Array.isArray(data.records)) {
            errors.push('Missing or invalid records array')
        }
        
        if (!data.version) {
            errors.push('Missing version information')
        }
        
        return { isValid: errors.length === 0, errors }
    }
    
    validateRecord(record) {
        const errors = []
        
        if (!record || typeof record !== 'object') {
            errors.push('Invalid record format')
            return { isValid: false, errors }
        }
        
        // Apply validation rules
        Object.keys(this.validationRules).forEach(field => {
            const rule = this.validationRules[field]
            const value = record[field]
            
            if (rule.required && (!value || value.toString().trim() === '')) {
                errors.push(`${field} is required`)
            }
            
            if (value) {
                if (rule.maxLength && value.toString().length > rule.maxLength) {
                    errors.push(`${field} exceeds maximum length of ${rule.maxLength}`)
                }
                
                if (rule.pattern && !rule.pattern.test(value.toString().replace(/\\s/g, ''))) {
                    errors.push(rule.message || `${field} format is invalid`)
                }
                
                if (rule.type === 'number') {
                    const numValue = parseFloat(value)
                    if (isNaN(numValue)) {
                        errors.push(`${field} must be a valid number`)
                    } else {
                        if (rule.min !== undefined && numValue < rule.min) {
                            errors.push(`${field} must be at least ${rule.min}`)
                        }
                        if (rule.max !== undefined && numValue > rule.max) {
                            errors.push(`${field} must not exceed ${rule.max}`)
                        }
                    }
                }
            }
        })
        
        return { isValid: errors.length === 0, errors }
    }
    
    sanitizeString(str) {
        if (!str) return ''
        return str.toString().trim().replace(/[<>\"']/g, '').substring(0, 200)
    }
    
    sanitizeRecord(record) {
        try {
            if (!record || typeof record !== 'object') return null
            
            const sanitized = {
                id: parseInt(record.id) || Date.now(),
                customer: this.sanitizeString(record.customer),
                invoice_to: this.sanitizeString(record.invoice_to),
                metrc_tag: this.sanitizeString(record.metrc_tag).substring(0, 16), // Truncate to 16 characters
                apex_invoice_note: this.sanitizeString(record.apex_invoice_note),
                invoice_weight: parseFloat(record.invoice_weight) || 0,
                weight_input_value: this.sanitizeString(record.weight_input_value),
                weight_unit: ['lbs', 'grams'].includes(record.weight_unit) ? record.weight_unit : 'lbs',
                invoice_number: this.sanitizeString(record.invoice_number),
                payment_method: this.sanitizeString(record.payment_method),
                payment_details: this.sanitizeString(record.payment_details),
                lab: this.sanitizeString(record.lab),
                tests_failed: this.sanitizeString(record.tests_failed),
                date_created: record.date_created || new Date().toISOString().split('T')[0],
                paid_status: ['Paid', 'Not Paid'].includes(record.paid_status) ? record.paid_status : 'Not Paid',
                paid_date: record.paid_date || '',
                compliance_status: this.sanitizeString(record.compliance_status) || 'Not Set'
            }
            
            return sanitized
        } catch (error) {
            console.error('Error sanitizing record:', error)
            return null
        }
    }
    
    processExcelDataDirect(worksheet) {
        const results = {
            validRecords: [],
            invalidRecords: [],
            errors: []
        }
        
        // Get the range of the worksheet
        const range = XLSX.utils.decode_range(worksheet['!ref'])
        console.log(`🔍 Processing ${range.e.r + 1} rows directly from worksheet`)
        
        // Process each row (skip header row 0)
        for (let rowIndex = 1; rowIndex <= range.e.r; rowIndex++) {
            try {
                // Get data from specific cells using direct access
                const metrcTagCell = worksheet[XLSX.utils.encode_cell({r: rowIndex, c: 0})] // Column A
                const itemNameCell = worksheet[XLSX.utils.encode_cell({r: rowIndex, c: 6})] // Column G
                
                // Extract values
                const metrcTagValue = metrcTagCell ? metrcTagCell.v : ''
                const itemNameValue = itemNameCell ? itemNameCell.v : ''
                
                console.log(`🔍 Row ${rowIndex}: METRC="${metrcTagValue}", Item="${itemNameValue}"`)
                
                // Skip empty rows
                if (!metrcTagValue || metrcTagValue.toString().trim() === '') {
                    continue
                }
                
                // Create new record
                const newRecord = {
                    id: Date.now() + rowIndex,
                    date_created: new Date().toISOString().split('T')[0],
                    metrc_tag: metrcTagValue.toString().substring(0, 16), // Truncated METRC tag
                    apex_invoice_note: itemNameValue ? `${metrcTagValue}\n${itemNameValue}` : metrcTagValue.toString(),
                    customer: '',
                    invoice_to: '',
                    invoice_weight: '',
                    weight_unit: 'lbs',
                    weight_input_value: '',
                    invoice_number: '',
                    payment_method: '',
                    payment_details: '',
                    tests_failed: '',
                    lab: '',
                    compliance_status: 'Not Set',
                    paid_status: 'Not Paid',
                    paid_date: ''
                }
                
                const sanitizedRecord = this.sanitizeRecord(newRecord)
                if (sanitizedRecord) {
                    results.validRecords.push(sanitizedRecord)
                    console.log(`✅ Added record: ${sanitizedRecord.metrc_tag} - ${itemNameValue || 'No item name'}`)
                } else {
                    results.invalidRecords.push({metrcTag: metrcTagValue, itemName: itemNameValue})
                    results.errors.push(`Row ${rowIndex + 1}: Failed sanitization`)
                }
                
            } catch (error) {
                results.invalidRecords.push({row: rowIndex})
                results.errors.push(`Row ${rowIndex + 1}: ${error.message}`)
            }
        }
        
        console.log(`🔍 Direct processing complete: ${results.validRecords.length} valid records`)
        return results
    }

    processExcelData(jsonData) {
        const results = {
            validRecords: [],
            invalidRecords: [],
            errors: []
        }
        
        for (let i = 1; i < jsonData.length; i++) {
            try {
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
                    
                    // Minimal debug to avoid console truncation
                    if (i === 1 && colIndex === 0) { // Only show column A for first data row
                        console.log(`🔍 Row 1 Column A: "${cellValue}"`)
                        
                        // Check if it contains tab-separated data
                        if (cellValue && cellValue.toString().includes('\t')) {
                            const parts = cellValue.toString().split('\t')
                            console.log(`🔍 TAB-SEPARATED: ${parts.length} parts found`)
                            console.log(`🔍 Part 0 (Tag): "${parts[0]}"`)
                            if (parts[6]) {
                                console.log(`🔍 Part 6 (Item): "${parts[6]}"`)
                            }
                        }
                    }
                    
                    // More lenient condition - capture anything that's not null/undefined
                    if (cellValue !== null && cellValue !== undefined && cellValue !== '') {
                        const trimmedValue = cellValue.toString().trim()
                        if (trimmedValue) {
                            newRecord[fieldName] = trimmedValue
                            if (i <= 3) {
                                console.log(`    ✓ Set newRecord.${fieldName} = "${trimmedValue}"`)
                            }
                        } else {
                            if (i <= 3) {
                                console.log(`    ✗ Trimmed value is empty`)
                            }
                        }
                    } else {
                        if (i <= 3) {
                            console.log(`    ✗ Cell value is null/undefined/empty`)
                        }
                    }
                })
                
                // FORCE capture column G data with multiple fallback methods
                let forceColumnG = row[6] // Column G direct access
                
                // Try different ways to get Column G data
                if (!forceColumnG || forceColumnG === undefined || forceColumnG === null || forceColumnG === '') {
                    // Try accessing as string
                    forceColumnG = row['6'] || row['G'] || ''
                }
                
                // Get the full data from column A
                const columnAData = newRecord.metrc_tag_full || row[0] || ''
                
                // Parse column A data - it might contain both METRC tag and item name
                let fullMetrcTag = ''
                let itemName = ''
                
                if (columnAData) {
                    const columnAString = columnAData.toString().trim()
                    
                    // Check if this looks like just a METRC tag (all alphanumeric, 16+ chars)
                    if (/^[A-Z0-9]{16,}$/.test(columnAString)) {
                        fullMetrcTag = columnAString
                        // Item name might be in a different row or we need to look elsewhere
                        console.log(`   Column A contains METRC tag only: "${fullMetrcTag}"`)
                    } 
                    // Check if it contains both tag and item (separated by space, newline, or other delimiter)
                    else if (columnAString.includes(' ') || columnAString.includes('\n') || columnAString.includes('\t')) {
                        // Try to split and identify METRC tag vs item name
                        const parts = columnAString.split(/[\s\n\t]+/)
                        
                        for (const part of parts) {
                            if (/^[A-Z0-9]{16,}$/.test(part)) {
                                fullMetrcTag = part
                            } else if (part.length > 3 && !fullMetrcTag.includes(part)) {
                                itemName = itemName ? `${itemName} ${part}` : part
                            }
                        }
                        console.log(`   Column A contains both - METRC: "${fullMetrcTag}", Item: "${itemName}"`)
                    }
                    // If it's not a pure METRC tag, treat the whole thing as potential item name
                    else if (columnAString.length > 16 && !/^[A-Z0-9]+$/.test(columnAString)) {
                        // Extract METRC tag from the beginning if it starts with one
                        const metrcMatch = columnAString.match(/^[A-Z0-9]{16,}/)
                        if (metrcMatch) {
                            fullMetrcTag = metrcMatch[0]
                            itemName = columnAString.substring(metrcMatch[0].length).trim()
                        } else {
                            itemName = columnAString
                        }
                        console.log(`   Column A mixed format - METRC: "${fullMetrcTag}", Item: "${itemName}"`)
                    }
                    // Default: treat as METRC tag
                    else {
                        fullMetrcTag = columnAString
                        console.log(`   Column A treated as METRC tag: "${fullMetrcTag}"`)
                    }
                }
                
                // Create truncated METRC tag (first 16 chars) for the METRC Tag column
                const truncatedMetrcTag = fullMetrcTag ? fullMetrcTag.toString().substring(0, 16) : ''
                
                // Simplified row analysis to avoid console truncation
                if (i === 1) { // Only show first data row
                    console.log(`🔍 Row ${i} has ${row.length} columns`)
                    console.log(`🔍 Column G exists: ${row[6] !== undefined}`)
                    if (row[6]) {
                        console.log(`🔍 Column G value: "${row[6]}"`)
                    }
                }
                
                // If no item name found, check if this might be an alternating row pattern
                if (!itemName) {
                    // Check if the next row might contain the item name for this METRC tag
                    const nextRowIndex = i + 1
                    if (nextRowIndex < jsonData.length) {
                        const nextRow = jsonData[nextRowIndex]
                        if (nextRow && nextRow[0]) {
                            const nextRowValue = nextRow[0].toString().trim()
                            // If next row doesn't look like a METRC tag, it might be the item name
                            if (!/^[A-Z0-9]{16,}$/.test(nextRowValue) && nextRowValue.length > 3) {
                                itemName = nextRowValue
                                if (i <= 3) {
                                    console.log(`   🎯 FOUND ITEM NAME in next row (${nextRowIndex}): "${itemName}"`)
                                }
                            }
                        }
                    }
                    
                    // Also check the previous row in case the pattern is reversed
                    if (!itemName && i > 1) {
                        const prevRowIndex = i - 1
                        const prevRow = jsonData[prevRowIndex]
                        if (prevRow && prevRow[0]) {
                            const prevRowValue = prevRow[0].toString().trim()
                            // If previous row doesn't look like a METRC tag, it might be the item name
                            if (!/^[A-Z0-9]{16,}$/.test(prevRowValue) && prevRowValue.length > 3) {
                                itemName = prevRowValue
                                if (i <= 3) {
                                    console.log(`   🎯 FOUND ITEM NAME in previous row (${prevRowIndex}): "${itemName}"`)
                                }
                            }
                        }
                    }
                    
                    // If still no item name, try to find in other columns for this row
                    if (!itemName) {
                        // Try columns around G (F, H, I, etc.)
                        const fallbackColumns = [5, 7, 8, 9, 10, 11, 12, 13, 14, 15] // F, H, I, J, K, L, M, N, O, P
                        
                        for (const colIndex of fallbackColumns) {
                            const fallbackValue = row[colIndex]
                            if (fallbackValue && typeof fallbackValue === 'string' && fallbackValue.trim()) {
                                const trimmedValue = fallbackValue.toString().trim()
                                // Look for values that might be item names (contain common words)
                                if (trimmedValue.toLowerCase().includes('preroll') || 
                                    trimmedValue.toLowerCase().includes('flower') ||
                                    trimmedValue.toLowerCase().includes('gram') ||
                                    trimmedValue.toLowerCase().includes('1g') ||
                                    trimmedValue.toLowerCase().includes('afghani') ||
                                    trimmedValue.toLowerCase().includes('kumia') ||
                                    (trimmedValue.length > 5 && !trimmedValue.match(/^[0-9.]+$/))) {
                                    
                                    const colLetter = String.fromCharCode(65 + colIndex)
                                    itemName = trimmedValue
                                    if (i <= 3) {
                                        console.log(`   🎯 FOUND ITEM NAME in column ${colLetter}${colIndex}: "${itemName}"`)
                                    }
                                    break
                                }
                            }
                        }
                    }
                }
                
                // Ensure we have the item name
                const finalItemName = itemName || ''
                
                // Set the METRC Tag field (truncated to 16 characters)
                newRecord.metrc_tag = truncatedMetrcTag
                
                // Set the Apex Invoice Note field (full METRC tag + item name)
                newRecord.apex_invoice_note = fullMetrcTag && finalItemName ? `${fullMetrcTag}\n${finalItemName}` : (fullMetrcTag || finalItemName || '')
                
                // Debug output for first few rows
                if (i <= 3) {
                    console.log(`\n📋 FINAL RESULT - Row ${i}:`)
                    console.log(`   METRC Tag (16 chars): "${truncatedMetrcTag}"`)
                    console.log(`   Item Name: "${finalItemName}"`)
                    console.log(`   Full Apex Note: "${newRecord.apex_invoice_note}"`)
                    console.log(`   Item found: ${!!finalItemName}`)
                }
                
                // Clean up temporary fields
                delete newRecord.apex_invoice_note_part2
                delete newRecord.metrc_tag_full
                
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
                
                const sanitizedRecord = this.sanitizeRecord(newRecord)
                if (sanitizedRecord) {
                    results.validRecords.push(sanitizedRecord)
                } else {
                    results.invalidRecords.push(row)
                    results.errors.push(`Row ${i + 1}: Failed sanitization`)
                }
                
            } catch (error) {
                results.invalidRecords.push(jsonData[i])
                results.errors.push(`Row ${i + 1}: ${error.message}`)
            }
        }
        
        return results
    }
    
    generateInvoiceNumber() {
        const now = new Date()
        const year = now.getFullYear()
        const month = String(now.getMonth() + 1).padStart(2, '0')
        const day = String(now.getDate()).padStart(2, '0')
        const timestamp = now.getTime().toString().slice(-4)
        
        return `INV-${year}${month}${day}-${timestamp}`
    }
    
    // Backup and recovery methods
    createBackup() {
        try {
            const backupKey = this.storageKey + '_backup'
            const currentData = localStorage.getItem(this.storageKey)
            if (currentData) {
                localStorage.setItem(backupKey, currentData)
            }
        } catch (error) {
            console.warn('Could not create backup:', error)
        }
    }
    
    attemptBackupRecovery() {
        try {
            const backupKey = this.storageKey + '_backup'
            const backupData = localStorage.getItem(backupKey)
            if (backupData) {
                const parsedData = JSON.parse(backupData)
                if (parsedData.records && Array.isArray(parsedData.records)) {
                    this.data = parsedData.records.map(record => this.sanitizeRecord(record)).filter(r => r !== null)
                    return true
                }
            }
        } catch (error) {
            console.error('Backup recovery failed:', error)
        }
        return false
    }
    
    emergencyExport() {
        try {
            const emergencyData = {
                timestamp: new Date().toISOString(),
                records: this.data
            }
            window.utils?.downloadJson(emergencyData, `emergency-backup-${Date.now()}.json`)
            window.uiManager?.showToast('Emergency backup downloaded', 'info')
        } catch (error) {
            console.error('Emergency export failed:', error)
        }
    }

    showDebugInfo() {
        console.log('Dashboard Data:', this.data)
        console.log('Total Records:', this.data.length)
        console.log('Recent Errors:', this.errors)
        console.log('localStorage Data:', localStorage.getItem(this.storageKey))
        
        // Get error summary from centralized reporter if available
        const errorSummary = window.errorReporter?.getErrorSummary() || { total: this.errors.length }
        
        let info = `Total Records: ${this.data.length}\n`
        info += `Total Errors: ${errorSummary.total}\n`
        
        if (errorSummary.bySeverity) {
            info += `Errors by severity: ${JSON.stringify(errorSummary.bySeverity)}\n`
        }
        info += '\n'
        
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
        
        // Show recent errors from centralized reporter or local
        const recentErrors = window.errorReporter?.getRecentErrors(3) || this.errors.slice(-3)
        if (recentErrors.length > 0) {
            info += 'Recent Errors:\n'
            recentErrors.forEach(error => {
                info += `- ${error.context}: ${error.message}\n`
            })
            info += '\n'
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
        
        info += '\n\nActions available:'
        info += '\n- Export error log: window.errorReporter.exportErrorLog()'
        info += '\n- Clear errors: window.errorReporter.clearErrors()'
        
        alert(info + '\n\nCheck console for detailed data')
    }
}

// Global instance
window.dataManager = new DataManager()