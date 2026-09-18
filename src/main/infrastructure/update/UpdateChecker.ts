import { app } from 'electron';
import { WindowManager } from '../windows/WindowManager';
import { logger } from '../logger/logger';
import { IPC_CHANNELS } from '@shared/constants/ipc';
import type { UpdateReleasePayload } from '@shared/types/api';

export interface UpdateCheckerOptions {
  owner?: string;
  repo?: string;
  initialDelayMs?: number;
  intervalMs?: number;
  fetcher?: typeof fetch;
  currentVersion?: string;
}

interface GitHubReleaseResponse {
  tag_name?: string;
  name?: string;
  body?: string;
  html_url?: string;
  published_at?: string;
}

/**
 * Service responsible for periodic GitHub Releases update checks (Architecture §15.3, PRD US#61, TASK [P23-T2]).
 * Runs purely in main process, executes manual notification strategy without background auto-installer daemon.
 */
export class UpdateChecker {
  public static readonly DEFAULT_OWNER = process.env.GITHUB_OWNER || 'Wildann77';
  public static readonly DEFAULT_REPO = process.env.GITHUB_REPO || 'personal_note_electron';
  public static readonly DEFAULT_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
  public static readonly DEFAULT_INITIAL_DELAY_MS = 5000; // 5 seconds after launch

  private static initialTimeout: NodeJS.Timeout | null = null;
  private static intervalTimer: NodeJS.Timeout | null = null;
  private static isRunning = false;

  /**
   * Compares a remote release tag against current application version using standard semver.
   * Returns true if remote version is strictly greater than current version.
   *
   * @param remoteTag e.g. "v1.1.0" or "1.1.0"
   * @param currentVersion e.g. "1.0.0"
   */
  public static isNewerVersion(remoteTag: string, currentVersion: string): boolean {
    if (!remoteTag || !currentVersion) return false;

    const cleanRemote = remoteTag.replace(/^[vV]/, '').trim();
    const cleanCurrent = currentVersion.replace(/^[vV]/, '').trim();

    const remoteParts = cleanRemote.split('.').map((p) => parseInt(p, 10));
    const currentParts = cleanCurrent.split('.').map((p) => parseInt(p, 10));

    const maxLen = Math.max(remoteParts.length, currentParts.length);
    for (let i = 0; i < maxLen; i++) {
      const r = isNaN(remoteParts[i]) ? 0 : remoteParts[i];
      const c = isNaN(currentParts[i]) ? 0 : currentParts[i];
      if (r > c) return true;
      if (r < c) return false;
    }

    return false;
  }

  /**
   * Performs an asynchronous check to the GitHub Releases endpoint.
   * If a newer release exists, broadcasts the payload to all open windows.
   */
  public static async checkForUpdates(
    options?: Partial<UpdateCheckerOptions>,
  ): Promise<UpdateReleasePayload | null> {
    const owner = options?.owner ?? this.DEFAULT_OWNER;
    const repo = options?.repo ?? this.DEFAULT_REPO;
    const fetchFn = options?.fetcher ?? fetch;
    const currentVersion = options?.currentVersion ?? app.getVersion();

    const endpoint = `https://api.github.com/repos/${owner}/${repo}/releases/latest`;
    logger.info('[UpdateChecker] Memeriksa pembaruan rilis GitHub', { endpoint, currentVersion });

    try {
      const response = await fetchFn(endpoint, {
        headers: {
          'User-Agent': 'PersonalNote-DesktopApp',
          Accept: 'application/vnd.github.v3+json',
        },
      });

      if (!response.ok) {
        logger.info(
          `[UpdateChecker] Pengecekan rilis mengembalikan HTTP status ${response.status}`,
        );
        return null;
      }

      const data = (await response.json()) as GitHubReleaseResponse;
      const remoteTag = data.tag_name || '';

      if (this.isNewerVersion(remoteTag, currentVersion)) {
        let formattedDate: string | undefined;
        if (data.published_at) {
          try {
            formattedDate = new Date(data.published_at).toLocaleDateString();
          } catch {
            formattedDate = data.published_at;
          }
        }

        const payload: UpdateReleasePayload = {
          currentVersion,
          latestVersion: remoteTag,
          releaseUrl: data.html_url || `https://github.com/${owner}/${repo}/releases`,
          releaseName: data.name,
          releaseNotes: data.body,
          publishedAt: formattedDate,
        };

        logger.info('[UpdateChecker] Versi baru terdeteksi, menyiarkan ke renderer', {
          latestVersion: remoteTag,
          currentVersion,
        });

        this.broadcastUpdate(payload);
        return payload;
      } else {
        logger.info('[UpdateChecker] Aplikasi sudah menggunakan versi terkini', {
          currentVersion,
          remoteTag,
        });
        return null;
      }
    } catch (err) {
      logger.warn(
        '[UpdateChecker] Gagal memeriksa pembaruan rilis GitHub (offline/network error):',
        err,
      );
      return null;
    }
  }

  /**
   * Broadcasts the update payload via IPC to all active browser windows.
   */
  public static broadcastUpdate(payload: UpdateReleasePayload): void {
    const windows = WindowManager.getAllWindows();
    for (const win of windows) {
      if (!win.isDestroyed() && !win.webContents.isDestroyed()) {
        win.webContents.send(IPC_CHANNELS.UPDATE_AVAILABLE, payload);
      }
    }
  }

  /**
   * Starts the periodic update checker (initial delay + recurring interval).
   */
  public static start(options?: Partial<UpdateCheckerOptions>): void {
    this.stop();
    this.isRunning = true;

    const initialDelay = options?.initialDelayMs ?? this.DEFAULT_INITIAL_DELAY_MS;
    const intervalMs = options?.intervalMs ?? this.DEFAULT_INTERVAL_MS;

    logger.info('[UpdateChecker] Memulai service update checker', { initialDelay, intervalMs });

    this.initialTimeout = setTimeout(() => {
      void this.checkForUpdates(options);
    }, initialDelay);

    this.intervalTimer = setInterval(() => {
      void this.checkForUpdates(options);
    }, intervalMs);
  }

  /**
   * Stops any pending timers for the update checker.
   */
  public static stop(): void {
    if (this.initialTimeout) {
      clearTimeout(this.initialTimeout);
      this.initialTimeout = null;
    }
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
    this.isRunning = false;
  }

  /**
   * Returns whether the update checker service is actively running.
   */
  public static getActiveStatus(): boolean {
    return this.isRunning;
  }
}
