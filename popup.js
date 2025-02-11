// popup.js

// Replace with your actual Chrome Extension OAuth Client ID.
const CLIENT_ID = '395341068349-s36q8cdunerk75tof73c6rhmdfa248v5.apps.googleusercontent.com';
// Scope for managing Calendar events.
const SCOPES = "https://www.googleapis.com/auth/calendar.events";

let accessToken = null;

// When the popup loads, display the stored events.
document.addEventListener('DOMContentLoaded', () => {
  // Load and display any scraped events
  chrome.storage.local.get('scrapedEvents', (data) => {
    const events = data.scrapedEvents || [];
    const container = document.getElementById('eventsContainer');
    
    if (events.length === 0) {
      container.innerHTML = 'No events found. Make sure you\'re on a page with dates.';
      return;
    }
    
    // Create a more detailed display of events
    container.innerHTML = events.map(event => `
      <div class="event">
        <strong>${event.summary}</strong><br>
        Date: ${new Date(event.date).toLocaleString()}<br>
        ${event.details ? `Details: ${event.details}<br>` : ''}
        Context: ${event.contextSnippet}
      </div>
    `).join('');
  });
});

// Function to initiate the OAuth flow using chrome.identity.launchWebAuthFlow.
function getAccessToken(interactive, callback) {
  chrome.identity.getAuthToken({ 
    interactive: interactive
  }, function(token) {
    if (chrome.runtime.lastError) {
      callback(chrome.runtime.lastError);
      return;
    }
    accessToken = 'Bearer ' + token;
    callback(null, token);
  });
}

// When the user clicks the "Add Events to Google Calendar" button,
// start the OAuth flow.
document.getElementById("addToCalendar").addEventListener("click", () => {
  console.log("Add to Calendar button clicked");
  chrome.storage.local.get('scrapedEvents', (data) => {
    console.log("Retrieved storage data:", data);
    if (!data.scrapedEvents || data.scrapedEvents.length === 0) {
      console.log("No events found in storage");
      alert('No events found to add to calendar');
      return;
    }

    getAccessToken(true, (err, token) => {
      if (err) {
        console.error("Error obtaining token:", err);
        alert("Error obtaining token: " + err.message);
      } else {
        console.log("Access token acquired, proceeding to add events");
        addEventsToCalendar(data.scrapedEvents);
      }
    });
  });
});

// Use the access token to create events in the user's primary calendar.
function addEventsToCalendar(events) {
    let successCount = 0;
    let failCount = 0;

    // Group events by class name
    const eventsByClass = {};
    events.forEach(event => {
        const className = event.className || 'Other Events';
        if (!eventsByClass[className]) {
            eventsByClass[className] = [];
        }
        eventsByClass[className].push(event);
    });

    // Process each class's events
    Object.entries(eventsByClass).forEach(([className, classEvents]) => {
        // First, create or find the calendar for this class
        createOrFindCalendar(className)
            .then(calendarId => {
                // Then add all events for this class to the calendar
                classEvents.forEach(event => {
                    let calendarEvent = {
                        summary: event.summary,
                        description: `Type: ${event.type}\n` +
                                   `${event.details ? `Details: ${event.details}\n` : ''}` +
                                   `Course: ${event.className || 'N/A'}\n\n` +
                                   `Context from syllabus:\n${event.contextSnippet}`,
                        colorId: getEventColorId(event.type)
                    };

                    if (event.isRecurring) {
                        // Handle recurring event
                        calendarEvent = {
                            ...calendarEvent,
                            start: {
                                dateTime: getNextOccurrence(event.recurringDays, event.startTime).toISOString(),
                                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
                            },
                            end: {
                                dateTime: new Date(getNextOccurrence(event.recurringDays, event.startTime).getTime() + event.duration).toISOString(),
                                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
                            },
                            recurrence: [
                                `RRULE:FREQ=WEEKLY;BYDAY=${getDayAbbreviations(event.recurringDays)};UNTIL=${event.until.replace(/-/g, '')}`
                            ]
                        };
                    } else if (event.isAllDay) {
                        // Handle all-day event
                        const eventDate = new Date(event.date);
                        calendarEvent.start = {
                            date: eventDate.toISOString().split('T')[0]
                        };
                        calendarEvent.end = {
                            date: new Date(eventDate.getTime() + 24*60*60*1000).toISOString().split('T')[0]
                        };
                    } else {
                        // Handle regular event
                        const startDate = new Date(event.date);
                        calendarEvent.start = {
                            dateTime: startDate.toISOString()
                        };
                        calendarEvent.end = {
                            dateTime: new Date(startDate.getTime() + (event.duration || 3600000)).toISOString()
                        };
                    }

                    // Create the event in the specific calendar
                    fetch(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`, {
                        method: "POST",
                        headers: {
                            "Authorization": accessToken,
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify(calendarEvent)
                    })
                    .then(response => {
                        if (!response.ok) {
                            throw new Error(`HTTP error! status: ${response.status}`);
                        }
                        return response.json();
                    })
                    .then(data => {
                        console.log("Event created successfully:", data);
                        successCount++;
                        if (successCount + failCount === events.length) {
                            alert(`Successfully created ${successCount} events. Failed: ${failCount}`);
                        }
                    })
                    .catch(error => {
                        console.error("Error creating event:", error);
                        failCount++;
                        if (successCount + failCount === events.length) {
                            alert(`Successfully created ${successCount} events. Failed: ${failCount}`);
                        }
                    });
                });
            })
            .catch(error => {
                console.error("Error with calendar creation/lookup:", error);
                failCount += classEvents.length;
            });
    });
}

// Function to create or find a calendar for a class
async function createOrFindCalendar(className) {
    // First, try to find if the calendar already exists
    const response = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
        headers: {
            'Authorization': accessToken
        }
    });
    const data = await response.json();
    
    // Look for existing calendar with this class name
    const existingCalendar = data.items?.find(cal => cal.summary === className);
    if (existingCalendar) {
        return existingCalendar.id;
    }

    // If calendar doesn't exist, create it
    const createResponse = await fetch('https://www.googleapis.com/calendar/v3/calendars', {
        method: 'POST',
        headers: {
            'Authorization': accessToken,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            summary: className,
            description: `Calendar for ${className} events`,
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        })
    });

    if (!createResponse.ok) {
        throw new Error('Failed to create calendar');
    }

    const newCalendar = await createResponse.json();
    return newCalendar.id;
}

// Helper function to assign color IDs based on event type
function getEventColorId(eventType) {
  // Google Calendar color IDs (1-11)
  const colorMap = {
    'Assignment': '5',  // Yellow
    'Exam': '11',      // Red
    'Lecture': '9',    // Blue
    'Lab': '2',        // Green
    'Event': '1'       // Default (Lavender)
  };
  
  return colorMap[eventType] || '1';
}

// Helper function to get the next occurrence of a recurring event
function getNextOccurrence(days, time) {
  const now = new Date();
  const currentDay = now.getDay();
  
  // Find the next day that matches one of our recurring days
  let nextDay = days.find(day => day > currentDay);
  if (!nextDay) {
    nextDay = days[0]; // If no days left this week, use first day of next week
  }
  
  const daysToAdd = (nextDay - currentDay + 7) % 7;
  const nextDate = new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
  nextDate.setHours(time.hour, time.minute, 0, 0);
  
  return nextDate;
}

// Helper function to convert day numbers to RRULE day abbreviations
function getDayAbbreviations(days) {
  const dayMap = {
    1: 'MO',
    2: 'TU',
    3: 'WE',
    4: 'TH',
    5: 'FR'
  };
  return days.map(day => dayMap[day]).join(',');
}

// Optional: Add CSS to style the events in the popup
const style = document.createElement('style');
style.textContent = `
    .event {
        margin: 10px 0;
        padding: 10px;
        border: 1px solid #ccc;
        border-radius: 4px;
        background-color: #f9f9f9;
    }
    .event strong {
        color: #333;
    }
`;
document.head.appendChild(style);
