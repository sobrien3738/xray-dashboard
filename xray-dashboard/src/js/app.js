class App {
    constructor() {
        this.initialized = false
    }

    init() {
        if (this.initialized) {
            console.warn('App already initialized')
            return
        }

        console.log('Initializing X-Ray Dashboard with localStorage...')
        
        // Load data first
        const dataLoaded = window.dataManager.loadDataFromStorage()
        
        // Setup event listeners
        this.setupEventListeners()
        
        // Setup keyboard shortcuts
        this.setupKeyboardShortcuts()
        
        // Setup search functionality
        window.uiManager.setupSearch()
        
        // Setup calendar navigation
        window.calendarManager.setupCalendarNavigation()
        
        // Initialize UI
        window.uiManager.updateTables()
        window.uiManager.updateStats()
        
        // Ensure textareas are properly sized after data is loaded
        setTimeout(() => {
            window.uiManager.autoResizeTextareas()
        }, 100)
        
        // Show save indicator if data was loaded
        if (dataLoaded && window.dataManager.data.length > 0) {
            setTimeout(() => window.uiManager.showSaveIndicator(), 1000)
        }
        
        this.initialized = true
        console.log('Dashboard initialized successfully with localStorage!')
        console.log(`Loaded ${window.dataManager.data.length} records from storage`)
    }

    setupEventListeners() {
        // Excel upload
        const excelUpload = document.getElementById('excel-upload')
        if (excelUpload) {
            excelUpload.addEventListener('change', (e) => window.dataManager.handleExcelUpload(e))
        }
        
        // Export button
        const exportBtn = document.getElementById('export-btn')
        if (exportBtn) {
            exportBtn.addEventListener('click', () => window.dataManager.exportToExcel())
        }
        
        // Add record button
        const addRecordBtn = document.getElementById('add-record-btn')
        if (addRecordBtn) {
            addRecordBtn.addEventListener('click', () => window.uiManager.showAddRecordModal())
        }
        
        // Debug button
        const debugBtn = document.getElementById('debug-btn')
        if (debugBtn) {
            debugBtn.addEventListener('click', () => window.dataManager.showDebugInfo())
        }

        // Create sample data button
        const createSampleBtn = document.getElementById('create-sample-btn')
        if (createSampleBtn) {
            createSampleBtn.addEventListener('click', () => window.dataManager.createSampleData())
        }
        
        // Clear data button
        const clearDataBtn = document.getElementById('clear-data-btn')
        if (clearDataBtn) {
            clearDataBtn.addEventListener('click', () => window.dataManager.clearAllData())
        }
        
        // Tab switching
        const invoicingTab = document.getElementById('invoicing-tab')
        if (invoicingTab) {
            invoicingTab.addEventListener('click', (e) => {
                e.preventDefault()
                window.uiManager.switchToTab('invoicing')
            })
        }
        
        const testingTab = document.getElementById('testing-tab')
        if (testingTab) {
            testingTab.addEventListener('click', (e) => {
                e.preventDefault()
                window.uiManager.switchToTab('testing')
            })
        }

        const calendarTab = document.getElementById('calendar-tab')
        if (calendarTab) {
            calendarTab.addEventListener('click', (e) => {
                e.preventDefault()
                window.uiManager.switchToTab('calendar')
            })
        }

        // Sorting functionality
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('sortable-header')) {
                const column = e.target.dataset.sort
                if (column) {
                    window.uiManager.sortData(column)
                }
            }
        })

        // Filter controls
        const filterToggleBtn = document.getElementById('filter-toggle-btn')
        if (filterToggleBtn) {
            filterToggleBtn.addEventListener('click', () => {
                const filterPanel = document.getElementById('filter-panel')
                filterPanel.classList.toggle('show')
            })
        }

        const filterApplyBtn = document.getElementById('filter-apply-btn')
        if (filterApplyBtn) {
            filterApplyBtn.addEventListener('click', () => {
                window.uiManager.applyFilters()
            })
        }

        const filterClearBtn = document.getElementById('filter-clear-btn')
        if (filterClearBtn) {
            filterClearBtn.addEventListener('click', () => {
                window.uiManager.clearFilters()
            })
        }

        // Select all checkbox
        const selectAllCheckbox = document.getElementById('select-all')
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    window.uiManager.selectAllRows()
                } else {
                    window.uiManager.clearSelection()
                }
            })
        }

        // Bulk action buttons
        const bulkDeleteBtn = document.getElementById('bulk-delete-btn')
        if (bulkDeleteBtn) {
            bulkDeleteBtn.addEventListener('click', () => {
                window.uiManager.bulkDelete()
            })
        }

        const bulkExportBtn = document.getElementById('bulk-export-btn')
        if (bulkExportBtn) {
            bulkExportBtn.addEventListener('click', () => {
                window.uiManager.bulkExport()
            })
        }

        const bulkMarkPaidBtn = document.getElementById('bulk-mark-paid-btn')
        if (bulkMarkPaidBtn) {
            bulkMarkPaidBtn.addEventListener('click', () => {
                window.uiManager.bulkMarkPaid()
            })
        }

        const bulkClearBtn = document.getElementById('bulk-clear-btn')
        if (bulkClearBtn) {
            bulkClearBtn.addEventListener('click', () => {
                window.uiManager.clearSelection()
            })
        }

        // Undo/Redo buttons
        const undoBtn = document.getElementById('undo-btn')
        if (undoBtn) {
            undoBtn.addEventListener('click', () => {
                window.dataManager.undo()
            })
        }

        const redoBtn = document.getElementById('redo-btn')
        if (redoBtn) {
            redoBtn.addEventListener('click', () => {
                window.dataManager.redo()
            })
        }

        // Print calendar button
        const printCalendarBtn = document.getElementById('print-calendar-btn')
        if (printCalendarBtn) {
            printCalendarBtn.addEventListener('click', () => {
                window.print()
            })
        }
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Check if user is typing in an input field
            const isInputField = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT'
            
            // Ctrl/Cmd + S: Save (force save)
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault()
                window.dataManager.saveDataToStorage()
                window.uiManager.showToast('Data saved manually', 'success')
                return
            }
            
            // Only process other shortcuts if not in an input field
            if (isInputField) return
            
            // Ctrl/Cmd + N: Add new record
            if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                e.preventDefault()
                window.uiManager.showAddRecordModal()
                return
            }
            
            // Ctrl/Cmd + E: Export to Excel
            if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
                e.preventDefault()
                window.dataManager.exportToExcel()
                return
            }
            
            // Ctrl/Cmd + D: Show debug info
            if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
                e.preventDefault()
                window.dataManager.showDebugInfo()
                return
            }
            
            // Ctrl/Cmd + Z: Undo
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault()
                window.dataManager.undo()
                return
            }
            
            // Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y: Redo
            if ((e.ctrlKey || e.metaKey) && ((e.key === 'z' && e.shiftKey) || e.key === 'y')) {
                e.preventDefault()
                window.dataManager.redo()
                return
            }
            
            // Ctrl/Cmd + F: Focus search
            if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                e.preventDefault()
                const searchInput = document.getElementById('search')
                if (searchInput) {
                    searchInput.focus()
                    searchInput.select()
                }
                return
            }
            
            // Tab switching: 1, 2, 3
            if (e.key >= '1' && e.key <= '3') {
                const tabs = ['invoicing', 'testing', 'calendar']
                const tabIndex = parseInt(e.key) - 1
                if (tabs[tabIndex]) {
                    window.uiManager.switchToTab(tabs[tabIndex])
                }
                return
            }
            
            // Escape: Close any open modals or overlays
            if (e.key === 'Escape') {
                // Close loading overlay if present
                const loadingOverlay = document.getElementById('loading-overlay')
                if (loadingOverlay) {
                    window.uiManager.hideLoadingOverlay()
                }
                
                // Clear search
                const searchInput = document.getElementById('search')
                if (searchInput && searchInput.value) {
                    searchInput.value = ''
                    searchInput.dispatchEvent(new Event('input'))
                }
                return
            }
        })
        
        // Show keyboard shortcuts help on page load
        this.showKeyboardShortcutsToast()
    }
    
    showKeyboardShortcutsToast() {
        setTimeout(() => {
            const shortcuts = [
                'Ctrl+S: Save data',
                'Ctrl+Z: Undo',
                'Ctrl+Y: Redo',
                'Ctrl+N: New record',
                'Ctrl+E: Export Excel',
                'Ctrl+F: Search',
                '1/2/3: Switch tabs',
                'Esc: Clear/Close'
            ]
            window.uiManager.showToast(`Keyboard shortcuts: ${shortcuts.join(' • ')}`, 'info')
        }, 2000)
    }

    // Global functions for backwards compatibility
    setupGlobalFunctions() {
        // Make functions available globally for onclick handlers
        window.updateWeight = (recordId, inputValue, unit) => {
            window.utils.updateWeight(recordId, inputValue, unit)
        }

        window.updateRecordField = (recordId, fieldName, value) => {
            window.dataManager.updateRecordField(recordId, fieldName, value)
        }

        window.deleteRecord = (recordId) => {
            window.dataManager.deleteRecord(recordId)
        }

        window.createSampleData = () => {
            window.dataManager.createSampleData()
        }

        window.clearAllData = () => {
            window.dataManager.clearAllData()
        }

        window.showDebugInfo = () => {
            window.dataManager.showDebugInfo()
        }

        window.exportToExcel = () => {
            window.dataManager.exportToExcel()
        }

        window.showAddRecordModal = () => {
            window.uiManager.showAddRecordModal()
        }

        window.switchToTab = (tab) => {
            window.uiManager.switchToTab(tab)
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const app = new App()
    app.setupGlobalFunctions()
    app.init()
    
    // Make app globally available for debugging
    window.app = app
})