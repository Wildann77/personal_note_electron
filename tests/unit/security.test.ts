import { describe, it, expect, vi, beforeEach } from 'vitest';
import EventEmitter from 'events';
import type { BrowserWindow } from 'electron';

const { MockBrowserWindow, mockShell } = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Emitter = require('events') as typeof EventEmitter;

  class MockWebContents extends Emitter {
    openHandler?: (details: { url: string }) => { action: 'deny' | 'allow' };

    setWindowOpenHandler(handler: (details: { url: string }) => { action: 'deny' | 'allow' }) {
      this.openHandler = handler;
    }
  }

  class BrowserWindowMock {
    webContents = new MockWebContents();
  }

  const shellMock = {
    openExternal: vi.fn().mockResolvedValue(undefined),
  };

  return {
    MockBrowserWindow: BrowserWindowMock,
    mockShell: shellMock,
  };
});

vi.mock('electron', () => ({
  BrowserWindow: MockBrowserWindow,
  shell: mockShell,
}));

import { applySecurityPolicies } from '@main/app/security';

describe('Navigation Security Policies — applySecurityPolicies (Unit)', () => {
  let win: BrowserWindow;

  beforeEach(() => {
    vi.clearAllMocks();
    win = new MockBrowserWindow() as unknown as BrowserWindow;
    applySecurityPolicies(win);
  });

  describe('will-navigate interception', () => {
    it('prevents default in-window navigation for any URL', () => {
      const preventDefault = vi.fn();
      const mockEvent = { preventDefault };

      win.webContents.emit('will-navigate', mockEvent, 'https://malicious.com');

      expect(preventDefault).toHaveBeenCalledTimes(1);
    });
  });

  describe('setWindowOpenHandler interception', () => {
    const getOpenHandler = () => {
      const mockWin = win as unknown as InstanceType<typeof MockBrowserWindow>;
      return mockWin.webContents.openHandler!;
    };

    it('always returns action: deny to avoid internal window creation', () => {
      const handler = getOpenHandler();
      expect(handler).toBeDefined();

      const result = handler({ url: 'https://example.com' });
      expect(result).toEqual({ action: 'deny' });
    });

    it('allows https: protocol and delegates to shell.openExternal', () => {
      const handler = getOpenHandler();
      const targetUrl = 'https://developer.mozilla.org/en-US/';

      const result = handler({ url: targetUrl });

      expect(result).toEqual({ action: 'deny' });
      expect(mockShell.openExternal).toHaveBeenCalledWith(targetUrl);
    });

    it('allows http: protocol and delegates to shell.openExternal', () => {
      const handler = getOpenHandler();
      const targetUrl = 'http://example.com/test';

      const result = handler({ url: targetUrl });

      expect(result).toEqual({ action: 'deny' });
      expect(mockShell.openExternal).toHaveBeenCalledWith(targetUrl);
    });

    it('allows mailto: protocol and delegates to shell.openExternal', () => {
      const handler = getOpenHandler();
      const targetUrl = 'mailto:user@example.com?subject=Hello';

      const result = handler({ url: targetUrl });

      expect(result).toEqual({ action: 'deny' });
      expect(mockShell.openExternal).toHaveBeenCalledWith(targetUrl);
    });

    it('blocks file: protocol and does NOT call shell.openExternal', () => {
      const handler = getOpenHandler();
      const targetUrl = 'file:///etc/passwd';

      const result = handler({ url: targetUrl });

      expect(result).toEqual({ action: 'deny' });
      expect(mockShell.openExternal).not.toHaveBeenCalled();
    });

    it('blocks javascript: protocol and does NOT call shell.openExternal', () => {
      const handler = getOpenHandler();
      const targetUrl = 'javascript:alert(1)';

      const result = handler({ url: targetUrl });

      expect(result).toEqual({ action: 'deny' });
      expect(mockShell.openExternal).not.toHaveBeenCalled();
    });

    it('blocks data: protocol and does NOT call shell.openExternal', () => {
      const handler = getOpenHandler();
      const targetUrl = 'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==';

      const result = handler({ url: targetUrl });

      expect(result).toEqual({ action: 'deny' });
      expect(mockShell.openExternal).not.toHaveBeenCalled();
    });

    it('blocks shell: protocol and does NOT call shell.openExternal', () => {
      const handler = getOpenHandler();
      const targetUrl = 'shell:open';

      const result = handler({ url: targetUrl });

      expect(result).toEqual({ action: 'deny' });
      expect(mockShell.openExternal).not.toHaveBeenCalled();
    });

    it('blocks other arbitrary protocols (e.g. ftp:) without calling shell.openExternal', () => {
      const handler = getOpenHandler();
      const targetUrl = 'ftp://ftp.example.com/file.zip';

      const result = handler({ url: targetUrl });

      expect(result).toEqual({ action: 'deny' });
      expect(mockShell.openExternal).not.toHaveBeenCalled();
    });

    it('handles malformed / invalid URLs gracefully without throwing or opening external', () => {
      const handler = getOpenHandler();
      const invalidUrl = 'not a valid url :/// test';

      expect(() => {
        const result = handler({ url: invalidUrl });
        expect(result).toEqual({ action: 'deny' });
      }).not.toThrow();

      expect(mockShell.openExternal).not.toHaveBeenCalled();
    });
  });
});
