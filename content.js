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

    // Add recurring event patterns
    const recurringPatterns = {
        MWF: /\b(M[WF]{1,2}|[WF]M[WF]|[WF]{2}M)\b/i,
        TTH: /\b(T[Th]{1,2}|[Th]T[Th]|TTh|TuTh)\b/i,
        days: /\b(Monday|Tuesday|Wednesday|Thursday|Friday|Mon|Tue|Wed|Thu|Fri)\b/gi,
        time: /\b(\d{1,2}):?(\d{2})?\s*(am|pm)?\s*(?:-|to|–)\s*(\d{1,2}):?(\d{2})?\s*(am|pm)?\b/i
    };

    // Add function to calculate semester end date
    function calculateSemesterEnd() {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();

        // Fall semester (August - December)
        if (month >= 7) { // After July
            return `${year}-12-15`; // Fall semester ends in December
        } 
        // Spring semester (January - May)
        else {
            return `${year}-05-15`; // Spring semester ends in May
        }
    }

    lines.forEach(line => {
        // Skip empty lines
        if (!line.trim()) return;

        const contextSnippet = line.trim();
        const lowerContext = contextSnippet.toLowerCase();
        
        // Check for recurring patterns
        let recurringDays = [];
        let recurringTime = null;
        
        // Check for MWF pattern
        if (recurringPatterns.MWF.test(contextSnippet)) {
            recurringDays = [1, 3, 5]; // Monday = 1, Wednesday = 3, Friday = 5
        }
        // Check for TTH pattern
        else if (recurringPatterns.TTH.test(contextSnippet)) {
            recurringDays = [2, 4]; // Tuesday = 2, Thursday = 4
        }
        // Check for individual day names
        else {
            const dayMatches = contextSnippet.match(recurringPatterns.days);
            if (dayMatches) {
                recurringDays = dayMatches.map(day => {
                    const dayMap = {
                        'monday': 1, 'mon': 1,
                        'tuesday': 2, 'tue': 2,
                        'wednesday': 3, 'wed': 3,
                        'thursday': 4, 'thu': 4,
                        'friday': 5, 'fri': 5
                    };
                    return dayMap[day.toLowerCase()];
                }).filter(day => day !== undefined);
            }
        }

        // Check for time pattern
        const timeMatch = contextSnippet.match(recurringPatterns.time);
        if (timeMatch) {
            recurringTime = {
                startHour: parseInt(timeMatch[1]),
                startMinute: timeMatch[2] ? parseInt(timeMatch[2]) : 0,
                startAmPm: timeMatch[3] ? timeMatch[3].toLowerCase() : null,
                endHour: parseInt(timeMatch[4]),
                endMinute: timeMatch[5] ? parseInt(timeMatch[5]) : 0,
                endAmPm: timeMatch[6] ? timeMatch[6].toLowerCase() : null
            };

            // Convert to 24-hour format if needed
            if (recurringTime.startAmPm === 'pm' && recurringTime.startHour !== 12) {
                recurringTime.startHour += 12;
            }
            if (recurringTime.endAmPm === 'pm' && recurringTime.endHour !== 12) {
                recurringTime.endHour += 12;
            }
        }

        // If we found both recurring days and time, create a recurring event
        if (recurringDays.length > 0 && recurringTime) {
            let type = 'Event';
            let details = '';
            
            // Determine event type based on context
            if (lowerContext.includes('lecture')) {
                type = 'Lecture';
            } else if (lowerContext.includes('discussion')) {
                type = 'Discussion';
            } else if (lowerContext.includes('lab')) {
                type = 'Lab';
            }

            // Calculate duration in milliseconds
            const duration = ((recurringTime.endHour - recurringTime.startHour) * 60 +
                            (recurringTime.endMinute - recurringTime.startMinute)) * 60 * 1000;

            // Create a recurring event with dynamic end date
            events.push({
                type: type,
                details: details,
                summary: `${className} - ${type}`,
                contextSnippet: contextSnippet,
                className: className,
                isRecurring: true,
                recurringDays: recurringDays,
                startTime: {
                    hour: recurringTime.startHour,
                    minute: recurringTime.startMinute
                },
                duration: duration,
                until: calculateSemesterEnd() // Use the dynamic end date
            });
        }

        // Continue with existing non-recurring event processing...
        const dates = chrono.parse(line);
        if (dates.length === 0) return;

        // Only process the first date found in the line
        const date = dates[0];

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
