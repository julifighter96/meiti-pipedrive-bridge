// src/meiti.js - Meiti Callback Client
const axios = require('axios');
const { log } = require('./utils');

/**
 * Send callback to Meiti with updated contact/project data
 */
async function sendCallback(callbackUrl, data) {
  try {
    if (!callbackUrl) {
      log('warn', '⚠️  No callback URL provided, skipping callback');
      return null;
    }
    
    log('info', `📤 Sending callback to Meiti`, {
      url: callbackUrl.substring(0, 50) + '...',
      hasContactUpdate: data.requestContactUpdate,
      hasProjectUpdate: data.requestProjectUpdate
    });
    
    const response = await axios.post(callbackUrl, data, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 5000 // 5 second timeout
    });
    
    if (response.status === 200) {
      log('success', `✅ Callback successful`, {
        status: response.status,
        response: response.data
      });
      return response.data;
    }
    
    log('warn', `⚠️  Unexpected callback response`, {
      status: response.status
    });
    
    return response.data;
    
  } catch (error) {
    // Check if it's a timeout or network error
    if (error.code === 'ECONNABORTED') {
      log('error', '❌ Callback timeout (>5s)', {
        url: callbackUrl.substring(0, 50) + '...'
      });
    } else if (error.response) {
      log('error', '❌ Callback failed with HTTP error', {
        status: error.response.status,
        data: error.response.data
      });
    } else {
      log('error', '❌ Callback failed', {
        error: error.message
      });
    }
    
    // Don't throw - we don't want to fail the whole process if callback fails
    // Meiti already has the webhook, they just don't get the update
    return null;
  }
}

module.exports = {
  sendCallback
};
