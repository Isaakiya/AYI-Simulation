import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { HomePage } from './pages/HomePage';
import { InterviewPage } from './pages/InterviewPage';
import { PracticePage } from './pages/PracticePage';
import { FeedbackPage } from './pages/FeedbackPage';
import type { FeedbackResponse } from './services/api';

export type View = 'home' | 'interview' | 'practice' | 'feedback' | 'universities' | 'jobs';

export function App() {
  const [view, setView] = useState<View>('home');
  const [feedback, setFeedback] = useState<FeedbackResponse | null>(null);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.16),_transparent_40%),linear-gradient(135deg,_#020617,_#111827)] p-4 text-slate-100 lg:p-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 lg:flex-row">
        <Sidebar currentView={view} onNavigate={setView} />

        <main className="flex-1">
          {view === 'home' && (
            <HomePage
              onStartInterview={() => setView('interview')}
              onOpenPractice={() => setView('practice')}
              onOpenFeedback={() => setView('feedback')}
            />
          )}

          {view === 'interview' && <InterviewPage onFeedbackReady={setFeedback} />}

          {view === 'practice' && <PracticePage />}

          {view === 'feedback' && <FeedbackPage feedback={feedback} />}

          {(view === 'universities' || view === 'jobs') && (
            <div className="rounded-3xl border border-slate-700 bg-slate-900/80 p-8 text-slate-300 shadow-2xl">
              <h3 className="text-2xl font-semibold text-white">{view === 'universities' ? 'Universities' : 'IT Jobs'}</h3>
              <p className="mt-3">This section can be expanded with curated university and job listings for your users.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
