'use strict';

/**
 * Logger sederhana dengan timestamp dan level.
 */

function timestamp() {
  return new Date().toISOString();
}

function info(message, ...args) {
  console.log(`[${timestamp()}] [INFO] ${message}`, ...args);
}

function warn(message, ...args) {
  console.warn(`[${timestamp()}] [WARN] ${message}`, ...args);
}

function err(message, ...args) {
  console.error(`[${timestamp()}] [ERROR] ${message}`, ...args);
}

function debug(message, ...args) {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[${timestamp()}] [DEBUG] ${message}`, ...args);
  }
}

module.exports = { info, warn, error: err, debug };
