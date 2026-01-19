# Meiti-Pipedrive Bridge 🌉

Super simple bridge between Meiti webhooks and Pipedrive CRM.

## 🎯 Features

- ✅ **All 5 Meiti Event Types supported:**
  - IncomingCallLookup (0) - Find/create contact immediately
  - FinishedCall (1) - Create deal + activity after call
  - NewConversation (2) - Create deal for new chat
  - ConversationPaused (3) - Log pause activity
  - Manual (4) - Full sync on demand

- ✅ **Smart Pipedrive Integration:**
  - Automatic person search/create (no duplicates)
  - Deal creation with custom pipeline/stage
  - Activity logging for each event
  - Callback to Meiti with IDs

- ✅ **Production Ready:**
  - 202 Accepted async processing
  - Error handling & logging
  - Health checks
  - Docker support
  - Railway/Heroku/Fly.io ready

---

## 🚀 Quick Start

### **1. Get Pipedrive API Token**

1. Go to: https://app.pipedrive.com/settings/api
2. Copy your API token
3. Save it for later

### **2. Deploy to Railway (easiest)**ss

**Option A: One-Click Deploy**

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template)

**Option B: Manual Deploy**

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Create new project
railway init

# Set environment variables
railway variables set PIPEDRIVE_API_TOKEN=your_token_here
railway variables set APP_URL=$(railway domain)

# Deploy
railway up
```

### **3. Configure Meiti**

1. Go to Meiti App: **Einstellungen** → **Betrieb** → **CRM Synchronisation**
2. **URL:** Your Railway URL + `/webhook/meiti`
   ```
   https://your-app.railway.app/webhook/meiti
   ```
3. **Bearer Token:** (any value, e.g. "meiti-2026")
4. **Save**

### **4. Test**

1. In Meiti: Open any project
2. Click **Webhook Trigger** button
3. Check Railway logs
4. Check Pipedrive for new person/deal

---

## 📦 Local Development

### **Setup**

```bash
# Clone/download the project
cd meiti-pipedrive-bridge

# Install dependencies
npm install

# Copy env file
cp .env.example .env

# Edit .env and add your Pipedrive token
nano .env
```

### **Run**

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

### **Test with ngrok**

```bash
# Install ngrok
npm install -g ngrok

# Start tunnel
ngrok http 3000

# Use ngrok URL in Meiti
https://abc123.ngrok.io/webhook/meiti
```

---

## ⚙️ Configuration

### **Required Environment Variables**

```bash
PIPEDRIVE_API_TOKEN=your_api_token  # Required
```

### **Optional Environment Variables**

```bash
# Server
PORT=3000
NODE_ENV=production
APP_URL=https://your-app.railway.app

# Pipedrive
PIPEDRIVE_DOMAIN=api.pipedrive.com  # Default
PIPELINE_ID=1                        # Default pipeline ID
STAGE_ID=1                           # Default stage ID
```

### **Finding Pipeline & Stage IDs**

1. Go to Pipedrive: **Settings** → **Pipelines**
2. Click on your pipeline
3. Hover over a stage → URL shows stage ID
   ```
   https://app.pipedrive.com/pipeline/1/stage/3
                              ^ PIPELINE  ^ STAGE
   ```

---

## 🎛️ Event Type Behaviors

### **Event 0: IncomingCallLookup**
```
Trigger: Call comes in
Action:  Find/create person in Pipedrive
Response: Send person ID back to Meiti immediately
```

### **Event 1: FinishedCall**
```
Trigger: Call ended
Action:  Create person + deal + call activity
Response: Send person ID + deal ID back
```

### **Event 2: NewConversation**
```
Trigger: Chat starts after 1h+ pause
Action:  Create deal (if not exists) + activity
Response: Send IDs back
```

### **Event 3: ConversationPaused**
```
Trigger: 10 min of inactivity
Action:  Log pause activity on existing deal
Response: None (just logging)
```

### **Event 4: Manual**
```
Trigger: Manual button in Meiti app
Action:  Full sync - person + deal + activity
Response: Send complete data back
```

---

## 📊 Webhook Flow

```
┌─────────┐
│  Meiti  │
└────┬────┘
     │ POST /webhook/meiti
     ↓
┌──────────────────┐
│  Your App        │
│  (This bridge)   │
├──────────────────┤
│                  │
│  1. Respond 202  │ ← Immediate
│     Accepted     │
│                  │
│  2. Process:     │ ← Async
│     ├─ Parse     │
│     ├─ Pipedrive │
│     └─ Callback  │
│                  │
└────┬─────────────┘
     │ GET/POST to Pipedrive API
     ↓
┌──────────────┐
│  Pipedrive   │
│  ├─ Person   │
│  ├─ Deal     │
│  └─ Activity │
└──────────────┘
     │
     ↓ (IDs)
┌──────────────────┐
│  Your App        │
│  POST to         │
│  callbackUrl     │
└────┬─────────────┘
     │
     ↓
┌─────────┐
│  Meiti  │ ← Receives IDs
└─────────┘
```

---

## 🐛 Debugging

### **Check Logs**

**Railway:**
```bash
railway logs
```

**Local:**
```bash
# Logs appear in console
```

### **Test Health Endpoint**

```bash
curl https://your-app.railway.app/health
```

Should return:
```json
{"status":"healthy"}
```

### **Common Issues**

**Problem: "Missing required environment variables"**
```bash
# Make sure PIPEDRIVE_API_TOKEN is set
railway variables
```

**Problem: "Person not found"**
```bash
# Check if phone number format matches Pipedrive
# Try searching manually in Pipedrive with same number
```

**Problem: "Deal creation failed"**
```bash
# Check if PIPELINE_ID and STAGE_ID are valid
# Or remove them to use Pipedrive defaults
```

**Problem: "Callback timeout"**
```bash
# Meiti callback URLs are only valid for 5 minutes
# Check if your workflow completes within 5 min
```

---

## 🔒 Security

### **Best Practices**

1. **Use HTTPS only** (Railway provides this automatically)
2. **Keep API token secret** (never commit .env to git)
3. **Use environment variables** (not hardcoded)
4. **Monitor logs** for suspicious activity

### **Optional: Add Bearer Token Validation**

Edit `server.js` and add:

```javascript
app.post('/webhook/meiti', async (req, res) => {
  // Validate bearer token
  const authHeader = req.headers.authorization;
  const expectedToken = process.env.MEITI_BEARER_TOKEN;
  
  if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // ... rest of code
});
```

Then set in Railway:
```bash
railway variables set MEITI_BEARER_TOKEN=your-secret-token
```

---

## 📈 Monitoring

### **Railway Dashboard**

- CPU/Memory usage
- Request metrics
- Error logs
- Deployments

### **Optional: External Monitoring**

**Sentry (Error Tracking):**
```bash
npm install @sentry/node
```

**Datadog (APM):**
```bash
npm install dd-trace
```

---

## 🎨 Customization

### **Change Deal Title Format**

Edit `src/webhooks.js`:

```javascript
// Example: Add date to title
const deal = await createDeal({
  title: `${projectData.projectName} - ${new Date().toLocaleDateString('de-DE')}`,
  personId: person.id
});
```

### **Add Custom Fields**

Edit `src/pipedrive.js` in `createPerson()`:

```javascript
const personData = {
  name: name,
  phone: [{ value: phone, primary: true }],
  // Add custom fields (find IDs in Pipedrive settings)
  '12345abcdef': 'Custom value', // Replace with your field ID
  'a1b2c3d4e5': contactData.meitiContactId // Store Meiti ID
};
```

### **Change Activity Types**

Edit `src/webhooks.js`:

```javascript
// Options: call, meeting, task, deadline, email, lunch
await createActivity({
  type: 'meeting', // Change from 'call'
  // ...
});
```

---

## 📦 Alternative Deployments

### **Heroku**

```bash
heroku create your-app-name
heroku config:set PIPEDRIVE_API_TOKEN=your_token
git push heroku main
```

### **Fly.io**

```bash
fly launch
fly secrets set PIPEDRIVE_API_TOKEN=your_token
fly deploy
```

### **Docker**

```bash
docker build -t meiti-bridge .
docker run -p 3000:3000 \
  -e PIPEDRIVE_API_TOKEN=your_token \
  meiti-bridge
```

---

## 🧪 Testing

### **Unit Tests (optional to add)**

```bash
npm install --save-dev jest supertest
npm test
```

### **Manual Testing**

```bash
# Send test webhook
curl -X POST http://localhost:3000/webhook/meiti \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": 0,
    "timestampUtc": "2026-01-09T12:00:00Z",
    "callbackUrl": "https://example.com/callback",
    "contactData": {
      "meitiContactId": 12345,
      "phoneNumber": "+4972112345678",
      "firstName": "Max",
      "lastName": "Mustermann",
      "email": "max@example.com",
      "company": "Example GmbH"
    },
    "projectData": {
      "meitiProjectId": 67890,
      "projectName": "Test Projekt"
    }
  }'
```

---

## 💰 Costs

**Railway:**
- Free: $5 credit/month (enough for ~300-500 webhooks/month)
- Hobby: $5/month (unlimited webhooks)
- Pro: $20/month (more resources)

**Alternatives:**
- Heroku: $7/month (Eco plan)
- Fly.io: $5-10/month
- DigitalOcean: $5/month (Droplet)

---

## 📞 Support

**Issues?**
- Check logs: `railway logs`
- Test health: `curl https://your-app/health`
- Review Pipedrive API logs: https://app.pipedrive.com/settings/api

**Pipedrive API Docs:**
https://developers.pipedrive.com/docs/api/v1

**Meiti Webhook Docs:**
https://meiti.app/docs/webhook

---

## 📝 License

MIT License - Feel free to use and modify!

---

## 🎯 Next Steps

After setup:

1. ✅ Test all 5 event types
2. ✅ Customize deal titles/activities
3. ✅ Set up monitoring
4. ✅ Add custom fields if needed
5. ✅ Scale as needed

**Enjoy your automated CRM workflow!** 🎉
