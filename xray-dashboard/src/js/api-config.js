// API Configuration for X-Ray Dashboard
class ApiConfig {
    constructor() {
        // Determine API base URL based on environment
        this.baseURL = this.getApiBaseUrl();
        
        // Default request configuration
        this.defaultConfig = {
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include'
        };
    }

    getApiBaseUrl() {
        // In production, the API will be served from the same origin
        // In development, it might be a different port
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            // Development mode - check if we're running the frontend standalone
            const currentPort = window.location.port;
            if (currentPort === '3000' || currentPort === '8080') {
                return 'http://localhost:3001/api';
            }
        }
        
        // Production mode or same-origin serving
        return '/api';
    }

    // Helper method to make API requests
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            ...this.defaultConfig,
            ...options,
            headers: {
                ...this.defaultConfig.headers,
                ...(options.headers || {})
            }
        };

        try {
            const response = await fetch(url, config);
            
            // Handle non-JSON responses (like file downloads)
            const contentType = response.headers.get('content-type');
            if (contentType && !contentType.includes('application/json')) {
                if (response.ok) {
                    return response;
                } else {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
            }

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || data.error || `HTTP ${response.status}: ${response.statusText}`);
            }
            
            return data;
        } catch (error) {
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error('Network error: Unable to connect to server. Please check your connection.');
            }
            throw error;
        }
    }

    // Convenience methods for different HTTP verbs
    async get(endpoint, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const url = queryString ? `${endpoint}?${queryString}` : endpoint;
        return this.request(url, { method: 'GET' });
    }

    async post(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async put(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async delete(endpoint, data = {}) {
        const options = { method: 'DELETE' };
        if (Object.keys(data).length > 0) {
            options.body = JSON.stringify(data);
        }
        return this.request(endpoint, options);
    }

    // File upload method
    async uploadFile(endpoint, file, additionalData = {}) {
        const formData = new FormData();
        formData.append('file', file);
        
        // Add any additional data
        Object.keys(additionalData).forEach(key => {
            formData.append(key, additionalData[key]);
        });

        return this.request(endpoint, {
            method: 'POST',
            body: formData,
            headers: {} // Let browser set Content-Type for FormData
        });
    }

    // Download file method
    async downloadFile(endpoint, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const url = queryString ? `${endpoint}?${queryString}` : endpoint;
        
        const response = await this.request(url, { method: 'GET' });
        return response; // Returns the raw response for file handling
    }
}

// Export singleton instance
window.apiConfig = new ApiConfig();