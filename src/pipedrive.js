// src/pipedrive.js - Pipedrive API Client
const axios = require('axios');
const { log } = require('./utils');

const PIPEDRIVE_API_TOKEN = process.env.PIPEDRIVE_API_TOKEN;
const PIPEDRIVE_DOMAIN = process.env.PIPEDRIVE_DOMAIN || 'api.pipedrive.com';
const PIPELINE_ID = 2; // Optional: Default pipeline
const STAGE_ID = 10; // Optional: Default stage

// Validate API token is present
if (!PIPEDRIVE_API_TOKEN) {
  log('error', '❌ PIPEDRIVE_API_TOKEN is not set!');
  log('error', '💡 Set it in Railway: Settings → Variables → Add PIPEDRIVE_API_TOKEN');
} else {
  // Log token status (first 8 chars only for security)
  const tokenPreview = PIPEDRIVE_API_TOKEN.substring(0, 8) + '...';
  log('info', `🔑 Pipedrive API token loaded (${tokenPreview})`);
}

// Base API client
const api = axios.create({
  baseURL: `https://${PIPEDRIVE_DOMAIN}/v1`,
  params: {
    api_token: PIPEDRIVE_API_TOKEN
  },
  timeout: 10000
});

/**
 * Search for person by phone number
 */
async function searchPersonByPhone(phone) {
  try {
    const cleanPhone = phone.replace(/\s/g, ''); // Remove spaces
    
    const response = await api.get('/persons/search', {
      params: {
        term: cleanPhone,
        fields: 'phone',
        exact_match: false
      }
    });
    
    if (response.data?.data?.items?.length > 0) {
      const person = response.data.data.items[0].item;
      log('info', `🔍 Person found: ${person.name} (ID: ${person.id})`);
      return person;
    }
    
    log('info', `🔍 No person found for phone: ${phone}`);
    return null;
    
  } catch (error) {
    if (error.response?.status === 401) {
      log('error', '❌ Person search failed - Authentication error (401)');
      log('error', '💡 Check that PIPEDRIVE_API_TOKEN is correct in Railway environment variables');
      log('error', '💡 Get your token from: https://app.pipedrive.com/settings/api');
    } else {
      log('error', '❌ Person search failed', { error: error.message });
    }
    throw error;
  }
}

/**
 * Create new person in Pipedrive
 */
async function createPerson({ phone, firstName, lastName, email, company }) {
  try {
    const name = [firstName, lastName].filter(Boolean).join(' ') || 'Unbekannt';
    
    const personData = {
      name: name,
      phone: [{ value: phone, primary: true, label: 'work' }],
      visible_to: 3 // Visible to entire company
    };
    
    // Add email if provided
    if (email) {
      personData.email = [{ value: email, primary: true, label: 'work' }];
    }
    
    // Add organization if company name provided
    if (company) {
      personData.org_name = company;
    }
    
    const response = await api.post('/persons', personData);
    
    if (response.data?.success && response.data?.data) {
      const person = response.data.data;
      log('success', `✅ Person created: ${person.name} (ID: ${person.id})`);
      return person;
    }
    
    throw new Error('Failed to create person');
    
  } catch (error) {
    log('error', '❌ Person creation failed', { error: error.message });
    throw error;
  }
}

/**
 * Find existing person or create new one
 */
async function findOrCreatePerson({ phone, firstName, lastName, email, company }) {
  try {
    // Try to find existing person
    const existingPerson = await searchPersonByPhone(phone);
    
    if (existingPerson) {
      return existingPerson;
    }
    
    // Create new person if not found
    return await createPerson({ phone, firstName, lastName, email, company });
    
  } catch (error) {
    log('error', '❌ findOrCreatePerson failed', { error: error.message });
    throw error;
  }
}

/**
 * Create deal in Pipedrive
 */
async function createDeal({ title, personId, value = 0, currency = 'EUR', pipelineId, stageId }) {
  try {
    const dealData = {
      title: title,
      person_id: personId,
      value: value,
      currency: currency,
      status: 'open',
      visible_to: 3 // Visible to entire company
    };
    
    // Use provided or default pipeline/stage
    if (pipelineId || PIPELINE_ID) {
      dealData.pipeline_id = parseInt(pipelineId || PIPELINE_ID);
    }
    
    if (stageId || STAGE_ID) {
      dealData.stage_id = parseInt(stageId || STAGE_ID);
    }
    
    const response = await api.post('/deals', dealData);
    
    if (response.data?.success && response.data?.data) {
      const deal = response.data.data;
      log('success', `✅ Deal created: ${deal.title} (ID: ${deal.id})`);
      return deal;
    }
    
    throw new Error('Failed to create deal');
    
  } catch (error) {
    log('error', '❌ Deal creation failed', { error: error.message });
    throw error;
  }
}

/**
 * Create activity/note in Pipedrive
 */
async function createActivity({ subject, type = 'task', personId, dealId, note, done = false }) {
  try {
    const activityData = {
      subject: subject,
      type: type,
      done: done ? 1 : 0,
      note: note
    };
    
    if (personId) activityData.person_id = personId;
    if (dealId) activityData.deal_id = dealId;
    
    const response = await api.post('/activities', activityData);
    
    if (response.data?.success && response.data?.data) {
      const activity = response.data.data;
      log('success', `✅ Activity created: ${activity.subject} (ID: ${activity.id})`);
      return activity;
    }
    
    throw new Error('Failed to create activity');
    
  } catch (error) {
    log('error', '❌ Activity creation failed', { error: error.message });
    throw error;
  }
}

/**
 * Get deal by ID
 */
async function getDeal(dealId) {
  try {
    const response = await api.get(`/deals/${dealId}`);
    
    if (response.data?.success && response.data?.data) {
      return response.data.data;
    }
    
    return null;
    
  } catch (error) {
    log('error', '❌ Get deal failed', { error: error.message });
    return null;
  }
}

module.exports = {
  searchPersonByPhone,
  createPerson,
  findOrCreatePerson,
  createDeal,
  createActivity,
  getDeal
};
