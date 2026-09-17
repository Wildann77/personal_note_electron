import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ThemeToggle } from '@renderer/components/chrome/ThemeToggle';
import { useUIStore, UI_STORE_STORAGE_KEY } from '@renderer/stores/useUIStore';

describe('ThemeToggle Component (PRD US#48, US#49, TASK.md [P17-T1])', () => {
  beforeEach(() => {
    localStorage.clear();
    useUIStore.getState().resetUI();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders correctly in dark mode with Sun icon and accessibility label', () => {
    useUIStore.setState({ theme: 'dark' });
    render(<ThemeToggle />);

    const button = screen.getByTestId('theme-toggle-button');
    expect(button).toBeDefined();
    expect(button.getAttribute('aria-label')).toBe('Ganti ke Mode Terang');
    expect(button.getAttribute('title')).toBe('Ganti ke Mode Terang');
    expect(button.getAttribute('role')).toBe('button');

    const sunIcon = screen.getByTestId('theme-icon-sun');
    expect(sunIcon).toBeDefined();
    expect(screen.queryByTestId('theme-icon-moon')).toBeNull();
  });

  it('renders correctly in light mode with Moon icon and accessibility label', () => {
    useUIStore.setState({ theme: 'light' });
    render(<ThemeToggle />);

    const button = screen.getByTestId('theme-toggle-button');
    expect(button).toBeDefined();
    expect(button.getAttribute('aria-label')).toBe('Ganti ke Mode Gelap');
    expect(button.getAttribute('title')).toBe('Ganti ke Mode Gelap');

    const moonIcon = screen.getByTestId('theme-icon-moon');
    expect(moonIcon).toBeDefined();
    expect(screen.queryByTestId('theme-icon-sun')).toBeNull();
  });

  it('toggles theme back and forth on click', () => {
    useUIStore.setState({ theme: 'dark' });
    render(<ThemeToggle />);

    const button = screen.getByTestId('theme-toggle-button');

    // Click 1: dark -> light
    fireEvent.click(button);
    expect(useUIStore.getState().theme).toBe('light');
    expect(screen.getByTestId('theme-icon-moon')).toBeDefined();
    expect(button.getAttribute('aria-label')).toBe('Ganti ke Mode Gelap');

    // Click 2: light -> dark
    fireEvent.click(button);
    expect(useUIStore.getState().theme).toBe('dark');
    expect(screen.getByTestId('theme-icon-sun')).toBeDefined();
    expect(button.getAttribute('aria-label')).toBe('Ganti ke Mode Terang');
  });

  it('persists theme state to localStorage on toggle', () => {
    useUIStore.setState({ theme: 'dark' });
    render(<ThemeToggle />);

    const button = screen.getByTestId('theme-toggle-button');
    fireEvent.click(button);

    expect(useUIStore.getState().theme).toBe('light');

    const storedRaw = localStorage.getItem(UI_STORE_STORAGE_KEY);
    expect(storedRaw).not.toBeNull();
    const stored = JSON.parse(storedRaw as string) as {
      state: { theme: string };
    };
    expect(stored.state.theme).toBe('light');
  });

  it('supports showLabel prop to render label text alongside icon', () => {
    useUIStore.setState({ theme: 'dark' });
    const { rerender } = render(<ThemeToggle showLabel />);

    expect(screen.getByText('Mode Terang')).toBeDefined();

    useUIStore.setState({ theme: 'light' });
    rerender(<ThemeToggle showLabel />);
    expect(screen.getByText('Mode Gelap')).toBeDefined();
  });

  it('preserves no-drag class and merges custom className', () => {
    render(<ThemeToggle className="custom-theme-class" />);

    const button = screen.getByTestId('theme-toggle-button');
    expect(button.className).toContain('no-drag');
    expect(button.className).toContain('custom-theme-class');
  });
});
