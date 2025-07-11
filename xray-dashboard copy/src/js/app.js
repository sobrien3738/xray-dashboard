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
        
        // Setup search functionality
        window.uiManager.setupSearch()
        
        // Setup calendar navigation
        window.calendarManager.setupCalendarNavigation()
        
        // Initialize UI
        window.uiManager.updateTables()
        window.uiManager.updateStats()
        
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