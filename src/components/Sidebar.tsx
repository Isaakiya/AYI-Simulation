import React, { useState } from 'react';
import type { Difficulty } from '../App';

interface SidebarProps {
  currentView: 'home' | 'interview' | 'practice' | 'feedback' | 'universities' | 'jobs';
  onNavigate: (view: SidebarProps['currentView']) => void;
  difficulty: Difficulty;
  onDifficultyChange: (difficulty: Difficulty) => void;
}

const links: Array<{ key: SidebarProps['currentView']; label: string }> = [
  { key: 'home', label: 'Home' },
  { key: 'interview', label: 'Start Interview' },
  { key: 'practice', label: 'Practice' },
  { key: 'feedback', label: 'Feedback' },
  { key: 'universities', label: 'Universities' },
  { key: 'jobs', label: 'IT Jobs' },
];

export function Sidebar({ currentView, onNavigate, difficulty, onDifficultyChange }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      className={`relative z-20 overflow-hidden transition-[transform,width] duration-300 lg:sticky lg:top-0 lg:h-[calc(100vh-2rem)] lg:w-80 lg:flex-shrink-0 ${collapsed ? '-translate-x-full lg:w-0' : 'translate-x-0'}`}
    >
      <button
        type="button"
        onClick={() => setCollapsed((value) => !value)}
        className="absolute top-4 right-4 z-30 rounded-full border border-slate-600 bg-slate-900/95 px-3 py-2 text-sm text-slate-100 shadow-lg transition hover:bg-slate-800"
        aria-label={collapsed ? 'Show sidebar' : 'Hide sidebar'}
      >
        {collapsed ? '→' : '←'}
      </button>

      <aside
        className="flex h-full w-full flex-col justify-between rounded-3xl border border-slate-700 bg-slate-900/95 p-6 shadow-2xl lg:rounded-none lg:rounded-r-3xl lg:ml-0 lg:mr-6"
      >
        <div>
        <div className="mb-8 flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-400">AI Interview Platform</p>
            <h2 className={`mt-2 text-2xl font-semibold text-white ${collapsed ? 'hidden' : 'block'}`}>Ace Your Interview</h2>
          </div>
        </div>

        <nav className="space-y-2">
          {links.map((link) => (
            <button
              key={link.key}
              onClick={() => onNavigate(link.key)}
              className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-medium transition ${
                currentView === link.key
                  ? 'bg-cyan-500 text-slate-950'
                  : 'bg-slate-800/80 text-slate-200 hover:bg-slate-700'
              }`}
            >
              <span>{link.label}</span>
              <span aria-hidden="true">→</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-8 space-y-4 border-t border-slate-700 pt-6">
        <div className="rounded-2xl border border-slate-700 bg-slate-800/80 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Profile</p>
          <div className="mt-3 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-500/20 text-sm font-semibold text-cyan-300">
              n8n
            </div>
            <div>
              <p className="text-sm font-semibold text-white">n8n Credentials</p>
              <p className="text-xs text-slate-400">Connected workflow access</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-700 bg-slate-800/80 p-4">
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400" htmlFor="difficulty-select">
            Simulation Difficulty
          </label>
          <select
            id="difficulty-select"
            value={difficulty}
            onChange={(event) => onDifficultyChange(event.target.value as Difficulty)}
            className="mt-3 w-full rounded-xl border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none"
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
      </div>
      </aside>
    </div>
  );
}
