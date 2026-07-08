import React from 'react';
import type { FeedbackResponse } from '../services/api';

interface FeedbackPageProps {
  feedback: FeedbackResponse | null;
}

export function FeedbackPage({ feedback }: FeedbackPageProps) {
  if (!feedback) {
    return (
      <div className="rounded-3xl border border-slate-700 bg-slate-900/80 p-8 text-slate-300 shadow-2xl">
        No feedback yet. Complete an interview to see your analysis.
      </div>
    );
  }

  return (
    <div className="space-y-6 rounded-3xl border border-slate-700 bg-slate-900/80 p-8 shadow-2xl">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-400">Feedback Dashboard</p>
        <h3 className="mt-2 text-3xl font-semibold text-white">Interview Evaluation</h3>
      </div>

      <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-6">
        <p className="text-sm uppercase tracking-[0.2em] text-cyan-300">Overall Score</p>
        <p className="mt-2 text-4xl font-semibold text-white">{feedback.overallScore}/10</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-700 bg-slate-950/70 p-6">
          <h4 className="text-xl font-semibold text-white">Communication Analysis</h4>
          <p className="mt-3 text-slate-300">{feedback.communicationAnalysis}</p>
        </div>
        <div className="rounded-2xl border border-slate-700 bg-slate-950/70 p-6">
          <h4 className="text-xl font-semibold text-white">Technical Analysis</h4>
          <p className="mt-3 text-slate-300">{feedback.technicalAnalysis}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-700 bg-slate-950/70 p-6">
          <h4 className="text-xl font-semibold text-white">Strengths</h4>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-slate-300">
            {feedback.strengths.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
        <div className="rounded-2xl border border-slate-700 bg-slate-950/70 p-6">
          <h4 className="text-xl font-semibold text-white">Weaknesses</h4>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-slate-300">
            {feedback.weaknesses.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
        <div className="rounded-2xl border border-slate-700 bg-slate-950/70 p-6">
          <h4 className="text-xl font-semibold text-white">Improvement Suggestions</h4>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-slate-300">
            {feedback.improvementSuggestions.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
      </div>
    </div>
  );
}
