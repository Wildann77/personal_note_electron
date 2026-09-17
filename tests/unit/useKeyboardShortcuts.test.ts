import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, cleanup } from '@testing-library/react';
import { useKeyboardShortcuts } from '@renderer/hooks/useKeyboardShortcuts';
import * as useCreateNoteModule from '@renderer/components/sidebar/useCreateNote';

describe('useKeyboardShortcuts (PRD US#3, US#45, US#53, TASK.md [P18-T3])', () => {
  let mockCreateNote: ReturnType<typeof vi.fn>;
  let mockCloseWindow: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockCreateNote = vi.fn().mockResolvedValue({ success: true, data: { id: 101 } });
    mockCloseWindow = vi.fn();

    window.electronAPI = {
      ...window.electronAPI,
      notes: {
        create: mockCreateNote as unknown as typeof window.electronAPI.notes.create,
      },
      windowControls: {
        close: mockCloseWindow as unknown as () => void,
        minimize: vi.fn() as unknown as () => void,
        maximize: vi.fn() as unknown as () => void,
      },
    } as unknown as typeof window.electronAPI;
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('triggers executeCreateNote when Ctrl+N is pressed in MainWindow', () => {
    const executeSpy = vi
      .spyOn(useCreateNoteModule, 'executeCreateNote')
      .mockResolvedValue(undefined as never);

    renderHook(() => useKeyboardShortcuts({ isChildWindow: false }));

    const event = new KeyboardEvent('keydown', {
      key: 'n',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

    window.dispatchEvent(event);

    expect(preventDefaultSpy).toHaveBeenCalledTimes(1);
    expect(executeSpy).toHaveBeenCalledTimes(1);
  });

  it('triggers executeCreateNote when Cmd+N is pressed on macOS', () => {
    const executeSpy = vi
      .spyOn(useCreateNoteModule, 'executeCreateNote')
      .mockResolvedValue(undefined as never);

    renderHook(() => useKeyboardShortcuts({ isChildWindow: false }));

    const event = new KeyboardEvent('keydown', {
      key: 'N',
      metaKey: true,
      bubbles: true,
      cancelable: true,
    });
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

    window.dispatchEvent(event);

    expect(preventDefaultSpy).toHaveBeenCalledTimes(1);
    expect(executeSpy).toHaveBeenCalledTimes(1);
  });

  it('delegates note creation via API when Ctrl/Cmd+N is pressed in ChildWindow', () => {
    renderHook(() => useKeyboardShortcuts({ isChildWindow: true }));

    const event = new KeyboardEvent('keydown', {
      key: 'n',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });

    window.dispatchEvent(event);

    expect(mockCreateNote).toHaveBeenCalledTimes(1);
  });

  it('closes active window when Ctrl/Cmd+W is pressed', () => {
    renderHook(() => useKeyboardShortcuts());

    const event = new KeyboardEvent('keydown', {
      key: 'w',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

    window.dispatchEvent(event);

    expect(preventDefaultSpy).toHaveBeenCalledTimes(1);
    expect(mockCloseWindow).toHaveBeenCalledTimes(1);
  });

  it('invokes custom onEscape callback when Escape key is pressed', () => {
    const onEscape = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onEscape }));

    const event = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
    });

    window.dispatchEvent(event);

    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  it('ignores plain character keys without modifier', () => {
    const executeSpy = vi.spyOn(useCreateNoteModule, 'executeCreateNote');

    renderHook(() => useKeyboardShortcuts());

    const nEvent = new KeyboardEvent('keydown', { key: 'n', bubbles: true });
    const wEvent = new KeyboardEvent('keydown', { key: 'w', bubbles: true });

    window.dispatchEvent(nEvent);
    window.dispatchEvent(wEvent);

    expect(executeSpy).not.toHaveBeenCalled();
    expect(mockCloseWindow).not.toHaveBeenCalled();
  });

  it('cleans up listener on unmount', () => {
    const executeSpy = vi.spyOn(useCreateNoteModule, 'executeCreateNote');

    const { unmount } = renderHook(() => useKeyboardShortcuts());
    unmount();

    const event = new KeyboardEvent('keydown', {
      key: 'n',
      ctrlKey: true,
      bubbles: true,
    });

    window.dispatchEvent(event);

    expect(executeSpy).not.toHaveBeenCalled();
  });
});
