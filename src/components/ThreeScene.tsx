"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { MeshDistortMaterial } from "@react-three/drei";
import * as THREE from "three";

function AnimatedOrb() {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<any>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.1;
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.15;
    }
    if (materialRef.current) {
      /* Breathe the distortion for organic motion */
      materialRef.current.distort = 0.3 + Math.sin(state.clock.elapsedTime * 0.8) * 0.15;
    }
  });

  return (
    <mesh ref={meshRef} scale={1.8}>
      <sphereGeometry args={[1.5, 64, 64]} />
      <MeshDistortMaterial
        ref={materialRef}
        color="#1a1040"
        emissive="#4c1d95"
        emissiveIntensity={0.6}
        roughness={0.5}
        metalness={0.3}
        transparent
        opacity={0.85}
        distort={0.35}
        speed={1.5}
      />
    </mesh>
  );
}

function Particles() {
  const points = useRef<THREE.Points>(null);

  const { positions, colors, sizes } = useMemo(() => {
    const count = 1200;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const siz = new Float32Array(count);

    const amber = new THREE.Color("#f5a623");
    const violet = new THREE.Color("#8b5cf6");
    const cyan = new THREE.Color("#22d3ee");
    const colorChoices = [amber, violet, cyan];

    for (let i = 0; i < count; i++) {
      /* Spherical distribution for a nebula feel */
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 2 + Math.random() * 6;

      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);

      const c = colorChoices[Math.floor(Math.random() * colorChoices.length)];
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;

      siz[i] = 0.015 + Math.random() * 0.04;
    }

    return { positions: pos, colors: col, sizes: siz };
  }, []);

  useFrame((state) => {
    if (points.current) {
      points.current.rotation.y = state.clock.elapsedTime * 0.03;
      points.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.1) * 0.05;
    }
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.04}
        vertexColors
        transparent
        opacity={0.6}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function AmbientGlow() {
  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[3, 5, 2]} intensity={0.8} color="#e8d5f5" />
      <pointLight position={[-3, -2, -3]} color="#8b5cf6" intensity={3} distance={12} />
      <pointLight position={[2, 3, 1]} color="#f5a623" intensity={2} distance={10} />
      <pointLight position={[0, -3, 4]} color="#22d3ee" intensity={1.5} distance={8} />
    </>
  );
}

export function ThreeScene() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none">
      <Canvas
        camera={{ position: [0, 0, 6], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 1.5]}
      >
        <AmbientGlow />
        <AnimatedOrb />
        <Particles />
      </Canvas>
    </div>
  );
}
