// content.js
// content.js
console.log('window.chrono:', window.chrono);
console.log('Type of window.chrono.parse:', typeof window.chrono.parse);

// Use chrono to find dates in the page content
function scrapeDates() {
    // Get all text content from the page
    const pageText = document.body.innerText;
    
    // Use chrono to parse dates from the text
    const parsedDates = chrono.parse(pageText);
    
    // Transform the parsed dates into our event format
    const events = parsedDates.map(result => {
        // Get the surrounding context (about 100 characters before and after the date)
        const start = Math.max(0, result.index - 100);
        const end = Math.min(pageText.length, result.index + result.text.length + 100);
        const contextSnippet = pageText.substring(start, end);
        
        // Try to determine the event type based on nearby keywords
        let type = 'Event';
        const lowerContext = contextSnippet.toLowerCase();
        if (lowerContext.includes('Midterm')) {
            type = 'Midterm';
        } else if (lowerContext.includes('Final')) {
            type = 'Final';
        } else if (lowerContext.includes('homework') || lowerContext.includes('assignment')) {
            type = 'Assignment Due';
        } else if (lowerContext.includes('lecture')) {
            type = 'Lecture';
        } else if (lowerContext.includes('lab')) {
            type = 'Lab';
        } else if (lowerContext.includes('discussion')) {
            type = 'Discussion';
        }
        
        return {
            date: result.date().toISOString(),
            type: type,
            contextSnippet: contextSnippet.trim()
        };
    });
    
    // Save the extracted events to Chrome's local storage
    chrome.storage.local.set({ scrapedEvents: events }, () => {
        console.log("Scraped events saved:", events);
    });

    // Send a message to the popup (if open) about new events
    chrome.runtime.sendMessage({ scrapedEvents: events });
}

// Run the scraper when the page loads
scrapeDates();

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "scrape") {
        scrapeDates();
        sendResponse({success: true});
    }
});
