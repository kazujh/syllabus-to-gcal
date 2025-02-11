// popup.js

// Global variables for Google API
const CLIENT_ID = 'aomiinalljmameigojblanjihcenaigb.apps.googleusercontent.com';
const API_KEY = 'AIzaSyAtFrvCCHGs8q_fHaYSCb2L3nQSyXAxPzc';
const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest"];
const SCOPES = "https://www.googleapis.com/auth/calendar.events";

// Retrieve and display events when the popup opens
document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.local.get('scrapedEvents', (data) => {
    const events = data.scrapedEvents || [];
    const container = document.getElementById('eventsContainer');
    if (events.length === 0) {
      container.innerHTML = "<p>No events found.</p>";
      return;
    }
    container.innerHTML = "";
    events.forEach((event) => {
      const div = document.createElement('div');
      div.className = "event";
      div.innerHTML = `<strong>${event.type}</strong>: ${event.originalText}<br><em>${new Date(event.date).toLocaleString()}</em>`;
      container.appendChild(div);
    });
  });
});

// When user clicks the button, start Google API authentication
document.getElementById("addToCalendar").addEventListener("click", () => {
  if (typeof gapi === 'undefined') {
    console.error("gapi is not loaded. Please ensure gapi.js is included in your popup.html.");
    return;
  }
  gapi.load('client:auth2', initClient);
});

function initClient() {
  gapi.client.init({
    apiKey: API_KEY,
    clientId: CLIENT_ID,
    discoveryDocs: DISCOVERY_DOCS,
    scope: SCOPES
  }).then(() => {
    // Check if already signed in.
    if (!gapi.auth2.getAuthInstance().isSignedIn.get()) {
      return gapi.auth2.getAuthInstance().signIn();
    }
  }).then(() => {
    addEventsToCalendar();
  }).catch(error => {
    console.error("Error during authentication", error);
  });
}

function addEventsToCalendar() {
  // Retrieve events from storage.
  chrome.storage.local.get('scrapedEvents', (data) => {
    const events = data.scrapedEvents || [];
    events.forEach(event => {
      // Create a basic event object.
      const calendarEvent = {
        'summary': event.type,
        'description': event.contextSnippet,
        'start': {
          'dateTime': new Date(event.date).toISOString()
        },
        // For simplicity, set the end time to one hour later.
        'end': {
          'dateTime': new Date(new Date(event.date).getTime() + 3600000).toISOString()
        }
      };

      // Insert the event into the user's primary calendar.
      gapi.client.calendar.events.insert({
        'calendarId': 'primary',
        'resource': calendarEvent
      }).then(response => {
        console.log('Event created: ', response.result.htmlLink);
      }).catch(error => {
        console.error("Error creating event", error);
      });
    });
  });
}
