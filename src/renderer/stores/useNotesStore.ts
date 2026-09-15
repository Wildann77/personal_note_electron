import { create } from 'zustand';
import type { Note, NoteMetadata } from '@shared/types/note';

/**
 * State data attributes for runtime notes memory store.
 */
export interface NotesStateData {
  notes: NoteMetadata[];
  activeNote: Note | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Action methods for runtime notes memory store.
 */
export interface NotesStateActions {
  /**
   * Generic setter by field name and value (PRD §Testing Decisions point 3).
   * Updates only targeted field without affecting remaining state attributes.
   */
  setField: <K extends keyof NotesStateData>(field: K, value: NotesStateData[K]) => void;

  /**
   * Inserts or updates a note in the in-memory list, maintaining descending sort order (updatedAt DESC, id DESC).
   * Also synchronizes activeNote if currently selected note matches noteId.
   */
  upsertNote: (note: NoteMetadata | Note) => void;

  /**
   * Removes a note from the in-memory list by id.
   * If the deleted note was active, resets activeNote to null.
   */
  deleteNote: (id: number) => void;

  /**
   * Resets the store back to initial clean state.
   */
  reset: () => void;
}

export type NotesStore = NotesStateData & NotesStateActions;

export const initialNotesState: NotesStateData = {
  notes: [],
  activeNote: null,
  isLoading: false,
  error: null,
};

/**
 * Helper to extract pure NoteMetadata from Note or NoteMetadata.
 */
function toMetadata(note: NoteMetadata | Note): NoteMetadata {
  return {
    id: note.id,
    title: note.title,
    snippet: note.snippet,
    revision: note.revision,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  };
}

/**
 * Runtime in-memory Zustand store for notes.
 * Strictly non-persistent to eliminate localStorage bloat (Further Notes #3).
 */
export const useNotesStore = create<NotesStore>()((set) => ({
  ...initialNotesState,

  setField: (field, value) => {
    set({ [field]: value } as Pick<NotesStateData, typeof field>);
  },

  upsertNote: (note) => {
    const metadata = toMetadata(note);
    set((state) => {
      const existingIndex = state.notes.findIndex((n) => n.id === metadata.id);
      let updatedList: NoteMetadata[];

      if (existingIndex >= 0) {
        updatedList = [...state.notes];
        updatedList[existingIndex] = metadata;
      } else {
        updatedList = [metadata, ...state.notes];
      }

      updatedList.sort((a, b) => b.updatedAt - a.updatedAt || b.id - a.id);

      let nextActiveNote = state.activeNote;
      if (state.activeNote && state.activeNote.id === metadata.id) {
        if ('content' in note && note.content) {
          nextActiveNote = note;
        } else {
          nextActiveNote = {
            ...state.activeNote,
            ...metadata,
          };
        }
      }

      return {
        notes: updatedList,
        activeNote: nextActiveNote,
      };
    });
  },

  deleteNote: (id) => {
    set((state) => ({
      notes: state.notes.filter((n) => n.id !== id),
      activeNote: state.activeNote?.id === id ? null : state.activeNote,
    }));
  },

  reset: () => {
    set(initialNotesState);
  },
}));
