class CalendarManager {
    constructor() {
        this.currentCalendarDate = new Date()
        this.xraySchedule = {}
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
            
            if (currentSlot === 0) {
                this.xraySchedule[dateKey].slot1 = {
                    customer: record.customer,
                    metrcTag: record.metrc_tag,
                    weight: record.invoice_weight,
                    recordId: record.id
                }
                currentSlot = 1
            } else {
                this.xraySchedule[dateKey].slot2 = {
                    customer: record.customer,
                    metrcTag: record.metrc_tag,
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
        
        for (let i = 0; i < startingDayOfWeek; i++) {
            const emptyCell = document.createElement('div')
            emptyCell.className = 'h-32 bg-gray-50 border border-gray-200 rounded'
            calendarGrid.appendChild(emptyCell)
        }
        
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day)
            const dateKey = date.toISOString().split('T')[0]
            const isSunday = date.getDay() === 0
            const isWorkDay = date.getDay() >= 1 && date.getDay() <= 6
            const isToday = dateKey === new Date().toISOString().split('T')[0]
            
            const dayCell = document.createElement('div')
            dayCell.className = `h-32 border border-gray-200 rounded p-2 ${
                isSunday ? 'bg-gray-100' : 'bg-white'
            } ${isToday ? 'ring-2 ring-blue-500' : ''}`
            
            const dayNumber = document.createElement('div')
            dayNumber.className = `text-sm font-medium mb-1 ${
                isToday ? 'text-blue-600' : 'text-gray-900'
            }`
            dayNumber.textContent = day
            dayCell.appendChild(dayNumber)
            
            if (isWorkDay && this.xraySchedule[dateKey]) {
                const schedule = this.xraySchedule[dateKey]
                
                if (schedule.slot1) {
                    const slot1 = document.createElement('div')
                    slot1.className = 'text-xs bg-blue-100 text-blue-800 p-1 rounded mb-1 truncate cursor-pointer hover:bg-blue-200'
                    slot1.innerHTML = `
                        <div class="font-medium">🔬 Slot 1</div>
                        <div class="font-semibold">${schedule.slot1.customer}</div>
                    `
                    slot1.title = `Customer: ${schedule.slot1.customer}\nMETRC: ${schedule.slot1.metrcTag}\nWeight: ${schedule.slot1.weight} lbs`
                    dayCell.appendChild(slot1)
                } else {
                    const emptySlot1 = document.createElement('div')
                    emptySlot1.className = 'text-xs bg-gray-100 text-gray-500 p-1 rounded mb-1'
                    emptySlot1.innerHTML = '<div class="font-medium">🔬 Slot 1</div><div>Available</div>'
                    dayCell.appendChild(emptySlot1)
                }
                
                if (schedule.slot2) {
                    const slot2 = document.createElement('div')
                    slot2.className = 'text-xs bg-green-100 text-green-800 p-1 rounded truncate cursor-pointer hover:bg-green-200'
                    slot2.innerHTML = `
                        <div class="font-medium">🔬 Slot 2</div>
                        <div class="font-semibold">${schedule.slot2.customer}</div>
                    `
                    slot2.title = `Customer: ${schedule.slot2.customer}\nMETRC: ${schedule.slot2.metrcTag}\nWeight: ${schedule.slot2.weight} lbs`
                    dayCell.appendChild(slot2)
                } else {
                    const emptySlot2 = document.createElement('div')
                    emptySlot2.className = 'text-xs bg-gray-100 text-gray-500 p-1 rounded'
                    emptySlot2.innerHTML = '<div class="font-medium">🔬 Slot 2</div><div>Available</div>'
                    dayCell.appendChild(emptySlot2)
                }
            } else if (isWorkDay) {
                const emptySlot1 = document.createElement('div')
                emptySlot1.className = 'text-xs bg-gray-100 text-gray-500 p-1 rounded mb-1'
                emptySlot1.innerHTML = '<div class="font-medium">🔬 Slot 1</div><div>Available</div>'
                dayCell.appendChild(emptySlot1)
                
                const emptySlot2 = document.createElement('div')
                emptySlot2.className = 'text-xs bg-gray-100 text-gray-500 p-1 rounded'
                emptySlot2.innerHTML = '<div class="font-medium">🔬 Slot 2</div><div>Available</div>'
                dayCell.appendChild(emptySlot2)
            } else {
                const closedDiv = document.createElement('div')
                closedDiv.className = 'text-xs text-gray-400 p-1 text-center'
                closedDiv.textContent = 'Closed (Sunday)'
                dayCell.appendChild(closedDiv)
            }
            
            calendarGrid.appendChild(dayCell)
        }
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