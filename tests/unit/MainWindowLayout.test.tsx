import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MainWindowLayout } from '@renderer/layouts/MainWindowLayout';
import { useUIStore, SIDEBAR_DEFAULT_WIDTH } from '@renderer/stores/useUIStore';

describe('MainWindowLayout Component (PRD US#38–47, Architecture §14, §17)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useUIStore.setState({ sidebarWidth: SIDEBAR_DEFAULT_WIDTH });
    window.electronAPI = {
      ...window.electronAPI,
      platform: 'linux',
      windowControls: {
        minimize: vi.fn(),
        maximize: vi.fn(),
        close: vi.fn(),
      },
    };
  });

  afterEach(() => {
    cleanup();
  });

  it('renders TitleBar, sidebar container, splitter, and content canvas', () => {
    render(
      <MainWindowLayout
        title="My Notes"
        sidebarContent={<div data-testid="test-sidebar">Sidebar Content</div>}
      >
        <div data-testid="test-editor">Editor Canvas</div>
      </MainWindowLayout>,
    );

    expect(screen.getByTestId('main-window-layout')).toBeDefined();
    expect(screen.getByTestId('titlebar-chrome')).toBeDefined();
    expect(screen.getByTestId('titlebar-title').textContent).toBe('My Notes');

    const sidebar = screen.getByTestId('main-layout-sidebar');
    expect(sidebar).toBeDefined();
    expect(sidebar.style.width).toBe(`${SIDEBAR_DEFAULT_WIDTH}px`);
    expect(screen.getByTestId('test-sidebar')).toBeDefined();

    expect(screen.getByTestId('sidebar-splitter')).toBeDefined();

    const content = screen.getByTestId('main-layout-content');
    expect(content).toBeDefined();
    expect(screen.getByTestId('test-editor')).toBeDefined();
  });

  it('binds sidebar width reactively to useUIStore.sidebarWidth', () => {
    useUIStore.setState({ sidebarWidth: 350 });

    render(
      <MainWindowLayout>
        <div>Content</div>
      </MainWindowLayout>,
    );

    const sidebar = screen.getByTestId('main-layout-sidebar');
    expect(sidebar.style.width).toBe('350px');
  });

  it('renders custom header slots in TitleBar', () => {
    render(
      <MainWindowLayout
        headerLeftContent={<button>Left Action</button>}
        headerRightContent={<span>Sync OK</span>}
      >
        <div>Content</div>
      </MainWindowLayout>,
    );

    expect(screen.getByRole('button', { name: 'Left Action' })).toBeDefined();
    expect(screen.getByText('Sync OK')).toBeDefined();
    expect(screen.getByTestId('window-controls')).toBeDefined();
  });
});
