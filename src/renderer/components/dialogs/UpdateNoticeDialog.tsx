import * as React from 'react';
import { ArrowUpCircle, ExternalLink, Download, Sparkles, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@renderer/components/ui/dialog';
import { Button } from '@renderer/components/ui/button';

export interface UpdateNoticeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  latestVersion: string;
  releaseUrl: string;
  currentVersion?: string;
  releaseNotes?: string;
  releaseName?: string;
  publishedAt?: string;
  onDownload?: () => void;
}

/**
 * UpdateNoticeDialog (Architecture §15.3, PRD US#61, DESIGN.md §5.3, TASK.md [P14-T3]).
 * Modal dialog notifikasi saat rilis GitHub terbaru lebih baru dari app.getVersion().
 * Menampilkan changelog ringkas dan tombol "Unduh Pembaruan" yang membuka browser sistem.
 */
export const UpdateNoticeDialog: React.FC<UpdateNoticeDialogProps> = ({
  open,
  onOpenChange,
  latestVersion,
  releaseUrl,
  currentVersion,
  releaseNotes,
  releaseName,
  publishedAt,
  onDownload,
}) => {
  const handleDownload = () => {
    if (onDownload) {
      onDownload();
    } else if (releaseUrl && typeof window !== 'undefined') {
      window.open(releaseUrl, '_blank', 'noopener,noreferrer');
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid="update-notice-dialog"
        className="max-w-lg sm:max-w-[540px] w-full border-primary/30 shadow-2xl p-6 overflow-hidden"
      >
        <DialogHeader className="gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-full bg-primary/10 text-primary">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-semibold text-foreground">
                Pembaruan Tersedia
              </DialogTitle>
              <div
                data-testid="update-version-badge"
                className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5"
              >
                {currentVersion && (
                  <>
                    <span>
                      v<span className="font-mono">{currentVersion.replace(/^v/, '')}</span>
                    </span>
                    <span>&rarr;</span>
                  </>
                )}
                <span className="font-medium text-primary">
                  v<span className="font-mono">{latestVersion.replace(/^v/, '')}</span>
                </span>
                {publishedAt && (
                  <span className="text-muted-foreground/70">&bull; {publishedAt}</span>
                )}
              </div>
            </div>
          </div>
          <DialogDescription className="text-xs sm:text-sm text-muted-foreground leading-relaxed pt-1">
            Versi baru Personal Note telah dirilis di GitHub. Unduh versi terbaru untuk menikmati
            fitur baru, perbaikan bug, dan stabilitas performa.
          </DialogDescription>
        </DialogHeader>

        {releaseNotes && (
          <div className="space-y-1.5">
            <div className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span>Catatan Rilis:</span>
              {releaseName && (
                <span className="font-normal text-muted-foreground text-[11px] truncate max-w-[200px]">
                  {releaseName}
                </span>
              )}
            </div>
            <div className="max-h-44 overflow-y-auto rounded-md border border-border bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
              <div data-testid="update-changelog" className="whitespace-pre-wrap font-sans">
                {releaseNotes}
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-2 pt-2">
          <Button
            data-testid="update-later-btn"
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto text-xs"
          >
            Nanti Saja
          </Button>

          <Button
            data-testid="update-download-btn"
            type="button"
            variant="default"
            size="sm"
            onClick={handleDownload}
            className="w-full sm:w-auto text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Unduh Pembaruan</span>
            <ExternalLink className="w-3 h-3 opacity-70" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

UpdateNoticeDialog.displayName = 'UpdateNoticeDialog';

export interface UpdateNoticeToastProps {
  open: boolean;
  onClose: () => void;
  latestVersion: string;
  releaseUrl: string;
  currentVersion?: string;
  releaseNotes?: string;
  onDownload?: () => void;
  onOpenDetails?: () => void;
}

/**
 * UpdateNoticeToast (Architecture §15.3, PRD US#61, TASK.md [P14-T3]).
 * Banner/toast mengambang yang muncul di sudut layar saat rilis baru terdeteksi.
 */
export const UpdateNoticeToast: React.FC<UpdateNoticeToastProps> = ({
  open,
  onClose,
  latestVersion,
  releaseUrl,
  releaseNotes,
  onDownload,
  onOpenDetails,
}) => {
  if (!open) return null;

  const handleDownload = () => {
    if (onDownload) {
      onDownload();
    } else if (releaseUrl && typeof window !== 'undefined') {
      window.open(releaseUrl, '_blank', 'noopener,noreferrer');
    }
    onClose();
  };

  return (
    <div
      data-testid="update-notice-toast"
      role="status"
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 flex max-w-md items-center gap-3 rounded-lg border border-primary/30 bg-card p-3 shadow-2xl text-card-foreground animate-in fade-in slide-in-from-bottom-2 duration-200"
    >
      <div className="p-2 rounded-full bg-primary/10 text-primary shrink-0">
        <ArrowUpCircle className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <span>Pembaruan Tersedia</span>
          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
            v{latestVersion.replace(/^v/, '')}
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground truncate mt-0.5">
          {releaseNotes
            ? releaseNotes.split('\n')[0]
            : `Versi baru v${latestVersion.replace(/^v/, '')} tersedia.`}
        </p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {onOpenDetails && (
          <Button
            data-testid="toast-details-btn"
            variant="ghost"
            size="sm"
            onClick={onOpenDetails}
            className="h-7 px-2 text-xs"
          >
            Detail
          </Button>
        )}
        <Button
          data-testid="toast-download-btn"
          variant="default"
          size="sm"
          onClick={handleDownload}
          className="h-7 px-2.5 text-xs gap-1 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Download className="w-3 h-3" />
          <span>Unduh</span>
        </Button>
        <button
          data-testid="toast-close-btn"
          type="button"
          onClick={onClose}
          className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors"
          aria-label="Tutup notifikasi"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

UpdateNoticeToast.displayName = 'UpdateNoticeToast';
