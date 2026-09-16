import * as React from 'react';
import { cn } from '@renderer/lib/utils';
import { useUIStore } from '@renderer/stores/useUIStore';
import { TitleBar } from '@renderer/components/chrome/TitleBar';
import { WindowControls } from '@renderer/components/chrome/WindowControls';
import { Splitter } from '@renderer/components/ui/splitter';
import { ScrollArea } from '@renderer/components/ui/scroll-area';

export interface MainWindowLayoutProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  /**
   * TitleBar title override. Defaults to "Personal Note".
   */
  title?: React.ReactNode;

  /**
   * Custom left slot in TitleBar (e.g. app logo, sidebar actions).
   */
  headerLeftContent?: React.ReactNode;

  /**
   * Custom center slot in TitleBar.
   */
  headerCenterContent?: React.ReactNode;

  /**
   * Custom right slot in TitleBar before window controls (e.g. sync badge, theme toggle).
   */
  headerRightContent?: React.ReactNode;

  /**
   * Sidebar content node (NoteList, new note button, etc.).
   */
  sidebarContent?: React.ReactNode;

  /**
   * Main content / editor canvas.
   */
  children?: React.ReactNode;
}

/**
 * Main Window Layout Shell (Architecture §14, §17, PRD US#38–47, DESIGN.md §4).
 * - Fixed 38px custom frameless TitleBar with adaptive WindowControls.
 * - Resizable sidebar with persistent width via `useUIStore.sidebarWidth`.
 * - Tactile 1px Splitter with 6px hit-box.
 * - Isolated scrolling viewports for sidebar and editor canvas.
 */
export const MainWindowLayout: React.FC<MainWindowLayoutProps> = ({
  title = 'Personal Note',
  headerLeftContent,
  headerCenterContent,
  headerRightContent,
  sidebarContent,
  children,
  className,
  ...props
}) => {
  const sidebarWidth = useUIStore((state) => state.sidebarWidth);

  return (
    <div
      data-testid="main-window-layout"
      className={cn(
        'flex flex-col h-screen w-screen overflow-hidden bg-background text-foreground select-none',
        className,
      )}
      {...props}
    >
      {/* 38px Frameless TitleBar Chrome */}
      <TitleBar
        title={title}
        leftContent={headerLeftContent}
        centerContent={headerCenterContent}
        rightContent={
          <div className="flex items-center gap-2 h-full">
            {headerRightContent}
            <WindowControls />
          </div>
        }
      />

      {/* Main Content Workspace: Sidebar + Splitter + Editor */}
      <div className="flex flex-1 w-full h-[calc(100vh-38px)] overflow-hidden">
        {/* Sidebar Container */}
        <aside
          data-testid="main-layout-sidebar"
          style={{ width: `${sidebarWidth}px` }}
          className="shrink-0 h-full overflow-hidden bg-background border-r-0 flex flex-col min-w-0"
        >
          <ScrollArea data-testid="sidebar-scroll-area" className="h-full w-full flex-1 min-w-0">
            {sidebarContent}
          </ScrollArea>
        </aside>

        {/* Resizer Splitter */}
        <Splitter />

        {/* Main Editor Canvas Container */}
        <main
          data-testid="main-layout-content"
          className="flex-1 h-full overflow-hidden min-w-0 bg-background flex flex-col select-text"
        >
          {children}
        </main>
      </div>
    </div>
  );
};
