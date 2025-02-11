// content.js
// content.js
console.log('window.chrono:', window.chrono);
console.log('Type of window.chrono.parse:', typeof window.chrono.parse);

const pageText = document.body.innerText;
const results = window.chrono.parse(pageText);
console.log('Parsed results:', results);

// A simple function to classify the event based on nearby keywords.
function classifyEvent(textSegment) {
  const lower = textSegment.toLowerCase();
  if (lower.includes("lecture")) return "Lecture";
  if (lower.includes("midterm")) return "Midterm Exam";
  if (lower.includes("final")) return "Final Exam";
  if (lower.includes("homework") || lower.includes("assignment")) return "Homework Deadline";
  if (lower.includes("office hours")) return "Office Hours";
  if (lower.includes("lab")) return "Lab Session";
  if (lower.includes("discussion")) return "Discussion";
  return "General Event";
}

// Prepare an array of events.
const events = results.map(result => {
  // The parsed date as a Date object.
  const eventDate = result.start.date();

  // Extract a snippet around the matched text (adjust window as needed).
  const snippetStart = Math.max(0, result.index - 50);
  const snippetEnd = Math.min(pageText.length, result.index + 50);
  const snippet = pageText.substring(snippetStart, snippetEnd);

  return {
    type: classifyEvent(snippet),
    date: eventDate.toISOString(),
    originalText: result.text,
    contextSnippet: snippet
  };sdfsd
});


// Save the extracted events to Chrome's local storage.
chrome.storage.local.set({ scrapedEvents: events }, () => {
  console.log("Scraped events saved:", events);
});

// Optionally, send a message to your popup (if open) about new events.
chrome.runtime.sendMessage({ scrapedEvents: events });
