// src/webhooks.js - Meiti Webhook Handler
const { findOrCreatePerson, createDeal, createActivity } = require('./pipedrive');
const { sendCallback } = require('./meiti');
const { log } = require('./utils');

// Event Type Mapping
const EVENT_TYPES = {
  0: 'IncomingCallLookup',
  1: 'FinishedCall',
  2: 'NewConversation',
  3: 'ConversationPaused',
  4: 'Manual'
};

/**
 * Main webhook handler - dispatches to specific event handlers
 */
async function handleMeitiWebhook(payload) {
  const eventType = EVENT_TYPES[payload.eventType] || 'Unknown';
  
  log('info', `📋 Processing event: ${eventType}`, {
    eventTypeId: payload.eventType,
    contactId: payload.contactData?.meitiContactId,
    projectId: payload.projectData?.meitiProjectId
  });
  
  // Dispatch to specific handler based on event type
  switch (payload.eventType) {
    case 0: // IncomingCallLookup
      await handleIncomingCall(payload);
      break;
      
    case 1: // FinishedCall
      await handleFinishedCall(payload);
      break;
      
    case 2: // NewConversation
      await handleNewConversation(payload);
      break;
      
    case 3: // ConversationPaused
      await handleConversationPaused(payload);
      break;
      
    case 4: // Manual
      await handleManualTrigger(payload);
      break;
      
    default:
      log('warn', `⚠️  Unknown event type: ${payload.eventType}`);
  }
}

/**
 * Event Type 0: Incoming Call Lookup
 * Action: Find/Create Person, Send IDs back immediately
 */
async function handleIncomingCall(payload) {
  try {
    const { contactData, callbackUrl } = payload;
    
    // Find or create person in Pipedrive
    const person = await findOrCreatePerson({
      phone: contactData.phoneNumber,
      firstName: contactData.firstName,
      lastName: contactData.lastName,
      email: contactData.email,
      company: contactData.company
    });
    
    log('info', `👤 Person ready: ${person.name} (ID: ${person.id})`);
    
    // Send person ID back to Meiti immediately
    if (callbackUrl) {
      await sendCallback(callbackUrl, {
        requestContactUpdate: true,
        contactData: {
          crmContactId: String(person.id),
          crmAiInfo: `Pipedrive Kontakt gefunden/erstellt. Person ID: ${person.id}`
        }
      });
    }
    
  } catch (error) {
    log('error', '❌ IncomingCall handler failed', { error: error.message });
    throw error;
  }
}

/**
 * Event Type 1: Finished Call
 * Action: Create Deal + Activity
 */
async function handleFinishedCall(payload) {
  try {
    const { contactData, projectData, callbackUrl } = payload;
    
    // Find or create person
    const person = await findOrCreatePerson({
      phone: contactData.phoneNumber,
      firstName: contactData.firstName,
      lastName: contactData.lastName,
      email: contactData.email,
      company: contactData.company
    });
    
    log('info', `👤 Person: ${person.name} (ID: ${person.id})`);
    
    // Create deal
    const deal = await createDeal({
      title: projectData.projectName || `Anruf beendet - ${contactData.phoneNumber}`,
      personId: person.id,
      value: 0,
      currency: 'EUR'
    });
    
    log('info', `💼 Deal created: ${deal.title} (ID: ${deal.id})`);
    
    // Create activity to log the call
    await createActivity({
      subject: 'Anruf über Meiti beendet',
      type: 'call',
      done: true,
      personId: person.id,
      dealId: deal.id,
      note: `Anruf über Meiti beendet.\nTelefon: ${contactData.phoneNumber}\nDatum: ${payload.timestampUtc}`
    });
    
    log('info', `📝 Activity logged for call`);
    
    // Send IDs back to Meiti
    if (callbackUrl) {
      await sendCallback(callbackUrl, {
        requestContactUpdate: true,
        contactData: {
          crmContactId: String(person.id)
        },
        requestProjectUpdate: true,
        projectData: {
          crmProjectId: String(deal.id),
          crmAiInfo: `Deal erstellt nach Anruf. Deal ID: ${deal.id}`
        }
      });
    }
    
  } catch (error) {
    log('error', '❌ FinishedCall handler failed', { error: error.message });
    throw error;
  }
}

/**
 * Event Type 2: New Conversation
 * Action: Create Deal (if not exists) + Activity
 */
async function handleNewConversation(payload) {
  try {
    const { contactData, projectData, callbackUrl } = payload;
    
    // Check if we already have a deal (via crmProjectId)
    if (projectData.crmProjectId) {
      log('info', `💼 Deal already exists: ${projectData.crmProjectId}`);
      
      // Just log activity
      await createActivity({
        subject: 'Neue Konversation über Meiti gestartet',
        type: 'task',
        dealId: parseInt(projectData.crmProjectId),
        note: `Kunde hat Chat nach >1h Pause wieder aufgenommen.\nDatum: ${payload.timestampUtc}`
      });
      
      return;
    }
    
    // No existing deal - create new one
    const person = await findOrCreatePerson({
      phone: contactData.phoneNumber,
      firstName: contactData.firstName,
      lastName: contactData.lastName,
      email: contactData.email,
      company: contactData.company
    });
    
    const deal = await createDeal({
      title: projectData.projectName || `Chat Anfrage - ${contactData.phoneNumber}`,
      personId: person.id,
      value: 0,
      currency: 'EUR'
    });
    
    log('info', `💼 New deal for conversation: ${deal.title} (ID: ${deal.id})`);
    
    // Send IDs back
    if (callbackUrl) {
      await sendCallback(callbackUrl, {
        requestContactUpdate: true,
        contactData: {
          crmContactId: String(person.id)
        },
        requestProjectUpdate: true,
        projectData: {
          crmProjectId: String(deal.id),
          crmAiInfo: `Deal für Chat-Konversation erstellt. Deal ID: ${deal.id}`
        }
      });
    }
    
  } catch (error) {
    log('error', '❌ NewConversation handler failed', { error: error.message });
    throw error;
  }
}

/**
 * Event Type 3: Conversation Paused
 * Action: Update Activity / Add Note
 */
async function handleConversationPaused(payload) {
  try {
    const { projectData } = payload;
    
    // If we have a deal, add activity
    if (projectData.crmProjectId) {
      await createActivity({
        subject: 'Chat Konversation pausiert (10+ Min Inaktivität)',
        type: 'task',
        dealId: parseInt(projectData.crmProjectId),
        note: `Konversation pausiert nach 10 Minuten Inaktivität.\nZusammenfassung: ${projectData.currentSummary || 'Keine Zusammenfassung verfügbar'}\nDatum: ${payload.timestampUtc}`
      });
      
      log('info', `📝 Pause activity logged for deal ${projectData.crmProjectId}`);
    } else {
      log('warn', `⚠️  No deal ID to log pause activity`);
    }
    
  } catch (error) {
    log('error', '❌ ConversationPaused handler failed', { error: error.message });
    throw error;
  }
}

/**
 * Event Type 4: Manual Trigger
 * Action: Full sync - Create Person + Deal + Send IDs
 */
async function handleManualTrigger(payload) {
  try {
    const { contactData, projectData, callbackUrl } = payload;
    
    // Full processing like IncomingCall + FinishedCall combined
    const person = await findOrCreatePerson({
      phone: contactData.phoneNumber,
      firstName: contactData.firstName,
      lastName: contactData.lastName,
      email: contactData.email,
      company: contactData.company
    });
    
    log('info', `👤 Person: ${person.name} (ID: ${person.id})`);
    
    // Create deal if we don't have one
    let dealId = projectData.crmProjectId;
    
    if (!dealId) {
      const deal = await createDeal({
        title: projectData.projectName || `Manueller Trigger - ${contactData.phoneNumber}`,
        personId: person.id,
        value: 0,
        currency: 'EUR'
      });
      
      dealId = deal.id;
      log('info', `💼 Deal created: ${deal.title} (ID: ${deal.id})`);
    } else {
      log('info', `💼 Using existing deal: ${dealId}`);
    }
    
    // Log manual trigger activity
    await createActivity({
      subject: 'Manueller Meiti Webhook Trigger',
      type: 'task',
      personId: person.id,
      dealId: parseInt(dealId),
      note: `Manuell über Meiti App getriggert.\nZusammenfassung: ${projectData.currentSummary || 'Keine Zusammenfassung'}\nDatum: ${payload.timestampUtc}`
    });
    
    // Send full update back
    if (callbackUrl) {
      await sendCallback(callbackUrl, {
        requestContactUpdate: true,
        contactData: {
          crmContactId: String(person.id),
          firstName: contactData.firstName || person.first_name,
          lastName: contactData.lastName || person.last_name,
          email: contactData.email || person.email?.[0]?.value,
          crmAiInfo: `Vollständiger Sync über manuellen Trigger. Person ID: ${person.id}`
        },
        requestProjectUpdate: true,
        projectData: {
          crmProjectId: String(dealId),
          crmAiInfo: `Deal synchronisiert. Deal ID: ${dealId}`
        }
      });
    }
    
  } catch (error) {
    log('error', '❌ ManualTrigger handler failed', { error: error.message });
    throw error;
  }
}

module.exports = {
  handleMeitiWebhook
};
