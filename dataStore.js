const crypto = require('crypto');

const sessions = new Map();
const questionBank = {
  easy: [
    { title: 'Tell us about yourself', text: 'Introduce your background and why you are interested in IT.' },
    { title: 'What is debugging?', text: 'Explain what debugging means and how you approach it.' },
  ],
  medium: [
    { title: 'Describe an API', text: 'Explain what an API is and how it is used in modern applications.' },
    { title: 'How do you secure web data?', text: 'Describe a few techniques to protect user data in a web app.' },
  ],
  hard: [
    { title: 'Explain authentication vs authorization', text: 'Discuss the difference between authentication and authorization.' },
    { title: 'Why use version control?', text: 'Explain the benefits of version control for developers and teams.' },
  ],
};

function generateId() {
  return crypto.randomBytes(10).toString('hex');
}

function sampleQuestions(difficulty, count) {
  const pool = (difficulty === 'practice')
    ? Object.values(questionBank).flat()
    : (questionBank[difficulty] || questionBank.medium);

  const questions = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    // shallow copy to avoid shared references
    questions.push({ ...pool[idx] });
  }
  return questions;
}

function createSession({ mode, difficulty, totalQuestions = 8 }) {
  const id = generateId();
  const questions = sampleQuestions(mode === 'practice' ? 'practice' : difficulty, totalQuestions);
  const session = {
    id,
    mode,
    difficulty,
    totalQuestions,
    questionIndex: 0,
    questions,
    currentQuestion: null,
    feedback: [],
    completed: false,
  };
  sessions.set(id, session);
  return session;
}

function getSession(id) {
  return sessions.get(id) || null;
}

function updateSession(id, updates) {
  const session = getSession(id);
  if (!session) {
    return null;
  }
  const merged = { ...session, ...updates };
  sessions.set(id, merged);
  return merged;
}

function advanceQuestion(id) {
  const session = getSession(id);
  if (!session) {
    return false;
  }

  const nextIndex = session.questionIndex + 1;
  if (nextIndex >= session.totalQuestions) {
    session.completed = true;
    sessions.set(id, session);
    return true;
  }

  session.questionIndex = nextIndex;
  session.currentQuestion = null;
  sessions.set(id, session);
  return false;
}

function getPlaceholderQuestion(difficulty, index) {
  const questions = questionBank[difficulty] || questionBank.medium;
  return questions[index % questions.length];
}

function getSessionQuestion(sessionId) {
  const session = getSession(sessionId);
  if (!session) return null;
  const idx = session.questionIndex || 0;
  return session.questions[idx] || null;
}

module.exports = {
  createSession,
  getSession,
  updateSession,
  advanceQuestion,
  getPlaceholderQuestion,
  getSessionQuestion,
};
