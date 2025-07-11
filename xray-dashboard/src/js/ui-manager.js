class UIManager {
    constructor() {
        this.currentTab = 'invoicing'
        this.sortConfig = { column: null, direction: 'asc' }
        this.activeFilters = {}
        this.selectedRows = new Set()
        this.collapsedSections = new Set() // Track which sections are collapsed
        this.validationRules = {
            customer: { required: true, minLength: 2, maxLength: 200 },
            metrc_tag: { required: true, pattern: /^[A-Z0-9]{16}$/, message: 'METRC tag must be 16 alphanumeric characters' },
            invoice_weight: { type: 'number', min: 0, max: 1000 },
            invoice_number: { pattern: /^[A-Z0-9\-]+$/i, message: 'Invalid invoice number format' },
            email: { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email format' }
        }
    }

    // Auto-resize textareas to fit content properly
    autoResizeTextareas() {
        const textareas = document.querySelectorAll('textarea.auto-resize')
        textareas.forEach(textarea => {
            if (textarea.value && textarea.value.trim()) {
                // Force a reflow by setting height to auto first
                textarea.style.height = 'auto'
                // Calculate proper height based on content with padding considerations
                const newHeight = Math.max(textarea.scrollHeight, 60)
                textarea.style.height = newHeight + 'px'
            } else {
                // For empty textareas, set minimum height
                textarea.style.height = '60px'
            }
        })
    }

    showSaveIndicator() {
        const indicator = document.getElementById('save-indicator')
        if (indicator) {
            indicator.classList.add('show')
            setTimeout(() => {
                indicator.classList.remove('show')
            }, 2000)
        }
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div')
        const bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500'
        
        toast.className = `toast ${bgColor} text-white px-4 py-2 rounded-lg shadow-lg z-50`
        toast.innerHTML = `
            <div class="flex items-center gap-2">
                <span>${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" class="text-white hover:text-gray-200">×</button>
            </div>
        `
        
        const container = document.getElementById('toast-container')
        container.appendChild(toast)
        setTimeout(() => toast.classList.add('show'), 100)
        setTimeout(() => {
            toast.classList.remove('show')
            setTimeout(() => toast.remove(), 300)
        }, 5000)
    }

    showLoadingOverlay(message = 'Processing...') {
        const overlay = document.createElement('div')
        overlay.id = 'loading-overlay'
        overlay.className = 'loading-overlay'
        overlay.innerHTML = `
            <div class="loading-content">
                <div class="spinner w-8 h-8 mx-auto"></div>
                <div class="loading-text">${message}</div>
            </div>
        `
        document.body.appendChild(overlay)
    }

    hideLoadingOverlay() {
        const overlay = document.getElementById('loading-overlay')
        if (overlay) {
            overlay.remove()
        }
    }

    validateField(field, value, fieldName) {
        const rules = this.validationRules[fieldName]
        if (!rules) return { isValid: true }

        const errors = []

        // Required validation
        if (rules.required && (!value || value.toString().trim() === '')) {
            errors.push(`${fieldName} is required`)
        }

        // Skip other validations if field is empty and not required
        if (!value || value.toString().trim() === '') {
            return { isValid: errors.length === 0, errors }
        }

        // Type validation
        if (rules.type === 'number') {
            const numValue = parseFloat(value)
            if (isNaN(numValue)) {
                errors.push(`${fieldName} must be a number`)
            } else {
                if (rules.min !== undefined && numValue < rules.min) {
                    errors.push(`${fieldName} must be at least ${rules.min}`)
                }
                if (rules.max !== undefined && numValue > rules.max) {
                    errors.push(`${fieldName} must be no more than ${rules.max}`)
                }
            }
        }

        // Pattern validation
        if (rules.pattern && !rules.pattern.test(value.toString())) {
            errors.push(rules.message || `${fieldName} format is invalid`)
        }

        // Length validation
        if (rules.minLength && value.toString().length < rules.minLength) {
            errors.push(`${fieldName} must be at least ${rules.minLength} characters`)
        }
        if (rules.maxLength && value.toString().length > rules.maxLength) {
            errors.push(`${fieldName} must be no more than ${rules.maxLength} characters`)
        }

        return { isValid: errors.length === 0, errors }
    }

    applyValidationStyling(field, validation) {
        // Remove existing validation classes
        field.classList.remove('input-valid', 'input-invalid', 'input-warning')
        
        // Remove existing validation message
        const existingMessage = field.parentNode.querySelector('.validation-message')
        if (existingMessage) {
            existingMessage.remove()
        }

        // Apply new validation styling
        if (validation.isValid) {
            field.classList.add('input-valid')
        } else {
            field.classList.add('input-invalid')
            
            // Add validation message
            const message = document.createElement('span')
            message.className = 'validation-message error'
            message.textContent = validation.errors[0] // Show first error
            field.parentNode.appendChild(message)
        }
    }

    setupFieldValidation(field, fieldName) {
        const validateAndStyle = () => {
            const validation = this.validateField(field, field.value, fieldName)
            this.applyValidationStyling(field, validation)
            return validation.isValid
        }

        // Validate on blur (when user leaves field)
        field.addEventListener('blur', validateAndStyle)
        
        // Validate on input for immediate feedback (debounced)
        let timeout
        field.addEventListener('input', () => {
            clearTimeout(timeout)
            timeout = setTimeout(validateAndStyle, 500)
        })

        return validateAndStyle
    }

    // Check if a record is completed (paid and passed testing)
    isRecordCompleted(record) {
        const isPaid = record.paid_status === 'Paid'
        const hasPassedTesting = record.compliance_status === 'Passed Testing' || 
                                record.tests_failed === 'None' || 
                                record.tests_failed === '0' ||
                                record.tests_failed === 0
        return isPaid && hasPassedTesting
    }

    // Collapsible section management
    toggleSection(sectionId) {
        if (this.collapsedSections.has(sectionId)) {
            this.collapsedSections.delete(sectionId)
        } else {
            this.collapsedSections.add(sectionId)
        }
        this.updateSectionDisplay(sectionId)
    }

    updateSectionDisplay(sectionId) {
        const header = document.getElementById(`${sectionId}-header`)
        const content = document.getElementById(`${sectionId}-content`)
        
        if (!header || !content) return
        
        const isCollapsed = this.collapsedSections.has(sectionId)
        
        if (isCollapsed) {
            header.classList.remove('expanded')
            header.classList.add('collapsed')
            content.classList.remove('expanded')
            content.classList.add('collapsed')
        } else {
            header.classList.remove('collapsed')
            header.classList.add('expanded')
            content.classList.remove('collapsed')
            content.classList.add('expanded')
        }
    }

    createCollapsibleSection(sectionId, title, count, content) {
        // Auto-collapse completed sections by default
        if (sectionId === 'completed-records') {
            this.collapsedSections.add(sectionId)
        }
        
        const isCollapsed = this.collapsedSections.has(sectionId)
        
        return `
            <div class="collapsible-section">
                <div id="${sectionId}-header" 
                     class="collapsible-header ${isCollapsed ? 'collapsed' : 'expanded'}"
                     onclick="window.uiManager.toggleSection('${sectionId}')">
                    <div class="flex items-center gap-3">
                        <span class="font-semibold">${title}</span>
                        <span class="collapsible-count">${count}</span>
                    </div>
                    <span class="collapsible-icon">${isCollapsed ? '▼' : '▲'}</span>
                </div>
                <div id="${sectionId}-content" 
                     class="collapsible-content ${isCollapsed ? 'collapsed' : 'expanded'}">
                    ${content}
                </div>
            </div>
        `
    }

    // Sorting functionality
    sortData(column) {
        const data = window.dataManager.data
        
        // Toggle sort direction if same column
        if (this.sortConfig.column === column) {
            this.sortConfig.direction = this.sortConfig.direction === 'asc' ? 'desc' : 'asc'
        } else {
            this.sortConfig.column = column
            this.sortConfig.direction = 'asc'
        }

        data.sort((a, b) => {
            let valueA = a[column] || ''
            let valueB = b[column] || ''

            // Handle different data types
            if (column === 'date_created' || column === 'paid_date') {
                valueA = new Date(valueA || 0)
                valueB = new Date(valueB || 0)
            } else if (column === 'invoice_weight') {
                valueA = parseFloat(valueA) || 0
                valueB = parseFloat(valueB) || 0
            } else {
                valueA = valueA.toString().toLowerCase()
                valueB = valueB.toString().toLowerCase()
            }

            if (valueA < valueB) return this.sortConfig.direction === 'asc' ? -1 : 1
            if (valueA > valueB) return this.sortConfig.direction === 'asc' ? 1 : -1
            return 0
        })

        this.updateSortHeaders()
        this.updateTables()
    }

    updateSortHeaders() {
        // Remove all sort indicators
        document.querySelectorAll('.sortable-header').forEach(header => {
            header.classList.remove('sorted-asc', 'sorted-desc')
        })

        // Add sort indicator to current column
        if (this.sortConfig.column) {
            const header = document.querySelector(`[data-sort="${this.sortConfig.column}"]`)
            if (header) {
                header.classList.add(`sorted-${this.sortConfig.direction}`)
            }
        }
    }

    // Filtering functionality
    applyFilters() {
        this.activeFilters = {
            dateFrom: document.getElementById('filter-date-from')?.value || '',
            dateTo: document.getElementById('filter-date-to')?.value || '',
            paymentStatus: document.getElementById('filter-payment-status')?.value || '',
            customer: document.getElementById('filter-customer')?.value || ''
        }

        this.updateTables()
        this.showToast('Filters applied', 'success')
    }

    clearFilters() {
        document.getElementById('filter-date-from').value = ''
        document.getElementById('filter-date-to').value = ''
        document.getElementById('filter-payment-status').value = ''
        document.getElementById('filter-customer').value = ''
        
        this.activeFilters = {}
        this.updateTables()
        this.showToast('Filters cleared', 'info')
    }

    getFilteredData() {
        let data = [...window.dataManager.data]

        // Apply date range filter
        if (this.activeFilters.dateFrom) {
            data = data.filter(record => {
                const recordDate = new Date(record.date_created)
                const filterDate = new Date(this.activeFilters.dateFrom)
                return recordDate >= filterDate
            })
        }

        if (this.activeFilters.dateTo) {
            data = data.filter(record => {
                const recordDate = new Date(record.date_created)
                const filterDate = new Date(this.activeFilters.dateTo)
                return recordDate <= filterDate
            })
        }

        // Apply payment status filter
        if (this.activeFilters.paymentStatus) {
            data = data.filter(record => record.paid_status === this.activeFilters.paymentStatus)
        }

        // Apply customer filter
        if (this.activeFilters.customer) {
            const customerFilter = this.activeFilters.customer.toLowerCase()
            data = data.filter(record => 
                (record.customer || '').toLowerCase().includes(customerFilter)
            )
        }

        return data
    }

    // Bulk selection functionality
    toggleRowSelection(recordId) {
        if (this.selectedRows.has(recordId)) {
            this.selectedRows.delete(recordId)
        } else {
            this.selectedRows.add(recordId)
        }
        this.updateBulkActions()
        this.updateRowSelection()
    }

    selectAllRows() {
        const allIds = this.getFilteredData().map(record => record.id)
        this.selectedRows = new Set(allIds)
        this.updateBulkActions()
        this.updateRowSelection()
    }

    clearSelection() {
        this.selectedRows.clear()
        this.updateBulkActions()
        this.updateRowSelection()
    }

    updateBulkActions() {
        const selectedCount = this.selectedRows.size
        const bulkActions = document.getElementById('bulk-actions')
        const selectedCountElement = document.getElementById('selected-count')
        
        if (selectedCount > 0) {
            bulkActions.classList.add('show')
            selectedCountElement.textContent = selectedCount
        } else {
            bulkActions.classList.remove('show')
        }
    }

    updateRowSelection() {
        // Update row highlighting
        document.querySelectorAll('tbody tr').forEach(row => {
            const checkbox = row.querySelector('.row-select-checkbox')
            if (checkbox) {
                const recordId = parseInt(checkbox.dataset.recordId)
                const isSelected = this.selectedRows.has(recordId)
                checkbox.checked = isSelected
                if (isSelected) {
                    row.classList.add('selected-row')
                } else {
                    row.classList.remove('selected-row')
                }
            }
        })

        // Update select-all checkbox
        const selectAllCheckbox = document.getElementById('select-all')
        const totalVisible = this.getFilteredData().length
        const selectedVisible = this.getFilteredData().filter(record => 
            this.selectedRows.has(record.id)
        ).length

        if (selectAllCheckbox) {
            selectAllCheckbox.checked = totalVisible > 0 && selectedVisible === totalVisible
            selectAllCheckbox.indeterminate = selectedVisible > 0 && selectedVisible < totalVisible
        }
    }

    // Bulk operations
    bulkDelete() {
        if (this.selectedRows.size === 0) return
        
        const count = this.selectedRows.size
        if (confirm(`Delete ${count} selected records?`)) {
            this.selectedRows.forEach(recordId => {
                window.dataManager.deleteRecord(recordId)
            })
            this.selectedRows.clear()
            this.updateBulkActions()
            this.showToast(`${count} records deleted`, 'success')
        }
    }

    bulkMarkPaid() {
        if (this.selectedRows.size === 0) return
        
        this.selectedRows.forEach(recordId => {
            window.dataManager.updateRecordField(recordId, 'paid_status', 'Paid')
            window.dataManager.updateRecordField(recordId, 'paid_date', new Date().toISOString().split('T')[0])
        })
        
        this.showToast(`${this.selectedRows.size} records marked as paid`, 'success')
        this.updateTables()
    }

    bulkExport() {
        if (this.selectedRows.size === 0) return
        
        const selectedData = window.dataManager.data.filter(record => 
            this.selectedRows.has(record.id)
        )
        
        window.dataManager.exportToExcel(selectedData)
        this.showToast(`Exported ${this.selectedRows.size} records`, 'success')
    }

    updateTables() {
        this.updateInvoicingTable()
        this.updateTestingTable()
        this.setupTableValidation()
        window.calendarManager?.updateXraySchedule()
        if (this.currentTab === 'calendar') {
            window.calendarManager?.updateCalendarView()
        }
    }

    setupTableValidation() {
        // Setup validation for METRC tag fields in both invoicing and testing tables
        const metrcFields = document.querySelectorAll('input[data-field="metrc_tag"]')
        metrcFields.forEach(field => {
            this.setupFieldValidation(field, 'metrc_tag')
        })

        // Setup autocomplete for customer fields in testing table
        const testingCustomerFields = document.querySelectorAll('#testing-tbody input[onchange*="customer"]')
        testingCustomerFields.forEach(field => {
            field.dataset.field = 'customer'
            this.setupAutocomplete(field)
        })

        // Setup auto-resize for textareas with improved timing
        requestAnimationFrame(() => {
            this.autoResizeTextareas()
        })
    }

    updateInvoicingTable() {
        const tbody = document.getElementById('invoicing-tbody')
        const filteredData = this.getFilteredData()
        
        if (filteredData.length === 0) {
            const message = window.dataManager.data.length === 0 
                ? 'Upload an Excel file, add records manually, or create sample data to get started'
                : 'No records match the current filters'
            tbody.innerHTML = `
                <tr class="border-b border-gray-100">
                    <td colspan="14" class="px-4 py-8 text-center text-gray-500">
                        ${message}
                    </td>
                </tr>
            `
            return
        }

        // Separate active and completed records
        const activeRecords = filteredData.filter(record => !this.isRecordCompleted(record))
        const completedRecords = filteredData.filter(record => this.isRecordCompleted(record))

        let html = ''

        // Active records section (always shown)
        if (activeRecords.length > 0) {
            const activeRowsHtml = activeRecords.map(record => this.createTableRow(record)).join('')
            html += `
                <tr>
                    <td colspan="14" class="px-0 py-0">
                        <table class="w-full text-sm text-left">
                            <tbody>
                                ${activeRowsHtml}
                            </tbody>
                        </table>
                    </td>
                </tr>
            `
        }

        // Completed records section (collapsible)
        if (completedRecords.length > 0) {
            const completedRowsHtml = completedRecords.map(record => this.createTableRow(record)).join('')
            const collapsibleSection = this.createCollapsibleSection(
                'completed-records',
                '✅ Paid/Passed X-ray',
                completedRecords.length,
                `<table class="w-full text-sm text-left">
                    <tbody>
                        ${completedRowsHtml}
                    </tbody>
                </table>`
            )
            
            html += `
                <tr>
                    <td colspan="14" class="px-0 py-0">
                        ${collapsibleSection}
                    </td>
                </tr>
            `
        }

        tbody.innerHTML = html
        
        // Setup autocomplete for all customer and invoice_to inputs
        tbody.querySelectorAll('input[data-field="customer"], input[data-field="invoice_to"]').forEach(input => {
            this.setupAutocomplete(input)
        })
        
        // Update row selection after table is rendered
        this.updateRowSelection()
    }

    createTableRow(record) {
        const customerValue = String(record.customer || '').replace(/"/g, '&quot;')
        const invoiceToValue = String(record.invoice_to || '').replace(/"/g, '&quot;')
        const metrcValue = String(record.metrc_tag || '').replace(/"/g, '&quot;')
        const apexInvoiceNoteValue = String(record.apex_invoice_note || '').replace(/"/g, '&quot;')
        const invoiceNumValue = String(record.invoice_number || '').replace(/"/g, '&quot;')
        const paymentDetailsValue = String(record.payment_details || '').replace(/"/g, '&quot;')
        
        let placeholder = 'Payment Details'
        if (record.payment_method === 'Check') placeholder = 'Check Number'
        else if (record.payment_method === 'Cash') placeholder = 'Amount/Notes'
        else if (record.payment_method === 'ACH') placeholder = 'Reference Number'
        
        return `
        <tr class="border-b border-gray-100 hover:bg-gray-50">
            <td class="px-4 py-3">
                <input type="checkbox" class="row-checkbox row-select-checkbox" data-record-id="${record.id}" 
                       onchange="window.uiManager.toggleRowSelection(${record.id})">
            </td>
            <td class="px-4 py-3 text-gray-900 text-xs">${record.date_created || 'N/A'}</td>
            <td class="px-4 py-3">
                ${this.createAutocompleteInput(
                    customerValue, 
                    'customer', 
                    record.id, 
                    'Enter customer name',
                    'px-3 py-2 border border-gray-300 rounded-md text-sm w-full min-w-[140px] focus:outline-none focus:ring-2 focus:ring-blue-500'
                )}
            </td>
            <td class="px-4 py-3">
                ${this.createAutocompleteInput(
                    invoiceToValue, 
                    'invoice_to', 
                    record.id, 
                    'Invoice recipient',
                    'px-3 py-2 border border-gray-300 rounded-md text-sm w-full min-w-[140px] focus:outline-none focus:ring-2 focus:ring-blue-500'
                )}
            </td>
            <td class="px-4 py-3">
                <input type="text" value="${metrcValue}" 
                    onchange="window.dataManager.updateRecordField(${record.id}, 'metrc_tag', this.value)"
                    data-field="metrc_tag"
                    class="px-3 py-2 border border-gray-300 rounded-md text-sm w-full min-w-[160px] focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono" />
            </td>
            <td class="px-4 py-3">
                <textarea 
                    onchange="window.dataManager.updateRecordField(${record.id}, 'apex_invoice_note', this.value)"
                    class="px-3 py-2 border border-gray-300 rounded-md text-sm w-full min-w-[200px] focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono auto-resize" 
                    rows="2"
                    placeholder="METRC Tag + Code"
                    oninput="this.style.height = 'auto'; this.style.height = this.scrollHeight + 'px'">${apexInvoiceNoteValue}</textarea>
            </td>
            <td class="px-4 py-3">
                ${window.utils?.createWeightInput(record, 'inv-')}
            </td>
            <td class="px-4 py-3">
                <div class="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-700 font-medium">
                    ${parseFloat(record.invoice_weight || 0).toFixed(2)} lbs
                </div>
            </td>
            <td class="px-4 py-3">
                <input type="text" value="${invoiceNumValue}" 
                    onchange="window.dataManager.updateRecordField(${record.id}, 'invoice_number', this.value)"
                    class="px-3 py-2 border border-gray-300 rounded-md text-sm w-full min-w-[120px] focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </td>
            <td class="px-4 py-3">
                <select onchange="window.dataManager.updateRecordField(${record.id}, 'payment_method', this.value)" 
                    class="px-3 py-2 border border-gray-300 rounded-md text-sm w-full min-w-[100px] focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="" ${!record.payment_method ? 'selected' : ''}>Select Method</option>
                    <option value="Check" ${record.payment_method === 'Check' ? 'selected' : ''}>Check</option>
                    <option value="Cash" ${record.payment_method === 'Cash' ? 'selected' : ''}>Cash</option>
                    <option value="ACH" ${record.payment_method === 'ACH' ? 'selected' : ''}>ACH</option>
                </select>
            </td>
            <td class="px-4 py-3">
                <input type="text" value="${paymentDetailsValue}" 
                    placeholder="${placeholder}"
                    onchange="window.dataManager.updateRecordField(${record.id}, 'payment_details', this.value)"
                    class="px-3 py-2 border border-gray-300 rounded-md text-sm w-full min-w-[120px] focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </td>
            <td class="px-4 py-3">
                <select onchange="window.dataManager.updateRecordField(${record.id}, 'paid_status', this.value)" 
                    class="px-3 py-2 border border-gray-300 rounded-md text-sm w-full min-w-[100px] focus:outline-none focus:ring-2 focus:ring-blue-500 ${record.paid_status === 'Paid' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}">
                    <option value="Not Paid" ${record.paid_status === 'Not Paid' ? 'selected' : ''}>Not Paid</option>
                    <option value="Paid" ${record.paid_status === 'Paid' ? 'selected' : ''}>Paid</option>
                </select>
            </td>
            <td class="px-4 py-3">
                <input type="date" value="${record.paid_date || ''}" 
                    onchange="window.dataManager.updateRecordField(${record.id}, 'paid_date', this.value)"
                    class="px-3 py-2 border border-gray-300 rounded-md text-sm w-full min-w-[140px] focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </td>
            <td class="px-4 py-3">
                <button onclick="window.dataManager.deleteRecord(${record.id})" class="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600">
                    Delete
                </button>
            </td>
        </tr>
        `
    }

    updateTestingTable() {
        const tbody = document.getElementById('testing-tbody')
        const filteredData = this.getFilteredData()
        
        if (filteredData.length === 0) {
            const message = window.dataManager.data.length === 0 
                ? 'Upload an Excel file, add records manually, or create sample data to get started'
                : 'No records match the current filters'
            tbody.innerHTML = `
                <tr class="border-b border-gray-100">
                    <td colspan="9" class="px-4 py-8 text-center text-gray-500">
                        ${message}
                    </td>
                </tr>
            `
            return
        }

        // Separate active and completed records
        const activeRecords = filteredData.filter(record => !this.isRecordCompleted(record))
        const completedRecords = filteredData.filter(record => this.isRecordCompleted(record))

        let html = ''

        // Active records section (always shown)
        if (activeRecords.length > 0) {
            const activeRowsHtml = activeRecords.map(record => this.createTestingTableRow(record)).join('')
            html += `
                <tr>
                    <td colspan="9" class="px-0 py-0">
                        <table class="w-full text-sm text-left">
                            <tbody>
                                ${activeRowsHtml}
                            </tbody>
                        </table>
                    </td>
                </tr>
            `
        }

        // Completed records section (collapsible)
        if (completedRecords.length > 0) {
            const completedRowsHtml = completedRecords.map(record => this.createTestingTableRow(record)).join('')
            const collapsibleSection = this.createCollapsibleSection(
                'completed-testing-records',
                '✅ Paid/Passed X-ray',
                completedRecords.length,
                `<table class="w-full text-sm text-left">
                    <tbody>
                        ${completedRowsHtml}
                    </tbody>
                </table>`
            )
            
            html += `
                <tr>
                    <td colspan="9" class="px-0 py-0">
                        ${collapsibleSection}
                    </td>
                </tr>
            `
        }

        tbody.innerHTML = html
    }

    createTestingTableRow(record) {
        const customerValue = String(record.customer || '').replace(/"/g, '&quot;')
        const metrcValue = String(record.metrc_tag || '').replace(/"/g, '&quot;')
        const testsFailedValue = String(record.tests_failed || '').replace(/"/g, '&quot;')
        const labValue = String(record.lab || '').replace(/"/g, '&quot;')
        
        return `
        <tr class="border-b border-gray-100 hover:bg-gray-50">
            <td class="px-4 py-3 text-gray-900 text-xs">${record.date_created || ''}</td>
            <td class="px-4 py-3">
                <input type="text" value="${customerValue}" 
                    onchange="window.dataManager.updateRecordField(${record.id}, 'customer', this.value)"
                    class="px-3 py-2 border border-gray-300 rounded-md text-sm w-full min-w-[140px] focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </td>
            <td class="px-4 py-3">
                <input type="text" value="${metrcValue}" 
                    onchange="window.dataManager.updateRecordField(${record.id}, 'metrc_tag', this.value)"
                    data-field="metrc_tag"
                    class="px-3 py-2 border border-gray-300 rounded-md text-sm w-full min-w-[160px] focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono" />
            </td>
            <td class="px-4 py-3">
                ${window.utils?.createWeightInput(record, 'test-')}
            </td>
            <td class="px-4 py-3">
                <div class="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-700 font-medium">
                    ${parseFloat(record.invoice_weight || 0).toFixed(2)} lbs
                </div>
            </td>
            <td class="px-4 py-3">
                <input type="text" value="${testsFailedValue}" 
                    onchange="window.dataManager.updateRecordField(${record.id}, 'tests_failed', this.value)"
                    class="px-3 py-2 border border-gray-300 rounded-md text-sm w-full min-w-[140px] focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </td>
            <td class="px-4 py-3">
                <input type="text" value="${labValue}" 
                    onchange="window.dataManager.updateRecordField(${record.id}, 'lab', this.value)"
                    class="px-3 py-2 border border-gray-300 rounded-md text-sm w-full min-w-[100px] focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </td>
            <td class="px-4 py-3">
                <select onchange="window.dataManager.updateRecordField(${record.id}, 'compliance_status', this.value)" 
                    class="px-3 py-2 border border-gray-300 rounded-md text-sm w-full min-w-[120px] focus:outline-none focus:ring-2 focus:ring-blue-500 ${record.compliance_status?.includes('Passed') ? 'bg-green-50 text-green-800' : record.compliance_status?.includes('Failed') ? 'bg-red-50 text-red-800' : 'bg-white'}">
                    <option value="Not Set" ${record.compliance_status === 'Not Set' ? 'selected' : ''}>Not Set</option>
                    <option value="Passed Testing" ${record.compliance_status === 'Passed Testing' ? 'selected' : ''}>Passed Testing</option>
                    <option value="Failed Testing" ${record.compliance_status === 'Failed Testing' ? 'selected' : ''}>Failed Testing</option>
                </select>
            </td>
            <td class="px-4 py-3">
                <button onclick="window.dataManager.deleteRecord(${record.id})" class="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600">
                    Delete
                </button>
            </td>
        </tr>
        `
    }

    updateStats() {
        const stats = window.dataManager.getStats()
        
        document.getElementById('stat-total').textContent = stats.total
        document.getElementById('stat-pending').textContent = stats.pending
        document.getElementById('stat-passed').textContent = stats.passed
        document.getElementById('stat-paid').textContent = stats.paid
        document.getElementById('stat-unpaid').textContent = stats.unpaid
    }

    switchToTab(tab) {
        const invoicingBtn = document.getElementById('invoicing-tab')
        const testingBtn = document.getElementById('testing-tab')
        const calendarBtn = document.getElementById('calendar-tab')
        const invoicingTable = document.getElementById('invoicing-table')
        const testingTable = document.getElementById('testing-table')
        const calendarView = document.getElementById('calendar-view')

        this.currentTab = tab

        const allTabs = [invoicingBtn, testingBtn, calendarBtn]
        allTabs.forEach(btn => {
            if (btn) {
                btn.className = 'px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 border-b-2 border-transparent rounded-t-md'
            }
        })

        if (invoicingTable) invoicingTable.classList.add('hidden')
        if (testingTable) testingTable.classList.add('hidden')
        if (calendarView) calendarView.classList.add('hidden')

        if (tab === 'testing') {
            if (testingBtn) testingBtn.className = 'px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border-b-2 border-blue-600 rounded-t-md'
            if (testingTable) testingTable.classList.remove('hidden')
            this.updateTestingTable()
        } else if (tab === 'calendar') {
            if (calendarBtn) calendarBtn.className = 'px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border-b-2 border-blue-600 rounded-t-md'
            if (calendarView) calendarView.classList.remove('hidden')
            window.calendarManager?.updateXraySchedule()
            window.calendarManager?.updateCalendarView()
        } else {
            if (invoicingBtn) invoicingBtn.className = 'px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border-b-2 border-blue-600 rounded-t-md'
            if (invoicingTable) invoicingTable.classList.remove('hidden')
            this.updateInvoicingTable()
        }
    }

    showAddRecordModal() {
        const modal = document.createElement('div')
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'
        modal.innerHTML = `
            <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
                <div class="p-6">
                    <div class="flex items-center justify-between mb-4">
                        <h2 class="text-xl font-semibold text-gray-900">Add New Record</h2>
                        <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-gray-600">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>
                    <div id="form-errors" class="hidden mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                        <div class="flex">
                            <svg class="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path>
                            </svg>
                            <div class="ml-3">
                                <h3 class="text-sm font-medium text-red-800">Please fix the following errors:</h3>
                                <div id="error-list" class="mt-2 text-sm text-red-700">
                                    <ul class="list-disc pl-5 space-y-1"></ul>
                                </div>
                            </div>
                        </div>
                    </div>
                    <form id="add-record-form" class="space-y-4" novalidate>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">
                                    Customer <span class="text-red-500">*</span>
                                </label>
                                <div class="relative">
                                    <input type="text" name="customer" required maxlength="200" 
                                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="Enter customer name"
                                        autocomplete="off"
                                        data-field="customer">
                                    <div id="customer-modal-dropdown" class="absolute z-50 w-full bg-white border border-gray-300 rounded-md shadow-lg hidden max-h-48 overflow-y-auto mt-1">
                                    </div>
                                </div>
                                <div class="validation-message text-red-500 text-xs mt-1 hidden"></div>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Invoice To</label>
                                <div class="relative">
                                    <input type="text" name="invoice_to" maxlength="200" 
                                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="Invoice recipient"
                                        autocomplete="off"
                                        data-field="invoice_to">
                                    <div id="invoice-to-modal-dropdown" class="absolute z-50 w-full bg-white border border-gray-300 rounded-md shadow-lg hidden max-h-48 overflow-y-auto mt-1">
                                    </div>
                                </div>
                                <div class="validation-message text-red-500 text-xs mt-1 hidden"></div>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">
                                    METRC Tag
                                    <span class="text-gray-500 text-xs">(26 characters)</span>
                                </label>
                                <input type="text" name="metrc_tag" maxlength="26" 
                                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                                    placeholder="1A40D030000891D000000658" />
                                <div class="validation-message text-red-500 text-xs mt-1 hidden"></div>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">
                                    Apex Invoice Note
                                    <span class="text-gray-500 text-xs">(METRC Tag + Code)</span>
                                </label>
                                <textarea name="apex_invoice_note" maxlength="300" rows="2"
                                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono resize-none"
                                    placeholder="1A40D030000891D000000658&#10;KUMIA2F7.040925"></textarea>
                                <div class="validation-message text-red-500 text-xs mt-1 hidden"></div>
                            </div>
                            <div class="md:col-span-2">
                                <label class="block text-sm font-medium text-gray-700 mb-1">Weight</label>
                                <div class="flex gap-2 max-w-xs">
                                    <input type="number" step="0.01" min="0" max="1000" name="invoice_weight" 
                                        class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="0.00" />
                                    <select name="weight_unit" class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                        <option value="lbs">lbs</option>
                                        <option value="grams">g</option>
                                    </select>
                                </div>
                                <div class="validation-message text-red-500 text-xs mt-1 hidden"></div>
                            </div>
                        </div>
                        
                        <div class="flex justify-end gap-3 pt-4">
                            <button type="button" onclick="this.closest('.fixed').remove()" class="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">
                                Cancel
                            </button>
                            <button type="submit" class="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed">
                                Add Record
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `
        
        document.body.appendChild(modal)
        
        // Add real-time validation
        this.setupFormValidation(modal)
        
        // Setup autocomplete for modal inputs
        this.setupModalAutocomplete(modal)
        
        document.getElementById('add-record-form').addEventListener('submit', (e) => {
            e.preventDefault()
            
            const formData = new FormData(e.target)
            const recordData = {
                customer: formData.get('customer') || '',
                invoice_to: formData.get('invoice_to') || '',
                metrc_tag: formData.get('metrc_tag') || '',
                apex_invoice_note: formData.get('apex_invoice_note') || '',
                invoice_weight: formData.get('invoice_weight') || '',
                weight_unit: formData.get('weight_unit') || 'lbs'
            }
            
            // Validate form before submission
            if (!this.validateForm(recordData)) {
                return
            }
            
            try {
                const newRecord = window.dataManager.addRecord(recordData)
                modal.remove()
                
                if (recordData.invoice_weight && recordData.weight_unit === 'grams') {
                    this.showToast(`Record added! ${recordData.invoice_weight}g converted to ${newRecord.invoice_weight} lbs and scheduled for X-ray`, 'success')
                } else {
                    this.showToast(`Record added successfully! Available in all tabs and scheduled for X-ray.`, 'success')
                }
                
            } catch (error) {
                this.showFormErrors([error.message])
            }
        })
    }

    // Form validation methods
    setupFormValidation(modal) {
        const form = modal.querySelector('#add-record-form')
        const inputs = form.querySelectorAll('input, select')
        
        inputs.forEach(input => {
            input.addEventListener('blur', () => this.validateField(input))
            input.addEventListener('input', () => this.clearFieldError(input))
        })
    }
    
    setupModalAutocomplete(modal) {
        const customerInput = modal.querySelector('input[data-field="customer"]')
        const invoiceToInput = modal.querySelector('input[data-field="invoice_to"]')
        
        if (customerInput) {
            this.setupModalAutocompleteField(customerInput, 'customer-modal-dropdown', 'customer')
        }
        
        if (invoiceToInput) {
            this.setupModalAutocompleteField(invoiceToInput, 'invoice-to-modal-dropdown', 'invoice_to')
        }
    }
    
    setupModalAutocompleteField(inputElement, dropdownId, fieldName) {
        const dropdown = document.getElementById(dropdownId)
        if (!dropdown) return
        
        const showSuggestions = (suggestions) => {
            if (suggestions.length === 0) {
                dropdown.classList.add('hidden')
                return
            }
            
            dropdown.innerHTML = suggestions.map(suggestion => `
                <div class="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm border-b border-gray-100 last:border-b-0"
                     onclick="window.uiManager.selectModalSuggestion('${inputElement.name}', '${suggestion.replace(/'/g, "\\'")}', '${dropdownId}')">
                    ${window.utils?.escapeHtml(suggestion) || suggestion}
                </div>
            `).join('')
            
            dropdown.classList.remove('hidden')
        }
        
        const hideSuggestions = () => {
            setTimeout(() => dropdown.classList.add('hidden'), 150)
        }
        
        inputElement.addEventListener('input', (e) => {
            const query = e.target.value
            if (query.length < 1) {
                dropdown.classList.add('hidden')
                return
            }
            
            let suggestions = []
            if (fieldName === 'customer') {
                suggestions = window.dataManager?.searchCustomers(query) || []
            } else if (fieldName === 'invoice_to') {
                suggestions = window.dataManager?.searchInvoiceTo(query) || []
            }
            
            showSuggestions(suggestions)
        })
        
        inputElement.addEventListener('focus', (e) => {
            const query = e.target.value
            if (query.length > 0) {
                let suggestions = []
                if (fieldName === 'customer') {
                    suggestions = window.dataManager?.searchCustomers(query) || []
                } else if (fieldName === 'invoice_to') {
                    suggestions = window.dataManager?.searchInvoiceTo(query) || []
                }
                showSuggestions(suggestions)
            }
        })
        
        inputElement.addEventListener('blur', hideSuggestions)
    }
    
    selectModalSuggestion(inputName, suggestion, dropdownId) {
        const input = document.querySelector(`input[name="${inputName}"]`)
        const dropdown = document.getElementById(dropdownId)
        
        if (input) {
            input.value = suggestion
            input.dispatchEvent(new Event('input')) // Trigger validation
        }
        
        if (dropdown) {
            dropdown.classList.add('hidden')
        }
    }
    
    validateField(field) {
        const name = field.name
        const value = field.value.trim()
        let isValid = true
        let message = ''
        
        // Required field validation
        if (field.hasAttribute('required') && !value) {
            isValid = false
            message = `${this.getFieldLabel(name)} is required`
        }
        
        // Specific field validations
        if (value) {
            switch (name) {
                case 'customer':
                    if (value.length > 200) {
                        isValid = false
                        message = 'Customer name must be 200 characters or less'
                    }
                    break
                    
                case 'metrc_tag':
                    if (value && !window.utils?.validateMetrcTag(value)) {
                        isValid = false
                        message = 'METRC tag must be 16 alphanumeric characters'
                    }
                    break
                    
                case 'invoice_weight':
                    const weight = parseFloat(value)
                    if (value && (isNaN(weight) || weight < 0 || weight > 1000)) {
                        isValid = false
                        message = 'Weight must be a number between 0 and 1000'
                    }
                    break
                    
                case 'invoice_to':
                    if (value.length > 200) {
                        isValid = false
                        message = 'Invoice to must be 200 characters or less'
                    }
                    break
                    
                case 'apex_invoice_note':
                    if (value.length > 300) {
                        isValid = false
                        message = 'Apex Invoice Note must be 300 characters or less'
                    }
                    break
            }
        }
        
        this.showFieldError(field, isValid ? null : message)
        return isValid
    }
    
    validateForm(recordData) {
        const errors = []
        
        // Customer is required
        if (!recordData.customer || recordData.customer.trim() === '') {
            errors.push('Customer name is required')
        }
        
        // Validate customer length
        if (recordData.customer && recordData.customer.length > 200) {
            errors.push('Customer name must be 200 characters or less')
        }
        
        // Validate METRC tag if provided
        if (recordData.metrc_tag && !window.utils?.validateMetrcTag(recordData.metrc_tag)) {
            errors.push('METRC tag must be 26 alphanumeric characters')
        }
        
        // Validate weight if provided
        if (recordData.invoice_weight) {
            const weight = parseFloat(recordData.invoice_weight)
            if (isNaN(weight) || weight < 0 || weight > 1000) {
                errors.push('Weight must be a number between 0 and 1000')
            }
        }
        
        // Validate invoice_to length
        if (recordData.invoice_to && recordData.invoice_to.length > 200) {
            errors.push('Invoice to must be 200 characters or less')
        }
        
        // Validate apex_invoice_note length
        if (recordData.apex_invoice_note && recordData.apex_invoice_note.length > 300) {
            errors.push('Apex Invoice Note must be 300 characters or less')
        }
        
        if (errors.length > 0) {
            this.showFormErrors(errors)
            return false
        }
        
        this.hideFormErrors()
        return true
    }
    
    showFieldError(field, message) {
        const validationMessage = field.parentElement.querySelector('.validation-message')
        if (validationMessage) {
            if (message) {
                validationMessage.textContent = message
                validationMessage.classList.remove('hidden')
                field.classList.add('border-red-300')
                field.classList.remove('border-gray-300')
            } else {
                validationMessage.classList.add('hidden')
                field.classList.remove('border-red-300')
                field.classList.add('border-gray-300')
            }
        }
    }
    
    clearFieldError(field) {
        const validationMessage = field.parentElement.querySelector('.validation-message')
        if (validationMessage) {
            validationMessage.classList.add('hidden')
            field.classList.remove('border-red-300')
            field.classList.add('border-gray-300')
        }
    }
    
    showFormErrors(errors) {
        const errorContainer = document.getElementById('form-errors')
        const errorList = document.getElementById('error-list').querySelector('ul')
        
        if (errorContainer && errorList) {
            errorList.innerHTML = errors.map(error => `<li>${error}</li>`).join('')
            errorContainer.classList.remove('hidden')
            
            // Scroll to errors
            errorContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        }
    }
    
    hideFormErrors() {
        const errorContainer = document.getElementById('form-errors')
        if (errorContainer) {
            errorContainer.classList.add('hidden')
        }
    }
    
    getFieldLabel(fieldName) {
        const labels = {
            customer: 'Customer',
            invoice_to: 'Invoice To',
            metrc_tag: 'METRC Tag',
            apex_invoice_note: 'Apex Invoice Note',
            invoice_weight: 'Weight'
        }
        return labels[fieldName] || fieldName
    }

    // Autocomplete functionality
    createAutocompleteInput(value, fieldName, recordId, placeholder, cssClasses) {
        const uniqueId = `autocomplete-${fieldName}-${recordId || 'new'}-${Date.now()}`
        const containerId = `${uniqueId}-container`
        
        return `
            <div class="relative" id="${containerId}">
                <input type="text" 
                    id="${uniqueId}"
                    value="${value}" 
                    placeholder="${placeholder}"
                    class="${cssClasses}"
                    autocomplete="off"
                    data-field="${fieldName}"
                    data-record-id="${recordId || ''}"
                    onchange="window.dataManager.updateRecordField(${recordId}, '${fieldName}', this.value)"
                />
                <div id="${uniqueId}-dropdown" class="absolute z-50 w-full bg-white border border-gray-300 rounded-md shadow-lg hidden max-h-48 overflow-y-auto mt-1">
                </div>
            </div>
        `
    }

    setupAutocomplete(inputElement) {
        if (!inputElement) return
        
        const fieldName = inputElement.dataset.field
        const dropdown = document.getElementById(`${inputElement.id}-dropdown`)
        
        if (!dropdown) return
        
        const showSuggestions = (suggestions) => {
            if (suggestions.length === 0) {
                dropdown.classList.add('hidden')
                return
            }
            
            dropdown.innerHTML = suggestions.map(suggestion => `
                <div class="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm border-b border-gray-100 last:border-b-0"
                     onclick="window.uiManager.selectSuggestion('${inputElement.id}', '${suggestion.replace(/'/g, "\\'")}')">
                    ${window.utils?.escapeHtml(suggestion) || suggestion}
                </div>
            `).join('')
            
            dropdown.classList.remove('hidden')
        }
        
        const hideSuggestions = () => {
            setTimeout(() => dropdown.classList.add('hidden'), 150)
        }
        
        inputElement.addEventListener('input', (e) => {
            const query = e.target.value
            if (query.length < 1) {
                dropdown.classList.add('hidden')
                return
            }
            
            let suggestions = []
            if (fieldName === 'customer') {
                suggestions = window.dataManager?.searchCustomers(query) || []
            } else if (fieldName === 'invoice_to') {
                suggestions = window.dataManager?.searchInvoiceTo(query) || []
            }
            
            showSuggestions(suggestions)
        })
        
        const showSuggestionsForCurrentValue = () => {
            const query = inputElement.value
            let suggestions = []
            
            if (fieldName === 'customer') {
                suggestions = window.dataManager?.searchCustomers(query) || []
            } else if (fieldName === 'invoice_to') {
                suggestions = window.dataManager?.searchInvoiceTo(query) || []
            }
            
            // Show all suggestions if query is empty, filtered suggestions if query exists
            if (query.length === 0) {
                // Show all unique values when field is empty
                if (fieldName === 'customer') {
                    suggestions = window.dataManager?.getAllCustomers() || []
                } else if (fieldName === 'invoice_to') {
                    suggestions = window.dataManager?.getAllInvoiceTo() || []
                }
            }
            
            showSuggestions(suggestions)
        }

        inputElement.addEventListener('focus', showSuggestionsForCurrentValue)
        
        // Also show suggestions on click (this fixes the double-click issue)
        inputElement.addEventListener('click', (e) => {
            e.stopPropagation()
            showSuggestionsForCurrentValue()
        })
        
        inputElement.addEventListener('blur', hideSuggestions)
        
        // Handle keyboard navigation
        inputElement.addEventListener('keydown', (e) => {
            const items = dropdown.querySelectorAll('div')
            let selectedIndex = -1
            
            // Find currently highlighted item
            items.forEach((item, index) => {
                if (item.classList.contains('bg-blue-100')) {
                    selectedIndex = index
                }
            })
            
            if (e.key === 'ArrowDown') {
                e.preventDefault()
                selectedIndex = Math.min(selectedIndex + 1, items.length - 1)
            } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                selectedIndex = Math.max(selectedIndex - 1, 0)
            } else if (e.key === 'Enter' && selectedIndex >= 0) {
                e.preventDefault()
                items[selectedIndex].click()
                return
            } else if (e.key === 'Escape') {
                dropdown.classList.add('hidden')
                return
            }
            
            // Update highlighting
            items.forEach((item, index) => {
                item.classList.toggle('bg-blue-100', index === selectedIndex)
                item.classList.toggle('bg-gray-100', index !== selectedIndex && index === selectedIndex)
            })
        })
    }
    
    selectSuggestion(inputId, suggestion) {
        const input = document.getElementById(inputId)
        if (input) {
            input.value = suggestion
            input.dispatchEvent(new Event('change'))
            const dropdown = document.getElementById(`${inputId}-dropdown`)
            if (dropdown) dropdown.classList.add('hidden')
        }
    }

    setupSearch() {
        const searchInput = document.getElementById('search')
        if (searchInput) {
            // Add debounced search
            const debouncedSearch = window.utils?.debounce((searchTerm) => {
                if (searchTerm === '') {
                    this.updateTables()
                    return
                }
                
                const filteredData = window.dataManager.data.filter(record => 
                    (record.customer || '').toLowerCase().includes(searchTerm) ||
                    (record.metrc_tag || '').toLowerCase().includes(searchTerm) ||
                    (record.invoice_number || '').toLowerCase().includes(searchTerm) ||
                    (record.invoice_to || '').toLowerCase().includes(searchTerm) ||
                    (record.apex_invoice_note || '').toLowerCase().includes(searchTerm)
                )
                
                const originalData = window.dataManager.data
                window.dataManager.data = filteredData
                this.updateTables()
                window.dataManager.data = originalData
            }, 300)
            
            searchInput.addEventListener('input', (e) => {
                const searchTerm = e.target.value.toLowerCase()
                debouncedSearch(searchTerm)
            })
        }
    }
}

// Global instance
window.uiManager = new UIManager()