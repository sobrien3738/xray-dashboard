class CalendarManager {
    constructor() {
        this.currentCalendarDate = new Date()
        this.xraySchedule = {}
        this.editingSlot = null
        this.customSlots = JSON.parse(localStorage.getItem('calendar-custom-slots') || '{}')
    }

    updateXraySchedule() {
        this.xraySchedule = {}
        
        const sortedRecords = [...window.dataManager.data].sort((a, b) => {
            const dateA = new Date(a.date_created)
            const dateB = new Date(b.date_created)
            if (dateA.getTime() === dateB.getTime()) {
                return a.id - b.id
            }
            return dateA - dateB
        })
        
        let currentDate = new Date()
        let currentSlot = 0
        
        sortedRecords.forEach(record => {
            while (currentDate.getDay() === 0) {
                currentDate.setDate(currentDate.getDate() + 1)
                currentSlot = 0
            }
            
            const dateKey = currentDate.toISOString().split('T')[0]
            
            if (!this.xraySchedule[dateKey]) {
                this.xraySchedule[dateKey] = { slot1: null, slot2: null }
            }
            
            // Extract full METRC tag from apex_invoice_note (first line before newline)
            const fullMetrcTag = record.apex_invoice_note ? record.apex_invoice_note.split('\n')[0] : record.metrc_tag
            
            if (currentSlot === 0) {
                this.xraySchedule[dateKey].slot1 = {
                    customer: record.customer,
                    metrcTag: record.metrc_tag, // Keep 16-char for compatibility
                    fullMetrcTag: fullMetrcTag, // Full METRC tag from apex_invoice_note
                    weight: record.invoice_weight,
                    recordId: record.id
                }
                currentSlot = 1
            } else {
                this.xraySchedule[dateKey].slot2 = {
                    customer: record.customer,
                    metrcTag: record.metrc_tag, // Keep 16-char for compatibility  
                    fullMetrcTag: fullMetrcTag, // Full METRC tag from apex_invoice_note
                    weight: record.invoice_weight,
                    recordId: record.id
                }
                currentDate.setDate(currentDate.getDate() + 1)
                currentSlot = 0
            }
        })
    }

    updateCalendarView() {
        const year = this.currentCalendarDate.getFullYear()
        const month = this.currentCalendarDate.getMonth()
        
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December']
        document.getElementById('calendar-month-year').textContent = `${monthNames[month]} ${year}`
        
        const firstDay = new Date(year, month, 1)
        const lastDay = new Date(year, month + 1, 0)
        const daysInMonth = lastDay.getDate()
        const startingDayOfWeek = firstDay.getDay()
        
        const calendarGrid = document.getElementById('calendar-grid')
        calendarGrid.innerHTML = ''
        
        // Add empty cells for days before the first day of the month
        for (let i = 0; i < startingDayOfWeek; i++) {
            const prevMonthDate = new Date(year, month, 0 - (startingDayOfWeek - 1 - i))
            const emptyCell = this.createCalendarDay(prevMonthDate, true) // true = other month
            calendarGrid.appendChild(emptyCell)
        }
        
        // Add cells for each day of the current month
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day)
            const dayCell = this.createCalendarDay(date, false)
            calendarGrid.appendChild(dayCell)
        }
        
        // Fill remaining cells to complete the grid
        const totalCells = calendarGrid.children.length
        const remainingCells = 42 - totalCells // 6 weeks * 7 days
        for (let i = 1; i <= remainingCells; i++) {
            const nextMonthDate = new Date(year, month + 1, i)
            const emptyCell = this.createCalendarDay(nextMonthDate, true) // true = other month
            calendarGrid.appendChild(emptyCell)
        }
    }

    createCalendarDay(date, isOtherMonth = false) {
        const dateKey = date.toISOString().split('T')[0]
        const dayOfWeek = date.getDay()
        const isSunday = dayOfWeek === 0
        const isWorkDay = dayOfWeek >= 1 && dayOfWeek <= 6
        const isToday = dateKey === new Date().toISOString().split('T')[0]
        
        const dayCell = document.createElement('div')
        dayCell.className = `calendar-day ${
            isOtherMonth ? 'other-month' : ''
        } ${isToday ? 'today' : ''}`
        dayCell.dataset.date = dateKey
        
        // Day number
        const dayNumber = document.createElement('div')
        dayNumber.className = 'calendar-day-number'
        dayNumber.textContent = date.getDate()
        dayCell.appendChild(dayNumber)
        
        // Slots container
        const slotsContainer = document.createElement('div')
        slotsContainer.className = 'calendar-slots'
        
        if (isWorkDay && !isOtherMonth) {
            // Create two X-ray slots
            const slot1 = this.createSlot(dateKey, 1, 'Morning Slot')
            const slot2 = this.createSlot(dateKey, 2, 'Afternoon Slot')
            
            slotsContainer.appendChild(slot1)
            slotsContainer.appendChild(slot2)
        } else if (isSunday) {
            const closedSlot = document.createElement('div')
            closedSlot.className = 'calendar-slot unavailable'
            closedSlot.textContent = 'Closed'
            slotsContainer.appendChild(closedSlot)
        }
        
        dayCell.appendChild(slotsContainer)
        return dayCell
    }

    createSlot(dateKey, slotNumber, defaultName) {
        const slotKey = `${dateKey}-slot${slotNumber}`
        const slot = document.createElement('div')
        
        // Check for auto-scheduled records
        const autoRecord = this.xraySchedule[dateKey] && this.xraySchedule[dateKey][`slot${slotNumber}`]
        
        // Check for custom slot data
        const customData = this.customSlots[slotKey]
        
        if (autoRecord) {
            slot.className = 'calendar-slot booked'
            
            // Get last 5 digits from the FULL METRC tag (from apex_invoice_note)
            const fullMetrcTag = autoRecord.fullMetrcTag || autoRecord.metrcTag || ''
            const last5Digits = fullMetrcTag.slice(-5)
            
            if (customData && customData.trim()) {
                // Both auto-scheduled AND custom notes
                slot.innerHTML = `
                    <div style="font-weight: 600; font-size: 0.6rem; line-height: 1.0;">${autoRecord.customer}</div>
                    <div style="font-size: 0.5rem; color: #666; font-family: monospace;">${last5Digits}</div>
                    <div style="font-size: 0.5rem; color: #d97706; font-style: italic; margin-top: 1px;">📝 ${customData}</div>
                `
                slot.title = `Auto-scheduled + Notes\nCustomer: ${autoRecord.customer}\nFull METRC: ${autoRecord.fullMetrcTag || autoRecord.metrcTag}\nWeight: ${autoRecord.weight} lbs\nNotes: ${customData}\nClick to edit notes`
            } else {
                // Just auto-scheduled
                slot.innerHTML = `
                    <div style="font-weight: 600; font-size: 0.65rem; line-height: 1.1;">${autoRecord.customer}</div>
                    <div style="font-size: 0.55rem; color: #666; font-family: monospace;">${last5Digits}</div>
                `
                slot.title = `Auto-scheduled\nCustomer: ${autoRecord.customer}\nFull METRC: ${autoRecord.fullMetrcTag || autoRecord.metrcTag}\nWeight: ${autoRecord.weight} lbs\nClick to add notes`
            }
        } else if (customData && customData.trim()) {
            // Just custom notes (no auto-scheduled data)
            slot.className = 'calendar-slot booked'
            slot.innerHTML = `
                <div style="font-weight: 600; font-size: 0.65rem; line-height: 1.1;">${customData}</div>
            `
            slot.title = `Custom entry: ${customData}\nClick to edit`
        } else {
            slot.className = 'calendar-slot available'
            slot.textContent = defaultName
        }
        
        // Add click handler for editing
        slot.addEventListener('click', (e) => {
            e.stopPropagation()
            this.editSlot(slotKey, slot)
        })
        
        return slot
    }

    editSlot(slotKey, slotElement) {
        // Close any existing edit forms
        this.closeEditForm()
        
        this.editingSlot = slotKey
        const currentValue = this.customSlots[slotKey] || ''
        
        // Create edit form
        const form = document.createElement('div')
        form.className = 'calendar-slot-form show'
        form.innerHTML = `
            <input type="text" class="calendar-slot-input" 
                   value="${currentValue}" 
                   placeholder="Enter customer info..."
                   maxlength="50">
            <div class="calendar-slot-buttons">
                <button class="calendar-slot-btn calendar-slot-btn-save">Save</button>
                <button class="calendar-slot-btn calendar-slot-btn-cancel">Cancel</button>
            </div>
        `
        
        // Position form relative to the slot's parent day
        const dayCell = slotElement.closest('.calendar-day')
        dayCell.style.position = 'relative'
        dayCell.appendChild(form)
        
        // Focus input
        const input = form.querySelector('.calendar-slot-input')
        input.focus()
        input.select()
        
        // Event handlers
        const saveBtn = form.querySelector('.calendar-slot-btn-save')
        const cancelBtn = form.querySelector('.calendar-slot-btn-cancel')
        
        const saveSlot = () => {
            const value = input.value.trim()
            this.saveSlotData(slotKey, value)
            this.closeEditForm()
            this.updateCalendarView()
        }
        
        const cancelEdit = () => {
            this.closeEditForm()
        }
        
        saveBtn.addEventListener('click', saveSlot)
        cancelBtn.addEventListener('click', cancelEdit)
        
        // Save on Enter, cancel on Escape
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault()
                saveSlot()
            } else if (e.key === 'Escape') {
                e.preventDefault()
                cancelEdit()
            }
        })
        
        // Close form if clicking outside
        document.addEventListener('click', (e) => {
            if (!form.contains(e.target)) {
                cancelEdit()
            }
        }, { once: true })
    }

    closeEditForm() {
        const existingForm = document.querySelector('.calendar-slot-form')
        if (existingForm) {
            existingForm.remove()
        }
        this.editingSlot = null
    }

    saveSlotData(slotKey, value) {
        if (value) {
            this.customSlots[slotKey] = value
        } else {
            delete this.customSlots[slotKey]
        }
        
        // Save to localStorage
        localStorage.setItem('calendar-custom-slots', JSON.stringify(this.customSlots))
        
        // Show toast notification
        window.uiManager?.showToast(
            value ? 'Slot updated successfully' : 'Slot cleared', 
            'success'
        )
    }

    navigateToPreviousMonth() {
        this.currentCalendarDate.setMonth(this.currentCalendarDate.getMonth() - 1)
        this.updateCalendarView()
    }

    navigateToNextMonth() {
        this.currentCalendarDate.setMonth(this.currentCalendarDate.getMonth() + 1)
        this.updateCalendarView()
    }

    setupCalendarNavigation() {
        const prevMonthBtn = document.getElementById('prev-month')
        if (prevMonthBtn) {
            prevMonthBtn.addEventListener('click', () => {
                this.navigateToPreviousMonth()
            })
        }

        const nextMonthBtn = document.getElementById('next-month')
        if (nextMonthBtn) {
            nextMonthBtn.addEventListener('click', () => {
                this.navigateToNextMonth()
            })
        }
    }
}

// Global instance
window.calendarManager = new CalendarManager()