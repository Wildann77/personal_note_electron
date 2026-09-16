import * as React from 'react';
import { useNotesStore } from '@renderer/stores/useNotesStore';
import { useUIStore } from '@renderer/stores/useUIStore';
import type { Note } from '@shared/types/note';

/**
 * Execute create note use case via IPC and synchronize state stores (PRD US#1, US#2).
 */
export async function executeCreateNote(): Promise<Note | null> {
  if (typeof window !== 'undefined' && window.electronAPI?.notes?.create) {
    const res = await window.electronAPI.notes.create();
    if (res.success && res.data) {
      useNotesStore.getState().setField('activeNote', res.data);
      useNotesStore.getState().upsertNote(res.data);
      useUIStore.getState().setActiveNoteId(res.data.id);
      return res.data;
    }
  }
  return null;
}

/**
 * Custom hook providing stable memoized create note handler.
 */
export function useCreateNote(customOnCreate?: () => void): () => void {
  return React.useCallback(() => {
    if (customOnCreate) {
      customOnCreate();
      return;
    }
    void executeCreateNote();
  }, [customOnCreate]);
}
