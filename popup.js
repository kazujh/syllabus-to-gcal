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
  console.log('Starting to create events:', events);
  
  if (!events || events.length === 0) {
    console.log('No events provided to addEventsToCalendar');
    alert('No events found to add to calendar');
    return;
  }

  let successCount = 0;
  let failCount = 0;

  events.forEach(event => {
    // Create a more detailed calendar event
    const calendarEvent = {
      summary: event.summary,
      description: `Type: ${event.type}\n` +
                  `${event.details ? `Details: ${event.details}\n` : ''}` +
                  `Course: ${event.courseName || 'N/A'}\n\n` +
                  `Context from syllabus:\n${event.contextSnippet}`,
      start: {
        dateTime: new Date(event.date).toISOString()
      },
      end: {
        dateTime: new Date(new Date(event.date).getTime() + 3600000).toISOString()
      },
      // Add color coding based on event type
      colorId: getEventColorId(event.type)
    };
    
    console.log('Sending calendar event:', calendarEvent);
    
    fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
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
