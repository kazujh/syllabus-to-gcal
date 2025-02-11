const path = require('path');

module.exports = {
  mode: 'production', // Use 'development' for debugging
  entry: './bundle.js',
  output: {
    filename: 'chrono.bundle.js',
    path: path.resolve(__dirname, 'libs'),
    // Omitting library and libraryTarget settings for a plain bundle.
  },
  target: 'web',
};
