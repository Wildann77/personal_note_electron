import type { ToolConstructable, ToolSettings } from '@editorjs/editorjs';
import Header from '@editorjs/header';
import List from '@editorjs/list';
import Checklist from '@editorjs/checklist';
import Quote from '@editorjs/quote';
import Code from '@editorjs/code';
import Delimiter from '@editorjs/delimiter';

export type EditorToolRegistry = Record<string, ToolConstructable | ToolSettings>;

/**
 * Saring opsi 'Checklist' bawaan @editorjs/list v2 agar tidak menduplikasi
 * tool @editorjs/checklist resmi yang memiliki tema dan styling kustom.
 */
const listToolbox = Array.isArray(
  (List as unknown as { toolbox?: Array<{ title?: string }> }).toolbox,
)
  ? (List as unknown as { toolbox: Array<{ title?: string }> }).toolbox.filter(
      (item) => item.title !== 'Checklist',
    )
  : undefined;

/**
 * Konfigurasi tools resmi default Editor.js (Architecture §2, PRD US#7).
 * Meliputi: Header (h1-h3), Nested List, Checklist, Code, Quote, Delimiter.
 */
export const defaultEditorTools: EditorToolRegistry = {
  header: {
    class: Header as unknown as ToolConstructable,
    inlineToolbar: ['link'],
    config: {
      placeholder: 'Judul Heading',
      levels: [1, 2, 3],
      defaultLevel: 1,
    },
  },
  list: {
    class: List as unknown as ToolConstructable,
    inlineToolbar: true,
    config: {
      defaultStyle: 'unordered',
    },
    ...(listToolbox ? { toolbox: listToolbox } : {}),
  },
  checklist: {
    class: Checklist,
    inlineToolbar: true,
  },
  quote: {
    class: Quote as unknown as ToolConstructable,
    inlineToolbar: true,
    config: {
      quotePlaceholder: 'Masukkan kutipan...',
      captionPlaceholder: 'Penulis kutipan',
    },
  },
  code: Code,
  delimiter: Delimiter,
};

/**
 * Mengembalikan salinan fresh konfigurasi tools default Editor.js.
 */
export function getDefaultEditorTools(): EditorToolRegistry {
  return { ...defaultEditorTools };
}

/**
 * Custom Tool Registry Manager untuk Editor.js.
 * Menerapkan Open/Closed Principle (OCP - Architecture §3.1):
 * Memungkinkan pendaftaran tool baru atau penyesuaian konfigurasi
 * tanpa mengubah kode inti editor.
 */
export class EditorToolsRegistry {
  private tools: EditorToolRegistry;

  constructor(initialTools: EditorToolRegistry = defaultEditorTools) {
    this.tools = { ...initialTools };
  }

  /**
   * Mendaftarkan atau mengganti tool pada registry.
   */
  public register(name: string, tool: ToolConstructable | ToolSettings): this {
    this.tools[name] = tool;
    return this;
  }

  /**
   * Menghapus tool dari registry berdasarkan nama.
   */
  public unregister(name: string): this {
    delete this.tools[name];
    return this;
  }

  /**
   * Memeriksa apakah sebuah tool terdaftar.
   */
  public has(name: string): boolean {
    return Object.prototype.hasOwnProperty.call(this.tools, name);
  }

  /**
   * Mengambil snapshot seluruh tool yang saat ini terdaftar.
   */
  public getTools(): EditorToolRegistry {
    return { ...this.tools };
  }

  /**
   * Mengembalikan registry ke set tool bawaan.
   */
  public reset(): this {
    this.tools = { ...defaultEditorTools };
    return this;
  }
}

/**
 * Singleton instance registry global untuk kemudahan akses.
 */
export const editorToolsRegistry = new EditorToolsRegistry();

/**
 * Factory function untuk membuat kumpulan tools dengan overrides/ekstensi kustom.
 */
export function createEditorTools(
  customTools?: Record<string, ToolConstructable | ToolSettings>,
): EditorToolRegistry {
  const merged: EditorToolRegistry = { ...defaultEditorTools };
  if (customTools) {
    for (const [key, val] of Object.entries(customTools)) {
      if (val !== undefined) {
        merged[key] = val;
      }
    }
  }
  return merged;
}
