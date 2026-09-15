import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { Splitter } from '@renderer/components/ui/splitter';
import {
  useUIStore,
  SIDEBAR_MIN_WIDTH,
  SIDEBAR_DEFAULT_WIDTH,
  SIDEBAR_MAX_WIDTH,
} from '@renderer/stores/useUIStore';

describe('Splitter Component (PRD US#46, US#47, DESIGN.md §4.3)', () => {
  const mockSetPointerCapture = vi.fn();
  const mockReleasePointerCapture = vi.fn();
  const mockHasPointerCapture = vi.fn().mockReturnValue(true);

  beforeEach(() => {
    vi.clearAllMocks();
    useUIStore.setState({ sidebarWidth: SIDEBAR_DEFAULT_WIDTH });

    // Mock pointer capture methods
    Element.prototype.setPointerCapture = mockSetPointerCapture;
    Element.prototype.releasePointerCapture = mockReleasePointerCapture;
    Element.prototype.hasPointerCapture = mockHasPointerCapture;
  });

  afterEach(() => {
    cleanup();
  });

  it('renders separator with 6px hit box and ARIA attributes', () => {
    render(<Splitter />);
    const splitter = screen.getByTestId('sidebar-splitter');
    const hitBox = screen.getByTestId('splitter-hit-box');

    expect(splitter).toBeDefined();
    expect(splitter.getAttribute('role')).toBe('separator');
    expect(splitter.getAttribute('aria-orientation')).toBe('vertical');
    expect(splitter.getAttribute('aria-valuenow')).toBe(String(SIDEBAR_DEFAULT_WIDTH));
    expect(splitter.getAttribute('aria-valuemin')).toBe(String(SIDEBAR_MIN_WIDTH));
    expect(splitter.getAttribute('aria-valuemax')).toBe(String(SIDEBAR_MAX_WIDTH));

    expect(hitBox).toBeDefined();
    expect(hitBox.className).toContain('w-[6px]');
    expect(hitBox.className).toContain('cursor-col-resize');
  });

  it('resizes sidebar width when dragged with pointer', () => {
    const onResize = vi.fn();
    const onResizeEnd = vi.fn();

    render(<Splitter onResize={onResize} onResizeEnd={onResizeEnd} />);
    const splitter = screen.getByTestId('sidebar-splitter');

    // Start drag at clientX: 280
    fireEvent.pointerDown(splitter, {
      button: 0,
      clientX: 280,
      pointerId: 1,
    });

    expect(mockSetPointerCapture).toHaveBeenCalledWith(1);

    // Drag right by +40px -> target width 320
    fireEvent.pointerMove(splitter, {
      clientX: 320,
      pointerId: 1,
    });

    expect(useUIStore.getState().sidebarWidth).toBe(320);
    expect(onResize).toHaveBeenCalledWith(320);

    // End drag
    fireEvent.pointerUp(splitter, {
      clientX: 320,
      pointerId: 1,
    });

    expect(mockReleasePointerCapture).toHaveBeenCalledWith(1);
    expect(onResizeEnd).toHaveBeenCalledWith(320);
  });

  it('clamps width to minWidth (220) and maxWidth (480) during drag', () => {
    render(<Splitter />);
    const splitter = screen.getByTestId('sidebar-splitter');

    // Start drag at 280
    fireEvent.pointerDown(splitter, { button: 0, clientX: 280, pointerId: 1 });

    // Drag far left (-200px) -> would be 80, clamped to min 220
    fireEvent.pointerMove(splitter, { clientX: 80, pointerId: 1 });
    expect(useUIStore.getState().sidebarWidth).toBe(SIDEBAR_MIN_WIDTH);

    // Drag far right (+600px) -> would be 880, clamped to max 480
    fireEvent.pointerMove(splitter, { clientX: 880, pointerId: 1 });
    expect(useUIStore.getState().sidebarWidth).toBe(SIDEBAR_MAX_WIDTH);

    fireEvent.pointerUp(splitter, { clientX: 880, pointerId: 1 });
  });

  it('resets to defaultWidth (280) on double-click', () => {
    useUIStore.setState({ sidebarWidth: 380 });
    const onResize = vi.fn();

    render(<Splitter onResize={onResize} />);
    const splitter = screen.getByTestId('sidebar-splitter');

    fireEvent.doubleClick(splitter);
    expect(useUIStore.getState().sidebarWidth).toBe(SIDEBAR_DEFAULT_WIDTH);
    expect(onResize).toHaveBeenCalledWith(SIDEBAR_DEFAULT_WIDTH);
  });

  it('supports keyboard navigation via arrow keys and home/end', () => {
    useUIStore.setState({ sidebarWidth: 280 });
    render(<Splitter />);
    const splitter = screen.getByTestId('sidebar-splitter');

    // ArrowLeft (-5px)
    fireEvent.keyDown(splitter, { key: 'ArrowLeft' });
    expect(useUIStore.getState().sidebarWidth).toBe(275);

    // ArrowRight (+5px)
    fireEvent.keyDown(splitter, { key: 'ArrowRight' });
    expect(useUIStore.getState().sidebarWidth).toBe(280);

    // Shift + ArrowRight (+20px)
    fireEvent.keyDown(splitter, { key: 'ArrowRight', shiftKey: true });
    expect(useUIStore.getState().sidebarWidth).toBe(300);

    // End (jump to max)
    fireEvent.keyDown(splitter, { key: 'End' });
    expect(useUIStore.getState().sidebarWidth).toBe(SIDEBAR_MAX_WIDTH);

    // Home (jump to min)
    fireEvent.keyDown(splitter, { key: 'Home' });
    expect(useUIStore.getState().sidebarWidth).toBe(SIDEBAR_MIN_WIDTH);
  });
});
