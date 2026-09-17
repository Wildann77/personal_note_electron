import * as React from 'react';
import { HardDrive, CheckCircle2, AlertCircle, Loader2, X } from 'lucide-react';
import { Button } from '@renderer/components/ui/button';
import { cn } from '@renderer/lib/utils';
import type { Result } from '@shared/types/result';

export interface BackupToastState {
  visible: boolean;
  success: boolean;
  message: string;
  filePath?: string;
}

export interface BackupButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Optional callback fired when backup completes.
   */
  onBackupComplete?: (result: Result<string>) => void;
  /**
   * Optional custom tooltip / aria-label.
   * Defaults to "Cadangkan Database".
   */
  label?: string;
  /**
   * Whether to display text label alongside icon.
   * Defaults to false (icon only).
   */
  showLabel?: boolean;
}

/**
 * BackupFeedbackToast (DESIGN.md §5.3, PRD US#62).
 * Floating toast notification positioned at bottom-right with auto-dismiss after 3.5s.
 */
export const BackupFeedbackToast: React.FC<{
  state: BackupToastState;
  onClose: () => void;
}> = ({ state, onClose }) => {
  if (!state.visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="backup-feedback-toast"
      className={cn(
        'fixed bottom-4 right-4 z-50 flex items-start gap-3 p-3.5 rounded-lg border shadow-xl backdrop-blur-md select-none max-w-sm w-full',
        'bg-card/95 text-card-foreground border-border animate-in fade-in slide-in-from-bottom-3 duration-200',
      )}
    >
      <div className="shrink-0 mt-0.5">
        {state.success ? (
          <CheckCircle2
            data-testid="backup-toast-success-icon"
            className="w-4 h-4 text-emerald-500"
          />
        ) : (
          <AlertCircle data-testid="backup-toast-error-icon" className="w-4 h-4 text-destructive" />
        )}
      </div>

      <div className="flex-1 min-w-0 pr-1">
        <p className="text-xs font-semibold tracking-tight text-foreground leading-snug">
          {state.success ? 'Database Berhasil Dicadangkan' : 'Gagal Membuat Cadangan Database'}
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5 break-all leading-relaxed">
          {state.message}
        </p>
        {state.filePath && (
          <p
            data-testid="backup-toast-filepath"
            className="text-[10px] font-mono text-muted-foreground/80 truncate mt-1 bg-muted/40 px-1.5 py-0.5 rounded border border-border/50"
            title={state.filePath}
          >
            {state.filePath}
          </p>
        )}
      </div>

      <button
        type="button"
        aria-label="Tutup Notifikasi"
        data-testid="backup-toast-close-btn"
        onClick={onClose}
        className="shrink-0 text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted/60 focus:outline-none focus:ring-1 focus:ring-ring"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

/**
 * BackupButton (Architecture §14, §17, PRD US#62, DESIGN.md §4.2, TASK.md [P11-T5]).
 * Manual SQLite database snapshot backup button mounted in frameless TitleBar chrome.
 */
export const BackupButton = React.forwardRef<HTMLButtonElement, BackupButtonProps>(
  (
    {
      className,
      label = 'Cadangkan Database',
      showLabel = false,
      onBackupComplete,
      disabled,
      ...props
    },
    ref,
  ) => {
    const [isBackingUp, setIsBackingUp] = React.useState<boolean>(false);
    const [toastState, setToastState] = React.useState<BackupToastState>({
      visible: false,
      success: true,
      message: '',
    });

    const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    React.useEffect(() => {
      return () => {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }
      };
    }, []);

    const showToast = React.useCallback((success: boolean, message: string, filePath?: string) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      setToastState({
        visible: true,
        success,
        message,
        filePath,
      });

      timerRef.current = setTimeout(() => {
        setToastState((prev) => ({ ...prev, visible: false }));
      }, 3500);
    }, []);

    const handleBackup = async (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();

      if (isBackingUp) return;

      setIsBackingUp(true);

      try {
        const backupApi = window.electronAPI?.backup;
        if (!backupApi) {
          throw new Error('Backup API tidak tersedia di window.electronAPI');
        }

        const result = backupApi.create
          ? await backupApi.create()
          : await backupApi.triggerBackup();

        if (result.success) {
          showToast(
            true,
            'Snapshot database SQLite aman tersimpan di folder cadangan.',
            result.data,
          );
        } else {
          showToast(
            false,
            result.error?.message || 'Terjadi kesalahan sistem saat membuat cadangan database.',
          );
        }

        if (onBackupComplete) {
          onBackupComplete(result);
        }
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : 'Kesalahan tak terduga';
        showToast(false, errMsg);

        if (onBackupComplete) {
          onBackupComplete({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: errMsg },
          });
        }
      } finally {
        setIsBackingUp(false);
      }
    };

    return (
      <>
        <Button
          ref={ref}
          type="button"
          variant="ghost"
          size="sm"
          role="button"
          aria-label={label}
          title={label}
          disabled={disabled || isBackingUp}
          data-testid="backup-database-button"
          onClick={(e) => {
            void handleBackup(e);
          }}
          className={cn(
            'no-drag h-7 w-7 p-0 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors focus-visible:ring-1 focus-visible:ring-ring shrink-0 select-none flex items-center justify-center',
            showLabel && 'w-auto px-2 gap-1.5',
            className,
          )}
          {...props}
        >
          {isBackingUp ? (
            <Loader2
              data-testid="backup-icon-spinner"
              className="w-3.5 h-3.5 animate-spin text-primary"
            />
          ) : (
            <HardDrive
              data-testid="backup-icon-harddrive"
              className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground transition-colors"
            />
          )}
          {showLabel && <span className="text-xs font-medium">{label}</span>}
        </Button>

        {/* Floating Feedback Toast */}
        <BackupFeedbackToast
          state={toastState}
          onClose={() => setToastState((prev) => ({ ...prev, visible: false }))}
        />
      </>
    );
  },
);

BackupButton.displayName = 'BackupButton';
