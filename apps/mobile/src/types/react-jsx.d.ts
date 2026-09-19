// React 19 + React Native JSX compatibility
import type { ComponentType, ReactElement, ReactNode } from 'react';

declare global {
  namespace JSX {
    type Element = ReactElement;
    interface ElementClass {
      render(): ReactNode;
    }
    type ElementType = string | ComponentType<unknown>;
    interface IntrinsicAttributes {
      [key: string]: unknown;
    }
  }
}

export {};
