require('dotenv').config();
const express = require('express');
const twilio = require('twilio');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// ─── Config ───────────────────────────────────────────────────────────────────

const {
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_FROM_NUMBER,
  MY_PHONE_NUMBER,
  WEBHOOK_BASE_URL,
  WAKING_HOUR_START = '8',   // 8am default
  WAKING_HOUR_END   = '21',  // 9pm default
  CALLS_PER_DAY     = '3',
  PORT              = '3000',
} = process.env;

const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getQuotes() {
  const quotesPath = path.join(__dirname, '../data/quotes.json');
  return JSON.parse(fs.readFileSync(quotesPath, 'utf8'));
}

function randomQuote() {
  const quotes = getQuotes();
  return quotes[Math.floor(Math.random() * quotes.length)];
}

function randomTimeToday(startHour, endHour) {
  const now = new Date();
  const start = new Date(now);
  start.setHours(startHour, 0, 0, 0);
  const end = new Date(now);
  end.setHours(endHour, 0, 0, 0);

  // If we're past the window today, schedule for tomorrow
  const earliest = now > start ? now : start;
  if (earliest >= end) {
    // Past today's window — return null (will be rescheduled tomorrow)
    return null;
  }

  const randomMs = Math.random() * (end - earliest);
  return new Date(earliest.getTime() + randomMs);
}

// ─── Make a call ──────────────────────────────────────────────────────────────

async function makeCall() {
  console.log(`[${new Date().toISOString()}] Placing call to ${MY_PHONE_NUMBER}...`);
  try {
    const call = await client.calls.create({
      to: MY_PHONE_NUMBER,
      from: TWILIO_FROM_NUMBER,
      url: `${WEBHOOK_BASE_URL}/twiml`,
    });
    console.log(`[${new Date().toISOString()}] Call placed: ${call.sid}`);
  } catch (err) {
    console.error('Call failed:', err.message);
  }
}

// ─── Scheduler ────────────────────────────────────────────────────────────────

function scheduleDayCalls() {
  const start = parseInt(WAKING_HOUR_START, 10);
  const end   = parseInt(WAKING_HOUR_END,   10);
  const count = parseInt(CALLS_PER_DAY,     10);

  console.log(`\nScheduling ${count} calls between ${start}:00 and ${end}:00...`);

  const scheduled = [];

  for (let i = 0; i < count; i++) {
    const callTime = randomTimeToday(start, end);
    if (!callTime) continue;

    const delay = callTime - Date.now();
    scheduled.push(callTime);

    setTimeout(async () => {
      await makeCall();
    }, delay);

    console.log(`  Call ${i + 1}: ${callTime.toLocaleTimeString('en-GB')}`);
  }

  // Reschedule for tomorrow at midnight
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 1, 0, 0); // 00:01 tomorrow
  const msUntilTomorrow = tomorrow - Date.now();

  setTimeout(() => {
    scheduleDayCalls();
  }, msUntilTomorrow);

  console.log(`  Next reschedule: ${tomorrow.toLocaleDateString('en-GB')} 00:01\n`);
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// Twilio calls this when you pick up
app.post('/twiml', (req, res) => {
  const quote = randomQuote();
  console.log(`[${new Date().toISOString()}] Serving quote: "${quote}"`);

  const twiml = new twilio.twiml.VoiceResponse();
  twiml.pause({ length: 1 }); // brief pause before speaking
  twiml.say(
    { voice: 'Google.en-GB-Neural2-B', language: 'en-GB' },
    quote
  );
  twiml.pause({ length: 1 });

  res.type('text/xml').send(twiml.toString());
});

// View all quotes
app.get('/quotes', (req, res) => {
  res.json(getQuotes());
});

// Replace all quotes
app.put('/quotes', (req, res) => {
  const { quotes } = req.body;
  if (!Array.isArray(quotes)) {
    return res.status(400).json({ error: 'Body must be { quotes: [...] }' });
  }
  const quotesPath = path.join(__dirname, '../data/quotes.json');
  fs.writeFileSync(quotesPath, JSON.stringify(quotes, null, 2));
  res.json({ message: `Saved ${quotes.length} quotes.` });
});

// Manually trigger a call (useful for testing)
app.post('/call-now', async (req, res) => {
  await makeCall();
  res.json({ message: 'Call placed!' });
});

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', quotes: getQuotes().length });
});

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`Quote Caller running on port ${PORT}`);
  scheduleDayCalls();
});
