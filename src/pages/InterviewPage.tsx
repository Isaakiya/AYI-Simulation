import React, { useCallback, useEffect, useRef, useState } from 'react';
import { startInterviewSession, submitInterviewTranscript } from '../services/api';

interface InterviewPageProps {
  onFeedbackReady: (feedback: Awaited<ReturnType<typeof submitInterviewTranscript>>) => void;
}

type Speaker = 'interviewer' | 'candidate';
type Phase = 'idle' | 'active' | 'submitting' | 'done';

interface Exchange {
  speaker: Speaker;
  text: string;
}

const INTERVIEW_QUESTIONS = [
  'Tell me about yourself and why you are interested in this role.',
  'Describe a challenging project you worked on and how you handled it.',
  'What are your greatest strengths and how do they apply to this position?',
  'Tell me about a time you faced a conflict and how you resolved it.',
  'Where do you see yourself in five years?',
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

export function InterviewPage({ onFeedbackReady }: InterviewPageProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [status, setStatus] = useState(
    speechSupported
      ? 'Start the session to begin your real-time voice interview.'
      : 'Voice interviews need a browser with microphone and speech support (try Chrome).',
  );
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [liveCaption, setLiveCaption] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const transcriptRef = useRef<Exchange[]>([]);
  const answerRef = useRef('');

  const stopEverything = useCallback(() => {
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
  }, []);

  useEffect(() => stopEverything, [stopEverything]);

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
      setStatus('Interviewer is speaking. Please listen.');
      window.speechSynthesis.speak(utterance);
    });
  }, []);

  const captureAnswer = useCallback((): Promise<string> => {
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

      recognition.onend = () => {
        setIsListening(false);
        recognitionRef.current = null;
        resolve(answerRef.current.trim());
      };

      recognition.onerror = () => {
        setIsListening(false);
        recognitionRef.current = null;
        resolve(answerRef.current.trim());
      };

      setIsListening(true);
      setStatus('Listening. Speak your answer aloud, then press "Done answering".');
      recognition.start();
    });
  }, []);

  const finishAnswering = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  const runInterview = useCallback(async () => {
    await speak('Hello, welcome to your interview. Take a breath, and we will begin.');

    for (const question of INTERVIEW_QUESTIONS) {
      setCurrentQuestion(question);
      addExchange('interviewer', question);
      await speak(question);

      const answer = await captureAnswer();
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

    const feedback = await submitInterviewTranscript(transcript);
    onFeedbackReady(feedback);
    setPhase('done');
    setStatus('Feedback is ready. Open the Feedback tab to review your evaluation.');
  }, [addExchange, captureAnswer, onFeedbackReady, speak]);

  const handleStart = useCallback(async () => {
    if (!speechSupported) {
      setStatus('Voice interviews need a browser with microphone and speech support (try Chrome).');
      return;
    }

    transcriptRef.current = [];
    setExchanges([]);
    setLiveCaption('');
    setCurrentQuestion('');
    setPhase('active');

    try {
      const data = await startInterviewSession();
      setStatus(data.message || 'Interview session started.');
      await runInterview();
    } catch (error) {
      stopEverything();
      setStatus(error instanceof Error ? error.message : 'Unable to start the interview.');
      setPhase('idle');
    }
  }, [runInterview, stopEverything]);

  return (
    <div className="space-y-6 rounded-3xl border border-slate-700 bg-slate-900/80 p-8 shadow-2xl">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-400">Interview Flow</p>
        <h3 className="mt-2 text-3xl font-semibold text-white">Voice Interview Session</h3>
        <p className="mt-3 text-slate-300">
          A real-time, voice-only interview. The interviewer speaks each question aloud and listens to your spoken
          answer, just like a live interview. No typing required.
        </p>
      </div>

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

        {(isSpeaking || isListening) && (
          <span className="inline-flex items-center gap-2 text-sm font-medium text-cyan-300">
            <span className={`h-2.5 w-2.5 rounded-full ${isListening ? 'bg-emerald-400' : 'bg-cyan-400'} animate-pulse`} />
            {isListening ? 'Listening to you' : 'Interviewer speaking'}
          </span>
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
