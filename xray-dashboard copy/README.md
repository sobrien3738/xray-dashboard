# X-Ray & Compliance Tracking Dashboard

A modular web application for tracking X-ray testing and compliance for cannabis/hemp testing facilities.

## Project Structure

```
xray-dashboard/
├── index.html              # Main HTML structure
├── src/
│   ├── css/
│   │   └── styles.css      # Custom CSS styles
│   └── js/
│       ├── app.js          # Main application initialization
│       ├── data-manager.js # Data management and localStorage
│       ├── ui-manager.js   # UI updates and table management
│       ├── calendar-manager.js # Calendar view and X-ray scheduling
│       └── utils.js        # Utility functions and helpers
├── assets/                 # Static assets (if needed)
└── README.md              # This file
```

## Module Overview

### DataManager (`data-manager.js`)
- Handles all data operations
- localStorage persistence
- Excel import/export
- Sample data creation
- Record CRUD operations

### UIManager (`ui-manager.js`)
- Updates tables and UI elements
- Tab switching logic
- Modal management
- Toast notifications
- Search functionality

### CalendarManager (`calendar-manager.js`)
- X-ray scheduling (2 slots per day, Mon-Sat)
- Calendar view rendering
- Month navigation

### Utils (`utils.js`)
- Weight conversion (grams ↔ pounds)
- Input validation
- Date formatting
- General utility functions

### App (`app.js`)
- Application initialization
- Event listener setup
- Global function bindings for backwards compatibility

## Features

- **Multi-tab Interface**: Invoicing, Testing, and Calendar views
- **Data Persistence**: Automatic localStorage saving
- **Excel Integration**: Import/export functionality
- **X-ray Scheduling**: Automatic scheduling with 2 slots per day
- **Weight Conversion**: Supports both pounds and grams
- **Search**: Real-time filtering across all fields
- **Responsive Design**: Works on desktop and mobile

## Getting Started

1. Open `index.html` in a web browser
2. The application will automatically load any saved data
3. Use "Create Sample Data" to get started with example records
4. Import Excel files or add records manually

## Data Structure

Each record contains:
- Customer information
- METRC tag (cannabis tracking)
- Weight (input and invoice)
- Invoice details
- Payment information
- Testing results
- Compliance status

## Browser Compatibility

- Modern browsers with ES6+ support
- localStorage required for data persistence
- File API support for Excel import/export

## Development

To modify specific functionality:
- **Data operations**: Edit `data-manager.js`
- **UI changes**: Edit `ui-manager.js`
- **Calendar features**: Edit `calendar-manager.js`
- **Utility functions**: Edit `utils.js`
- **Styling**: Edit `styles.css`
- **HTML structure**: Edit `index.html`

The modular structure allows for easy maintenance and feature additions without affecting other parts of the application.