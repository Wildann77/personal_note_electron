import { describe, it, expect, beforeEach } from 'vitest';
import { useNotesStore, initialNotesState } from '@renderer/stores/useNotesStore';
import type { Note, NoteMetadata } from '@shared/types/note';

describe('useNotesStore (In-Memory Runtime)', () => {
  beforeEach(() => {
    useNotesStore.getState().reset();
  });

  it('initializes with clean default values', () => {
    const state = useNotesStore.getState();
    expect(state.notes).toEqual([]);
    expect(state.activeNote).toBeNull();
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
  });

  describe('Generic Setter `setField` (PRD §Testing Decisions Point 3)', () => {
    it('updates isLoading without modifying remaining fields', () => {
      useNotesStore.getState().setField('isLoading', true);

      const state = useNotesStore.getState();
      expect(state.isLoading).toBe(true);
      expect(state.notes).toEqual(initialNotesState.notes);
      expect(state.activeNote).toEqual(initialNotesState.activeNote);
      expect(state.error).toEqual(initialNotesState.error);
    });

    it('updates error without modifying remaining fields', () => {
      const errorMessage = 'Disk I/O error occurred';
      useNotesStore.getState().setField('error', errorMessage);

      const state = useNotesStore.getState();
      expect(state.error).toBe(errorMessage);
      expect(state.notes).toEqual(initialNotesState.notes);
      expect(state.activeNote).toEqual(initialNotesState.activeNote);
      expect(state.isLoading).toBe(false);
    });

    it('updates notes list without modifying remaining fields', () => {
      const mockNotes: NoteMetadata[] = [
        {
          id: 1,
          title: 'Title 1',
          snippet: 'Snippet 1',
          revision: 1,
          createdAt: 1000,
          updatedAt: 1000,
        },
      ];

      useNotesStore.getState().setField('notes', mockNotes);

      const state = useNotesStore.getState();
      expect(state.notes).toEqual(mockNotes);
      expect(state.activeNote).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('updates activeNote without modifying remaining fields', () => {
      const mockNote: Note = {
        id: 42,
        title: 'Active Note',
        snippet: 'Snippet 42',
        content: { time: 1000, blocks: [], version: '2.31.0' },
        revision: 2,
        createdAt: 1000,
        updatedAt: 2000,
      };

      useNotesStore.getState().setField('activeNote', mockNote);

      const state = useNotesStore.getState();
      expect(state.activeNote).toEqual(mockNote);
      expect(state.notes).toEqual([]);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('upsertNote', () => {
    it('inserts a new note and keeps list sorted by updatedAt DESC, id DESC', () => {
      const noteA: NoteMetadata = {
        id: 1,
        title: 'Older Note',
        snippet: 'Snippet',
        revision: 1,
        createdAt: 1000,
        updatedAt: 1000,
      };
      const noteB: NoteMetadata = {
        id: 2,
        title: 'Newer Note',
        snippet: 'Snippet',
        revision: 1,
        createdAt: 2000,
        updatedAt: 2000,
      };

      useNotesStore.getState().upsertNote(noteA);
      useNotesStore.getState().upsertNote(noteB);

      const notes = useNotesStore.getState().notes;
      expect(notes).toHaveLength(2);
      expect(notes[0].id).toBe(2);
      expect(notes[1].id).toBe(1);
    });

    it('updates an existing note in-place and re-sorts by updatedAt', () => {
      const noteA: NoteMetadata = {
        id: 1,
        title: 'Note 1',
        snippet: 'Snippet',
        revision: 1,
        createdAt: 1000,
        updatedAt: 1000,
      };
      const noteB: NoteMetadata = {
        id: 2,
        title: 'Note 2',
        snippet: 'Snippet',
        revision: 1,
        createdAt: 1500,
        updatedAt: 1500,
      };

      useNotesStore.getState().upsertNote(noteA);
      useNotesStore.getState().upsertNote(noteB);

      // Initially noteB is at index 0 because 1500 > 1000
      expect(useNotesStore.getState().notes[0].id).toBe(2);

      // Update noteA with newer timestamp
      useNotesStore.getState().upsertNote({
        ...noteA,
        title: 'Updated Note 1',
        updatedAt: 3000,
      });

      const updatedNotes = useNotesStore.getState().notes;
      expect(updatedNotes).toHaveLength(2);
      expect(updatedNotes[0].id).toBe(1);
      expect(updatedNotes[0].title).toBe('Updated Note 1');
      expect(updatedNotes[1].id).toBe(2);
    });

    it('synchronizes activeNote when upserting with full Note content', () => {
      const initialActive: Note = {
        id: 10,
        title: 'Old Title',
        snippet: 'Old Snippet',
        content: { time: 100, blocks: [{ type: 'paragraph', data: { text: 'Old' } }] },
        revision: 1,
        createdAt: 100,
        updatedAt: 100,
      };

      useNotesStore.getState().setField('activeNote', initialActive);

      const updatedActive: Note = {
        ...initialActive,
        title: 'New Title',
        content: { time: 200, blocks: [{ type: 'paragraph', data: { text: 'New' } }] },
        revision: 2,
        updatedAt: 200,
      };

      useNotesStore.getState().upsertNote(updatedActive);

      expect(useNotesStore.getState().activeNote).toEqual(updatedActive);
    });

    it('partially updates activeNote metadata when upserting with NoteMetadata', () => {
      const initialActive: Note = {
        id: 10,
        title: 'Old Title',
        snippet: 'Old Snippet',
        content: { time: 100, blocks: [{ type: 'paragraph', data: { text: 'Old' } }] },
        revision: 1,
        createdAt: 100,
        updatedAt: 100,
      };

      useNotesStore.getState().setField('activeNote', initialActive);

      const metadataUpdate: NoteMetadata = {
        id: 10,
        title: 'Broadcasted Title',
        snippet: 'Broadcasted Snippet',
        revision: 2,
        createdAt: 100,
        updatedAt: 300,
      };

      useNotesStore.getState().upsertNote(metadataUpdate);

      const currentActive = useNotesStore.getState().activeNote;
      expect(currentActive?.title).toBe('Broadcasted Title');
      expect(currentActive?.revision).toBe(2);
      expect(currentActive?.updatedAt).toBe(300);
      expect(currentActive?.content).toEqual(initialActive.content);
    });

    it('leaves activeNote untouched when upserting an unrelated note', () => {
      const active: Note = {
        id: 10,
        title: 'Active',
        snippet: 'Active',
        content: { blocks: [] },
        revision: 1,
        createdAt: 100,
        updatedAt: 100,
      };
      useNotesStore.getState().setField('activeNote', active);

      useNotesStore.getState().upsertNote({
        id: 99,
        title: 'Other',
        snippet: 'Other',
        revision: 1,
        createdAt: 200,
        updatedAt: 200,
      });

      expect(useNotesStore.getState().activeNote?.id).toBe(10);
    });
  });

  describe('deleteNote', () => {
    it('removes note from notes list by id', () => {
      const note: NoteMetadata = {
        id: 5,
        title: 'To be deleted',
        snippet: 'Snippet',
        revision: 1,
        createdAt: 100,
        updatedAt: 100,
      };
      useNotesStore.getState().upsertNote(note);
      expect(useNotesStore.getState().notes).toHaveLength(1);

      useNotesStore.getState().deleteNote(5);
      expect(useNotesStore.getState().notes).toHaveLength(0);
    });

    it('clears activeNote if the deleted note is the currently active note', () => {
      const note: Note = {
        id: 5,
        title: 'Active to be deleted',
        snippet: 'Snippet',
        content: { blocks: [] },
        revision: 1,
        createdAt: 100,
        updatedAt: 100,
      };
      useNotesStore.getState().upsertNote(note);
      useNotesStore.getState().setField('activeNote', note);

      useNotesStore.getState().deleteNote(5);
      expect(useNotesStore.getState().activeNote).toBeNull();
    });

    it('preserves activeNote if a different note is deleted', () => {
      const active: Note = {
        id: 10,
        title: 'Active',
        snippet: 'Snippet',
        content: { blocks: [] },
        revision: 1,
        createdAt: 100,
        updatedAt: 100,
      };
      const toDelete: NoteMetadata = {
        id: 20,
        title: 'Delete me',
        snippet: 'Snippet',
        revision: 1,
        createdAt: 100,
        updatedAt: 100,
      };

      useNotesStore.getState().upsertNote(active);
      useNotesStore.getState().upsertNote(toDelete);
      useNotesStore.getState().setField('activeNote', active);

      useNotesStore.getState().deleteNote(20);

      expect(useNotesStore.getState().notes).toHaveLength(1);
      expect(useNotesStore.getState().activeNote?.id).toBe(10);
    });
  });

  describe('reset', () => {
    it('resets entire store to initial clean state', () => {
      useNotesStore.getState().setField('isLoading', true);
      useNotesStore.getState().setField('error', 'Some error');
      useNotesStore.getState().upsertNote({
        id: 1,
        title: 'Test',
        snippet: 'Snippet',
        revision: 1,
        createdAt: 100,
        updatedAt: 100,
      });

      useNotesStore.getState().reset();

      expect(useNotesStore.getState().notes).toEqual([]);
      expect(useNotesStore.getState().activeNote).toBeNull();
      expect(useNotesStore.getState().isLoading).toBe(false);
      expect(useNotesStore.getState().error).toBeNull();
    });
  });
});
