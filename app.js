const state = {
  sessionId: null,
  mode: 'interview',
  difficulty: 'medium',
  currentQuestionIndex: 0,
  totalQuestions: 0,
  currentQuestion: null,
  completed: false,
  listening: false,
  processingAnswer: false,
  transcript: '',
  sessionStarting: false,
  questionTimerId: null,
  questionTimerRemaining: 0,
};

function computeTotalQuestions(mode, difficulty) {
  if (mode === 'practice') return 20;
  if (difficulty === 'easy') return 5;
  if (difficulty === 'medium') return 8;
  if (difficulty === 'hard') return 10;
  return 8;
}

// ensure the UI reflects the selected difficulty on initial load
state.totalQuestions = computeTotalQuestions(state.mode, state.difficulty);

const screens = {
  home: document.getElementById('home-screen'),
  intro: document.getElementById('intro-screen'),
  landing: document.getElementById('landing-screen'),
  difficulty: document.getElementById('difficulty-screen'),
  interview: document.getElementById('interview-screen'),
  timeout: document.getElementById('timeout-screen'),
};

const modeLabel = document.getElementById('mode-label');
const difficultyLabel = document.getElementById('difficulty-label');
const questionCountLabel = document.getElementById('question-count-label');
const timerLabel = document.getElementById('timer-label');
const questionTitle = document.getElementById('question-title');
const questionText = document.getElementById('question-text');
const timeoutTitle = document.getElementById('timeout-title');
const timeoutTip = document.getElementById('timeout-tip');
const feedbackPanel = document.getElementById('feedback-panel');
const feedbackText = document.getElementById('feedback-text');
const speechStatus = document.getElementById('speech-status');
const transcriptText = document.getElementById('transcript-text');
const nextQuestionButton = document.getElementById('next-question-button');
const listenButton = document.getElementById('listen-button');
const errorMessage = document.getElementById('error-message');
const mouthEl = document.getElementById('npc-mouth');

const startButton = document.getElementById('start-button');
const practiceButton = document.getElementById('practice-button');
const difficultyButton = document.getElementById('difficulty-button');
const quitButton = document.getElementById('quit-button');
const resumeButton = document.getElementById('resume-button');
const difficultyForm = document.getElementById('difficulty-form');
const difficultyBackButton = document.getElementById('difficulty-back-button');
const quitSessionButton = document.getElementById('quit-session-button');
const timeoutHomeButton = document.getElementById('timeout-home-button');

let recognition = null;

if (startButton) startButton.addEventListener('click', () => beginSession('interview')); else console.warn('start-button not found');
if (practiceButton) practiceButton.addEventListener('click', () => beginSession('practice')); else console.warn('practice-button not found');
if (difficultyButton) difficultyButton.addEventListener('click', () => showScreen('difficulty')); else console.warn('difficulty-button not found');
if (quitButton) quitButton.addEventListener('click', () => resetApplication('home')); else console.warn('quit-button not found');
if (resumeButton) resumeButton.addEventListener('click', () => showScreen('home')); else console.warn('resume-button not found');
if (difficultyBackButton) difficultyBackButton.addEventListener('click', () => showScreen('home')); else console.warn('difficulty-back-button not found');
if (nextQuestionButton) nextQuestionButton.addEventListener('click', loadQuestion); else console.warn('next-question-button not found');
if (quitSessionButton) quitSessionButton.addEventListener('click', () => resetApplication('home')); else console.warn('quit-session-button not found');
if (timeoutHomeButton) timeoutHomeButton.addEventListener('click', () => resetApplication('home')); else console.warn('timeout-home-button not found');
if (listenButton) listenButton.addEventListener('click', toggleListening); else console.warn('listen-button not found');
if (difficultyForm) difficultyForm.addEventListener('submit', saveDifficulty); else console.warn('difficulty-form not found');

document.querySelectorAll('input[name="difficulty"]').forEach((input) => {
  input.addEventListener('change', (event) => {
    state.difficulty = event.target.value;
    difficultyLabel.textContent = state.difficulty;
    // update expected total immediately for the UI
    state.totalQuestions = computeTotalQuestions(state.mode, state.difficulty);
    updateStatus();
  });
});

function showScreen(name) {
  Object.keys(screens).forEach((key) => {
    if (screens[key]) screens[key].classList.toggle('active', key === name);
  });
  // stop NPC when leaving the interview screen
  if (name !== 'interview') {
    stopAllSpeech();
    if (recognition && state.listening) {
      try { recognition.stop(); } catch (e) {}
      state.listening = false;
    }
  }
}

// Audio / lip-sync state
let audioCtx = null;
let analyser = null;
let dataArray = null;
let lipSyncAnimationId = null;
let syntheticSource = null;
let mouthIntervalId = null;

function ensureAudioContext() {
  if (audioCtx) return;
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    dataArray = new Uint8Array(analyser.fftSize);
  } catch (e) {
    console.warn('AudioContext unavailable', e);
    audioCtx = null;
  }
}

function startAnalyserForSource(sourceNode) {
  ensureAudioContext();
  try { sourceNode.connect(analyser); } catch (e) {}
}

function stopAnalyserForSource(sourceNode) {
  try { sourceNode.disconnect(analyser); } catch (e) {}
}

function animateMouthFromAnalyser() {
  if (!analyser || !dataArray) return;
  analyser.getByteTimeDomainData(dataArray);
  let sum = 0;
  for (let i = 0; i < dataArray.length; i++) {
    const v = (dataArray[i] - 128) / 128;
    sum += v * v;
  }
  const rms = Math.sqrt(sum / dataArray.length);
  const min = 0.18;
  const max = 1.0;
  const scaled = Math.min(max, Math.max(min, min + rms * (max - min) * 3));
  if (mouthEl) mouthEl.style.transform = `scaleY(${scaled})`;
  lipSyncAnimationId = requestAnimationFrame(animateMouthFromAnalyser);
}

function stopLipSync() {
  if (lipSyncAnimationId) { cancelAnimationFrame(lipSyncAnimationId); lipSyncAnimationId = null; }
  if (mouthEl) mouthEl.style.transform = 'scaleY(0.18)';
  if (syntheticSource) { try { syntheticSource.stop(); } catch (e) {} syntheticSource = null; }
  if (mouthIntervalId) { clearInterval(mouthIntervalId); mouthIntervalId = null; }
}

function startSimpleLipSync() {
  stopSimpleLipSync();
  mouthIntervalId = setInterval(() => {
    const min = 0.22;
    const max = 0.9;
    const v = Math.random() * (max - min) + min;
    if (mouthEl) mouthEl.style.transform = `scaleY(${v})`;
  }, 70);
}

function stopSimpleLipSync() {
  if (mouthIntervalId) { clearInterval(mouthIntervalId); mouthIntervalId = null; }
  if (mouthEl) mouthEl.style.transform = 'scaleY(0.18)';
}

function estimateSpeechDuration(text) {
  const words = (text || '').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(0.8, words * 0.375);
}

function playSyntheticSpeech(durationSeconds) {
  ensureAudioContext();
  if (!audioCtx) return;
  stopLipSync();
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    gain.gain.value = 0; // silent, we only route to analyser
    osc.connect(gain);
    gain.connect(analyser);
    syntheticSource = osc;
    osc.start();
    animateMouthFromAnalyser();
    setTimeout(() => {
      try { osc.stop(); } catch (e) {}
      syntheticSource = null;
    }, Math.max(200, durationSeconds * 1000));
  } catch (e) { console.warn('playSyntheticSpeech failed', e); }
}

function stopAllSpeech() {
  try {
    if (window.speechSynthesis && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
  } catch (e) {}
  try {
    if (syntheticSource) {
      try { syntheticSource.stop(); } catch (e) {}
      syntheticSource = null;
    }
  } catch (e) {}
  stopLipSync();
}

function speakText(message) {
  if (!window.speechSynthesis) { setError('Speech output is not supported by this browser.'); return; }

  // stop any previous speech or synthetic source to avoid repeats/queueing
  stopAllSpeech();

  ensureAudioContext();
  if (audioCtx && audioCtx.state === 'suspended') { audioCtx.resume().catch(() => {}); }

  const duration = estimateSpeechDuration(message);
  playSyntheticSpeech(duration);

  try {
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.rate = 1; utterance.pitch = 1; utterance.volume = 1;
    utterance.onstart = () => startSimpleLipSync();
    utterance.onend = () => setTimeout(() => stopLipSync(), 120);
    window.speechSynthesis.speak(utterance);
  } catch (err) { console.error('speakText failed', err); }
}

function setError(message) {
  console.error(message);
  if (!errorMessage) return;
  errorMessage.textContent = message || '';
  errorMessage.classList.remove('hidden');
}

function clearError() {
  if (!errorMessage) return;
  errorMessage.textContent = '';
  errorMessage.classList.add('hidden');
}

function setSpeechStatus(msg) { if (speechStatus) speechStatus.textContent = msg || ''; }
function setTranscript(txt) { if (transcriptText) transcriptText.textContent = txt || ''; }
function showFeedback(txt) { if (!feedbackPanel || !feedbackText) return; feedbackText.textContent = txt || ''; feedbackPanel.classList.remove('hidden'); }

function updateStatus() {
  modeLabel.textContent = state.mode === 'practice' ? 'Practice' : 'Interview';
  difficultyLabel.textContent = state.difficulty.charAt(0).toUpperCase() + state.difficulty.slice(1);
  const total = state.totalQuestions || 0;
  const cur = state.completed ? total : (typeof state.currentQuestionIndex === 'number' ? state.currentQuestionIndex + 1 : 0);
  questionCountLabel.textContent = `${cur}/${total}`;
}

function updateListenButtonState() {
  if (!listenButton) return;
  if (state.processingAnswer) {
    listenButton.disabled = true;
    listenButton.textContent = 'Processing...';
    return;
  }

  listenButton.disabled = false;
  listenButton.textContent = state.listening ? 'Stop' : 'Speak answer';
}

function getQuestionTimeLimit() {
  if (state.difficulty === 'easy') return 60;
  if (state.difficulty === 'hard') return 30;
  return 45;
}

function clearQuestionTimer() {
  if (state.questionTimerId) {
    clearInterval(state.questionTimerId);
    state.questionTimerId = null;
  }
  state.questionTimerRemaining = 0;
  updateTimerLabel();
}

function updateTimerLabel() {
  if (!timerLabel) return;
  if (!state.currentQuestion || state.completed || state.questionTimerRemaining <= 0) {
    timerLabel.textContent = '--';
    return;
  }
  timerLabel.textContent = `${state.questionTimerRemaining}s`;
}

function startQuestionTimer() {
  clearQuestionTimer();
  const limit = getQuestionTimeLimit();
  state.questionTimerRemaining = limit;
  updateTimerLabel();

  if (limit <= 0) return;
  state.questionTimerId = setInterval(() => {
    state.questionTimerRemaining -= 1;
    updateTimerLabel();

    if (state.questionTimerRemaining <= 0) {
      clearQuestionTimer();
      showTimeoutScreen();
    }
  }, 1000);
}

function showTimeoutScreen() {
  clearQuestionTimer();
  state.processingAnswer = false;
  state.listening = false;
  updateListenButtonState();

  if (recognition && state.listening) {
    try { recognition.stop(); } catch (e) {}
  }
  stopAllSpeech();
  if (listenButton) {
    listenButton.classList.add('hidden');
    listenButton.disabled = true;
  }
  nextQuestionButton.classList.add('hidden');
  if (timeoutTitle) timeoutTitle.textContent = 'You are too slow, try again!';
  if (timeoutTip) timeoutTip.textContent = 'Tip: try summarizing and be concise with your answer.';
  setSpeechStatus('Time is up.');
  setTranscript('');
  feedbackPanel.classList.add('hidden');
  updateTimerLabel();
  showScreen('timeout');
}

function createRecognizer() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    return null;
  }

  const recognizer = new SpeechRecognition();
  recognizer.lang = 'en-US';
  recognizer.continuous = true;
  recognizer.interimResults = true;
  recognizer.maxAlternatives = 1;

  recognizer.addEventListener('start', () => {
    state.listening = true;
    state.processingAnswer = false;
    updateListenButtonState();
    setSpeechStatus('Speak clearly. Click Stop when you are finished.');
  });

  recognizer.addEventListener('result', (event) => {
    let interimText = '';
    let finalText = '';

    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const result = event.results[index];
      const chunk = (result[0]?.transcript || '').trim();
      if (!chunk) continue;
      if (result.isFinal) {
        finalText = finalText ? `${finalText} ${chunk}` : chunk;
      } else {
        interimText = interimText ? `${interimText} ${chunk}` : chunk;
      }
    }

    if (finalText) {
      state.transcript = state.transcript ? `${state.transcript} ${finalText}` : finalText;
    }

    const displayText = interimText ? `${state.transcript} ${interimText}`.trim() : state.transcript;
    setTranscript(displayText || 'Listening...');
  });

  recognizer.addEventListener('end', async () => {
    state.listening = false;
    updateListenButtonState();
    if (state.transcript) {
      setSpeechStatus('Processing your response...');
      await sendAnswer(state.transcript);
    } else {
      setSpeechStatus('No speech detected. Tap again to try.');
    }
  });

  recognizer.addEventListener('error', (event) => {
    state.listening = false;
    state.processingAnswer = false;
    updateListenButtonState();
    setError(`Speech recognition error: ${event.error}`);
    setSpeechStatus('Try again or use a quieter environment.');
  });

  return recognizer;
}

function resetApplication(targetScreen = 'home') {
  clearQuestionTimer();
  state.sessionId = null;
  state.mode = 'interview';
  state.currentQuestionIndex = 0;
  // reflect currently selected difficulty
  if (document.querySelector('input[name="difficulty"]:checked')) {
    state.difficulty = document.querySelector('input[name="difficulty"]:checked').value;
  }
  state.totalQuestions = computeTotalQuestions(state.mode, state.difficulty);
  state.currentQuestion = null;
  state.completed = false;
  state.listening = false;
  state.processingAnswer = false;
  state.transcript = '';
  feedbackPanel.classList.add('hidden');
  nextQuestionButton.classList.add('hidden');
  setSpeechStatus('Waiting for the first question.');
  setTranscript('');
  clearError();
  updateStatus();
  if (document.querySelector('input[name="difficulty"]:checked')) {
    state.difficulty = document.querySelector('input[name="difficulty"]:checked').value;
  }
  questionTitle.textContent = 'Ready to begin?';
  questionText.textContent = 'Press Start to hear the first interview question.';
  updateListenButtonState();
  showScreen(targetScreen);
  // ensure any ongoing speech stops when quitting
  stopAllSpeech();
  if (recognition && state.listening) {
    try { recognition.stop(); } catch (e) {}
    state.listening = false;
  }
}

async function sendApi(path, body) {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Server error');
  }
  return data;
}

async function beginSession(mode) {
  try {
    if (state.sessionStarting) return;
    clearQuestionTimer();
    state.sessionStarting = true;
    clearError();
    state.mode = mode;
    state.currentQuestionIndex = 0;
    // show the expected total immediately while the server creates the session
    state.totalQuestions = computeTotalQuestions(state.mode, state.difficulty);
    state.completed = false;
    state.currentQuestion = null;
    state.processingAnswer = false;
    state.transcript = '';
    feedbackPanel.classList.add('hidden');
    nextQuestionButton.classList.add('hidden');
    setTranscript('');
    showScreen('interview');
    updateStatus();

    console.log('beginSession()', mode);
    setSpeechStatus('Creating session...');

    // disable start/practice while creating
    if (startButton) startButton.disabled = true;
    if (practiceButton) practiceButton.disabled = true;

    const data = await sendApi('/api/session', { mode: state.mode, difficulty: state.difficulty });
    console.log('session created', data);

    state.sessionId = data.sessionId;
    if (typeof data.totalQuestions === 'number' && data.totalQuestions > 0) {
      state.totalQuestions = data.totalQuestions;
    }
    if (typeof data.currentIndex === 'number') {
      state.currentQuestionIndex = data.currentIndex;
    }
    const welcome = data.botpressText || 'Welcome to your voice interview. Answer the questions aloud when prompted.';
    speakText(welcome);
    setSpeechStatus('Interview started. Listening for the first question.');
    await loadQuestion();
    state.sessionStarting = false;
    if (startButton) startButton.disabled = false;
    if (practiceButton) practiceButton.disabled = false;
  } catch (error) {
    state.sessionStarting = false;
    if (startButton) startButton.disabled = false;
    if (practiceButton) practiceButton.disabled = false;
    setError(error.message);
  }
}

async function loadQuestion() {
  try {
    clearError();
    console.log('loadQuestion() - sessionId', state.sessionId);
    const data = await sendApi('/api/question', {
      sessionId: state.sessionId,
    });
    console.log('question loaded', data);

      state.currentQuestion = data.question;
      state.completed = data.complete || false;
      if (typeof data.currentIndex === 'number') {
        state.currentQuestionIndex = data.currentIndex;
      }
      if (typeof data.totalQuestions === 'number' && data.totalQuestions > 0) {
        state.totalQuestions = data.totalQuestions;
      }
    state.transcript = '';
    state.listening = false;
    state.processingAnswer = false;
    feedbackPanel.classList.add('hidden');
    nextQuestionButton.classList.add('hidden');
    setTranscript('');
    questionTitle.textContent = data.question.title || 'Interview question';
    questionText.textContent = data.question.text || 'Please answer the current prompt.';
    updateStatus();
    setSpeechStatus('Press Speak answer when you are ready to respond.');

    const questionSpeech = data.botpressText || `${data.question.title}. ${data.question.text}`;
    speakText(questionSpeech);

    // show/hide speak controls based on session state
    if (data.complete) {
      clearQuestionTimer();
      questionTitle.textContent = 'Session complete';
      questionText.textContent = 'Great work! You can quit or restart from the home screen.';
      setSpeechStatus('The session is complete. Thank you.');
      if (listenButton) { listenButton.classList.add('hidden'); listenButton.disabled = true; }
    } else {
      startQuestionTimer();
      if (listenButton) { listenButton.classList.remove('hidden'); }
      updateListenButtonState();
    }
  } catch (error) {
    setError(error.message);
  }
}

async function toggleListening() {
  if (state.processingAnswer) return;

  if (!recognition) {
    recognition = createRecognizer();
    if (!recognition) {
      setError('Speech recognition is not supported by this browser.');
      return;
    }
  }

  if (state.listening) {
    setSpeechStatus('Stopping recording...');
    recognition.stop();
    return;
  }

  state.transcript = '';
  setTranscript('Listening...');
  clearError();
  recognition.start();
}

async function sendAnswer(answer) {
  if (!state.sessionId) {
    setError('Please start a session before answering.');
    return;
  }

  try {
    clearQuestionTimer();
    state.processingAnswer = true;
    updateListenButtonState();
    clearError();
    const data = await sendApi('/api/answer', {
      sessionId: state.sessionId,
      answer,
    });

    // update question index/total from server only when valid
    if (typeof data.currentIndex === 'number') {
      state.currentQuestionIndex = data.currentIndex;
    }
    if (typeof data.totalQuestions === 'number' && data.totalQuestions > 0) {
      state.totalQuestions = data.totalQuestions;
    }
    state.completed = data.complete || false;
    state.processingAnswer = false;
    updateStatus();
    showFeedback(data.feedback || 'No feedback was returned.');
    speakText(data.feedback || 'No feedback was returned.');
    // hide/disable speak button after answer submitted
    if (listenButton) {
      listenButton.classList.add('hidden');
      listenButton.disabled = true;
    }
    // ensure recognition is stopped
    if (recognition && state.listening) {
      try { recognition.stop(); } catch (e) {}
      state.listening = false;
    }

    if (data.complete) {
      setSpeechStatus('Interview complete. Press Quit to finish.');
      nextQuestionButton.classList.add('hidden');
      questionTitle.textContent = 'Interview complete';
      questionText.textContent = 'Thank you for practicing with the simulator.';
      if (listenButton) { listenButton.classList.add('hidden'); listenButton.disabled = true; }
    } else {
      setSpeechStatus('Tap Next Question when you are ready for the next question.');
      nextQuestionButton.classList.remove('hidden');
    }
  } catch (error) {
    setError(error.message);
  }
}

function saveDifficulty(event) {
  event.preventDefault();
  clearError();
  const selected = document.querySelector('input[name="difficulty"]:checked');
  if (!selected) {
    setError('Please choose a difficulty level.');
    return;
  }

  state.difficulty = selected.value;
  difficultyLabel.textContent = state.difficulty.charAt(0).toUpperCase() + state.difficulty.slice(1);
  showScreen('landing');
}

resetApplication();

// Runtime UI diagnostics and resilient bindings
function initUiChecks() {
  try {
    const mapping = {
      'start-button': () => beginSession('interview'),
      'practice-button': () => beginSession('practice'),
      'difficulty-button': () => showScreen('difficulty'),
      'quit-button': () => resetApplication(),
    };

    Object.keys(mapping).forEach((id) => {
      const el = document.getElementById(id);
      if (!el) {
        console.warn(`UI check: element ${id} not found`);
        return;
      }
      // ensure there's at least one click handler
      el.addEventListener('click', (e) => {
        try {
          mapping[id](e);
        } catch (err) {
          console.error(`Handler for ${id} failed:`, err);
        }
      });
      console.log(`UI check: attached resilient handler to ${id}`);
    });
  } catch (err) {
    console.error('initUiChecks failed', err);
  }
}

initUiChecks();

// Stop speech when user navigates away or hides the page
window.addEventListener('beforeunload', () => stopAllSpeech());
document.addEventListener('visibilitychange', () => {
  if (document.hidden) stopAllSpeech();
});
