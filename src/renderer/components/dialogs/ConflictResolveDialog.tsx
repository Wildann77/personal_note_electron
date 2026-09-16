import * as React from 'react';
import { AlertTriangle, Copy, RefreshCw, UploadCloud, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@renderer/components/ui/dialog';
import { Button } from '@renderer/components/ui/button';

export interface ConflictResolveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReload: () => void | Promise<void>;
  onCopyLocal: () => void | Promise<void>;
  onOverwrite?: () => void | Promise<void>;
  noteTitle?: string;
}

/**
 * ConflictResolveDialog (Architecture §7.1, PRD US#60, DESIGN.md §5.3, TASK.md [P14-T2]).
 * Dialog resolusi saat autosave mengembalikan CONCURRENCY_ERROR akibat
 * catatan yang sama diedit bersamaan di jendela lain.
 */
export const ConflictResolveDialog: React.FC<ConflictResolveDialogProps> = ({
  open,
  onOpenChange,
  onReload,
  onCopyLocal,
  onOverwrite,
  noteTitle,
}) => {
  const [copied, setCopied] = React.useState<boolean>(false);
  const [isProcessing, setIsProcessing] = React.useState<boolean>(false);

  const handleCopy = async () => {
    try {
      await onCopyLocal();
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy local draft:', err);
    }
  };

  const handleReload = async () => {
    setIsProcessing(true);
    try {
      await onReload();
      onOpenChange(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOverwrite = async () => {
    if (!onOverwrite) return;
    setIsProcessing(true);
    try {
      await onOverwrite();
      onOpenChange(false);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid="conflict-resolve-dialog"
        className="max-w-lg sm:max-w-[560px] w-full border-warning/40 shadow-2xl p-6 overflow-hidden"
      >
        <DialogHeader className="gap-2">
          <div className="flex items-center gap-2.5 text-warning">
            <div className="p-2 rounded-full bg-warning/10 text-warning">
              <AlertTriangle className="w-5 h-5 text-warning" />
            </div>
            <DialogTitle className="text-base sm:text-lg font-semibold text-foreground">
              Konflik Revisi Catatan
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs sm:text-sm text-muted-foreground leading-relaxed pt-1">
            {noteTitle ? (
              <>
                Catatan &quot;<strong>{noteTitle}</strong>&quot; telah dimodifikasi di jendela atau
                sesi lain sejak terakhir kali dibuka.
              </>
            ) : (
              'Catatan ini telah dimodifikasi di jendela atau sesi lain sejak terakhir kali dibuka.'
            )}
            <br />
            Pilih tindakan resolusi di bawah agar perubahan Anda tidak hilang secara diam-diam:
          </DialogDescription>
        </DialogHeader>

        <div className="my-2 p-3.5 rounded-md bg-muted/60 border border-border text-xs text-muted-foreground space-y-1.5 w-full min-w-0">
          <p>
            <strong className="text-foreground">Muat Ulang:</strong> Mengambil versi terbaru dari
            database (menimpa draf lokal Anda).
          </p>
          <p>
            <strong className="text-foreground">Salin Draf Lokal:</strong> Menyalin isi teks lokal
            saat ini ke clipboard agar dapat diselamatkan sebelum memuat ulang.
          </p>
          {onOverwrite && (
            <p>
              <strong className="text-foreground">Timpa Server:</strong> Memaksakan versi lokal Anda
              disimpan ke database sebagai revisi terbaru.
            </p>
          )}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pt-2 w-full">
          <Button
            data-testid="conflict-copy-btn"
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void handleCopy()}
            className="w-full sm:w-auto text-xs gap-1.5 shrink-0"
            disabled={isProcessing}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-success" />
                <span className="text-success font-medium">Tersalin!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Salin Draf Lokal</span>
              </>
            )}
          </Button>

          <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto shrink-0">
            <Button
              data-testid="conflict-reload-btn"
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void handleReload()}
              className="w-full sm:w-auto text-xs gap-1.5 border-warning/40 text-warning hover:bg-warning/10"
              disabled={isProcessing}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Muat Ulang dari Database</span>
            </Button>

            {onOverwrite && (
              <Button
                data-testid="conflict-overwrite-btn"
                type="button"
                variant="default"
                size="sm"
                onClick={() => void handleOverwrite()}
                className="w-full sm:w-auto text-xs gap-1.5 bg-warning text-warning-foreground hover:bg-warning/90"
                disabled={isProcessing}
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Timpa Server</span>
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

ConflictResolveDialog.displayName = 'ConflictResolveDialog';
