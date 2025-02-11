// bundle.js
import * as chronoModule from 'chrono-node';
console.log('Raw imported chronoModule keys:', Object.keys(chronoModule));

// Attach the entire module to the global object
window.chrono = chronoModule;
console.log('chrono attached to window:', window.chrono);
