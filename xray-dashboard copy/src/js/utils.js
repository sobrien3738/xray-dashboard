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
        // Basic METRC tag validation - should be alphanumeric and specific length
        if (!tag) return false
        return /^[A-Z0-9]{26}$/.test(tag.replace(/\s/g, ''))
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
}

// Global instance
window.utils = new Utils()