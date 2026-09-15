import { useEffect } from 'react';
import { useNotesStore } from '@renderer/stores/useNotesStore';
import type { NoteMutationPayload } from '@shared/types/note';

export interface UseSyncListenerOptions {
  onMutation?: (payload: NoteMutationPayload) => void;
}

/**
 * useSyncListener
 *
 * Hook React untuk mendengarkan broadcast mutasi catatan dari main process
 * (Architecture §17 PRD Further Note #1, PRD US#37).
 * Secara reaktif memperbarui in-memory useNotesStore di window mana pun
 * (baik main window maupun child window).
 */
export function useSyncListener(options?: UseSyncListenerOptions): void {
  const onMutation = options?.onMutation;

  useEffect(() => {
    if (typeof window === 'undefined' || !window.electronAPI?.notes?.onBroadcastChanged) {
      return;
    }

    const unsubscribe = window.electronAPI.notes.onBroadcastChanged(
      (payload: NoteMutationPayload) => {
        const store = useNotesStore.getState();

        switch (payload.type) {
          case 'create':
          case 'update': {
            if (payload.note) {
              store.upsertNote(payload.note);
            } else if (window.electronAPI?.notes?.getById) {
              void window.electronAPI.notes.getById(payload.noteId).then((result) => {
                if (result.success) {
                  useNotesStore.getState().upsertNote(result.data);
                }
              });
            }
            break;
          }
          case 'delete': {
            store.deleteNote(payload.noteId);
            break;
          }
        }

        onMutation?.(payload);
      },
    );

    return () => {
      unsubscribe();
    };
  }, [onMutation]);
}
