// src/utils.js - Utility Functions

/**
 * Enhanced logging with timestamps and colors
 */
function log(level, message, data = {}) {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}]`;
  
  // Format based on level
  let coloredMessage;
  switch (level) {
    case 'error':
      coloredMessage = `${prefix} ❌ ${message}`;
      break;
    case 'warn':
      coloredMessage = `${prefix} ⚠️  ${message}`;
      break;
    case 'success':
      coloredMessage = `${prefix} ✅ ${message}`;
      break;
    case 'info':
    default:
      coloredMessage = `${prefix} ℹ️  ${message}`;
  }
  
  console.log(coloredMessage);
  
  // Log data if present
  if (Object.keys(data).length > 0) {
    console.log('  Data:', JSON.stringify(data, null, 2));
  }
  
  // In production, you could also send to external logging service here
  // e.g., Sentry, LogDNA, Datadog, etc.
}

/**
 * Format phone number (basic cleanup)
 */
function formatPhone(phone) {
  if (!phone) return '';
  return phone.replace(/\s+/g, '').replace(/[^\d+]/g, '');
}

/**
 * Validate required environment variables
 */
function validateEnv() {
  const required = [
    'PIPEDRIVE_API_TOKEN'
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

/**
 * Sleep/delay function
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  log,
  formatPhone,
  validateEnv,
  sleep
};
