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
    
    // Load glossary terms from Supabase
    const glossaryMap = await loadGlossary();
    
    // Highlight glossary terms in the main content
    if (glossaryMap.size > 0) {
        highlightGlossaryTerms('.main-content', glossaryMap);
        
        // Initialize tooltip functionality
        initializeGlossaryTooltips();
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
 * Load glossary terms and definitions from Supabase
 * @returns {Promise<Map>} - A Map with terms as keys and definitions as values
 */
async function loadGlossary() {
    try {
        // Fetch term and definition columns from the glossary table, ordered alphabetically
        const { data, error } = await supabase
            .from('glossary')
            .select('term, definition')
            .order('term', { ascending: true });

        if (error) {
            console.error('Error fetching glossary:', error);
            return new Map();
        }

        // Create a new Map to store the glossary
        const glossaryMap = new Map();

        // Populate the Map with term as key and definition as value
        data.forEach(entry => {
            glossaryMap.set(entry.term, entry.definition);
        });

        console.log(`Loaded ${glossaryMap.size} glossary terms`);
        return glossaryMap;

    } catch (error) {
        console.error('Error loading glossary:', error);
        return new Map();
    }
}

/**
 * Highlight glossary terms in the content
 * @param {string} selector - CSS selector for the content to scan (e.g., '.main-content')
 * @param {Map} glossaryMap - Map of glossary terms and definitions
 */
function highlightGlossaryTerms(selector, glossaryMap) {
    // Find all DOM elements that match the selector
    const elements = document.querySelectorAll(selector);

    // Iterate over each element
    elements.forEach(element => {
        let innerHTML = element.innerHTML;

        // Iterate over the glossaryMap
        glossaryMap.forEach((definition, term) => {
            // Create a case-insensitive, global RegExp that matches whole words only
            // \b ensures word boundaries (won't match 'pan' inside 'panning')
            const regex = new RegExp(`\\b(${term})\\b`, 'gi');

            // Replace matches with wrapped span elements
            innerHTML = innerHTML.replace(regex, (match) => {
                // Use the actual matched text to preserve original capitalization
                return `<span class="glossary-term" data-definition="${definition}">${match}</span>`;
            });
        });

        // Update the element's innerHTML with the modified HTML
        element.innerHTML = innerHTML;
    });

    console.log(`Highlighted glossary terms in ${elements.length} element(s)`);
}

/**
 * Initialize glossary tooltip functionality
 * Handles both desktop (hover) and mobile (click) interactions
 */
function initializeGlossaryTooltips() {
    // Create a single tooltip div and append it to the body
    const tooltip = document.createElement('div');
    tooltip.id = 'glossary-tooltip';
    tooltip.className = 'glossary-tooltip';
    document.body.appendChild(tooltip);

    let currentTerm = null; // Track the currently active term for mobile

    // Desktop: Mouseover event listener
    document.addEventListener('mouseover', (event) => {
        const term = event.target.closest('.glossary-term');
        
        if (term) {
            // Get the definition from the data attribute
            const definition = term.getAttribute('data-definition');
            
            if (definition) {
                // Set the tooltip content
                tooltip.textContent = definition;
                
                // Position the tooltip near the cursor
                positionTooltip(tooltip, term);
                
                // Show the tooltip
                tooltip.classList.add('show');
            }
        }
    });

    // Desktop: Mouseout event listener
    document.addEventListener('mouseout', (event) => {
        const term = event.target.closest('.glossary-term');
        
        if (term) {
            // Hide the tooltip
            tooltip.classList.remove('show');
        }
    });

    // Mobile: Click event listener
    document.addEventListener('click', (event) => {
        const term = event.target.closest('.glossary-term');
        
        if (term) {
            // User clicked a glossary term
            event.preventDefault();
            
            // If clicking the same term, toggle it off
            if (currentTerm === term && tooltip.classList.contains('show')) {
                tooltip.classList.remove('show');
                currentTerm = null;
            } else {
                // Show tooltip for this term
                const definition = term.getAttribute('data-definition');
                
                if (definition) {
                    tooltip.textContent = definition;
                    positionTooltip(tooltip, term);
                    tooltip.classList.add('show');
                    currentTerm = term;
                }
            }
        } else {
            // User clicked anywhere else - hide the tooltip
            if (tooltip.classList.contains('show')) {
                tooltip.classList.remove('show');
                currentTerm = null;
            }
        }
    });

    console.log('Glossary tooltips initialized');
}

/**
 * Position the tooltip relative to the target element
 * @param {HTMLElement} tooltip - The tooltip element
 * @param {HTMLElement} target - The target element (glossary term)
 */
function positionTooltip(tooltip, target) {
    const rect = target.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    
    // Position above the term by default
    let top = rect.top + window.scrollY - tooltipRect.height - 12;
    let left = rect.left + window.scrollX;
    
    // If tooltip would go off the top of the screen, position it below instead
    if (rect.top - tooltipRect.height - 12 < 0) {
        top = rect.bottom + window.scrollY + 12;
    }
    
    // Ensure tooltip doesn't go off the right edge of the screen
    if (left + tooltipRect.width > window.innerWidth) {
        left = window.innerWidth - tooltipRect.width - 20;
    }
    
    // Ensure tooltip doesn't go off the left edge
    if (left < 10) {
        left = 10;
    }
    
    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${left}px`;
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
export { init, fetchData, loadGlossary, highlightGlossaryTerms, initializeGlossaryTooltips }
