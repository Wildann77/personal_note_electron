/**
 * SingleFlightQueue
 *
 * Sisi renderer queue yang menjamin hanya ada 1 request autosave
 * "in-flight" pada satu waktu (Architecture §7.2).
 * Request baru selama masih ada task aktif ditumpuk sebagai `pendingPayload`
 * (menimpa task tertunda sebelumnya), dan diproses setelah task aktif selesai.
 */
export class SingleFlightQueue {
  private inFlightPromise: Promise<void> | null = null;
  private pendingPayload: (() => Promise<void>) | null = null;

  /**
   * Daftarkan task autosave async ke antrean.
   * Jika task lain sedang in-flight, task ini menjadi pending payload terbaru.
   */
  enqueue(task: () => Promise<void>): void {
    this.pendingPayload = task;
    this.process();
  }

  /**
   * Batalkan pending payload yang belum dieksekusi.
   * Berguna saat berganti catatan aktif atau unmount hook.
   */
  clear(): void {
    this.pendingPayload = null;
  }

  /**
   * Mengecek apakah queue sedang aktif memproses atau memiliki pending payload.
   */
  get isBusy(): boolean {
    return this.inFlightPromise !== null || this.pendingPayload !== null;
  }

  /**
   * Menunggu sampai semua task in-flight dan pending selesai diproses.
   */
  async waitForIdle(): Promise<void> {
    while (this.inFlightPromise || this.pendingPayload) {
      if (this.inFlightPromise) {
        await this.inFlightPromise;
      } else if (this.pendingPayload) {
        this.process();
      }
    }
  }

  private process(): void {
    if (this.inFlightPromise) return;
    if (!this.pendingPayload) return;

    const currentTask = this.pendingPayload;
    this.pendingPayload = null;

    this.inFlightPromise = (async () => {
      try {
        await currentTask();
      } catch (err) {
        // Tangkap error agar uncaught rejection tidak mematikan antrean/runtime
        console.error('SingleFlightQueue: Task execution error:', err);
      } finally {
        this.inFlightPromise = null;
        if (this.pendingPayload) {
          this.process();
        }
      }
    })();
  }
}
