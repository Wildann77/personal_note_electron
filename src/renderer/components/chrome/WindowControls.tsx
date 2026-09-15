import * as React from 'react';
import { cn } from '@renderer/lib/utils';

export interface WindowControlsProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Explicit platform override (useful for testing or stories).
   * Defaults to detection via window.electronAPI.platform or navigator.
   */
  platform?: string;

  /**
   * Whether the window is currently maximized (toggles square vs restore icon).
   */
  isMaximized?: boolean;

  /**
   * Optional custom click overrides for tests or custom window managers.
   */
  onMinimize?: () => void;
  onMaximize?: () => void;
  onClose?: () => void;
}

/**
 * Safe runtime platform detection for macOS.
 * Adheres to zero-leak Chromium sandbox policies (PRD US#41).
 */
export function isMacOS(platformProp?: string): boolean {
  if (platformProp) {
    return platformProp === 'darwin' || platformProp.toLowerCase().includes('mac');
  }

  if (typeof window !== 'undefined') {
    if (window.electronAPI?.platform) {
      return window.electronAPI.platform === 'darwin';
    }

    if (typeof navigator !== 'undefined') {
      const ua = navigator.userAgent || '';
      const plat = navigator.platform || '';
      return (
        plat.toLowerCase().includes('mac') ||
        ua.toLowerCase().includes('macintosh') ||
        ua.toLowerCase().includes('mac os x')
      );
    }
  }

  return false;
}

/**
 * Adaptive Window Controls component for frameless custom TitleBar (PRD US#41–45, Architecture §17).
 * - macOS: Returns null (native traffic lights used in window chrome).
 * - Windows / Linux: Renders Minimize, Maximize/Restore, and Close action buttons.
 */
export const WindowControls: React.FC<WindowControlsProps> = ({
  platform,
  isMaximized = false,
  onMinimize,
  onMaximize,
  onClose,
  className,
  ...props
}) => {
  const isMac = isMacOS(platform);

  // In macOS, hide custom window controls entirely (native traffic light handles it)
  if (isMac) {
    return null;
  }

  const handleMinimize = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onMinimize) {
      onMinimize();
    } else if (typeof window !== 'undefined' && window.electronAPI?.windowControls?.minimize) {
      window.electronAPI.windowControls.minimize();
    }
  };

  const handleMaximize = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onMaximize) {
      onMaximize();
    } else if (typeof window !== 'undefined' && window.electronAPI?.windowControls?.maximize) {
      window.electronAPI.windowControls.maximize();
    }
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClose) {
      onClose();
    } else if (typeof window !== 'undefined' && window.electronAPI?.windowControls?.close) {
      window.electronAPI.windowControls.close();
    }
  };

  return (
    <div
      data-testid="window-controls"
      className={cn('no-drag flex items-center h-full select-none', className)}
      {...props}
    >
      {/* Minimize Button */}
      <button
        type="button"
        data-testid="window-control-minimize"
        aria-label="Minimize"
        onClick={handleMinimize}
        className="no-drag inline-flex items-center justify-center h-[38px] w-11 text-muted-foreground hover:text-foreground hover:bg-muted/80 active:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        <svg
          className="w-3.5 h-3.5"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
        >
          <line x1="2" y1="8" x2="14" y2="8" />
        </svg>
      </button>

      {/* Maximize / Restore Toggle Button */}
      <button
        type="button"
        data-testid="window-control-maximize"
        aria-label={isMaximized ? 'Restore' : 'Maximize'}
        onClick={handleMaximize}
        className="no-drag inline-flex items-center justify-center h-[38px] w-11 text-muted-foreground hover:text-foreground hover:bg-muted/80 active:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        {isMaximized ? (
          // Restore Icon (overlapping squares)
          <svg
            className="w-3.5 h-3.5"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="4.5" y="2.5" width="8.5" height="8.5" rx="0.5" />
            <path d="M2.5 5.5v7.5a0.5 0.5 0 0 0 0.5 0.5H10.5" />
          </svg>
        ) : (
          // Maximize Icon (single square)
          <svg
            className="w-3.5 h-3.5"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="3" width="10" height="10" rx="1" />
          </svg>
        )}
      </button>

      {/* Close Button (Destructive Hover) */}
      <button
        type="button"
        data-testid="window-control-close"
        aria-label="Close"
        onClick={handleClose}
        className="no-drag inline-flex items-center justify-center h-[38px] w-11 text-muted-foreground hover:text-white hover:bg-[#f43f5e] active:bg-[#e11d48] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        <svg
          className="w-3.5 h-3.5"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
        >
          <line x1="3.5" y1="3.5" x2="12.5" y2="12.5" />
          <line x1="12.5" y1="3.5" x2="3.5" y2="12.5" />
        </svg>
      </button>
    </div>
  );
};
