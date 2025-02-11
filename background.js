// background.js

chrome.runtime.onInstalled.addListener(() => {
    console.log("Syllabus Date Scraper Extension installed.");
  });
  
  // Listen for messages if needed.
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.scrapedEvents) {
      console.log("Received scraped events in background:", message.scrapedEvents);
    }
  });
  