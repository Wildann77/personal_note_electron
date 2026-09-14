import React from 'react';

export const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-background text-foreground p-8 flex flex-col items-center justify-center">
      <div className="max-w-md w-full p-6 bg-card text-card-foreground rounded-lg border border-border shadow-lg space-y-4">
        <h1 className="text-2xl font-bold text-primary tracking-tight">Personal Note App</h1>
        <p className="text-sm text-muted-foreground">
          Electron Forge + Vite 8 + React 19 + Tailwind CSS 4.3.x Initialized
        </p>
        <div className="flex gap-2">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary text-primary-foreground">
            Tailwind v4 Active
          </span>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border">
            Dark / Light Token Ready
          </span>
        </div>
      </div>
    </div>
  );
};
