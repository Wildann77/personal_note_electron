import * as React from 'react';
import { Sun, Moon } from 'lucide-react';
import { Button } from '@renderer/components/ui/button';
import { useUIStore } from '@renderer/stores/useUIStore';
import { cn } from '@renderer/lib/utils';

export interface ThemeToggleProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Optional custom label or text to display alongside icon.
   */
  showLabel?: boolean;
}

/**
 * ThemeToggle (PRD US#48, US#49, DESIGN.md §4.1, TASK.md [P17-T1]).
 * Sleek, accessible toggle switch for Dark / Light mode with smooth micro-animation.
 */
export const ThemeToggle = React.forwardRef<HTMLButtonElement, ThemeToggleProps>(
  ({ className, showLabel = false, ...props }, ref) => {
    const theme = useUIStore((state) => state.theme);
    const toggleTheme = useUIStore((state) => state.toggleTheme);

    const isDark = theme === 'dark';
    const label = isDark ? 'Ganti ke Mode Terang' : 'Ganti ke Mode Gelap';

    return (
      <Button
        ref={ref}
        type="button"
        variant="ghost"
        size="sm"
        role="button"
        aria-label={label}
        title={label}
        data-testid="theme-toggle-button"
        onClick={toggleTheme}
        className={cn(
          'no-drag h-7 w-7 p-0 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors focus-visible:ring-1 focus-visible:ring-ring shrink-0 select-none flex items-center justify-center',
          showLabel && 'w-auto px-2 gap-1.5',
          className,
        )}
        {...props}
      >
        {isDark ? (
          <Sun
            data-testid="theme-icon-sun"
            className="w-3.5 h-3.5 text-warning transition-transform duration-200 hover:rotate-45"
          />
        ) : (
          <Moon
            data-testid="theme-icon-moon"
            className="w-3.5 h-3.5 text-primary transition-transform duration-200 hover:-rotate-12"
          />
        )}
        {showLabel && (
          <span className="text-xs font-medium">{isDark ? 'Mode Terang' : 'Mode Gelap'}</span>
        )}
      </Button>
    );
  },
);

ThemeToggle.displayName = 'ThemeToggle';
