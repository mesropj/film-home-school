/**
 * Film Home School - Main Application
 * Author: Mesrop Janoyan
 */

import { createClient } from '@supabase/supabase-js'

// Supabase Configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Initialize Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Application initialization
document.addEventListener('DOMContentLoaded', () => {
    console.log('Film Home School application loaded');
    init();
});

/**
 * Initialize the application
 */
async function init() {
    console.log('Initializing Film Home School...');
    
    // Check Supabase connection
    const { data, error } = await supabase.from('_health').select('*').limit(1)
    if (error && error.code !== 'PGRST204') {
        console.log('Supabase connected successfully')
    }
    
    setupEventListeners();
    loadContent();
}

/**
 * Setup event listeners for interactive elements
 */
function setupEventListeners() {
    // Add event listeners here as needed
    console.log('Event listeners initialized');
}

/**
 * Load initial content
 */
async function loadContent() {
    console.log('Loading initial content...');
    // Add content loading logic here
    // Example: Fetch data from Supabase
    // const { data, error } = await supabase.from('your_table').select('*')
}

/**
 * Utility function for API calls (for non-Supabase APIs)
 * @param {string} url - The API endpoint
 * @param {object} options - Fetch options
 * @returns {Promise} - The fetch promise
 */
async function fetchData(url, options = {}) {
    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Fetch error:', error);
        throw error;
    }
}

// Export functions if using modules
export { init, fetchData }
