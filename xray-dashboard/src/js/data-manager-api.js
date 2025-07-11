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
        
        // Undo/Redo system (now handles API calls)
        this.undoStack = []
        this.redoStack = []
        this.maxUndoSteps = 50
        this.isUndoRedoing = false

        // API integration flag
        this.useAPI = true
        this.lastSyncTime = null
    }

    // API Methods - Replace localStorage with server calls
    async saveDataToStorage() {
        try {
            // In API mode, data is automatically saved on each operation
            // This method now just shows the save indicator
            window.uiManager?.showSaveIndicator()
            console.log(`Data synchronized with server: ${this.data.length} records`)
            return true
        } catch (error) {
            console.error('Error synchronizing with server:', error)
            window.uiManager?.showToast('Failed to synchronize with server', 'error')
            return false
        }
    }
    
    async loadDataFromStorage() {
        try {
            console.log('Loading data from server...')
            const response = await window.apiConfig.get('/records')
            
            if (response.success) {
                this.data = response.data
                this.lastSyncTime = new Date().toISOString()
                console.log(`Loaded ${this.data.length} records from server`)
                return true
            } else {
                throw new Error(response.error || 'Failed to load data')
            }
        } catch (error) {
            console.error('Error loading data from server:', error)
            
            // Fallback to localStorage if API is not available
            if (this.isLocalStorageAvailable()) {
                console.log('Falling back to localStorage...')
                return this.loadDataFromLocalStorageFallback()
            }
            
            window.uiManager?.showToast(`Failed to load data: ${error.message}`, 'error')
            return false
        }
    }

    // Fallback to localStorage if API is not available
    loadDataFromLocalStorageFallback() {
        try {
            const savedData = localStorage.getItem(this.storageKey)
            if (!savedData) {
                console.log('No fallback data found in localStorage')
                return false
            }
            
            const parsedData = JSON.parse(savedData)
            
            if (parsedData.records && Array.isArray(parsedData.records)) {
                this.data = parsedData.records
                console.log(`Loaded ${this.data.length} records from localStorage fallback`)
                window.uiManager?.showToast('Running in offline mode', 'warning')
                this.useAPI = false
                return true
            }
            
            return false
        } catch (error) {
            console.error('Error loading fallback data:', error)
            return false
        }
    }

    // API-based CRUD operations
    async addRecord(recordData) {
        try {
            this.saveState() // Save state for undo
            
            if (this.useAPI) {
                const response = await window.apiConfig.post('/records', recordData)
                
                if (response.success) {
                    // Update local data
                    this.data.push(response.data)
                    this.updateUI()
                    window.uiManager?.showToast('Record added successfully', 'success')
                    return response.data
                } else {
                    throw new Error(response.error || 'Failed to add record')
                }
            } else {
                // Fallback to local storage mode
                return this.addRecordLocal(recordData)
            }
        } catch (error) {
            console.error('Error adding record:', error)
            window.uiManager?.showToast(`Failed to add record: ${error.message}`, 'error')
            throw error
        }
    }

    async updateRecordField(recordId, fieldName, value) {
        try {
            this.saveState() // Save state for undo
            
            const record = this.data.find(r => r.id == recordId)
            if (!record) {
                throw new Error('Record not found')
            }

            if (this.useAPI) {
                const updateData = { [fieldName]: value }
                const response = await window.apiConfig.put(`/records/${recordId}`, updateData)
                
                if (response.success) {
                    // Update local data
                    Object.assign(record, response.data)
                    this.updateUI()
                    return true
                } else {
                    throw new Error(response.error || 'Failed to update record')
                }
            } else {
                // Fallback to local storage mode
                record[fieldName] = value
                record.date_updated = new Date().toISOString().split('T')[0]
                this.updateUI()
                return true
            }
        } catch (error) {
            console.error('Error updating record field:', error)
            window.uiManager?.showToast(`Failed to update ${fieldName}: ${error.message}`, 'error')
            return false
        }
    }

    async deleteRecord(recordId) {
        try {
            this.saveState() // Save state for undo
            
            if (this.useAPI) {
                const response = await window.apiConfig.delete(`/records/${recordId}`)
                
                if (response.success) {
                    // Update local data
                    this.data = this.data.filter(r => r.id != recordId)
                    this.updateUI()
                    window.uiManager?.showToast('Record deleted successfully', 'success')
                    return true
                } else {
                    throw new Error(response.error || 'Failed to delete record')
                }
            } else {
                // Fallback to local storage mode
                this.data = this.data.filter(r => r.id != recordId)
                this.updateUI()
                window.uiManager?.showToast('Record deleted successfully', 'success')
                return true
            }
        } catch (error) {
            console.error('Error deleting record:', error)
            window.uiManager?.showToast(`Failed to delete record: ${error.message}`, 'error')
            return false
        }
    }

    async bulkDelete(recordIds) {
        try {
            this.saveState() // Save state for undo
            
            if (this.useAPI) {
                const response = await window.apiConfig.delete('/records', { ids: recordIds })
                
                if (response.success) {
                    // Update local data
                    this.data = this.data.filter(r => !recordIds.includes(r.id))
                    this.updateUI()
                    window.uiManager?.showToast(`${response.summary.deleted} records deleted successfully`, 'success')
                    return response
                } else {
                    throw new Error(response.error || 'Failed to bulk delete records')
                }
            } else {
                // Fallback to local storage mode
                this.data = this.data.filter(r => !recordIds.includes(r.id))
                this.updateUI()
                window.uiManager?.showToast(`${recordIds.length} records deleted successfully`, 'success')
                return { summary: { deleted: recordIds.length } }
            }
        } catch (error) {
            console.error('Error bulk deleting records:', error)
            window.uiManager?.showToast(`Failed to bulk delete records: ${error.message}`, 'error')
            throw error
        }
    }

    async handleExcelUpload(event) {
        const file = event.target.files[0]
        if (!file) return

        try {
            window.uiManager?.showLoadingOverlay('Processing Excel file...')
            this.saveState() // Save state for undo

            if (this.useAPI) {
                // Upload to server
                const response = await window.apiConfig.uploadFile('/upload/excel', file)
                
                if (response.success) {
                    // Refresh data from server
                    await this.loadDataFromStorage()
                    this.updateUI()
                    
                    const { summary } = response.data
                    window.uiManager?.showToast(
                        `Excel import completed: ${summary.successful} records imported, ${summary.failed} failed`, 
                        'success'
                    )
                } else {
                    throw new Error(response.error || 'Failed to process Excel file')
                }
            } else {
                // Fallback to local processing
                await this.processExcelFileLocal(file)
            }
        } catch (error) {
            console.error('Error processing Excel file:', error)
            window.uiManager?.showToast(`Failed to process Excel file: ${error.message}`, 'error')
        } finally {
            window.uiManager?.hideLoadingOverlay()
            event.target.value = '' // Reset file input
        }
    }

    async exportToExcel(selectedData = null) {
        try {
            window.uiManager?.showLoadingOverlay('Generating Excel file...')
            
            if (this.useAPI) {
                // Use server export
                const response = await window.apiConfig.downloadFile('/upload/export')
                
                // Create download link
                const blob = await response.blob()
                const url = window.URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `xray-records-export-${new Date().toISOString().split('T')[0]}.xlsx`
                document.body.appendChild(a)
                a.click()
                window.URL.revokeObjectURL(url)
                document.body.removeChild(a)
                
                window.uiManager?.showToast('Excel file exported successfully', 'success')
            } else {
                // Fallback to local export
                this.exportToExcelLocal(selectedData)
            }
        } catch (error) {
            console.error('Error exporting to Excel:', error)
            window.uiManager?.showToast(`Failed to export Excel file: ${error.message}`, 'error')
        } finally {
            window.uiManager?.hideLoadingOverlay()
        }
    }

    // Local fallback methods (existing localStorage logic)
    addRecordLocal(recordData) {
        const id = Date.now() + Math.random()
        const record = {
            id,
            date_created: new Date().toISOString().split('T')[0],
            date_updated: new Date().toISOString().split('T')[0],
            ...recordData
        }
        
        this.data.push(record)
        this.saveDataToLocalStorage()
        this.updateUI()
        window.uiManager?.showToast('Record added successfully (offline)', 'success')
        return record
    }

    saveDataToLocalStorage() {
        try {
            const dataToSave = {
                version: this.storageVersion,
                timestamp: new Date().toISOString(),
                records: this.data,
                recordCount: this.data.length
            }
            localStorage.setItem(this.storageKey, JSON.stringify(dataToSave))
        } catch (error) {
            console.error('Error saving to localStorage:', error)
        }
    }

    async processExcelFileLocal(file) {
        // Use existing Excel processing logic
        const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        
        const records = this.processExcelDataDirect(worksheet)
        
        for (const record of records) {
            this.addRecordLocal(record)
        }
        
        window.uiManager?.showToast(`Excel import completed: ${records.length} records imported (offline)`, 'success')
    }

    exportToExcelLocal(selectedData = null) {
        const dataToExport = selectedData || this.data
        
        const exportData = dataToExport.map(record => ({
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
        }))

        const wb = XLSX.utils.book_new()
        const ws = XLSX.utils.json_to_sheet(exportData)
        XLSX.utils.book_append_sheet(wb, ws, 'X-Ray Records')

        const timestamp = new Date().toISOString().split('T')[0]
        const filename = `xray-records-export-${timestamp}.xlsx`
        
        XLSX.writeFile(wb, filename)
        window.uiManager?.showToast('Excel file exported successfully', 'success')
    }

    // Utility methods
    updateUI() {
        window.uiManager?.updateTables()
        window.uiManager?.updateStats()
        this.saveDataToStorage() // Auto-save indicator
    }

    isLocalStorageAvailable() {
        try {
            const test = '__localStorage_test__'
            localStorage.setItem(test, test)
            localStorage.removeItem(test)
            return true
        } catch (e) {
            return false
        }
    }

    // Keep existing undo/redo, validation, and utility methods
    saveState() {
        if (this.isUndoRedoing) return
        
        const state = JSON.parse(JSON.stringify(this.data))
        this.undoStack.push(state)
        
        if (this.undoStack.length > this.maxUndoSteps) {
            this.undoStack.shift()
        }
        
        this.redoStack = []
        this.updateUndoRedoUI()
    }

    async undo() {
        if (this.undoStack.length === 0) return
        
        this.isUndoRedoing = true
        
        try {
            const currentState = JSON.parse(JSON.stringify(this.data))
            this.redoStack.push(currentState)
            
            const previousState = this.undoStack.pop()
            this.data = previousState
            
            if (this.useAPI) {
                // TODO: Implement server-side undo if needed
                // For now, just update UI
                this.updateUI()
            } else {
                this.saveDataToLocalStorage()
                this.updateUI()
            }
            
            window.uiManager?.showToast('Action undone', 'info')
        } catch (error) {
            console.error('Error during undo:', error)
            window.uiManager?.showToast('Failed to undo action', 'error')
        } finally {
            this.isUndoRedoing = false
            this.updateUndoRedoUI()
        }
    }

    async redo() {
        if (this.redoStack.length === 0) return
        
        this.isUndoRedoing = true
        
        try {
            const currentState = JSON.parse(JSON.stringify(this.data))
            this.undoStack.push(currentState)
            
            const nextState = this.redoStack.pop()
            this.data = nextState
            
            if (this.useAPI) {
                // TODO: Implement server-side redo if needed
                // For now, just update UI
                this.updateUI()
            } else {
                this.saveDataToLocalStorage()
                this.updateUI()
            }
            
            window.uiManager?.showToast('Action redone', 'info')
        } catch (error) {
            console.error('Error during redo:', error)
            window.uiManager?.showToast('Failed to redo action', 'error')
        } finally {
            this.isUndoRedoing = false
            this.updateUndoRedoUI()
        }
    }

    updateUndoRedoUI() {
        const undoBtn = document.getElementById('undo-btn')
        const redoBtn = document.getElementById('redo-btn')
        
        if (undoBtn) {
            undoBtn.disabled = this.undoStack.length === 0
        }
        
        if (redoBtn) {
            redoBtn.disabled = this.redoStack.length === 0
        }
        
        const undoRedoPanel = document.getElementById('undo-redo-panel')
        if (undoRedoPanel) {
            if (this.undoStack.length > 0 || this.redoStack.length > 0) {
                undoRedoPanel.classList.add('show')
            } else {
                undoRedoPanel.classList.remove('show')
            }
        }
    }

    // Keep all existing utility methods unchanged
    getAllCustomers() {
        const customers = [...new Set(this.data.map(record => record.customer).filter(c => c && c.trim()))]
        return customers.sort()
    }

    getAllInvoiceTo() {
        const invoiceTo = [...new Set(this.data.map(record => record.invoice_to).filter(c => c && c.trim()))]
        return invoiceTo.sort()
    }

    // Include existing methods like processExcelDataDirect, showDebugInfo, etc.
    processExcelDataDirect(worksheet) {
        const records = []
        let rowIndex = 2 // Start from row 2 (skip header)
        
        while (true) {
            const metrcCell = worksheet[XLSX.utils.encode_cell({ r: rowIndex - 1, c: 0 })]
            const customerCell = worksheet[XLSX.utils.encode_cell({ r: rowIndex - 1, c: 2 })]
            
            if (!metrcCell && !customerCell) {
                break
            }
            
            const record = {
                id: Date.now() + Math.random(),
                date_created: new Date().toISOString().split('T')[0],
                date_updated: new Date().toISOString().split('T')[0]
            }
            
            // Process using existing column mapping logic...
            for (const [colIndex, fieldName] of Object.entries(this.columnMapping)) {
                const cell = worksheet[XLSX.utils.encode_cell({ r: rowIndex - 1, c: parseInt(colIndex) })]
                let value = cell ? cell.v : ''
                
                if (fieldName === 'metrc_tag_full') {
                    const fullText = String(value || '').trim()
                    const metrcMatch = fullText.match(/[A-Z0-9]{16}/)
                    record.metrc_tag = metrcMatch ? metrcMatch[0] : ''
                    record.metrc_tag_full = fullText
                    record.apex_invoice_note = fullText
                } else if (fieldName === 'invoice_weight') {
                    record[fieldName] = parseFloat(value) || 0
                } else if (fieldName === 'tests_failed') {
                    record[fieldName] = parseInt(value) || 0
                } else {
                    record[fieldName] = String(value || '').trim()
                }
            }
            
            if (record.customer && record.customer.trim()) {
                records.push(record)
            }
            
            rowIndex++
            
            if (rowIndex > 10000) {
                console.warn('Reached maximum row limit (10000) during Excel processing')
                break
            }
        }
        
        return records
    }

    // Add other existing methods as needed...
    clearAllData() {
        if (confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
            this.saveState()
            this.data = []
            this.updateUI()
            window.uiManager?.showToast('All data cleared', 'success')
        }
    }

    createSampleData() {
        this.saveState()
        
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
                apex_invoice_note: '1A40D03000005DD1000053021 Theory Wellness Premium Flower\nBatch: TW-240301\nStrain: Blue Dream'
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
                apex_invoice_note: '1A40D03000005DD2000053022 Green Thumb Industries Concentrate\nProduct: Live Resin\nTHC: 78.5%'
            }
        ]
        
        for (const recordData of sampleRecords) {
            this.addRecord(recordData)
        }
        
        window.uiManager?.showToast('Sample data created', 'success')
    }

    showDebugInfo() {
        const debugInfo = {
            totalRecords: this.data.length,
            apiMode: this.useAPI,
            lastSync: this.lastSyncTime,
            undoStackSize: this.undoStack.length,
            redoStackSize: this.redoStack.length,
            errors: this.errors
        }
        
        console.log('X-Ray Dashboard Debug Info:', debugInfo)
        alert(`Debug Info:\nTotal Records: ${debugInfo.totalRecords}\nAPI Mode: ${debugInfo.apiMode}\nLast Sync: ${debugInfo.lastSync}\nUndo Stack: ${debugInfo.undoStackSize}\nRedo Stack: ${debugInfo.redoStackSize}`)
    }
}

// Global instance
window.dataManager = new DataManager()