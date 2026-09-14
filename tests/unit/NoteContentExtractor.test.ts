import { describe, it, expect } from 'vitest';
import { NoteContentExtractor } from '@main/domain/services/NoteContentExtractor';
import type { OutputData } from '@shared/types/note';

describe('NoteContentExtractor Domain Service', () => {
  describe('Fallback & Empty Handling', () => {
    it('returns default title and empty snippet message when content has empty blocks array', () => {
      const content: OutputData = { blocks: [] };
      const result = NoteContentExtractor.extract(content);

      expect(result).toEqual({
        title: 'Catatan Tanpa Judul',
        snippet: 'Belum ada konten tulisan...',
      });
    });

    it('handles undefined or null gracefully with default fallback', () => {
      expect(NoteContentExtractor.extract(null)).toEqual({
        title: 'Catatan Tanpa Judul',
        snippet: 'Belum ada konten tulisan...',
      });
      expect(NoteContentExtractor.extract(undefined)).toEqual({
        title: 'Catatan Tanpa Judul',
        snippet: 'Belum ada konten tulisan...',
      });
      expect(NoteContentExtractor.extract({} as OutputData)).toEqual({
        title: 'Catatan Tanpa Judul',
        snippet: 'Belum ada konten tulisan...',
      });
    });

    it('returns default title and empty string snippet when blocks exist but all contain only whitespace or empty text', () => {
      const content: OutputData = {
        blocks: [
          { type: 'paragraph', data: { text: '' } },
          { type: 'paragraph', data: { text: '    ' } },
          { type: 'header', data: { text: '   ' } },
        ],
      };
      const result = NoteContentExtractor.extract(content);

      expect(result).toEqual({
        title: 'Catatan Tanpa Judul',
        snippet: '',
      });
    });
  });

  describe('Single vs Multi Block Extraction', () => {
    it('extracts title and leaves snippet empty when only one non-empty block exists', () => {
      const content: OutputData = {
        blocks: [{ type: 'header', data: { text: 'Judul Utama' } }],
      };
      const result = NoteContentExtractor.extract(content);

      expect(result).toEqual({
        title: 'Judul Utama',
        snippet: '',
      });
    });

    it('extracts first block as title and second non-empty block as snippet', () => {
      const content: OutputData = {
        blocks: [
          { type: 'header', data: { text: 'Daftar Tugas' } },
          { type: 'paragraph', data: { text: 'Berikut tugas hari ini untuk diselesaikan.' } },
          { type: 'paragraph', data: { text: 'Blok ketiga yang diabaikan.' } },
        ],
      };
      const result = NoteContentExtractor.extract(content);

      expect(result).toEqual({
        title: 'Daftar Tugas',
        snippet: 'Berikut tugas hari ini untuk diselesaikan.',
      });
    });

    it('skips initial empty blocks until finding first non-empty block for title and second for snippet', () => {
      const content: OutputData = {
        blocks: [
          { type: 'paragraph', data: { text: '   ' } },
          { type: 'paragraph', data: { text: 'Judul dari blok kedua' } },
          { type: 'paragraph', data: { text: '' } },
          { type: 'paragraph', data: { text: 'Cuplikan dari blok keempat' } },
        ],
      };
      const result = NoteContentExtractor.extract(content);

      expect(result).toEqual({
        title: 'Judul dari blok kedua',
        snippet: 'Cuplikan dari blok keempat',
      });
    });

    it('truncates title to max 80 chars and snippet to max 140 chars', () => {
      const longTitle = 'T'.repeat(120);
      const longSnippet = 'S'.repeat(200);
      const content: OutputData = {
        blocks: [
          { type: 'header', data: { text: longTitle } },
          { type: 'paragraph', data: { text: longSnippet } },
        ],
      };
      const result = NoteContentExtractor.extract(content);

      expect(result.title).toHaveLength(80);
      expect(result.title).toBe('T'.repeat(80));
      expect(result.snippet).toHaveLength(140);
      expect(result.snippet).toBe('S'.repeat(140));
    });
  });

  describe('Supported Block Types (Polymorphic Extraction)', () => {
    it('extracts text from header block', () => {
      const content: OutputData = {
        blocks: [{ type: 'header', data: { text: 'Catatan Arsitektur', level: 2 } }],
      };
      const result = NoteContentExtractor.extract(content);
      expect(result.title).toBe('Catatan Arsitektur');
    });

    it('extracts text from paragraph block', () => {
      const content: OutputData = {
        blocks: [{ type: 'paragraph', data: { text: 'Paragraf pertama' } }],
      };
      const result = NoteContentExtractor.extract(content);
      expect(result.title).toBe('Paragraf pertama');
    });

    it('extracts text from quote block', () => {
      const content: OutputData = {
        blocks: [{ type: 'quote', data: { text: 'Simplicity is prerequisite for reliability.' } }],
      };
      const result = NoteContentExtractor.extract(content);
      expect(result.title).toBe('Simplicity is prerequisite for reliability.');
    });

    it('extracts text from list block with plain string items', () => {
      const content: OutputData = {
        blocks: [
          { type: 'list', data: { style: 'unordered', items: ['Apel', 'Jeruk', 'Mangga'] } },
        ],
      };
      const result = NoteContentExtractor.extract(content);
      expect(result.title).toBe('Apel, Jeruk, Mangga');
    });

    it('extracts text from list block with object items (Editor.js v2 style)', () => {
      const content: OutputData = {
        blocks: [
          {
            type: 'list',
            data: {
              style: 'ordered',
              items: [{ content: 'Langkah 1' }, { content: 'Langkah 2' }],
            },
          },
        ],
      };
      const result = NoteContentExtractor.extract(content);
      expect(result.title).toBe('Langkah 1, Langkah 2');
    });

    it('extracts text from checklist block', () => {
      const content: OutputData = {
        blocks: [
          {
            type: 'checklist',
            data: {
              items: [
                { text: 'Setup TypeScript', checked: true },
                { text: 'Tulis Unit Test', checked: false },
              ],
            },
          },
        ],
      };
      const result = NoteContentExtractor.extract(content);
      expect(result.title).toBe('Setup TypeScript, Tulis Unit Test');
    });

    it('extracts text from code block', () => {
      const content: OutputData = {
        blocks: [{ type: 'code', data: { code: 'const x = 42;' } }],
      };
      const result = NoteContentExtractor.extract(content);
      expect(result.title).toBe('const x = 42;');
    });

    it('extracts text from unknown block with data.text fallback', () => {
      const content: OutputData = {
        blocks: [{ type: 'custom_callout', data: { text: 'Pesan penting' } }],
      };
      const result = NoteContentExtractor.extract(content);
      expect(result.title).toBe('Pesan penting');
    });

    it('ignores block with empty or missing data', () => {
      const content: OutputData = {
        blocks: [
          { type: 'delimiter', data: {} },
          { type: 'paragraph', data: { text: 'Setelah delimiter' } },
        ],
      };
      const result = NoteContentExtractor.extract(content);
      expect(result.title).toBe('Setelah delimiter');
    });
  });

  describe('HTML and Entity Sanitization', () => {
    it('strips HTML tags completely', () => {
      const content: OutputData = {
        blocks: [
          {
            type: 'paragraph',
            data: { text: '<strong>Penting:</strong> Gunakan <em>Clean Architecture</em>.' },
          },
          {
            type: 'paragraph',
            data: { text: 'Klik <a href="https://example.com">tautan ini</a> untuk info.' },
          },
        ],
      };
      const result = NoteContentExtractor.extract(content);

      expect(result.title).toBe('Penting: Gunakan Clean Architecture.');
      expect(result.snippet).toBe('Klik tautan ini untuk info.');
    });

    it('replaces HTML entities with normal characters', () => {
      const content: OutputData = {
        blocks: [
          {
            type: 'paragraph',
            data: {
              text: 'Tom&nbsp;&amp;&nbsp;Jerry &lt;tag&gt; &quot;kutip&quot; &#39;petik&#39;',
            },
          },
        ],
      };
      const result = NoteContentExtractor.extract(content);

      expect(result.title).toBe('Tom & Jerry <tag> "kutip" \'petik\'');
    });

    it('collapses multiple whitespace, tabs, and newlines into a single space', () => {
      const content: OutputData = {
        blocks: [
          {
            type: 'paragraph',
            data: { text: '   Baris 1\n\n\t   Baris 2    Baris 3   ' },
          },
        ],
      };
      const result = NoteContentExtractor.extract(content);

      expect(result.title).toBe('Baris 1 Baris 2 Baris 3');
    });
  });
});
