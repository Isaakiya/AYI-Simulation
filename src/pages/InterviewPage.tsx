import React, { useState } from 'react';
import { startInterviewSession, submitInterviewTranscript } from '../services/api';

interface InterviewPageProps {
  onFeedbackReady: (feedback: Awaited<ReturnType<typeof submitInterviewTranscript>>) => void;
}

export function InterviewPage({ onFeedbackReady }: InterviewPageProps) {
  const [transcript, setTranscript] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('Start a professional interview session to begin.');

  const handleStart = async () => {
    setLoading(true);
    try {
      const data = await startInterviewSession();
      setMessage(data.message || 'Interview session started successfully.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to start interview.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!transcript.trim()) {
      setMessage('Please enter a transcript before submitting.');
      return;
    }

    setLoading(true);
    try {
      const feedback = await submitInterviewTranscript(transcript);
      onFeedbackReady(feedback);
      setMessage('Feedback generated successfully.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to generate feedback.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 rounded-3xl border border-slate-700 bg-slate-900/80 p-8 shadow-2xl">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-400">Interview Flow</p>
        <h3 className="mt-2 text-3xl font-semibold text-white">Interview Session</h3>
        <p className="mt-3 text-slate-300">The frontend sends the session request to n8n, which triggers Botpress and routes the completed transcript for evaluation.</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <button onClick={handleStart} className="rounded-2xl bg-cyan-500 px-5 py-3 font-semibold text-slate-950 hover:bg-cyan-400" disabled={loading}>
          {loading ? 'Preparing...' : 'Start Interview'}
        </button>
        <button onClick={handleSubmit} className="rounded-2xl border border-slate-600 px-5 py-3 font-semibold text-slate-100 hover:bg-slate-800" disabled={loading}>
          Submit Transcript
        </button>
      </div>

      <textarea
        value={transcript}
        onChange={(event) => setTranscript(event.target.value)}
        rows={10}
        className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 p-4 text-slate-100 outline-none ring-0"
        placeholder="Paste the completed interview transcript here for evaluation..."
      />

      <div className="rounded-2xl border border-slate-700 bg-slate-950/70 p-4 text-sm text-slate-300">
        {message}
      </div>
    </div>
  );
}
