import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { Difficulty } from '../App';
import { startInterviewSession, submitInterviewTranscript } from '../services/api';

interface InterviewPageProps {
  difficulty: Difficulty;
  onFeedbackReady: (feedback: Awaited<ReturnType<typeof submitInterviewTranscript>>) => void;
}

type Speaker = 'interviewer' | 'candidate';
type Phase = 'idle' | 'active' | 'submitting' | 'done';

interface Exchange {
  speaker: Speaker;
  text: string;
}

const DIFFICULTY_CONFIG: Record<Difficulty, { questions: number; seconds: number }> = {
  easy: { questions: 5, seconds: 60 },
  medium: { questions: 8, seconds: 45 },
  hard: { questions: 10, seconds: 30 },
};

const QUESTION_POOL = [
  'Tell me about yourself and why you are interested in this role.',
  'Describe a challenging project you worked on and how you handled it.',
  'What are your greatest strengths and how do they apply to this position?',
  'Tell me about a time you faced a conflict and how you resolved it.',
  'Where do you see yourself in five years?',
  'Describe a situation where you had to learn something new quickly.',
  'How do you handle tight deadlines and pressure?',
  'Tell me about a time you received difficult feedback and what you did with it.',
  'What motivates you to do your best work?',
  'Why should we choose you over other candidates?',
];

const speechSupported =
  typeof window !== 'undefined' &&
  (Boolean(window.SpeechRecognition) || Boolean(window.webkitSpeechRecognition)) &&
  'speechSynthesis' in window;

function createRecognition(): SpeechRecognition | null {
  const RecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!RecognitionCtor) {
    return null;
  }

  const recognition = new RecognitionCtor();
  recognition.lang = 'en-US';
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;
  return recognition;
}

export function InterviewPage({ difficulty, onFeedbackReady }: InterviewPageProps) {
  const config = DIFFICULTY_CONFIG[difficulty];

  const [phase, setPhase] = useState<Phase>('idle');
  const [status, setStatus] = useState(
    speechSupported
      ? 'Start the session to begin your real-time voice interview.'
      : 'Voice interviews need a browser with microphone and speech support (try Chrome).',
  );
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [questionNumber, setQuestionNumber] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(config.questions);
  const [secondsLeft, setSecondsLeft] = useState(config.seconds);
  const [liveCaption, setLiveCaption] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [mouthScale, setMouthScale] = useState(0.2);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transcriptRef = useRef<Exchange[]>([]);
  const answerRef = useRef('');

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stopEverything = useCallback(() => {
    clearTimer();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // recognition was not active
      }
      recognitionRef.current = null;
    }
  }, [clearTimer]);

  useEffect(() => stopEverything, [stopEverything]);

  useEffect(() => {
    if (phase === 'idle') {
      setTotalQuestions(config.questions);
      setSecondsLeft(config.seconds);
    }
  }, [config.questions, config.seconds, phase]);

  useEffect(() => {
    if (!isSpeaking) {
      setMouthScale(0.2);
      return;
    }
    const id = setInterval(() => setMouthScale(0.25 + Math.random() * 0.65), 90);
    return () => clearInterval(id);
  }, [isSpeaking]);

  const addExchange = useCallback((speaker: Speaker, text: string) => {
    const next = [...transcriptRef.current, { speaker, text }];
    transcriptRef.current = next;
    setExchanges(next);
  }, []);

  const speak = useCallback((text: string): Promise<void> => {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        resolve();
        return;
      }

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.volume = 1;
      utterance.onend = () => {
        setIsSpeaking(false);
        resolve();
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
        resolve();
      };

      setIsSpeaking(true);
      window.speechSynthesis.speak(utterance);
    });
  }, []);

  const captureAnswer = useCallback(
    (limitSeconds: number): Promise<string> => {
      return new Promise((resolve) => {
        const recognition = createRecognition();
        if (!recognition) {
          resolve('');
          return;
        }

        recognitionRef.current = recognition;
        answerRef.current = '';
        setLiveCaption('');

        recognition.onresult = (event) => {
          let interim = '';
          for (let index = event.resultIndex; index < event.results.length; index += 1) {
            const chunk = event.results[index][0].transcript.trim();
            if (!chunk) {
              continue;
            }
            if (event.results[index].isFinal) {
              answerRef.current = answerRef.current ? `${answerRef.current} ${chunk}` : chunk;
            } else {
              interim = interim ? `${interim} ${chunk}` : chunk;
            }
          }
          setLiveCaption(`${answerRef.current} ${interim}`.trim());
        };

        const finish = () => {
          clearTimer();
          setIsListening(false);
          recognitionRef.current = null;
          resolve(answerRef.current.trim());
        };

        recognition.onend = finish;
        recognition.onerror = finish;

        setIsListening(true);
        setStatus('Listening. Answer aloud before the timer runs out, or press "Done answering".');
        recognition.start();

        setSecondsLeft(limitSeconds);
        timerRef.current = setInterval(() => {
          setSecondsLeft((prev) => {
            if (prev <= 1) {
              clearTimer();
              try {
                recognition.stop();
              } catch {
                // recognition already stopped
              }
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      });
    },
    [clearTimer],
  );

  const finishAnswering = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  const runInterview = useCallback(async () => {
    const questions = QUESTION_POOL.slice(0, config.questions);
    setTotalQuestions(questions.length);

    await speak(
      `Hello, and welcome to your ${difficulty} interview. There are ${questions.length} questions. ` +
        `You will have ${config.seconds} seconds to answer each one. Let us begin.`,
    );

    for (let index = 0; index < questions.length; index += 1) {
      const question = questions[index];
      setQuestionNumber(index + 1);
      setCurrentQuestion(question);
      setSecondsLeft(config.seconds);
      addExchange('interviewer', question);
      setStatus('Interviewer is speaking. Please listen.');
      await speak(question);

      const answer = await captureAnswer(config.seconds);
      setLiveCaption('');
      addExchange('candidate', answer || '(no answer detected)');
    }

    setCurrentQuestion('');
    await speak('Thank you. That concludes the interview. Generating your feedback now.');

    setPhase('submitting');
    setStatus('Evaluating your interview...');
    const transcript = transcriptRef.current
      .map((item) => `${item.speaker === 'interviewer' ? 'Interviewer' : 'Candidate'}: ${item.text}`)
      .join('\n');

    try {
      const feedback = await submitInterviewTranscript(transcript);
      onFeedbackReady(feedback);
      setStatus('Feedback is ready. Open the Feedback tab to review your evaluation.');
    } catch {
      setStatus('Interview complete. Could not reach the backend for feedback — run the server (npm start) to enable it.');
    } finally {
      setPhase('done');
    }
  }, [addExchange, captureAnswer, config.questions, config.seconds, difficulty, onFeedbackReady, speak]);

  const handleStart = useCallback(async () => {
    if (!speechSupported) {
      setStatus('Voice interviews need a browser with microphone and speech support (try Chrome).');
      return;
    }

    transcriptRef.current = [];
    setExchanges([]);
    setLiveCaption('');
    setCurrentQuestion('');
    setQuestionNumber(0);
    setPhase('active');

    try {
      // The session ping is best-effort; the voice interview runs client-side even
      // if the backend (Botpress/Gemini/n8n) is not reachable yet.
      await startInterviewSession().catch(() => null);
      await runInterview();
    } catch (error) {
      stopEverything();
      setStatus(error instanceof Error ? error.message : 'Unable to start the interview.');
      setPhase('idle');
    }
  }, [runInterview, stopEverything]);

  const started = phase !== 'idle';
  const modeLabel = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);

  return (
    <div className="space-y-6 rounded-3xl border border-slate-700 bg-slate-900/80 p-8 shadow-2xl">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-400">Interview Flow</p>
        <h3 className="mt-2 text-3xl font-semibold text-white">Voice Interview Session</h3>
        <p className="mt-3 text-slate-300">
          A real-time, voice-only interview. Your interviewer speaks each question aloud and listens to your spoken
          answer, just like a live one-to-one interview. No typing required.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-700 bg-slate-950/70 p-4 text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Mode</p>
          <p className="mt-1 text-lg font-semibold text-white">{modeLabel}</p>
        </div>
        <div className="rounded-2xl border border-slate-700 bg-slate-950/70 p-4 text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Question</p>
          <p className="mt-1 text-lg font-semibold text-white">
            {started ? questionNumber : 0}/{totalQuestions}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-700 bg-slate-950/70 p-4 text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Timer</p>
          <p className={`mt-1 text-lg font-semibold ${secondsLeft <= 10 && isListening ? 'text-rose-400' : 'text-white'}`}>
            {isListening ? `${secondsLeft}s` : `${config.seconds}s`}
          </p>
        </div>
      </div>

      {started && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-700 bg-slate-950/60 p-6">
          <div className="relative h-40 w-40 rounded-full border-4 border-white/10 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.95),_rgba(14,59,88,0.9))] shadow-2xl">
            <span className="absolute left-[38%] top-[40%] h-3 w-3 -translate-x-1/2 rounded-full bg-slate-900" />
            <span className="absolute left-[62%] top-[40%] h-3 w-3 -translate-x-1/2 rounded-full bg-slate-900" />
            <span
              className="absolute bottom-10 left-1/2 h-3 w-14 origin-top rounded bg-slate-900 transition-transform duration-75"
              style={{ transform: `translateX(-50%) scaleY(${mouthScale})` }}
            />
          </div>
          <span className="inline-flex items-center gap-2 text-sm font-medium text-cyan-300">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                isListening ? 'bg-emerald-400' : isSpeaking ? 'bg-cyan-400' : 'bg-slate-500'
              } ${isListening || isSpeaking ? 'animate-pulse' : ''}`}
            />
            {isListening ? 'Listening to your answer' : isSpeaking ? 'Interviewer is speaking' : 'Interviewer'}
          </span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {phase === 'idle' && (
          <button
            onClick={handleStart}
            className="rounded-2xl bg-cyan-500 px-5 py-3 font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-60"
            disabled={!speechSupported}
          >
            Start Voice Interview
          </button>
        )}

        {phase === 'active' && isListening && (
          <button
            onClick={finishAnswering}
            className="rounded-2xl bg-cyan-500 px-5 py-3 font-semibold text-slate-950 hover:bg-cyan-400"
          >
            Done answering
          </button>
        )}
      </div>

      {currentQuestion && (
        <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-6">
          <p className="text-sm uppercase tracking-[0.2em] text-cyan-300">Current question</p>
          <p className="mt-2 text-lg text-white">{currentQuestion}</p>
        </div>
      )}

      {isListening && (
        <div className="rounded-2xl border border-slate-700 bg-slate-950/80 p-4 text-slate-100">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Your answer</p>
          <p className="mt-2 min-h-[1.5rem] text-slate-200">{liveCaption || 'Listening...'}</p>
        </div>
      )}

      {exchanges.length > 0 && (
        <div className="space-y-3">
          {exchanges.map((item, index) => (
            <div
              key={`${item.speaker}-${index}`}
              className={`rounded-2xl border p-4 text-sm ${
                item.speaker === 'interviewer'
                  ? 'border-slate-700 bg-slate-950/70 text-slate-200'
                  : 'border-cyan-500/20 bg-cyan-500/10 text-slate-100'
              }`}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
                {item.speaker === 'interviewer' ? 'Interviewer' : 'You'}
              </p>
              <p className="mt-2">{item.text}</p>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-2xl border border-slate-700 bg-slate-950/70 p-4 text-sm text-slate-300">{status}</div>
    </div>
  );
}
