import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { WindowControls, isMacOS } from '@renderer/components/chrome/WindowControls';

describe('WindowControls Component (Adaptive TitleBar Chrome)', () => {
  const mockMinimize = vi.fn();
  const mockMaximize = vi.fn();
  const mockClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    window.electronAPI = {
      ...window.electronAPI,
      platform: 'linux',
      windowControls: {
        minimize: mockMinimize,
        maximize: mockMaximize,
        close: mockClose,
      },
    };
  });

  afterEach(() => {
    cleanup();
  });

  describe('Platform Adaptation (PRD US#41, US#42)', () => {
    it('returns null on macOS (darwin platform)', () => {
      const { container } = render(<WindowControls platform="darwin" />);
      expect(container.firstChild).toBeNull();
      expect(screen.queryByTestId('window-controls')).toBeNull();
    });

    it('returns null when electronAPI.platform is darwin and no prop is passed', () => {
      window.electronAPI = {
        ...window.electronAPI,
        platform: 'darwin',
      };
      const { container } = render(<WindowControls />);
      expect(container.firstChild).toBeNull();
    });

    it('renders controls when platform is win32', () => {
      render(<WindowControls platform="win32" />);
      expect(screen.getByTestId('window-controls')).toBeDefined();
    });

    it('renders controls when platform is linux', () => {
      render(<WindowControls platform="linux" />);
      expect(screen.getByTestId('window-controls')).toBeDefined();
    });

    it('helper isMacOS correctly identifies darwin platforms', () => {
      expect(isMacOS('darwin')).toBe(true);
      expect(isMacOS('MacIntel')).toBe(true);
      expect(isMacOS('win32')).toBe(false);
      expect(isMacOS('linux')).toBe(false);
    });
  });

  describe('Control Actions (PRD US#43–45)', () => {
    it('renders all 3 buttons with no-drag class so clicks are not swallowed', () => {
      render(<WindowControls platform="linux" />);
      const minBtn = screen.getByTestId('window-control-minimize');
      const maxBtn = screen.getByTestId('window-control-maximize');
      const closeBtn = screen.getByTestId('window-control-close');

      expect(minBtn.className).toContain('no-drag');
      expect(maxBtn.className).toContain('no-drag');
      expect(closeBtn.className).toContain('no-drag');
    });

    it('triggers minimize() when minimize button is clicked', () => {
      render(<WindowControls platform="linux" />);
      fireEvent.click(screen.getByTestId('window-control-minimize'));
      expect(mockMinimize).toHaveBeenCalledTimes(1);
    });

    it('triggers maximize() when maximize button is clicked', () => {
      render(<WindowControls platform="linux" />);
      fireEvent.click(screen.getByTestId('window-control-maximize'));
      expect(mockMaximize).toHaveBeenCalledTimes(1);
    });

    it('triggers close() when close button is clicked', () => {
      render(<WindowControls platform="linux" />);
      fireEvent.click(screen.getByTestId('window-control-close'));
      expect(mockClose).toHaveBeenCalledTimes(1);
    });

    it('renders restore aria-label when isMaximized is true', () => {
      render(<WindowControls platform="linux" isMaximized={true} />);
      const maxBtn = screen.getByTestId('window-control-maximize');
      expect(maxBtn.getAttribute('aria-label')).toBe('Restore');
    });

    it('renders maximize aria-label when isMaximized is false', () => {
      render(<WindowControls platform="linux" isMaximized={false} />);
      const maxBtn = screen.getByTestId('window-control-maximize');
      expect(maxBtn.getAttribute('aria-label')).toBe('Maximize');
    });

    it('calls custom click handlers when provided via props', () => {
      const customMin = vi.fn();
      const customMax = vi.fn();
      const customClose = vi.fn();

      render(
        <WindowControls
          platform="linux"
          onMinimize={customMin}
          onMaximize={customMax}
          onClose={customClose}
        />,
      );

      fireEvent.click(screen.getByTestId('window-control-minimize'));
      expect(customMin).toHaveBeenCalledTimes(1);
      expect(mockMinimize).not.toHaveBeenCalled();

      fireEvent.click(screen.getByTestId('window-control-maximize'));
      expect(customMax).toHaveBeenCalledTimes(1);
      expect(mockMaximize).not.toHaveBeenCalled();

      fireEvent.click(screen.getByTestId('window-control-close'));
      expect(customClose).toHaveBeenCalledTimes(1);
      expect(mockClose).not.toHaveBeenCalled();
    });
  });
});
