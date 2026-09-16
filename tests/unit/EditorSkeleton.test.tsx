import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Skeleton } from '@renderer/components/ui/skeleton';
import { EditorSkeleton } from '@renderer/components/editor/EditorSkeleton';

describe('Skeleton & EditorSkeleton Components (DESIGN.md §5.5, Architecture §17)', () => {
  it('renders primitive Skeleton component with animate-pulse class', () => {
    render(<Skeleton className="w-10 h-10" data-testid="custom-skeleton" />);
    const el = screen.getByTestId('custom-skeleton');
    expect(el).toBeDefined();
    expect(el.className).toContain('animate-pulse');
    expect(el.className).toContain('bg-muted/60');
  });

  it('renders EditorSkeleton with sticky header and canvas placeholders', () => {
    render(<EditorSkeleton />);
    const skeleton = screen.getByTestId('editor-skeleton');
    expect(skeleton).toBeDefined();
    const pulseElements = skeleton.querySelectorAll('[data-testid="skeleton"]');
    expect(pulseElements.length).toBeGreaterThanOrEqual(5);
  });
});
