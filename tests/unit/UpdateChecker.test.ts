import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { UpdateChecker } from '@main/infrastructure/update/UpdateChecker';
import { WindowManager } from '@main/infrastructure/windows/WindowManager';
import { IPC_CHANNELS } from '@shared/constants/ipc';

describe('UpdateChecker (Unit - Architecture §15.3, PRD US#61, TASK [P23-T2])', () => {
  beforeEach(() => {
    UpdateChecker.stop();
    vi.clearAllMocks();
  });

  afterEach(() => {
    UpdateChecker.stop();
  });

  describe('isNewerVersion', () => {
    it('detects newer minor version', () => {
      expect(UpdateChecker.isNewerVersion('v1.1.0', '1.0.0')).toBe(true);
      expect(UpdateChecker.isNewerVersion('1.1.0', '1.0.0')).toBe(true);
    });

    it('detects newer patch version', () => {
      expect(UpdateChecker.isNewerVersion('v1.0.1', '1.0.0')).toBe(true);
    });

    it('detects newer major version', () => {
      expect(UpdateChecker.isNewerVersion('v2.0.0', '1.9.9')).toBe(true);
    });

    it('returns false for equal version', () => {
      expect(UpdateChecker.isNewerVersion('v1.0.0', '1.0.0')).toBe(false);
      expect(UpdateChecker.isNewerVersion('1.0.0', '1.0.0')).toBe(false);
    });

    it('returns false for older remote version', () => {
      expect(UpdateChecker.isNewerVersion('v0.9.0', '1.0.0')).toBe(false);
    });

    it('returns false for empty or invalid version strings', () => {
      expect(UpdateChecker.isNewerVersion('', '1.0.0')).toBe(false);
      expect(UpdateChecker.isNewerVersion('v1.0.0', '')).toBe(false);
    });
  });

  describe('checkForUpdates', () => {
    it('fetches releases, detects newer version, and broadcasts update payload', async () => {
      const mockPayload = {
        tag_name: 'v1.2.0',
        name: 'Release 1.2.0',
        body: 'Exciting features added',
        html_url: 'https://github.com/Wildann77/personal_note_electron/releases/tag/v1.2.0',
        published_at: '2026-09-17T12:00:00Z',
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockPayload),
      });

      const mockSend = vi.fn();
      const mockWindow = {
        isDestroyed: () => false,
        webContents: {
          isDestroyed: () => false,
          send: mockSend,
        },
      };
      vi.spyOn(WindowManager, 'getAllWindows').mockReturnValue([
        mockWindow as unknown as import('electron').BrowserWindow,
      ]);

      const result = await UpdateChecker.checkForUpdates({
        fetcher: mockFetch as unknown as typeof fetch,
        currentVersion: '1.0.0',
      });

      expect(result).not.toBeNull();
      expect(result?.latestVersion).toBe('v1.2.0');
      expect(result?.currentVersion).toBe('1.0.0');
      expect(result?.releaseUrl).toBe(mockPayload.html_url);
      expect(mockSend).toHaveBeenCalledWith(
        IPC_CHANNELS.UPDATE_AVAILABLE,
        expect.objectContaining({
          latestVersion: 'v1.2.0',
        }),
      );
    });

    it('does not broadcast when remote release is not newer', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ tag_name: 'v1.0.0' }),
      });

      const mockSend = vi.fn();
      vi.spyOn(WindowManager, 'getAllWindows').mockReturnValue([]);

      const result = await UpdateChecker.checkForUpdates({
        fetcher: mockFetch as unknown as typeof fetch,
        currentVersion: '1.0.0',
      });

      expect(result).toBeNull();
      expect(mockSend).not.toHaveBeenCalled();
    });

    it('handles non-200 HTTP response gracefully (returns null)', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });

      const result = await UpdateChecker.checkForUpdates({
        fetcher: mockFetch as unknown as typeof fetch,
        currentVersion: '1.0.0',
      });

      expect(result).toBeNull();
    });

    it('handles network throw gracefully without bubbling exception', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network offline'));

      const result = await UpdateChecker.checkForUpdates({
        fetcher: mockFetch as unknown as typeof fetch,
        currentVersion: '1.0.0',
      });

      expect(result).toBeNull();
    });
  });

  describe('start & stop lifecycle', () => {
    it('manages timer activation status correctly', () => {
      expect(UpdateChecker.getActiveStatus()).toBe(false);
      UpdateChecker.start({ initialDelayMs: 100000, intervalMs: 200000 });
      expect(UpdateChecker.getActiveStatus()).toBe(true);
      UpdateChecker.stop();
      expect(UpdateChecker.getActiveStatus()).toBe(false);
    });
  });
});
