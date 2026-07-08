import React from 'react';

interface HeroCardProps {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}

export function HeroCard({ title, description, actionLabel, onAction }: HeroCardProps) {
  return (
    <section className="rounded-3xl border border-slate-700 bg-slate-900/80 p-8 shadow-2xl">
      <div className="mb-4 inline-flex rounded-full bg-cyan-500/15 px-3 py-1 text-sm font-semibold text-cyan-300">
        Professional Preparation
      </div>
      <h3 className="text-3xl font-semibold text-white">{title}</h3>
      <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">{description}</p>
      <button
        onClick={onAction}
        className="mt-6 rounded-2xl bg-cyan-500 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400"
      >
        {actionLabel}
      </button>
    </section>
  );
}
