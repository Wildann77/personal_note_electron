import type { OutputData, OutputBlockData } from '@shared/types/note';

/**
 * Pure domain service for polymorphic extraction of clean plaintext title
 * and snippet from Editor.js block data.
 * Zero dependency on Electron, SQLite, or React.
 */
export class NoteContentExtractor {
  public static readonly DEFAULT_TITLE = 'Catatan Tanpa Judul';
  public static readonly EMPTY_SNIPPET_FALLBACK = 'Belum ada konten tulisan...';
  public static readonly MAX_TITLE_LENGTH = 80;
  public static readonly MAX_SNIPPET_LENGTH = 140;

  /**
   * Extracts title and preview snippet from Editor.js OutputData.
   * If blocks is empty, returns fallback title and empty snippet message.
   * First non-empty block becomes title, second non-empty block becomes snippet.
   */
  public static extract(content?: OutputData | null): { title: string; snippet: string } {
    if (!content || !Array.isArray(content.blocks) || content.blocks.length === 0) {
      return {
        title: this.DEFAULT_TITLE,
        snippet: this.EMPTY_SNIPPET_FALLBACK,
      };
    }

    let rawTitle = '';
    let rawSnippet = '';

    for (const block of content.blocks) {
      if (!block || typeof block !== 'object') continue;
      const text = this.extractBlockText(block);
      if (!text) continue;

      if (!rawTitle) {
        rawTitle = text;
      } else if (!rawSnippet) {
        rawSnippet = text;
        break;
      }
    }

    const title =
      rawTitle.length > 0 ? rawTitle.slice(0, this.MAX_TITLE_LENGTH) : this.DEFAULT_TITLE;
    const snippet = rawSnippet.length > 0 ? rawSnippet.slice(0, this.MAX_SNIPPET_LENGTH) : '';

    return { title, snippet };
  }

  /**
   * Extracts and cleans text from various Editor.js block types.
   */
  private static extractBlockText(block: OutputBlockData): string {
    if (!block || typeof block !== 'object') return '';
    const data = block.data as Record<string, unknown> | undefined;
    if (!data || typeof data !== 'object') return '';

    let text = '';

    switch (block.type) {
      case 'header':
      case 'paragraph':
      case 'quote':
        text = typeof data.text === 'string' ? data.text : '';
        break;

      case 'list':
        if (Array.isArray(data.items)) {
          text = data.items
            .map((item: unknown) => {
              if (typeof item === 'string') return item;
              if (item && typeof item === 'object' && 'content' in item) {
                const content = (item as Record<string, unknown>).content;
                return typeof content === 'string' || typeof content === 'number'
                  ? String(content)
                  : '';
              }
              return '';
            })
            .filter(Boolean)
            .join(', ');
        }
        break;

      case 'checklist':
        if (Array.isArray(data.items)) {
          text = data.items
            .map((item: unknown) => {
              if (item && typeof item === 'object' && 'text' in item) {
                const textVal = (item as Record<string, unknown>).text;
                return typeof textVal === 'string' || typeof textVal === 'number'
                  ? String(textVal)
                  : '';
              }
              return '';
            })
            .filter(Boolean)
            .join(', ');
        }
        break;

      case 'code':
        text = typeof data.code === 'string' ? data.code : '';
        break;

      default:
        text = typeof data.text === 'string' ? data.text : '';
        break;
    }

    return this.cleanText(text);
  }

  /**
   * Strips HTML tags, decodes common HTML entities, collapses whitespace, and trims.
   */
  private static cleanText(htmlOrText: string): string {
    return htmlOrText
      .replace(/<[^>]*>?/gm, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }
}
