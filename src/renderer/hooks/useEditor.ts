import { useEffect, useRef, useState, useCallback } from 'react';
import EditorJS, {
  type OutputData,
  type ToolConstructable,
  type ToolSettings,
} from '@editorjs/editorjs';
import type { Note } from '@shared/types/note';
import type { AppErrorPayload } from '@shared/types/result';
import { useNotesStore } from '@renderer/stores/useNotesStore';
import { SingleFlightQueue } from '@renderer/utils/SingleFlightQueue';
import { getDefaultEditorTools } from '@renderer/components/editor/editorTools';
import DragDrop from 'editorjs-drag-drop';

export { getDefaultEditorTools };

export const AUTOSAVE_DEBOUNCE_MS = 600;

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'conflict';

export interface ConflictData {
  serverNote: Note | null;
  localContent: OutputData;
  error: AppErrorPayload;
}

export interface UseEditorOptions {
  note: Note | null;
  holderId?: string;
  readOnly?: boolean;
  placeholder?: string;
  debounceMs?: number;
  tools?: Record<string, ToolConstructable | ToolSettings>;
  onSaveSuccess?: (note: Note) => void;
  onConflict?: (conflict: ConflictData) => void;
  onError?: (error: unknown) => void;
}

export interface UseEditorReturn {
  editorRef: React.MutableRefObject<EditorJS | null>;
  saveStatus: SaveStatus;
  isReady: boolean;
  isConflict: boolean;
  conflictData: ConflictData | null;
  forceSave: () => Promise<void>;
  resolveReload: () => Promise<void>;
  resolveKeepLocal: () => Promise<void>;
  dismissConflict: () => void;
}

/**
 * useEditor
 *
 * Lifecycle wrapper Editor.js & debounced autosave (600ms) dengan
 * SingleFlightQueue dan Optimistic Concurrency Control (OCC).
 */
export function useEditor({
  note,
  holderId = 'editorjs',
  readOnly = false,
  placeholder = 'Mulai menulis catatan...',
  debounceMs = AUTOSAVE_DEBOUNCE_MS,
  tools,
  onSaveSuccess,
  onConflict,
  onError,
}: UseEditorOptions): UseEditorReturn {
  const editorRef = useRef<EditorJS | null>(null);
  const queueRef = useRef<SingleFlightQueue>(new SingleFlightQueue());
  const localRevisionRef = useRef<number>(note?.revision ?? 1);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef<boolean>(true);
  const currentNoteIdRef = useRef<number | null>(note?.id ?? null);

  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [isReady, setIsReady] = useState<boolean>(false);
  const [isConflict, setIsConflict] = useState<boolean>(false);
  const [conflictData, setConflictData] = useState<ConflictData | null>(null);

  const noteRef = useRef<Note | null>(note);
  noteRef.current = note;

  const noteId = note?.id;
  const noteRevision = note?.revision;

  // Selaraskan local revision saat prop note berganti
  useEffect(() => {
    if (noteId !== undefined && noteRevision !== undefined) {
      localRevisionRef.current = noteRevision;
      currentNoteIdRef.current = noteId;
    } else {
      currentNoteIdRef.current = null;
    }
  }, [noteId, noteRevision]);

  const executeSave = useCallback(async () => {
    const activeNote = noteRef.current;
    if (!editorRef.current || !activeNote) return;

    try {
      setSaveStatus('saving');
      const content = await editorRef.current.save();

      queueRef.current.enqueue(async () => {
        if (!isMountedRef.current) return;
        if (typeof window === 'undefined' || !window.electronAPI?.notes?.update) {
          if (isMountedRef.current) {
            setSaveStatus('saved');
          }
          return;
        }

        const result = await window.electronAPI.notes.update({
          id: activeNote.id,
          expectedRevision: localRevisionRef.current,
          content,
        });

        if (!isMountedRef.current) return;

        if (result.success) {
          localRevisionRef.current = result.data.revision;
          setSaveStatus('saved');
          setIsConflict(false);
          setConflictData(null);
          useNotesStore.getState().upsertNote(result.data);
          onSaveSuccess?.(result.data);
        } else {
          if (result.error.code === 'CONCURRENCY_ERROR') {
            setSaveStatus('conflict');
            setIsConflict(true);
            const conflict: ConflictData = {
              serverNote: null,
              localContent: content,
              error: result.error,
            };
            setConflictData(conflict);
            onConflict?.(conflict);
          } else {
            setSaveStatus('error');
            onError?.(result.error);
          }
        }
      });
    } catch (err) {
      console.error('useEditor: Error saat memproses save editor:', err);
      if (isMountedRef.current) {
        setSaveStatus('error');
        onError?.(err);
      }
    }
  }, [onSaveSuccess, onConflict, onError]);

  const triggerDebouncedSave = useCallback(() => {
    if (readOnly || !noteRef.current) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      void executeSave();
    }, debounceMs);
  }, [readOnly, debounceMs, executeSave]);

  const forceSave = useCallback(async () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    await executeSave();
  }, [executeSave]);

  const resolveReload = useCallback(async () => {
    if (!note) return;

    if (typeof window === 'undefined' || !window.electronAPI?.notes?.getById) {
      setIsConflict(false);
      setConflictData(null);
      setSaveStatus('idle');
      return;
    }

    try {
      setSaveStatus('saving');
      const result = await window.electronAPI.notes.getById(note.id);
      if (!isMountedRef.current) return;

      if (result.success) {
        localRevisionRef.current = result.data.revision;
        useNotesStore.getState().upsertNote(result.data);
        setIsConflict(false);
        setConflictData(null);
        setSaveStatus('idle');

        if (editorRef.current && typeof editorRef.current.render === 'function') {
          await editorRef.current.render(result.data.content);
        }
      } else {
        setSaveStatus('error');
        onError?.(result.error);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setSaveStatus('error');
        onError?.(err);
      }
    }
  }, [note, onError]);

  const resolveKeepLocal = useCallback(async () => {
    if (!note || !editorRef.current) return;

    if (
      typeof window === 'undefined' ||
      !window.electronAPI?.notes?.getById ||
      !window.electronAPI?.notes?.update
    ) {
      setIsConflict(false);
      setConflictData(null);
      return;
    }

    try {
      setSaveStatus('saving');
      const serverRes = await window.electronAPI.notes.getById(note.id);
      if (!serverRes.success) {
        if (isMountedRef.current) setSaveStatus('error');
        return;
      }

      const content = await editorRef.current.save();
      const updateRes = await window.electronAPI.notes.update({
        id: note.id,
        expectedRevision: serverRes.data.revision,
        content,
      });

      if (!isMountedRef.current) return;

      if (updateRes.success) {
        localRevisionRef.current = updateRes.data.revision;
        useNotesStore.getState().upsertNote(updateRes.data);
        setIsConflict(false);
        setConflictData(null);
        setSaveStatus('saved');
        onSaveSuccess?.(updateRes.data);
      } else {
        setSaveStatus('conflict');
      }
    } catch (err) {
      if (isMountedRef.current) {
        setSaveStatus('error');
        onError?.(err);
      }
    }
  }, [note, onSaveSuccess, onError]);

  const dismissConflict = useCallback(() => {
    setIsConflict(false);
    setConflictData(null);
    setSaveStatus('idle');
  }, []);

  // Inisialisasi & Destruksi Editor.js instance
  useEffect(() => {
    isMountedRef.current = true;
    const queue = queueRef.current;

    if (!noteId) {
      setIsReady(false);
      setSaveStatus('idle');
      return;
    }

    // Pastikan DOM holder element tersedia sebelum inisialisasi
    const holderElement =
      typeof document !== 'undefined' ? document.getElementById(holderId) : null;
    if (!holderElement) {
      return;
    }

    // Bersihkan DOM sisa sebelum membuat instance baru
    holderElement.innerHTML = '';
    holderElement.setAttribute('spellcheck', 'false');

    const editorTools = tools ?? getDefaultEditorTools();
    const initialContent = noteRef.current?.content;

    const instance = new EditorJS({
      holder: holderId,
      data: initialContent && initialContent.blocks ? initialContent : undefined,
      placeholder,
      readOnly,
      tools: editorTools,
      onChange: () => {
        triggerDebouncedSave();
      },
      onReady: () => {
        if (isMountedRef.current) {
          try {
            new DragDrop(instance);
          } catch (err) {
            console.warn('[useEditor] Failed to initialize DragDrop:', err);
          }
          if (holderElement) {
            holderElement.setAttribute('spellcheck', 'false');
            holderElement.querySelectorAll('[contenteditable]').forEach((el) => {
              el.setAttribute('spellcheck', 'false');
            });
          }
          setIsReady(true);
        }
      },
    });

    editorRef.current = instance;

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }

      queue.clear();

      if (editorRef.current) {
        const toDestroy = editorRef.current;
        editorRef.current = null;
        setIsReady(false);

        void toDestroy.isReady
          .then(() => {
            toDestroy.destroy();
          })
          .catch(() => {
            // Abaikan jika sudah didestroy atau gagal
          });
      }
    };
  }, [noteId, holderId, readOnly, placeholder, tools, triggerDebouncedSave]);

  return {
    editorRef,
    saveStatus,
    isReady,
    isConflict,
    conflictData,
    forceSave,
    resolveReload,
    resolveKeepLocal,
    dismissConflict,
  };
}
