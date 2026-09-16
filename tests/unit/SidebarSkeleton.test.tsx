import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { SidebarSkeleton } from '@renderer/components/sidebar/SidebarSkeleton';

describe('SidebarSkeleton Component (DESIGN.md §5.5, Architecture §17)', () => {
  afterEach(() => {
    cleanup();
  });
  it('renders sidebar skeleton with animated pulse container', () => {
    render(<SidebarSkeleton />);

    const skeleton = screen.getByTestId('sidebar-skeleton');
    expect(skeleton).toBeDefined();
    expect(skeleton.className).toContain('animate-pulse');
  });

  it('supports custom className prop', () => {
    render(<SidebarSkeleton className="custom-test-class" />);

    const skeleton = screen.getByTestId('sidebar-skeleton');
    expect(skeleton.className).toContain('custom-test-class');
  });
});
