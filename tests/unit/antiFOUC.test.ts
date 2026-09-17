import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * Helper to run the Anti-FOUC script extracted directly from index.html
 */
function runAntiFOUCScript(): void {
  try {
    const stored = localStorage.getItem('personal-note-ui-store');
    if (stored) {
      const parsed = JSON.parse(stored) as { state?: { theme?: string } };
      if (parsed.state && parsed.state.theme === 'light') {
        document.documentElement.classList.remove('dark');
        document.documentElement.style.backgroundColor = '#ffffff';
        document.documentElement.style.color = '#09090b';
        return;
      }
    }
  } catch {
    // ignore parse error
  }
  document.documentElement.classList.add('dark');
  document.documentElement.style.backgroundColor = '#000000';
  document.documentElement.style.color = '#ffffff';
}

describe('Anti-FOUC & index.html Specification (Architecture §4.4, §17 Kategori G, PRD US#50, DESIGN.md §7)', () => {
  const indexHtmlPath = path.resolve(__dirname, '../../src/renderer/index.html');
  let indexHtmlContent: string;

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
    document.documentElement.style.backgroundColor = '';
    document.documentElement.style.color = '';
    indexHtmlContent = fs.readFileSync(indexHtmlPath, 'utf-8');
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('index.html contains strict Content-Security-Policy meta tag (Architecture §4.4)', () => {
    expect(indexHtmlContent).toContain('http-equiv="Content-Security-Policy"');
    expect(indexHtmlContent).toContain("default-src 'self'");
    expect(indexHtmlContent).toContain("style-src 'self' 'unsafe-inline'");
  });

  it('index.html contains inline Anti-FOUC script inside <head> before <body> (DESIGN.md §7)', () => {
    expect(indexHtmlContent).toContain("localStorage.getItem('personal-note-ui-store')");
    expect(indexHtmlContent).toContain("document.documentElement.classList.remove('dark')");
    expect(indexHtmlContent).toContain("document.documentElement.classList.add('dark')");
    expect(indexHtmlContent).toContain('<div id="root"></div>');
    expect(indexHtmlContent).toContain('src="/main.tsx"');
  });

  it('removes dark class and applies light background when stored theme is light', () => {
    document.documentElement.classList.add('dark');
    localStorage.setItem('personal-note-ui-store', JSON.stringify({ state: { theme: 'light' } }));

    runAntiFOUCScript();

    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(['#ffffff', 'rgb(255, 255, 255)']).toContain(
      document.documentElement.style.backgroundColor,
    );
    expect(['#09090b', 'rgb(9, 9, 11)']).toContain(document.documentElement.style.color);
  });

  it('applies dark class and background when stored theme is dark', () => {
    localStorage.setItem('personal-note-ui-store', JSON.stringify({ state: { theme: 'dark' } }));

    runAntiFOUCScript();

    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(['#000000', 'rgb(0, 0, 0)']).toContain(document.documentElement.style.backgroundColor);
    expect(['#ffffff', 'rgb(255, 255, 255)']).toContain(document.documentElement.style.color);
  });

  it('defaults to dark mode when localStorage is empty (DESIGN.md §7)', () => {
    runAntiFOUCScript();

    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(['#000000', 'rgb(0, 0, 0)']).toContain(document.documentElement.style.backgroundColor);
  });

  it('safely catches corrupt JSON and falls back to dark mode without throwing error', () => {
    localStorage.setItem('personal-note-ui-store', '{ invalid json garbage');

    expect(() => runAntiFOUCScript()).not.toThrow();
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(['#000000', 'rgb(0, 0, 0)']).toContain(document.documentElement.style.backgroundColor);
  });
});
