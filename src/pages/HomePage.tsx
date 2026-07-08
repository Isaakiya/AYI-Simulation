import React from 'react';
import { HeroCard } from '../components/HeroCard';

interface HomePageProps {
  onStartInterview: () => void;
  onOpenPractice: () => void;
  onOpenFeedback: () => void;
}

export function HomePage({ onStartInterview, onOpenPractice, onOpenFeedback }: HomePageProps) {
  return (
    <div className="space-y-6">
      <HeroCard
        title="Prepare for interviews with structured, AI-guided practice"
        description="Start a professional mock interview, practice your responses, and review detailed feedback designed for students and job seekers."
        actionLabel="Start Interview"
        onAction={onStartInterview}
      />

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-3xl border border-slate-700 bg-slate-900/70 p-6">
          <h4 className="text-xl font-semibold text-white">Practice Mode</h4>
          <p className="mt-3 text-slate-300">Use guided practice questions to improve confidence and delivery before your real interview.</p>
          <button onClick={onOpenPractice} className="mt-4 rounded-2xl border border-slate-600 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-slate-800">
            Open Practice
          </button>
        </div>

        <div className="rounded-3xl border border-slate-700 bg-slate-900/70 p-6">
          <h4 className="text-xl font-semibold text-white">Feedback Dashboard</h4>
          <p className="mt-3 text-slate-300">Review communication, technical strengths, weaknesses, and improvement ideas after each session.</p>
          <button onClick={onOpenFeedback} className="mt-4 rounded-2xl border border-slate-600 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-slate-800">
            View Feedback
          </button>
        </div>
      </div>
    </div>
  );
}
