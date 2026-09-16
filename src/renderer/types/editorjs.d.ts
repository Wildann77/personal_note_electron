declare module '@editorjs/checklist' {
  import type { ToolConstructable } from '@editorjs/editorjs';

  const Checklist: ToolConstructable;
  export default Checklist;
}

declare module 'editorjs-drag-drop' {
  import type EditorJS from '@editorjs/editorjs';

  export default class DragDrop {
    constructor(editor: EditorJS);
  }
}
