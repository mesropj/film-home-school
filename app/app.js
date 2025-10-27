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
    console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
    console.log('Supabase Key exists:', !!import.meta.env.VITE_SUPABASE_ANON_KEY);
    
    // Setup event listeners FIRST before any DOM manipulation
    setupEventListeners();
    
    // Load glossary terms from Supabase
    const glossaryMap = await loadGlossary();
    console.log('Glossary loaded with', glossaryMap.size, 'terms');
    
    // Highlight glossary terms in the main content
    if (glossaryMap.size > 0) {
        highlightGlossaryTerms('.main-content', glossaryMap);
        
        // Initialize tooltip functionality
        initializeGlossaryTooltips();
    } else {
        console.error('No glossary terms loaded!');
    }
    
    loadContent();
}

/**
 * Setup event listeners for interactive elements
 */
function setupEventListeners() {
    // Theme toggle functionality
    const themeToggle = document.getElementById('theme-toggle');
    
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const root = document.documentElement;
            const currentTheme = root.getAttribute('data-theme');
            
            // Toggle between light and dark
            // If currentTheme is 'dark', switch to light
            // Otherwise (light, null, or undefined), switch to dark
            if (currentTheme === 'dark') {
                root.setAttribute('data-theme', 'light');
                localStorage.setItem('theme', 'light');
                console.log('Switched to light mode');
            } else {
                root.setAttribute('data-theme', 'dark');
                localStorage.setItem('theme', 'dark');
                console.log('Switched to dark mode');
            }
        });
        
        console.log('Theme toggle button found and listener attached');
    } else {
        console.error('Theme toggle button not found');
    }
    
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
        console.log('Attempting to fetch glossary from Supabase...');
        
        // Fetch term, definition, and wikipedia_url columns from the glossary table
        const { data, error } = await supabase
            .from('glossary')
            .select('term, definition, wikipedia_url')
            .order('term', { ascending: true });

        if (error) {
            console.error('Supabase error:', error);
            console.error('Error details:', JSON.stringify(error, null, 2));
        }

        console.log('Raw data from Supabase:', data);
        console.log('Number of records:', data ? data.length : 0);

        // If no data from Supabase, try loading from CSV
        if (!data || data.length === 0) {
            console.warn('No data in Supabase. Loading from local CSV file...');
            return await loadGlossaryFromCSV();
        }

        // Create a new Map to store the glossary
        const glossaryMap = new Map();

        // Populate the Map with term as key and object with definition and wikipedia_url as value
        if (data && data.length > 0) {
            data.forEach(entry => {
                if (entry.term && entry.definition) {
                    glossaryMap.set(entry.term, {
                        definition: entry.definition,
                        wikipedia_url: entry.wikipedia_url || null
                    });
                }
            });
        }

        console.log(`Loaded ${glossaryMap.size} glossary terms from Supabase`);
        return glossaryMap;

    } catch (error) {
        console.error('Exception loading glossary:', error);
        console.error('Stack trace:', error.stack);
        console.warn('Falling back to CSV file...');
        return await loadGlossaryFromCSV();
    }
}

/**
 * Load glossary from local CSV file as fallback
 * @returns {Promise<Map>} - A Map with terms as keys and objects with definition and wikipedia_url
 */
async function loadGlossaryFromCSV() {
    try {
        const response = await fetch('/local_files/glossary.csv');
        if (!response.ok) {
            console.error('Failed to load CSV file');
            return new Map();
        }
        
        const csvText = await response.text();
        const lines = csvText.split('\n');
        const glossaryMap = new Map();
        
        // Parse header to find column indices
        const header = lines[0].toLowerCase().split(',');
        const termIndex = header.indexOf('term');
        const definitionIndex = header.indexOf('definition');
        const wikiIndex = header.findIndex(col => col.includes('wiki'));
        
        // Skip header row, start from line 1
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            // Simple CSV parsing (note: this won't handle commas within quoted fields perfectly)
            // For production, consider using a proper CSV parser library
            const values = line.split(',');
            
            if (values.length > definitionIndex) {
                const term = values[termIndex]?.replace(/^"|"$/g, '').trim();
                let definition = values[definitionIndex]?.replace(/^"|"$/g, '').trim();
                const wikipedia_url = wikiIndex >= 0 ? values[wikiIndex]?.replace(/^"|"$/g, '').trim() : null;
                
                if (term && definition) {
                    // Clean up escaped quotes
                    definition = definition.replace(/""/g, '"');
                    
                    glossaryMap.set(term, {
                        definition: definition,
                        wikipedia_url: wikipedia_url || null
                    });
                }
            }
        }
        
        console.log(`Loaded ${glossaryMap.size} glossary terms from CSV file`);
        return glossaryMap;
        
    } catch (error) {
        console.error('Error loading CSV:', error);
        return new Map();
    }
}

/**
 * Highlight glossary terms in the content
 * @param {string} selector - CSS selector for the content to scan (e.g., '.main-content')
 * @param {Map} glossaryMap - Map of glossary terms and definitions
 */
function highlightGlossaryTerms(selector, glossaryMap) {
    const containers = document.querySelectorAll(selector);
    
    if (containers.length === 0) {
        console.warn(`No elements found for selector: ${selector}`);
        return;
    }

    console.log(`Found ${containers.length} container(s) to scan for glossary terms`);
    
    // Convert Map to array and sort by length (longest first to avoid partial matches)
    const terms = Array.from(glossaryMap.entries()).sort((a, b) => b[0].length - a[0].length);
    
    containers.forEach(container => {
        highlightInElement(container, terms);
    });

    console.log(`Glossary highlighting complete`);
}

/**
 * Highlight glossary terms within a specific element
 * @param {Element} element - The element to process
 * @param {Array} terms - Array of [term, definition] pairs
 */
function highlightInElement(element, terms) {
    // Get all text nodes
    const walker = document.createTreeWalker(
        element,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode: function(node) {
                // Skip if parent is already a glossary term
                if (node.parentElement && node.parentElement.classList.contains('glossary-term')) {
                    return NodeFilter.FILTER_REJECT;
                }
                // Skip if text is only whitespace
                if (!node.textContent.trim()) {
                    return NodeFilter.FILTER_REJECT;
                }
                return NodeFilter.FILTER_ACCEPT;
            }
        }
    );

    const textNodes = [];
    let currentNode;
    while (currentNode = walker.nextNode()) {
        textNodes.push(currentNode);
    }

    // Process each text node
    textNodes.forEach(textNode => {
        const text = textNode.textContent;
        const matches = [];

        // Find all term matches in this text node
        terms.forEach(([term, data]) => {
            // Escape special regex characters in the term
            const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            
            // Create case-insensitive regex with word boundaries
            const regex = new RegExp(`\\b${escapedTerm}\\b`, 'gi');
            let match;

            while ((match = regex.exec(text)) !== null) {
                matches.push({
                    start: match.index,
                    end: match.index + match[0].length,
                    text: match[0], // Preserve original capitalization from the text
                    definition: typeof data === 'string' ? data : data.definition,
                    wikipedia_url: typeof data === 'object' ? data.wikipedia_url : null,
                    term: term
                });
            }
        });

        // If we have matches, rebuild the node
        if (matches.length > 0) {
            // Sort matches by position and remove overlaps (keep first occurrence)
            matches.sort((a, b) => a.start - b.start);
            const nonOverlapping = [];
            
            matches.forEach(match => {
                const overlaps = nonOverlapping.some(existing => 
                    (match.start >= existing.start && match.start < existing.end) ||
                    (match.end > existing.start && match.end <= existing.end)
                );
                if (!overlaps) {
                    nonOverlapping.push(match);
                }
            });

            // Create document fragment with highlighted terms
            const fragment = document.createDocumentFragment();
            let lastIndex = 0;

            nonOverlapping.forEach(match => {
                // Add text before the match
                if (match.start > lastIndex) {
                    fragment.appendChild(document.createTextNode(text.substring(lastIndex, match.start)));
                }

                // Add the glossary term span
                const span = document.createElement('span');
                span.className = 'glossary-term';
                span.setAttribute('data-definition', match.definition);
                if (match.wikipedia_url) {
                    span.setAttribute('data-wikipedia-url', match.wikipedia_url);
                }
                span.textContent = match.text; // Use the actual text from the document (preserves capitalization)
                fragment.appendChild(span);

                lastIndex = match.end;
            });

            // Add remaining text
            if (lastIndex < text.length) {
                fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
            }

            // Replace the text node with the fragment
            textNode.parentNode.replaceChild(fragment, textNode);
        }
    });
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
    let hideTimeout = null; // Timeout for delayed hiding

    /**
     * Build tooltip content with definition and optional Wikipedia link
     */
    function buildTooltipContent(definition, wikipediaUrl) {
        tooltip.innerHTML = ''; // Clear existing content
        
        // Add definition text
        const defText = document.createElement('p');
        defText.className = 'tooltip-definition';
        defText.textContent = definition;
        tooltip.appendChild(defText);
        
        // Add Wikipedia link if available
        if (wikipediaUrl) {
            const wikiLink = document.createElement('a');
            wikiLink.href = wikipediaUrl;
            wikiLink.target = '_blank';
            wikiLink.rel = 'noopener noreferrer';
            wikiLink.className = 'tooltip-wiki-link';
            
            // Wikipedia logo using external SVG file
            wikiLink.innerHTML = `
                <span class="wiki-icon-container">
                    <img src="/images/misc/Wikipedia's_W.svg" alt="Wikipedia" class="wiki-icon">
                </span>
                <span>Read more on Wikipedia</span>
            `;
            
            tooltip.appendChild(wikiLink);
        }
    }

    // Desktop: Mouseover event listener
    document.addEventListener('mouseover', (event) => {
        const term = event.target.closest('.glossary-term');
        
        if (term) {
            // Clear any pending hide timeout
            if (hideTimeout) {
                clearTimeout(hideTimeout);
                hideTimeout = null;
            }
            
            const definition = term.getAttribute('data-definition');
            const wikipediaUrl = term.getAttribute('data-wikipedia-url');
            
            if (definition) {
                buildTooltipContent(definition, wikipediaUrl);
                positionTooltip(tooltip, term);
                tooltip.classList.add('show');
            }
        }
        
        // Also check if hovering over tooltip itself - keep it visible
        if (event.target.closest('.glossary-tooltip')) {
            if (hideTimeout) {
                clearTimeout(hideTimeout);
                hideTimeout = null;
            }
        }
    });

    // Desktop: Mouseout event listener
    document.addEventListener('mouseout', (event) => {
        const term = event.target.closest('.glossary-term');
        
        if (term) {
            // Clear any existing timeout
            if (hideTimeout) {
                clearTimeout(hideTimeout);
            }
            
            // Set a delay before hiding (300ms gives time to move cursor to tooltip)
            hideTimeout = setTimeout(() => {
                tooltip.classList.remove('show');
            }, 300);
        }
        
        // If leaving the tooltip, hide it with delay
        if (event.target.closest('.glossary-tooltip')) {
            if (hideTimeout) {
                clearTimeout(hideTimeout);
            }
            
            hideTimeout = setTimeout(() => {
                tooltip.classList.remove('show');
            }, 300);
        }
    });

    // Mobile: Click event listener
    document.addEventListener('click', (event) => {
        const term = event.target.closest('.glossary-term');
        
        // Don't close tooltip if clicking the Wikipedia link
        if (event.target.closest('.tooltip-wiki-link')) {
            return;
        }
        
        if (term) {
            event.preventDefault();
            
            if (currentTerm === term && tooltip.classList.contains('show')) {
                tooltip.classList.remove('show');
                currentTerm = null;
            } else {
                const definition = term.getAttribute('data-definition');
                const wikipediaUrl = term.getAttribute('data-wikipedia-url');
                
                if (definition) {
                    buildTooltipContent(definition, wikipediaUrl);
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
