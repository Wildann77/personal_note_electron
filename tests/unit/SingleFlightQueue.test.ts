import { describe, it, expect, vi } from 'vitest';
import { SingleFlightQueue } from '@renderer/utils/SingleFlightQueue';

describe('SingleFlightQueue', () => {
  it('menjalankan satu task autosave hingga selesai', async () => {
    const queue = new SingleFlightQueue();
    let executed = false;

    queue.enqueue(async () => {
      await Promise.resolve();
      executed = true;
    });

    await queue.waitForIdle();
    expect(executed).toBe(true);
    expect(queue.isBusy).toBe(false);
  });

  it('hanya mengeksekusi payload pending terbaru saat terjadi pengetikan cepat berturut-turut', async () => {
    const queue = new SingleFlightQueue();
    const executionLog: string[] = [];

    // Task 1: In-flight lambat
    let resolveTask1!: () => void;
    const task1Promise = new Promise<void>((resolve) => {
      resolveTask1 = resolve;
    });

    queue.enqueue(async () => {
      executionLog.push('task1-start');
      await task1Promise;
      executionLog.push('task1-end');
    });

    expect(queue.isBusy).toBe(true);

    // Enqueue task 2, task 3, task 4 cepat
    queue.enqueue(async () => {
      await Promise.resolve();
      executionLog.push('task2');
    });
    queue.enqueue(async () => {
      await Promise.resolve();
      executionLog.push('task3');
    });
    queue.enqueue(async () => {
      await Promise.resolve();
      executionLog.push('task4');
    });

    // Lepas task 1
    resolveTask1();
    await queue.waitForIdle();

    // Task 2 dan 3 ditimpa oleh task 4 (anti-race condition)
    expect(executionLog).toEqual(['task1-start', 'task1-end', 'task4']);
    expect(queue.isBusy).toBe(false);
  });

  it('tidak membeku saat task mengalami kegagalan/error', async () => {
    const queue = new SingleFlightQueue();
    const executed: string[] = [];
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Task 1 gagal
    queue.enqueue(async () => {
      await Promise.resolve();
      executed.push('task1');
      throw new Error('Save network error');
    });

    // Task 2 berhasil
    queue.enqueue(async () => {
      await Promise.resolve();
      executed.push('task2');
    });

    await queue.waitForIdle();
    expect(executed).toEqual(['task1', 'task2']);
    expect(queue.isBusy).toBe(false);
    consoleSpy.mockRestore();
  });

  it('membatalkan pending task saat clear() dipanggil', async () => {
    const queue = new SingleFlightQueue();
    const executed: string[] = [];

    let resolveTask1!: () => void;
    const task1Promise = new Promise<void>((resolve) => {
      resolveTask1 = resolve;
    });

    queue.enqueue(async () => {
      executed.push('task1');
      await task1Promise;
    });

    queue.enqueue(async () => {
      await Promise.resolve();
      executed.push('task2');
    });

    // Batalkan task 2
    queue.clear();

    resolveTask1();
    await queue.waitForIdle();

    expect(executed).toEqual(['task1']);
    expect(queue.isBusy).toBe(false);
  });

  it('mengembalikan status isBusy secara akurat', async () => {
    const queue = new SingleFlightQueue();
    expect(queue.isBusy).toBe(false);

    let resolveTask!: () => void;
    const p = new Promise<void>((res) => {
      resolveTask = res;
    });

    queue.enqueue(async () => {
      await p;
    });

    expect(queue.isBusy).toBe(true);
    resolveTask();
    await queue.waitForIdle();
    expect(queue.isBusy).toBe(false);
  });
});
