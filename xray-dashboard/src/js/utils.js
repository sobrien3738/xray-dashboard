class Utils {
    convertToPounds(value, unit) {
        if (!value || value === '') return ''
        const numValue = parseFloat(value)
        if (isNaN(numValue)) return ''
        
        if (unit === 'grams') {
            return (numValue / 453.59).toFixed(2)
        }
        return numValue.toFixed(2)
    }

    createWeightInput(record, context = '') {
        const weightValue = record.weight_input_value || record.invoice_weight || ''
        const weightUnit = record.weight_unit || 'lbs'
        const inputId = `weight-${context}${record.id}`
        
        return `
            <div class="flex items-center gap-1">
                <input type="number" 
                       id="${inputId}"
                       step="0.01" 
                       value="${weightValue}" 
                       onchange="window.utils.updateWeight(${record.id}, this.value, document.getElementById('${inputId}-unit').value)"
                       class="px-3 py-2 border border-gray-300 rounded-md text-sm w-20 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <select id="${inputId}-unit" 
                        onchange="window.utils.updateWeight(${record.id}, document.getElementById('${inputId}').value, this.value)"
                        class="px-2 py-2 border border-gray-300 rounded-md text-xs w-16 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="lbs" ${weightUnit === 'lbs' ? 'selected' : ''}>lbs</option>
                    <option value="grams" ${weightUnit === 'grams' ? 'selected' : ''}>g</option>
                </select>
            </div>
        `
    }

    updateWeight(recordId, inputValue, unit) {
        const record = window.dataManager.data.find(r => r.id == recordId)
        if (record) {
            record.weight_input_value = inputValue
            record.weight_unit = unit
            record.invoice_weight = this.convertToPounds(inputValue, unit)
            
            window.uiManager?.updateTables()
            window.uiManager?.updateStats()
            window.dataManager?.autoSave()
            
            if (inputValue && unit === 'grams') {
                window.uiManager?.showToast(`${inputValue}g converted to ${record.invoice_weight} lbs`, 'info')
            }
        }
    }

    formatDate(dateString) {
        if (!dateString) return 'N/A'
        const date = new Date(dateString)
        return date.toLocaleDateString()
    }

    escapeHtml(text) {
        const div = document.createElement('div')
        div.textContent = text
        return div.innerHTML
    }

    validateMetrcTag(tag) {
        // Enhanced METRC tag validation - now expects 16 characters
        if (!tag || typeof tag !== 'string') return false
        
        // Remove any whitespace and convert to uppercase
        const cleanTag = tag.replace(/\s/g, '').toUpperCase()
        
        // METRC tags should be exactly 16 characters, alphanumeric
        if (cleanTag.length !== 16) return false
        if (!/^[A-Z0-9]{16}$/.test(cleanTag)) return false
        
        // Additional METRC-specific validation
        // METRC tags typically start with '1A' for Colorado
        if (cleanTag.startsWith('1A')) {
            // For 16-character tags starting with 1A, validate the structure
            // Format: 1A[2-char][12-char] (simplified for 16 chars)
            const prefix = cleanTag.substring(0, 2) // Should be '1A'
            const stateCode = cleanTag.substring(2, 4) // 2-char state identifier
            const identifier = cleanTag.substring(4, 16) // 12-char identifier
            
            // Validate each section contains only valid characters
            if (!/^[A-Z0-9]{2}$/.test(stateCode)) return false
            if (!/^[A-Z0-9]{12}$/.test(identifier)) return false
        }
        
        return true
    }
    
    formatMetrcTag(tag) {
        // Format METRC tag for display (adds spaces for readability)
        if (!tag) return ''
        const cleanTag = tag.replace(/\s/g, '').toUpperCase()
        if (cleanTag.length === 26) {
            // Format as: 1A40 D030 0008 91D0 0000 0658
            return cleanTag.replace(/(\w{4})/g, '$1 ').trim()
        }
        return cleanTag
    }
    
    cleanMetrcTag(tag) {
        // Clean METRC tag for storage (removes spaces, converts to uppercase)
        if (!tag) return ''
        return tag.replace(/\s/g, '').toUpperCase()
    }

    formatCurrency(amount) {
        if (!amount) return '$0.00'
        const num = parseFloat(amount)
        if (isNaN(num)) return '$0.00'
        return `$${num.toFixed(2)}`
    }

    generateInvoiceNumber() {
        const now = new Date()
        const year = now.getFullYear()
        const month = String(now.getMonth() + 1).padStart(2, '0')
        const day = String(now.getDate()).padStart(2, '0')
        const timestamp = now.getTime().toString().slice(-4)
        
        return `INV-${year}${month}${day}-${timestamp}`
    }

    downloadJson(data, filename) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    }

    debounce(func, wait) {
        let timeout
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout)
                func(...args)
            }
            clearTimeout(timeout)
            timeout = setTimeout(later, wait)
        }
    }

    deepClone(obj) {
        return JSON.parse(JSON.stringify(obj))
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        return emailRegex.test(email)
    }

    capitalizeFirst(str) {
        if (!str) return ''
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
    }

    truncateText(text, maxLength) {
        if (!text || text.length <= maxLength) return text
        return text.substring(0, maxLength) + '...'
    }
    
    // Centralized Error Reporting System
    createErrorReporter() {
        return {
            errors: [],
            maxErrors: 100,
            
            report(context, error, severity = 'error') {
                const errorEntry = {
                    id: Date.now() + Math.random(),
                    context,
                    message: error?.message || error,
                    stack: error?.stack,
                    severity, // 'error', 'warning', 'info'
                    timestamp: new Date().toISOString(),
                    userAgent: navigator.userAgent,
                    url: window.location.href,
                    dataCount: window.dataManager?.data?.length || 0
                }
                
                this.errors.push(errorEntry)
                
                // Keep only recent errors
                if (this.errors.length > this.maxErrors) {
                    this.errors = this.errors.slice(-this.maxErrors)
                }
                
                // Log to console
                console.error(`[${context}]`, error)
                
                // Show user notification for critical errors
                if (severity === 'error') {
                    const message = this.getUserFriendlyMessage(context, error)
                    window.uiManager?.showToast(message, 'error')
                }
                
                // Store in localStorage for debugging
                try {
                    localStorage.setItem('xray-dashboard-errors', JSON.stringify(this.errors.slice(-10)))
                } catch (e) {
                    // Ignore localStorage errors
                }
                
                return errorEntry.id
            },
            
            getUserFriendlyMessage(context, error) {
                const messages = {
                    'save': 'Failed to save data automatically. Please export your data as backup.',
                    'load': 'Could not load saved data. Starting fresh.',
                    'excel-import': 'Failed to import Excel file. Please check file format.',
                    'file-upload': 'File upload failed. Please try again.',
                    'add-record': 'Could not add record. Please check your input.',
                    'network': 'Network error occurred. Please check your connection.',
                    'validation': 'Please correct the highlighted errors.'
                }
                
                return messages[context] || 'An unexpected error occurred. Please try again.'
            },
            
            getRecentErrors(count = 10) {
                return this.errors.slice(-count)
            },
            
            clearErrors() {
                this.errors = []
                try {
                    localStorage.removeItem('xray-dashboard-errors')
                } catch (e) {
                    // Ignore
                }
            },
            
            exportErrorLog() {
                const errorData = {
                    timestamp: new Date().toISOString(),
                    errors: this.errors,
                    systemInfo: {
                        userAgent: navigator.userAgent,
                        url: window.location.href,
                        timestamp: new Date().toISOString()
                    }
                }
                
                window.utils?.downloadJson(errorData, `error-log-${Date.now()}.json`)
                window.uiManager?.showToast('Error log exported', 'info')
            },
            
            getErrorSummary() {
                const summary = {
                    total: this.errors.length,
                    byContext: {},
                    bySeverity: {},
                    recent: this.errors.slice(-5).map(err => ({
                        context: err.context,
                        message: err.message,
                        timestamp: err.timestamp
                    }))
                }
                
                this.errors.forEach(err => {
                    summary.byContext[err.context] = (summary.byContext[err.context] || 0) + 1
                    summary.bySeverity[err.severity] = (summary.bySeverity[err.severity] || 0) + 1
                })
                
                return summary
            }
        }
    }
}

// Global instance
window.utils = new Utils()

// Initialize global error reporter
window.errorReporter = window.utils.createErrorReporter()

// Global error handler
window.addEventListener('error', (event) => {
    window.errorReporter.report('global', event.error || event.message, 'error')
})

window.addEventListener('unhandledrejection', (event) => {
    window.errorReporter.report('promise', event.reason, 'error')
})