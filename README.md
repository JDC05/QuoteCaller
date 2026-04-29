# 📞 Quote Caller

Calls your phone at random times throughout the day. When you pick up, an AI voice reads a random quote from your personal list.

---

## How it works

1. The app schedules a set number of calls per day at random times within your waking hours
2. When you pick up, Twilio hits the `/twiml` endpoint
3. The app picks a random quote and returns it as TwiML
4. Twilio's neural AI voice reads the quote aloud
5. The next day's calls are auto-scheduled at midnight

---

## Setup

### 1. Twilio account

1. Sign up at [twilio.com](https://twilio.com) (free trial gives you ~$15 credit)
2. Go to **Console → Phone Numbers → Buy a Number**
   - Pick a UK number (search for +44)
   - Make sure **Voice** capability is ticked
   - Costs ~$1/month
3. Note down your:
   - **Account SID** (starts with `AC...`)
   - **Auth Token**
   - **Twilio phone number**

### 2. Configure environment

```bash
cp .env.example .env
```

Fill in your `.env`:

```
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_FROM_NUMBER=+441234567890     # your Twilio number
MY_PHONE_NUMBER=+447911123456        # your Nokia's number
WEBHOOK_BASE_URL=https://your-app.onrender.com
WAKING_HOUR_START=8
WAKING_HOUR_END=21
CALLS_PER_DAY=3
```

### 3. Edit your quotes

Open `data/quotes.json` and replace with your own quotes:

```json
[
  "Your first quote here. — Author",
  "Your second quote here. — Author",
  "Add as many as you like."
]
```

### 4. Run locally (for testing)

```bash
npm install
npm run dev
```

To test a call immediately (without waiting for the scheduler):

```bash
curl -X POST http://localhost:3000/call-now
```

> **Note:** For local testing, Twilio needs a public URL to reach your `/twiml` endpoint.
> Use [ngrok](https://ngrok.com) to expose it temporarily:
> ```bash
> ngrok http 3000
> # Copy the https URL and set it as WEBHOOK_BASE_URL in .env
> ```

---

## Deploy to Render (free)

Render's free tier keeps the app running continuously.

1. Push this project to a GitHub repository
2. Go to [render.com](https://render.com) and sign up (free)
3. Click **New → Web Service** → connect your GitHub repo
4. Render detects `render.yaml` automatically
5. Add your environment variables in the Render dashboard
6. Set `WEBHOOK_BASE_URL` to your Render app URL (e.g. `https://quote-caller.onrender.com`)
7. Deploy!

> ⚠️ Render free tier spins down after 15 minutes of inactivity.
> The scheduler keeps the app active, so this shouldn't be an issue.
> If calls stop, check your Render logs.

---

## API endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Health check, shows quote count |
| `POST` | `/twiml` | Called by Twilio when you pick up |
| `GET` | `/quotes` | View all quotes as JSON |
| `PUT` | `/quotes` | Replace all quotes |
| `POST` | `/call-now` | Trigger a call immediately (testing) |

### Update quotes via API

```bash
curl -X PUT https://your-app.onrender.com/quotes \
  -H "Content-Type: application/json" \
  -d '{"quotes": ["Quote one.", "Quote two.", "Quote three."]}'
```

---

## Customisation

All scheduling is controlled by env vars — no code changes needed:

| Variable | Default | Description |
|----------|---------|-------------|
| `WAKING_HOUR_START` | `8` | Earliest call hour (24h) |
| `WAKING_HOUR_END` | `21` | Latest call hour (24h) |
| `CALLS_PER_DAY` | `3` | Calls per day |

The voice used is `Google.en-GB-Neural2-B` — a natural-sounding British male voice.
To change it, edit the `voice` attribute in `src/index.js` `/twiml` route.
Other options: `Google.en-GB-Neural2-A` (female), `Polly.Brian` (Amazon British male).

---

## Cost estimate

- Twilio number: ~$1/month
- Outbound call: ~$0.013/min × ~1 min × 3 calls/day = ~$0.04/day (~$1.20/month)
- Hosting (Render): free
- **Total: ~$2–3/month**
