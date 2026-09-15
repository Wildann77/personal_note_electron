import * as React from 'react';
import { cn } from '@renderer/lib/utils';
import {
  useUIStore,
  SIDEBAR_MIN_WIDTH,
  SIDEBAR_DEFAULT_WIDTH,
  SIDEBAR_MAX_WIDTH,
} from '@renderer/stores/useUIStore';

export interface SplitterProps extends React.HTMLAttributes<HTMLDivElement> {
  minWidth?: number;
  maxWidth?: number;
  defaultWidth?: number;
  onResize?: (width: number) => void;
  onResizeEnd?: (width: number) => void;
}

/**
 * Splitter Resizer for adjusting sidebar / editor column width (PRD US#46, US#47, DESIGN.md §4.3).
 * - 1px visual border line with a 6px hit box for tactile desktop cursor dragging.
 * - Supports pointer events with pointer capture for buttery-smooth drag tracking.
 * - Double-click resets sidebar width to default (280px).
 * - Keyboard accessible (ArrowLeft / ArrowRight / Home / End).
 */
export const Splitter: React.FC<SplitterProps> = ({
  minWidth = SIDEBAR_MIN_WIDTH,
  maxWidth = SIDEBAR_MAX_WIDTH,
  defaultWidth = SIDEBAR_DEFAULT_WIDTH,
  onResize,
  onResizeEnd,
  className,
  ...props
}) => {
  const sidebarWidth = useUIStore((state) => state.sidebarWidth);
  const setSidebarWidth = useUIStore((state) => state.setSidebarWidth);

  const [isDragging, setIsDragging] = React.useState(false);
  const dragStartXRef = React.useRef<number>(0);
  const dragStartWidthRef = React.useRef<number>(sidebarWidth);
  const latestWidthRef = React.useRef<number>(sidebarWidth);

  // Keep latest width ref in sync
  latestWidthRef.current = sidebarWidth;

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    // Primary mouse button only
    if (e.button !== 0) return;

    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);

    dragStartXRef.current = e.clientX;
    dragStartWidthRef.current = sidebarWidth;
    setIsDragging(true);

    // Disable user-select on body while dragging to avoid accidental text selection
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;

    const deltaX = e.clientX - dragStartXRef.current;
    const rawWidth = dragStartWidthRef.current + deltaX;
    const clampedWidth = Math.min(maxWidth, Math.max(minWidth, Math.round(rawWidth)));

    setSidebarWidth(clampedWidth);
    onResize?.(clampedWidth);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;

    const target = e.currentTarget;
    if (target.hasPointerCapture(e.pointerId)) {
      target.releasePointerCapture(e.pointerId);
    }

    setIsDragging(false);
    document.body.style.userSelect = '';
    document.body.style.cursor = '';

    onResizeEnd?.(latestWidthRef.current);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSidebarWidth(defaultWidth);
    onResize?.(defaultWidth);
    onResizeEnd?.(defaultWidth);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 20 : 5;
    let nextWidth: number | null = null;

    if (e.key === 'ArrowLeft') {
      nextWidth = Math.max(minWidth, sidebarWidth - step);
    } else if (e.key === 'ArrowRight') {
      nextWidth = Math.min(maxWidth, sidebarWidth + step);
    } else if (e.key === 'Home') {
      nextWidth = minWidth;
    } else if (e.key === 'End') {
      nextWidth = maxWidth;
    }

    if (nextWidth !== null) {
      e.preventDefault();
      setSidebarWidth(nextWidth);
      onResize?.(nextWidth);
      onResizeEnd?.(nextWidth);
    }
  };

  return (
    <div
      role="separator"
      data-testid="sidebar-splitter"
      aria-orientation="vertical"
      aria-valuenow={sidebarWidth}
      aria-valuemin={minWidth}
      aria-valuemax={maxWidth}
      aria-label="Resize sidebar"
      tabIndex={0}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleKeyDown}
      className={cn(
        'relative w-[1px] shrink-0 bg-border hover:bg-primary transition-colors cursor-col-resize select-none touch-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
        isDragging && 'bg-primary',
        className,
      )}
      {...props}
    >
      {/* 6px invisible hit box on top of the 1px divider for easy grabbing */}
      <div
        data-testid="splitter-hit-box"
        className="absolute inset-y-0 -left-[2.5px] -right-[2.5px] w-[6px] cursor-col-resize"
      />
    </div>
  );
};
