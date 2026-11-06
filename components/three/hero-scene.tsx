'use client';

import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { MotionValue } from 'framer-motion';

const SKY = new THREE.Color('#0ea5e9');
const TEAL = new THREE.Color('#14b89a');
const DEEP = new THREE.Color('#0369a1');

/** Cheap smooth noise: a few interfering sine waves. Good enough to make a blob look alive. */
function wobble(x: number, y: number, z: number, t: number) {
  return (
    Math.sin(x * 1.7 + t * 0.9) * 0.5 +
    Math.sin(y * 2.1 - t * 0.7) * 0.35 +
    Math.sin(z * 1.3 + t * 1.1) * 0.35
  );
}

interface SceneProps {
  progress: MotionValue<number>;
  animate: boolean;
  quality: 'high' | 'low';
}

/** The glossy core blob that slowly breathes. */
function Core({ animate, quality }: { animate: boolean; quality: 'high' | 'low' }) {
  const mesh = useRef<THREE.Mesh>(null);
  const segments = quality === 'high' ? 72 : 40;
  const geometry = useMemo(() => new THREE.SphereGeometry(1.15, segments, segments), [segments]);
  const base = useMemo(() => Float32Array.from(geometry.attributes.position.array as Float32Array), [geometry]);

  useFrame(({ clock }) => {
    if (!animate || !mesh.current) return;
    const t = clock.getElapsedTime();
    const pos = geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3], y = base[i * 3 + 1], z = base[i * 3 + 2];
      const d = 1 + wobble(x, y, z, t) * 0.09;
      pos.setXYZ(i, x * d, y * d, z * d);
    }
    pos.needsUpdate = true;
    geometry.computeVertexNormals();
  });

  return (
    <mesh ref={mesh} geometry={geometry}>
      <meshPhysicalMaterial
        color="#0ea5e9"
        emissive="#0b7fb3"
        emissiveIntensity={0.25}
        roughness={0.12}
        metalness={0.15}
        clearcoat={1}
        clearcoatRoughness={0.08}
      />
    </mesh>
  );
}

/** A cloud of people-nodes joined by thin lines: the "network" Workivo is about. */
function Network({ quality }: { quality: 'high' | 'low' }) {
  const count = quality === 'high' ? 110 : 60;
  const nodes = useRef<THREE.InstancedMesh>(null);

  const { points, lineGeometry } = useMemo(() => {
    // Evenly spread points on a shell (Fibonacci sphere) with some depth jitter.
    const pts: THREE.Vector3[] = [];
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < count; i++) {
      const y = 1 - (i / (count - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const theta = golden * i;
      const radius = 2.1 + ((i * 9301 + 49297) % 233280) / 233280 * 1.25;
      pts.push(new THREE.Vector3(Math.cos(theta) * r * radius, y * radius, Math.sin(theta) * r * radius));
    }
    const verts: number[] = [];
    const maxDist = quality === 'high' ? 1.25 : 1.5;
    for (let i = 0; i < pts.length; i++) {
      let links = 0;
      for (let j = i + 1; j < pts.length && links < 3; j++) {
        if (pts[i].distanceTo(pts[j]) < maxDist) {
          verts.push(pts[i].x, pts[i].y, pts[i].z, pts[j].x, pts[j].y, pts[j].z);
          links++;
        }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    return { points: pts, lineGeometry: g };
  }, [count, quality]);

  useEffect(() => {
    const mesh = nodes.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const c = new THREE.Color();
    points.forEach((p, i) => {
      const s = 0.028 + ((i * 7) % 5) * 0.011;
      m.compose(p, new THREE.Quaternion(), new THREE.Vector3(s, s, s));
      mesh.setMatrixAt(i, m);
      c.copy(i % 5 === 0 ? DEEP : i % 2 === 0 ? SKY : TEAL);
      mesh.setColorAt(i, c);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [points]);

  return (
    <group>
      <instancedMesh ref={nodes} args={[undefined, undefined, count]}>
        <sphereGeometry args={[1, 12, 12]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      <lineSegments geometry={lineGeometry}>
        <lineBasicMaterial color="#38bdf8" transparent opacity={0.4} />
      </lineSegments>
    </group>
  );
}

/** Moves the whole scene: idle spin, mouse parallax, and scroll-driven zoom/rotation. */
function Rig({ progress, animate, children }: { progress: MotionValue<number>; animate: boolean; children: React.ReactNode }) {
  const group = useRef<THREE.Group>(null);
  const pointer = useRef({ x: 0, y: 0 });
  const { camera, size } = useThree();

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  useFrame((_, delta) => {
    const g = group.current;
    if (!g) return;
    const p = progress.get();
    const idle = animate ? delta * 0.12 : 0;

    g.rotation.y += idle;
    // Scroll adds extra rotation and pulls the camera in as the hero scrolls away.
    const targetRotX = pointer.current.y * 0.25 + p * 0.6;
    const targetRotZ = -pointer.current.x * 0.12;
    g.rotation.x += (targetRotX - g.rotation.x) * Math.min(1, delta * 3);
    g.rotation.z += (targetRotZ - g.rotation.z) * Math.min(1, delta * 3);

    const narrow = size.width < 700;
    g.scale.setScalar(narrow ? 0.7 : 1);
    const baseZ = narrow ? 9.5 : 7.2;
    camera.position.z += (baseZ - p * 2.4 - camera.position.z) * Math.min(1, delta * 4);
    g.position.x += ((narrow ? 0 : 1.35) - p * 1.2 - g.position.x) * Math.min(1, delta * 3);
    g.position.y += ((narrow ? 2.3 : 0) + p * 1.4 - g.position.y) * Math.min(1, delta * 3);
  });

  return <group ref={group}>{children}</group>;
}

export default function HeroScene({ progress, animate, quality }: SceneProps) {
  return (
    <Canvas
      dpr={[1, quality === 'high' ? 1.75 : 1.25]}
      camera={{ position: [0, 0, 7.2], fov: 42 }}
      gl={{ antialias: quality === 'high', alpha: true, powerPreference: 'high-performance' }}
      frameloop={animate ? 'always' : 'demand'}
      style={{ background: 'transparent' }}
    >
      <ambientLight intensity={0.7} />
      <directionalLight position={[4, 5, 5]} intensity={2.2} color="#ffffff" />
      <pointLight position={[-5, -3, 2]} intensity={18} color="#14b89a" distance={14} />
      <pointLight position={[3, -4, 4]} intensity={10} color="#38bdf8" distance={12} />
      <Rig progress={progress} animate={animate}>
        <Core animate={animate} quality={quality} />
        <Network quality={quality} />
      </Rig>
    </Canvas>
  );
}
