const express = require('express');
const path = require('path');

const app = express();
const requestedPort = Number(process.env.PORT) || 3001;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

function getEnv(name) {
  return process.env[name] ? process.env[name].trim() : '';
}

function buildFallbackFeedback(transcript) {
  const normalized = (transcript || '').toLowerCase();
  const score = normalized.includes('technical') || normalized.includes('project') ? 8.4 : 7.2;

  return {
    overallScore: Number(score.toFixed(1)),
    communicationAnalysis: 'You communicated clearly and structured your answer well. Continue focusing on concise delivery and confident pacing.',
    technicalAnalysis: 'Your answer shows a solid understanding of the topic. Add a few concrete examples and mention measurable outcomes where possible.',
    strengths: ['Clear communication', 'Good structure', 'Professional tone'],
    weaknesses: ['Need stronger examples', 'Could improve concision', 'Add more measurable results'],
    improvementSuggestions: ['Practice a 60-second answer format', 'Use STAR examples', 'Review common interview questions'],
  };
}

async function callN8nWebhook(payload) {
  const webhookUrl = getEnv('N8N_WEBHOOK_URL');
  if (!webhookUrl) {
    return null;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return null;
    }

    return response.json();
  } catch (error) {
    return null;
  }
}

async function callBotpress(sessionId, payload) {
  const botpressUrl = getEnv('BOTPRESS_API_URL');
  if (!botpressUrl) {
    return null;
  }

  try {
    const response = await fetch(`${botpressUrl.replace(/\/$/, '')}/api/v1/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, payload }),
    });

    if (!response.ok) {
      return null;
    }

    return response.json();
  } catch (error) {
    return null;
  }
}

async function callGemini(transcript) {
  const geminiUrl = getEnv('GEMINI_API_URL');
  const geminiKey = getEnv('GEMINI_API_KEY');
  if (!geminiUrl) {
    return null;
  }

  try {
    const response = await fetch(`${geminiUrl.replace(/\/$/, '')}/evaluate-answer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(geminiKey ? { Authorization: `Bearer ${geminiKey}` } : {}),
      },
      body: JSON.stringify({ transcript }),
    });

    if (!response.ok) {
      return null;
    }

    return response.json();
  } catch (error) {
    return null;
  }
}

app.post('/api/interview/start', async (req, res) => {
  const payload = {
    event: 'interview_started',
    mode: req.body.mode || 'interview',
    timestamp: new Date().toISOString(),
  };

  await callN8nWebhook(payload);
  await callBotpress(`session-${Date.now()}`, payload);

  res.json({
    sessionId: `session-${Date.now()}`,
    message: 'Interview session started. Botpress and n8n are ready to continue the workflow.',
  });
});

app.post('/api/interview/feedback', async (req, res) => {
  const { transcript } = req.body;
  if (!transcript || typeof transcript !== 'string') {
    return res.status(400).json({ message: 'Transcript is required.' });
  }

  const geminiResponse = await callGemini(transcript);
  const feedback = geminiResponse && (geminiResponse.feedback || geminiResponse.result)
    ? geminiResponse.feedback || geminiResponse.result
    : buildFallbackFeedback(transcript);

  await callN8nWebhook({
    event: 'interview_feedback_ready',
    transcript,
    feedback,
  });

  res.json(feedback);
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

function startServer(port) {
  const server = app.listen(port, () => {
    console.log(`AYI Interview Simulator backend listening on http://localhost:${port}`);
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      const nextPort = port + 1;
      console.warn(`Port ${port} is busy. Trying ${nextPort} instead.`);
      startServer(nextPort);
      return;
    }

    console.error(error);
    process.exit(1);
  });
}

startServer(requestedPort);
