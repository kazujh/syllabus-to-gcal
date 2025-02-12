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

    const lines = pageText.split('\n');
    const events = [];

    // Add recurring event patterns
    const recurringPatterns = {
        MWF: /\b(M[WF]{1,2}|[WF]M[WF]|[WF]{2}M)\b/i,
        TTH: /\b(T[Th]{1,2}|[Th]T[Th]|TTh|TuTh)\b/i,
        days: /\b(Mondays?|Tuesdays?|Wednesdays?|Thursdays?|Fridays?|Mon|Tue|Wed|Thu|Fri)\b/gi,
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

    const processedLines = new Set(); // Track which lines we've processed

    lines.forEach(line => {
        // Skip empty lines
        if (!line.trim()) return;

        const contextSnippet = line.trim();
        const lowerContext = contextSnippet.toLowerCase();
        
        console.log('Processing line:', contextSnippet); // Debug log
        
        // Check for recurring patterns first
        let recurringDays = [];
        let recurringTime = null;
        let wasRecurringEvent = false; // Flag to track if we processed this as recurring

        // Check for MWF pattern
        if (recurringPatterns.MWF.test(contextSnippet)) {
            recurringDays = [1, 3, 5];
            wasRecurringEvent = true;
        }
        // Check for TTH pattern
        else if (recurringPatterns.TTH.test(contextSnippet)) {
            recurringDays = [2, 4];
            wasRecurringEvent = true;
        }
        // Check for individual day names
        else {
            const dayMatches = contextSnippet.match(recurringPatterns.days);
            if (dayMatches) {
                recurringDays = dayMatches.map(day => {
                    const dayMap = {
                        'monday': 1, 'mon': 1, 'mondays': 1,
                        'tuesday': 2, 'tue': 2, 'tuesdays': 2,
                        'wednesday': 3, 'wed': 3, 'wednesdays': 3,
                        'thursday': 4, 'thu': 4, 'thursdays': 4,
                        'friday': 5, 'fri': 5, 'fridays': 5
                    };
                    return dayMap[day.toLowerCase()];
                }).filter(day => day !== undefined);
                
                if (recurringDays.length > 0) {
                    wasRecurringEvent = true;
                }
            }
        }

        // Process recurring event
        if (wasRecurringEvent) {
            const timeMatch = contextSnippet.match(recurringPatterns.time);
            if (timeMatch) {
                console.log('Found time match:', timeMatch); // Debug log
                recurringTime = {
                    startHour: parseInt(timeMatch[1]),
                    startMinute: timeMatch[2] ? parseInt(timeMatch[2]) : 0,
                    startAmPm: timeMatch[3] ? timeMatch[3].toLowerCase() : null,
                    endHour: parseInt(timeMatch[4]),
                    endMinute: timeMatch[5] ? parseInt(timeMatch[5]) : 0,
                    endAmPm: timeMatch[6] ? timeMatch[6].toLowerCase() : null
                };

                // Improved AM/PM handling
                // If end time is PM and start time has no AM/PM specified, assume start time is also PM
                if (recurringTime.endAmPm === 'pm' && !recurringTime.startAmPm) {
                    recurringTime.startAmPm = 'pm';
                }

                // If start time is PM and end time has no AM/PM specified, assume end time is also PM
                if (recurringTime.startAmPm === 'pm' && !recurringTime.endAmPm) {
                    recurringTime.endAmPm = 'pm';
                }

                // Convert start time to 24-hour format
                if (recurringTime.startAmPm === 'pm' && recurringTime.startHour !== 12) {
                    recurringTime.startHour += 12;
                } else if (recurringTime.startAmPm === 'am' && recurringTime.startHour === 12) {
                    recurringTime.startHour = 0;
                }

                // Convert end time to 24-hour format
                if (recurringTime.endAmPm === 'pm' && recurringTime.endHour !== 12) {
                    recurringTime.endHour += 12;
                } else if (recurringTime.endAmPm === 'am' && recurringTime.endHour === 12) {
                    recurringTime.endHour = 0;
                }

                // If no AM/PM specified for either time and hours are less than 7, assume PM
                if (!recurringTime.startAmPm && !recurringTime.endAmPm) {
                    if (recurringTime.startHour < 7) {
                        recurringTime.startHour += 12;
                    }
                    if (recurringTime.endHour < 7) {
                        recurringTime.endHour += 12;
                    }
                }

                console.log('Processed recurring time:', recurringTime); // Debug log

                // Calculate duration in milliseconds
                const duration = ((recurringTime.endHour - recurringTime.startHour) * 60 +
                                (recurringTime.endMinute - recurringTime.startMinute)) * 60 * 1000;

                // Determine event type
                let type = 'Event';
                let details = '';
                
                if (lowerContext.includes('lecture')) {
                    type = 'Lecture';
                } else if (lowerContext.includes('discussion')) {
                    type = 'Discussion';
                } else if (lowerContext.includes('lab')) {
                    type = 'Lab';
                } else if (lowerContext.includes('office hours')) {
                    type = 'Office Hours';
                }

                let summary = className ? `${className} - ` : '';
                summary += type;

                // Add the recurring event to the events array
                events.push({
                    type: type,
                    details: details,
                    summary: summary,
                    contextSnippet: contextSnippet,
                    className: className,
                    isRecurring: true,
                    recurringDays: recurringDays,
                    startTime: {
                        hour: recurringTime.startHour,
                        minute: recurringTime.startMinute
                    },
                    duration: duration,
                    until: calculateSemesterEnd()
                });

                // Mark this line as processed
                processedLines.add(contextSnippet);
            }
        }

        // Only process as a non-recurring event if we haven't already handled it as recurring
        if (!processedLines.has(contextSnippet)) {
            const dates = chrono.parse(line);
            if (dates.length > 0) {
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
                        details = `${hwMatch[1]} ${hwMatch[2]}`;
                        type = `Homework ${hwMatch[2]} Due`;
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
                    } else if (lowerContext.includes('project')) {
                        type = 'Project';
                        const projectPattern = /project\s*(\d+)?/i;
                        let projectMatch = projectPattern.exec(contextSnippet);
                        if (projectMatch && projectMatch[1]) {
                            details = `Project ${projectMatch[1]}`;
                        }
                        matchFound = true;
                    } else if (lowerContext.includes('discussion')) {
                        type = 'Discussion';
                        matchFound = true;
                    } else if (lowerContext.includes('office hours')) {
                        type = 'Office Hours';
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
                            case 'Office Hours':
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
            }
        }
    });

    // Sort events by date, putting recurring events first
    events.sort((a, b) => {
        if (a.isRecurring && !b.isRecurring) return -1;
        if (!a.isRecurring && b.isRecurring) return 1;
        if (a.isRecurring && b.isRecurring) return 0;
        return new Date(a.date) - new Date(b.date);
    });

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
