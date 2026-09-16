import * as React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@renderer/components/ui/alert-dialog';
import { buttonVariants } from '@renderer/components/ui/button';

export interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  noteTitle?: string;
}

/**
 * DeleteConfirmDialog (DESIGN.md §5.3, PRD US#24–28, TASK.md [P14-T1]).
 * Dialog konfirmasi penghapusan catatan berbasis shadcn/ui AlertDialog.
 */
export const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
  noteTitle,
}) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent data-testid="delete-confirm-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus Catatan Ini?</AlertDialogTitle>
          <AlertDialogDescription>
            {noteTitle ? (
              <>
                Catatan &quot;<strong>{noteTitle}</strong>&quot; akan dihapus permanen dari database
                lokal. Tindakan ini tidak dapat dibatalkan.
              </>
            ) : (
              'Catatan akan dihapus permanen dari database lokal. Tindakan ini tidak dapat dibatalkan.'
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel data-testid="delete-cancel-btn">Batal</AlertDialogCancel>
          <AlertDialogAction
            data-testid="delete-confirm-btn"
            className={buttonVariants({ variant: 'destructive' })}
            onClick={() => {
              onConfirm();
            }}
          >
            Hapus Catatan
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

DeleteConfirmDialog.displayName = 'DeleteConfirmDialog';
