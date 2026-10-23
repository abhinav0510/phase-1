// React Three Fiber v9: three.js JSX elements (<mesh>, <points>, ...) are no
// longer added to the global JSX namespace automatically. This augmentation
// makes them available to TypeScript across the project.
import type { ThreeElements } from "@react-three/fiber";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {}
  }
}
