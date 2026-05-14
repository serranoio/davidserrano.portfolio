declare module '*.css';

declare module '*.mdx' {
  const Component: React.ComponentType;
  export default Component;
}

declare module '*.txt?raw' {
  const content: string;
  export default content;
}

declare module 'troika-three-text' {
  import { Mesh, Material, ColorRepresentation } from 'three';
  export class Text extends Mesh {
    text: string;
    font?: string;
    fontSize: number;
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
    sync(callback?: () => void): void;
    dispose(): void;
  }
}

interface ImportMetaEnv {
  readonly SSG_MD: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
