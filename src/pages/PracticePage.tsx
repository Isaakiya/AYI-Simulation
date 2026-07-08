import React from 'react';

export function PracticePage() {
  const prompts = [
    'Tell me about yourself and your career goals.',
    'Describe a challenge you faced and how you handled it.',
    'Why are you interested in this role or programme?',
  ];

  return (
    <div className="space-y-6 rounded-3xl border border-slate-700 bg-slate-900/80 p-8 shadow-2xl">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-400">Practice Mode</p>
        <h3 className="mt-2 text-3xl font-semibold text-white">Independent Practice</h3>
        <p className="mt-3 text-slate-300">
          Work through guided prompts at your own pace to build confidence before a real interview.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {prompts.map((prompt) => (
          <div key={prompt} className="rounded-2xl border border-slate-700 bg-slate-950/70 p-4 text-sm text-slate-300">
            <p>{prompt}</p>
          </div>
        ))}
      </div>

      <button className="rounded-2xl bg-cyan-500 px-5 py-3 font-semibold text-slate-950 hover:bg-cyan-400">
        Start Practice
      </button>
    </div>
  );
}
