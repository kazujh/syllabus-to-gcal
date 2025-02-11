// content.js
console.log('window.chrono:', window.chrono);
console.log('Type of window.chrono.parse:', typeof window.chrono.parse);

// Use chrono to find dates in the page content
function scrapeDatesAndClassName() {
    const pageText = document.body.innerText;
    let className = 'Class Name Not Found';
    
    if (className === 'Class Name Not Found') {
        const courseNamePattern = /\b([A-Z][a-zA-Z]{1,9}\s?\d{1,3}[A-Z]?)\b/;
        const matches = pageText.match(courseNamePattern);
        className = matches ? matches[0].trim() : 'Course Name Not Found';
    }

    // Split the text into lines to process each event separately
    const lines = pageText.split('\n');
    const events = [];

    lines.forEach(line => {
        // Skip empty lines
        if (!line.trim()) return;

        const dates = chrono.parse(line);
        if (dates.length === 0) return;

        // Only process the first date found in the line
        const date = dates[0];
        const contextSnippet = line.trim();
        const lowerContext = contextSnippet.toLowerCase();

        let type = 'Event';
        let details = '';
        let matchFound = false;

        // Check for homework/assignment patterns first
        const homeworkPattern = /(homework|assignment|hw)\s*#?\s*(\d+)?/i;
        let hwMatch = homeworkPattern.exec(contextSnippet);
        if (hwMatch && !matchFound) {
            matchFound = true;
            type = 'Homework';
            if (hwMatch[2]) {
                details = `Homework ${hwMatch[2]}`;
                type = `Homework Deadline`;
            }
        }

        // Check for other patterns if homework wasn't found
        if (!matchFound) {
            if (lowerContext.includes('midterm')) {
                type = 'Midterm';
                const midtermPattern = /midterm\s*(\d+)?/i;
                let midtermMatch = midtermPattern.exec(contextSnippet);
                if (midtermMatch && midtermMatch[1]) {
                    details = `Midterm ${midtermMatch[1]}`;
                }
                matchFound = true;
            } else if (lowerContext.includes('final')) {
                type = 'Final';
                matchFound = true;
            } else if (lowerContext.includes('lecture')) {
                type = 'Lecture';
                matchFound = true;
            } else if (lowerContext.includes('lab')) {
                type = 'Lab';
                const labPattern = /lab\s*(\d+)?/i;
                let labMatch = labPattern.exec(contextSnippet);
                if (labMatch && labMatch[1]) {
                    details = `Lab ${labMatch[1]}`;
                }
                matchFound = true;
            } else if (lowerContext.includes('discussion')) {
                type = 'Discussion';
                matchFound = true;
            }
        }

        if (matchFound) {
            let eventDate = date.date();
            let isAllDay = false;
            let duration = 3600000; // default 1 hour in milliseconds
            
            // Check if a specific time was found in the parsed date
            const hasSpecificTime = date.start.isCertain('hour') && date.start.isCertain('minute');
            
            // Check if this is a time range (has both start and end times)
            const hasTimeRange = date.end !== null && 
                               date.end.isCertain('hour') && 
                               date.end.isCertain('minute');

            if (hasTimeRange) {
                // Calculate duration from the time range
                duration = date.end.date().getTime() - eventDate.getTime();
            } else if (!hasSpecificTime) {
                // Only set default times if no specific time was found
                switch(type) {
                    case 'Lecture':
                        eventDate.setHours(12, 0, 0, 0);
                        duration = 3600000; // 1 hour
                        break;
                    case 'Discussion':
                        eventDate.setHours(12, 0, 0, 0);
                        duration = 3600000; // 1 hour
                        break;
                    case 'Lab':
                        eventDate.setHours(12, 0, 0, 0);
                        duration = 3600000; // 1 hour
                        break;
                    case 'Midterm':
                        eventDate.setHours(12, 0, 0, 0);
                        duration = 3600000; // 1 hour
                        break;
                    case 'Final':
                        eventDate.setHours(12, 0, 0, 0);
                        duration = 3600000; // 1 hour
                        break;
                    default:
                        // For homework and other types
                        eventDate.setHours(23, 59, 0, 0);
                        duration = 600000; // No duration for deadlines
                }
            }

            let summary = className ? `${className} - ` : '';
            summary += details ? `${type}: ${details}` : type;
            
            events.push({
                date: eventDate.toISOString(),
                type: type,
                details: details,
                summary: summary,
                contextSnippet: contextSnippet,
                className: className,
                isAllDay: isAllDay,
                duration: duration // Add duration to the event object
            });
        }
    });

    // Sort events by date
    events.sort((a, b) => new Date(a.date) - new Date(b.date));

    chrome.storage.local.set({ scrapedEvents: events }, () => {
        console.log("Scraped events saved:", events);
    });

    chrome.runtime.sendMessage({ scrapedEvents: events });
}

// Run the scraper when the page loads
scrapeDatesAndClassName();

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "scrape") {
        scrapeDatesAndClassName();
        sendResponse({success: true});
    }
});
