import { describe, it, expect } from 'vitest';
import {
  defaultEditorTools,
  getDefaultEditorTools,
  EditorToolsRegistry,
  editorToolsRegistry,
  createEditorTools,
} from '@renderer/components/editor/editorTools';
import type { ToolConstructable } from '@editorjs/editorjs';

describe('editorTools registry (Architecture §2, §3.1 OCP, PRD US#7)', () => {
  it('includes all required official Editor.js tools', () => {
    const tools = getDefaultEditorTools();
    expect(tools).toHaveProperty('header');
    expect(tools).toHaveProperty('list');
    expect(tools).toHaveProperty('checklist');
    expect(tools).toHaveProperty('code');
    expect(tools).toHaveProperty('quote');
    expect(tools).toHaveProperty('delimiter');
  });

  it('configures header tool with levels 1, 2, 3 and placeholder', () => {
    const headerTool = defaultEditorTools.header as {
      config?: { levels?: number[]; placeholder?: string; defaultLevel?: number };
    };
    expect(headerTool.config?.levels).toEqual([1, 2, 3]);
    expect(headerTool.config?.placeholder).toBe('Judul Heading');
    expect(headerTool.config?.defaultLevel).toBe(1);
  });

  it('allows extending registry without modifying core code (OCP)', () => {
    const registry = new EditorToolsRegistry();
    class CustomMarkerTool {}

    registry.register('marker', CustomMarkerTool as unknown as ToolConstructable);
    expect(registry.has('marker')).toBe(true);
    expect(registry.getTools()).toHaveProperty('marker');

    registry.unregister('marker');
    expect(registry.has('marker')).toBe(false);
  });

  it('creates customized tool bundles via createEditorTools factory', () => {
    class CustomTableTool {}

    const customTools = createEditorTools({
      table: CustomTableTool as unknown as ToolConstructable,
    });

    expect(customTools).toHaveProperty('header');
    expect(customTools).toHaveProperty('table');
  });

  it('maintains a global singleton editorToolsRegistry', () => {
    expect(editorToolsRegistry).toBeInstanceOf(EditorToolsRegistry);
    expect(editorToolsRegistry.has('header')).toBe(true);
  });
});
