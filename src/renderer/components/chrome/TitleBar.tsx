import * as React from 'react';
import { cn } from '@renderer/lib/utils';

export interface TitleBarProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  /**
   * Title text or custom React node to display in the header.
   * Defaults to "Personal Note".
   */
  title?: React.ReactNode;

  /**
   * Optional custom left content (e.g. app icon, sidebar controls, or macOS traffic lights spacer).
   */
  leftContent?: React.ReactNode;

  /**
   * Optional custom center content.
   */
  centerContent?: React.ReactNode;

  /**
   * Optional custom right content (e.g. sync indicators, window action buttons, theme switch).
   */
  rightContent?: React.ReactNode;

  /**
   * Whether to show default title text when leftContent is omitted.
   * Defaults to true.
   */
  showDefaultTitle?: boolean;
}

/**
 * Custom frameless window TitleBar chrome (Architecture §17, PRD US#38–40).
 * Features 38px fixed height, draggable window region, and explicit no-drag containment
 * for interactive controls to prevent mouse events from being swallowed.
 */
export const TitleBar: React.FC<TitleBarProps> = ({
  title = 'Personal Note',
  leftContent,
  centerContent,
  rightContent,
  showDefaultTitle = true,
  className,
  children,
  onDoubleClick,
  ...props
}) => {
  const handleDoubleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    // Prevent triggering maximize when clicking on interactive controls
    const target = event.target as HTMLElement | null;
    if (target?.closest('.no-drag')) {
      return;
    }

    if (onDoubleClick) {
      onDoubleClick(event);
      return;
    }

    // Default frameless desktop behavior: double-click drag area toggles maximize
    if (typeof window !== 'undefined' && window.electronAPI?.windowControls?.maximize) {
      window.electronAPI.windowControls.maximize();
    }
  };

  return (
    <header
      data-testid="titlebar-chrome"
      className={cn(
        'drag-region h-[38px] w-full shrink-0 select-none bg-background text-foreground border-b border-border flex items-center justify-between px-3 text-xs font-medium tracking-tight',
        className,
      )}
      onDoubleClick={handleDoubleClick}
      {...props}
    >
      {/* Left section: App identity / custom left slot */}
      <div className="flex items-center gap-2 overflow-hidden">
        {leftContent ? (
          <div className="no-drag flex items-center gap-2">{leftContent}</div>
        ) : showDefaultTitle && title ? (
          <span
            data-testid="titlebar-title"
            className="truncate text-muted-foreground font-semibold"
          >
            {title}
          </span>
        ) : null}
      </div>

      {/* Center section: Custom center slot */}
      {centerContent && (
        <div className="no-drag flex items-center justify-center flex-1 px-2">{centerContent}</div>
      )}

      {/* Right section: Action controls, sync badges, window buttons */}
      <div className="no-drag flex items-center gap-2">
        {rightContent}
        {children}
      </div>
    </header>
  );
};
