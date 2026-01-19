// server.js - Main Application Entry Point
require('dotenv').config();
const express = require('express');
const { handleMeitiWebhook } = require('./src/webhooks');
const { log } = require('./src/utils');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Meiti-Pipedrive Bridge',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// Main webhook endpoint
app.post('/webhook/meiti', async (req, res) => {
  const startTime = Date.now();
  
  // Immediately respond with 202 Accepted before any processing
  res.status(202).json({ 
    status: 'accepted',
    message: 'Webhook received and processing' 
  });
  
  // Log webhook reception
  try {
    log('info', '📥 Webhook received', {
      ip: req.ip,
      userAgent: req.get('user-agent')
    });
  } catch (logError) {
    // Logging error shouldn't prevent webhook processing
    console.error('Failed to log webhook reception:', logError);
  }
  
  // Process webhook asynchronously
  // This continues AFTER response is sent
  setImmediate(async () => {
    try {
      await handleMeitiWebhook(req.body);
      
      const duration = Date.now() - startTime;
      log('success', '✅ Webhook processed successfully', { 
        duration: `${duration}ms` 
      });
      
    } catch (error) {
      log('error', '❌ Webhook processing failed', {
        error: error.message,
        stack: error.stack
      });
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  log('error', '❌ Server error', {
    error: err.message,
    stack: err.stack
  });
  
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path
  });
});

// Start server
app.listen(PORT, () => {
  log('info', `🚀 Server running on port ${PORT}`);
  log('info', `📍 Webhook URL: ${process.env.APP_URL || 'http://localhost:' + PORT}/webhook/meiti`);
  log('info', `🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  log('info', '⏹️  SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  log('info', '⏹️  SIGINT received, shutting down gracefully');
  process.exit(0);
});
