declare module '*.css';

declare module '*.mdx' {
  const Component: React.ComponentType;
  export default Component;
}

declare module '*.mdx?raw' {
  const content: string;
  export default content;
}

declare module '*.txt?raw' {
  const content: string;
  export default content;
}

declare module '*.woff' {
  const url: string;
  export default url;
}

declare module 'troika-three-text' {
  import { Mesh, Material, ColorRepresentation } from 'three';
  export class Text extends Mesh {
    text: string;
    font?: string;
    fontSize: number;
    letterSpacing: number;
    lineHeight: number | string;
    maxWidth: number;
    anchorX: number | 'left' | 'center' | 'right' | string;
    anchorY:
      | number
      | 'top'
      | 'top-baseline'
      | 'middle'
      | 'bottom-baseline'
      | 'bottom'
      | string;
    textAlign: 'left' | 'center' | 'right' | 'justify';
    color: ColorRepresentation;
    material: Material | Material[];
    outlineWidth: number | string;
    outlineColor: ColorRepresentation;
    outlineOpacity: number;
    /** Character index → colour from that character on. */
    colorRanges: Record<number, ColorRepresentation> | null;
    readonly textRenderInfo: TextRenderInfo | null;
    sync(callback?: () => void): void;
    dispose(): void;
  }
  export interface TextRenderInfo {
    blockBounds: [number, number, number, number];
  }
  export interface SelectionRect {
    left: number;
    top: number;
    right: number;
    bottom: number;
  }
  /** The rects covering characters [start, end), in the mesh's local space. */
  export function getSelectionRects(info: TextRenderInfo, start: number, end: number): SelectionRect[];
}

interface ImportMetaEnv {
  readonly SSG_MD: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '*.md' {
  const Component: React.ComponentType;
  export default Component;
}
