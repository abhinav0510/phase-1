"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Edges } from "@react-three/drei";
import * as THREE from "three";

/* ------------------------------------------------------------------ */
/* Dotted globe: points distributed on a sphere via a Fibonacci lattice */
/* ------------------------------------------------------------------ */
function Globe() {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const n = 2800;
    const r = 2.5;
    const arr = new Float32Array(n * 3);
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < n; i++) {
      const y = 1 - (i / (n - 1)) * 2;
      const rad = Math.sqrt(1 - y * y);
      const th = golden * i;
      arr[i * 3] = Math.cos(th) * rad * r;
      arr[i * 3 + 1] = y * r;
      arr[i * 3 + 2] = Math.sin(th) * rad * r;
    }
    return arr;
  }, []);

  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.045;
  });

  return (
    <points ref={ref} position={[-1.7, 0.3, -2.6]} rotation={[0.25, 0, 0]}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.03}
        color="#8aa0c4"
        transparent
        opacity={0.7}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

/* ------------------------------------------------------------------ */
/* Skyline: setback glass towers with twinkling gold windows            */
/* ------------------------------------------------------------------ */
type Tier = { w: number; h: number; d: number };
type TowerDef = { x: number; z: number; tiers: Tier[]; spire?: boolean };

// Base of every tower sits at local y = 0 (the floor), so the group can
// scale on Y to "rise" out of the ground on load.
const TOWERS: TowerDef[] = [
  { x: -1.3, z: 0.3, tiers: [{ w: 0.62, h: 1.7, d: 0.5 }, { w: 0.44, h: 0.5, d: 0.36 }] },
  {
    x: -0.35,
    z: -0.1,
    tiers: [
      { w: 0.72, h: 2.6, d: 0.56 },
      { w: 0.5, h: 0.7, d: 0.4 },
      { w: 0.3, h: 0.35, d: 0.26 },
    ],
    spire: true,
  },
  { x: 0.55, z: 0.35, tiers: [{ w: 0.58, h: 1.4, d: 0.48 }, { w: 0.4, h: 0.4, d: 0.34 }] },
  { x: 1.35, z: -0.05, tiers: [{ w: 0.66, h: 2.1, d: 0.5 }, { w: 0.46, h: 0.55, d: 0.36 }] },
  { x: 1.95, z: 0.5, tiers: [{ w: 0.5, h: 1.15, d: 0.42 }] },
  { x: 0.1, z: 0.95, tiers: [{ w: 0.42, h: 0.8, d: 0.36 }] },
];

// Overall size of the city cluster relative to the scene.
const SKYLINE_SCALE = 1.18;

const WIN_W = 0.07;
const WIN_H = 0.09;
const COL_STEP = 0.14;
const ROW_STEP = 0.16;

type WindowSpec = { pos: THREE.Vector3; rotY: number; lit: boolean; phase: number; speed: number };

/** Lay out window planes on the front (+z) and right (+x) face of every tier. */
function buildWindows(): WindowSpec[] {
  const out: WindowSpec[] = [];
  let seed = 7;
  const rnd = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  for (const t of TOWERS) {
    let yOff = 0;
    for (const tier of t.tiers) {
      const nx = Math.max(1, Math.floor(tier.w / COL_STEP));
      const ny = Math.max(1, Math.floor(tier.h / ROW_STEP));
      const nz = Math.max(1, Math.floor(tier.d / COL_STEP));
      const x0 = t.x - ((nx - 1) * COL_STEP) / 2;
      const y0 = yOff + 0.12;
      const z0 = t.z - ((nz - 1) * COL_STEP) / 2;
      for (let j = 0; j < ny; j++) {
        const y = y0 + j * ROW_STEP;
        if (y + WIN_H / 2 > yOff + tier.h - 0.05) break;
        // front face (+z)
        for (let i = 0; i < nx; i++) {
          out.push({
            pos: new THREE.Vector3(x0 + i * COL_STEP, y, t.z + tier.d / 2 + 0.006),
            rotY: 0,
            lit: rnd() < 0.42,
            phase: rnd() * Math.PI * 2,
            speed: 0.4 + rnd() * 0.9,
          });
        }
        // right face (+x)
        for (let k = 0; k < nz; k++) {
          out.push({
            pos: new THREE.Vector3(t.x + tier.w / 2 + 0.006, y, z0 + k * COL_STEP),
            rotY: Math.PI / 2,
            lit: rnd() < 0.42,
            phase: rnd() * Math.PI * 2,
            speed: 0.4 + rnd() * 0.9,
          });
        }
      }
      yOff += tier.h;
    }
  }
  return out;
}

function Windows() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const specs = useMemo(buildWindows, []);
  const count = specs.length;

  // Place every window once.
  useEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    specs.forEach((s, i) => {
      dummy.position.copy(s.pos);
      dummy.rotation.set(0, s.rotY, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [specs]);

  // Twinkle: lit windows breathe between dim and bright gold.
  const color = useMemo(() => new THREE.Color(), []);
  useFrame(({ clock }) => {
    const mesh = ref.current;
    if (!mesh) return;
    const t = clock.elapsedTime;
    for (let i = 0; i < count; i++) {
      const s = specs[i];
      const k = s.lit ? 0.62 + 0.3 * Math.sin(t * s.speed + s.phase) : 0.1;
      color.setRGB(0.85 * k * 1.25, 0.69 * k * 1.25, 0.47 * k * 1.25);
      mesh.setColorAt(i, color);
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]}>
      <planeGeometry args={[WIN_W, WIN_H]} />
      <meshBasicMaterial color="#ffffff" toneMapped={false} />
    </instancedMesh>
  );
}

function TowerBody({ def }: { def: TowerDef }) {
  let yOff = 0;
  const tiers = def.tiers.map((tier, i) => {
    const cy = yOff + tier.h / 2;
    yOff += tier.h;
    return (
      <mesh key={i} position={[def.x, cy, def.z]}>
        <boxGeometry args={[tier.w, tier.h, tier.d]} />
        <meshPhysicalMaterial
          color="#9fb4d6"
          emissive="#1f3356"
          emissiveIntensity={0.4}
          metalness={0.3}
          roughness={0.05}
          clearcoat={1}
          clearcoatRoughness={0.05}
          transparent
          opacity={0.38}
          depthWrite={false}
        />
        <Edges color="#d8b078" />
      </mesh>
    );
  });
  const top = yOff;
  return (
    <group>
      {tiers}
      {def.spire ? <Spire x={def.x} z={def.z} y={top} /> : null}
    </group>
  );
}

function Spire({ x, y, z }: { x: number; y: number; z: number }) {
  const tip = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!tip.current) return;
    const m = tip.current.material as THREE.MeshBasicMaterial;
    m.opacity = 0.55 + 0.45 * Math.sin(clock.elapsedTime * 2.2);
  });
  return (
    <group position={[x, y, z]}>
      <mesh position={[0, 0.32, 0]}>
        <cylinderGeometry args={[0.012, 0.03, 0.64, 12]} />
        <meshBasicMaterial color="#d8b078" />
      </mesh>
      <mesh ref={tip} position={[0, 0.68, 0]}>
        <sphereGeometry args={[0.045, 16, 16]} />
        <meshBasicMaterial color="#f0d9a8" transparent toneMapped={false} />
      </mesh>
    </group>
  );
}

function Skyline() {
  const group = useRef<THREE.Group>(null);
  const start = useRef<number | null>(null);

  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    if (start.current === null) start.current = clock.elapsedTime;
    const t = clock.elapsedTime - start.current;
    // Rise out of the ground over ~1.8s (ease-out cubic), then hold.
    const p = Math.min(1, t / 1.8);
    const eased = 1 - Math.pow(1 - p, 3);
    g.scale.y = (0.02 + 0.98 * eased) * SKYLINE_SCALE;
    // Gentle idle sway around a 3/4 view.
    g.rotation.y = 0.38 + 0.07 * Math.sin(clock.elapsedTime * 0.25);
  });

  return (
    <group
      ref={group}
      position={[0.15, -2.35, 0]}
      scale={[SKYLINE_SCALE, SKYLINE_SCALE, SKYLINE_SCALE]}
    >
      {TOWERS.map((t, i) => (
        <TowerBody key={i} def={t} />
      ))}
      <Windows />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Thin gold orbit ring                                                 */
/* ------------------------------------------------------------------ */
function Ring({
  radius,
  tilt,
  speed,
  tube = 0.012,
}: {
  radius: number;
  tilt: number;
  speed: number;
  tube?: number;
}) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.z += dt * speed;
  });
  return (
    <mesh ref={ref} rotation={[tilt, 0.2, 0]}>
      <torusGeometry args={[radius, tube, 16, 220]} />
      <meshBasicMaterial color="#d8b078" transparent opacity={0.85} />
    </mesh>
  );
}

export default function HeroScene() {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0.6, 9.5], fov: 38 }}
      gl={{ antialias: true, alpha: true }}
      style={{ background: "transparent" }}
    >
      <ambientLight intensity={0.45} />
      <directionalLight position={[4, 7, 5]} intensity={1.7} color="#fff5e4" />
      <pointLight position={[-5, -2, 3]} intensity={1.4} color="#d8b078" />
      <pointLight position={[0.6, -2.2, 2.5]} intensity={2.6} color="#d8b078" distance={9} />

      <Globe />
      <Skyline />

      <group position={[0.7, -0.2, 0]}>
        <Ring radius={3.5} tilt={1.28} speed={0.1} />
        <Ring radius={2.7} tilt={1.12} speed={-0.07} tube={0.008} />
      </group>

      {/* reflective floor glow beneath the skyline */}
      <mesh position={[0.3, -2.36, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[3.7, 72]} />
        <meshBasicMaterial color="#d8b078" transparent opacity={0.09} />
      </mesh>
    </Canvas>
  );
}
