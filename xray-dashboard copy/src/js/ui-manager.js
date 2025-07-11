class UIManager {
    constructor() {
        this.currentTab = 'invoicing'
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

    updateTables() {
        this.updateInvoicingTable()
        this.updateTestingTable()
        window.calendarManager?.updateXraySchedule()
        if (this.currentTab === 'calendar') {
            window.calendarManager?.updateCalendarView()
        }
    }

    updateInvoicingTable() {
        const tbody = document.getElementById('invoicing-tbody')
        
        if (window.dataManager.data.length === 0) {
            tbody.innerHTML = `
                <tr class="border-b border-gray-100">
                    <td colspan="12" class="px-4 py-8 text-center text-gray-500">
                        Upload an Excel file, add records manually, or create sample data to get started
                    </td>
                </tr>
            `
            return
        }

        const rows = window.dataManager.data.map((record) => {
            const customerValue = String(record.customer || '').replace(/"/g, '&quot;')
            const invoiceToValue = String(record.invoice_to || '').replace(/"/g, '&quot;')
            const metrcValue = String(record.metrc_tag || '').replace(/"/g, '&quot;')
            const invoiceNumValue = String(record.invoice_number || '').replace(/"/g, '&quot;')
            const paymentDetailsValue = String(record.payment_details || '').replace(/"/g, '&quot;')
            
            let placeholder = 'Payment Details'
            if (record.payment_method === 'Check') placeholder = 'Check Number'
            else if (record.payment_method === 'Cash') placeholder = 'Amount/Notes'
            else if (record.payment_method === 'ACH') placeholder = 'Reference Number'
            
            return `
            <tr class="border-b border-gray-100 hover:bg-gray-50">
                <td class="px-4 py-3 text-gray-900 text-xs">${record.date_created || 'N/A'}</td>
                <td class="px-4 py-3">
                    <input type="text" value="${customerValue}" 
                        onchange="window.dataManager.updateRecordField(${record.id}, 'customer', this.value)"
                        class="px-3 py-2 border border-gray-300 rounded-md text-sm w-full min-w-[140px] focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </td>
                <td class="px-4 py-3">
                    <input type="text" value="${invoiceToValue}" 
                        onchange="window.dataManager.updateRecordField(${record.id}, 'invoice_to', this.value)"
                        class="px-3 py-2 border border-gray-300 rounded-md text-sm w-full min-w-[140px] focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </td>
                <td class="px-4 py-3">
                    <input type="text" value="${metrcValue}" 
                        onchange="window.dataManager.updateRecordField(${record.id}, 'metrc_tag', this.value)"
                        class="px-3 py-2 border border-gray-300 rounded-md text-sm w-full min-w-[160px] focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono" />
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
        })
        
        tbody.innerHTML = rows.join('')
    }

    updateTestingTable() {
        const tbody = document.getElementById('testing-tbody')
        if (window.dataManager.data.length === 0) {
            tbody.innerHTML = `
                <tr class="border-b border-gray-100">
                    <td colspan="9" class="px-4 py-8 text-center text-gray-500">
                        Upload an Excel file, add records manually, or create sample data to get started
                    </td>
                </tr>
            `
            return
        }

        tbody.innerHTML = window.dataManager.data.map(record => `
            <tr class="border-b border-gray-100 hover:bg-gray-50">
                <td class="px-4 py-3 text-gray-900 text-xs">${record.date_created || ''}</td>
                <td class="px-4 py-3">
                    <input type="text" value="${(record.customer || '').replace(/"/g, '&quot;')}" 
                        onchange="window.dataManager.updateRecordField(${record.id}, 'customer', this.value)"
                        class="px-3 py-2 border border-gray-300 rounded-md text-sm w-full min-w-[140px] focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </td>
                <td class="px-4 py-3">
                    <input type="text" value="${(record.metrc_tag || '').replace(/"/g, '&quot;')}" 
                        onchange="window.dataManager.updateRecordField(${record.id}, 'metrc_tag', this.value)"
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
                    <input type="text" value="${(record.tests_failed || '').replace(/"/g, '&quot;')}" 
                        onchange="window.dataManager.updateRecordField(${record.id}, 'tests_failed', this.value)"
                        class="px-3 py-2 border border-gray-300 rounded-md text-sm w-full min-w-[140px] focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </td>
                <td class="px-4 py-3">
                    <input type="text" value="${(record.lab || '').replace(/"/g, '&quot;')}" 
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
        `).join('')
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
                    <form id="add-record-form" class="space-y-4">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Customer</label>
                                <input type="text" name="customer" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Invoice To</label>
                                <input type="text" name="invoice_to" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">METRC Tag</label>
                                <input type="text" name="metrc_tag" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono" />
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Weight</label>
                                <div class="flex gap-2">
                                    <input type="number" step="0.01" name="invoice_weight" class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                    <select name="weight_unit" class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                                        <option value="lbs">lbs</option>
                                        <option value="grams">g</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        
                        <div class="flex justify-end gap-3 pt-4">
                            <button type="button" onclick="this.closest('.fixed').remove()" class="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">
                                Cancel
                            </button>
                            <button type="submit" class="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">
                                Add Record
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `
        
        document.body.appendChild(modal)
        
        document.getElementById('add-record-form').addEventListener('submit', (e) => {
            e.preventDefault()
            const formData = new FormData(e.target)
            
            const recordData = {
                customer: formData.get('customer') || '',
                invoice_to: formData.get('invoice_to') || '',
                metrc_tag: formData.get('metrc_tag') || '',
                invoice_weight: formData.get('invoice_weight') || '',
                weight_unit: formData.get('weight_unit') || 'lbs'
            }
            
            const newRecord = window.dataManager.addRecord(recordData)
            modal.remove()
            
            if (recordData.invoice_weight && recordData.weight_unit === 'grams') {
                this.showToast(`Record added! ${recordData.invoice_weight}g converted to ${newRecord.invoice_weight} lbs and scheduled for X-ray`, 'success')
            } else {
                this.showToast(`Record added successfully! Available in all tabs and scheduled for X-ray.`, 'success')
            }
        })
    }

    setupSearch() {
        const searchInput = document.getElementById('search')
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const searchTerm = e.target.value.toLowerCase()
                if (searchTerm === '') {
                    this.updateTables()
                    return
                }
                
                const filteredData = window.dataManager.data.filter(record => 
                    (record.customer || '').toLowerCase().includes(searchTerm) ||
                    (record.metrc_tag || '').toLowerCase().includes(searchTerm) ||
                    (record.invoice_number || '').toLowerCase().includes(searchTerm) ||
                    (record.invoice_to || '').toLowerCase().includes(searchTerm)
                )
                
                const originalData = window.dataManager.data
                window.dataManager.data = filteredData
                this.updateTables()
                window.dataManager.data = originalData
            })
        }
    }
}

// Global instance
window.uiManager = new UIManager()