import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { TitleBar } from '@renderer/components/chrome/TitleBar';

describe('TitleBar Component (Frameless Window Chrome)', () => {
  const mockMaximize = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    window.electronAPI = {
      ...window.electronAPI,
      windowControls: {
        minimize: vi.fn(),
        maximize: mockMaximize,
        close: vi.fn(),
      },
    };
  });

  afterEach(() => {
    cleanup();
  });

  it('renders header with 38px fixed height and drag-region class', () => {
    render(<TitleBar />);
    const header = screen.getByTestId('titlebar-chrome');
    expect(header).toBeDefined();
    expect(header.className).toContain('drag-region');
    expect(header.className).toContain('h-[38px]');
  });

  it('renders default title "Personal Note" when title prop is omitted', () => {
    render(<TitleBar />);
    const title = screen.getByTestId('titlebar-title');
    expect(title.textContent).toBe('Personal Note');
  });

  it('renders custom title when provided', () => {
    render(<TitleBar title="Catatan Penting" />);
    const title = screen.getByTestId('titlebar-title');
    expect(title.textContent).toBe('Catatan Penting');
  });

  it('renders left, center, and right content in respective slots with no-drag class', () => {
    render(
      <TitleBar
        leftContent={<button id="menu-btn">Menu</button>}
        centerContent={<span id="doc-status">Draft</span>}
        rightContent={<button id="close-btn">X</button>}
      />,
    );

    const menuBtn = screen.getByRole('button', { name: 'Menu' });
    const statusSpan = screen.getByText('Draft');
    const closeBtn = screen.getByRole('button', { name: 'X' });

    expect(menuBtn).toBeDefined();
    expect(statusSpan).toBeDefined();
    expect(closeBtn).toBeDefined();

    // Verify parent containers have no-drag
    expect(menuBtn.closest('.no-drag')).not.toBeNull();
    expect(statusSpan.closest('.no-drag')).not.toBeNull();
    expect(closeBtn.closest('.no-drag')).not.toBeNull();
  });

  it('triggers maximize() on double click on the draggable header area', () => {
    render(<TitleBar />);
    const header = screen.getByTestId('titlebar-chrome');

    fireEvent.doubleClick(header);
    expect(mockMaximize).toHaveBeenCalledTimes(1);
  });

  it('does NOT trigger maximize() when double clicking inside a no-drag interactive element', () => {
    render(
      <TitleBar
        rightContent={
          <button id="test-btn" className="no-drag">
            Tombol
          </button>
        }
      />,
    );

    const btn = screen.getByRole('button', { name: 'Tombol' });
    fireEvent.doubleClick(btn);
    expect(mockMaximize).not.toHaveBeenCalled();
  });

  it('calls custom onDoubleClick handler if supplied', () => {
    const customDoubleClickHandler = vi.fn();
    render(<TitleBar onDoubleClick={customDoubleClickHandler} />);
    const header = screen.getByTestId('titlebar-chrome');

    fireEvent.doubleClick(header);
    expect(customDoubleClickHandler).toHaveBeenCalledTimes(1);
    expect(mockMaximize).not.toHaveBeenCalled();
  });
});
