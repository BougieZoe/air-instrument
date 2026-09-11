import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { EffectComposer, Bloom, ChromaticAberration, Noise } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import ParticleField from "./ParticleField";
import MorphingBlob from "./MorphingBlob";
import { CameraController } from "./ScrollCamera";
import * as THREE from "three";

/* ── Shader Mesh ── */
const VERTEX = /* glsl */ `
  uniform float uTime;
  uniform vec2 uMouse;
  varying vec2 vUv;
  varying float vElevation;
  varying float vDistortion;
  void main() {
    vUv = uv;
    vec3 pos = position;
    float dist = distance(uv, uMouse * 0.5 + 0.5);
    float wave  = sin(pos.x * 3.0 + uTime * 0.8) * 0.08
                + sin(pos.y * 4.0 + uTime * 0.6) * 0.06
                + sin(dist * 8.0 - uTime * 1.2) * 0.12 * (1.0 - dist)
                + sin(pos.x * 7.0 + uTime * 1.5) * cos(pos.y * 6.0 + uTime) * 0.04;
    pos.z += wave;
    vElevation = wave;
    vDistortion = dist;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const FRAGMENT = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;
  varying float vElevation;
  varying float vDistortion;
  void main() {
    vec3 deep  = vec3(0.03, 0.02, 0.08);
    vec3 mid   = vec3(0.08, 0.05, 0.16);
    vec3 glow  = vec3(0.22, 0.14, 0.42);
    vec3 highlight = vec3(0.40, 0.28, 0.60);

    float t = vUv.x * 0.5 + vUv.y * 0.5 + uTime * 0.04;
    vec3 col = mix(deep, mid, smoothstep(0.0, 1.0, vUv.x + sin(uTime * 0.3) * 0.15));
    col = mix(col, glow, vElevation * 3.0 + 0.25);
    col = mix(col, highlight, vElevation * 4.5 + 0.35);
    col += vec3(0.06, 0.03, 0.15) * sin(vUv.y * 8.0 + uTime) * 0.25;
    col += vec3(0.10, 0.05, 0.20) * (1.0 - vDistortion) * 0.15;

    gl_FragColor = vec4(col, 1.0);
  }
`;

const ShaderPlane = () => {
  const meshRef = useRef();
  const mouseTarget = useRef(new THREE.Vector2(0, 0));
  const mouseCurrent = useRef(new THREE.Vector2(0, 0));

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0, 0) },
    }),
    []
  );

  useEffect(() => {
    const onMove = (e) => {
      mouseTarget.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouseTarget.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  useFrame((state) => {
    uniforms.uTime.value = state.clock.elapsedTime;
    mouseCurrent.current.lerp(mouseTarget.current, 0.04);
    uniforms.uMouse.value.copy(mouseCurrent.current);
  });

  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[6, 4, 80, 60]} />
      <shaderMaterial
        vertexShader={VERTEX}
        fragmentShader={FRAGMENT}
        uniforms={uniforms}
        depthWrite={false}
      />
    </mesh>
  );
};

/* ── Scene ── */
const Scene = () => {
  return (
    <>
      <CameraController maxScroll={1200} zRange={0.8} tiltRange={0.06} />
      <MorphingBlob />
      <ParticleField count={500} />
      <ShaderPlane />
      <EffectComposer multisampling={0} disableNormalPass>
        <Bloom
          luminanceThreshold={0.4}
          mipmapBlur
          intensity={0.45}
          radius={0.5}
        />
        <ChromaticAberration
          blendFunction={BlendFunction.NORMAL}
          offset={new THREE.Vector2(0.0015, 0.001)}
          radialModulation={false}
          modulationOffset={0.1}
        />
        <Noise
          premultiply
          blendFunction={BlendFunction.OVERLAY}
          opacity={0.025}
        />
      </EffectComposer>
    </>
  );
};

/* ── Hero Component ── */
export default function Hero({ zoeMode, onInitialize, onReadMethod }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 600);
    return () => clearTimeout(t);
  }, []);

  return (
    <section
      style={{
        position: "relative",
        width: "100%",
        height: "100vh",
        background: "#04020e",
        overflow: "hidden",
      }}
    >
      {/* R3F Canvas with Post-processing */}
      <Canvas
        style={{ position: "absolute", inset: 0, zIndex: 1 }}
        camera={{ position: [0, 0, 3], fov: 60 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
      >
        <Scene />
      </Canvas>

      {/* Radial gradient overlay (subtle vignette) */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at 50% 60%, rgba(100,30,200,0.20) 0%, transparent 70%)",
          pointerEvents: "none",
          zIndex: 2,
        }}
      />

      {/* Scan line overlay (Lusion-style subtle lines) */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)",
          pointerEvents: "none",
          zIndex: 3,
          opacity: 0.6,
        }}
      />

      {/* Corner vignette (Active Theory darkening edges) */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at center, transparent 55%, rgba(2,1,8,0.55) 100%)",
          pointerEvents: "none",
          zIndex: 4,
        }}
      />

      {/* UI Overlay */}
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{
          opacity: ready ? 1 : 0,
          y: ready ? 0 : 50,
        }}
        transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10,
          textAlign: "center",
          padding: "0 2rem",
          pointerEvents: "none",
        }}
      >
        <div style={{ pointerEvents: "auto" }}>
          <p
            style={{
              fontFamily: "monospace",
              fontSize: "10px",
              letterSpacing: "0.3em",
              color: "rgba(167,139,250,0.5)",
              marginBottom: "2.5rem",
              textTransform: "uppercase",
            }}
          >
            ZOE_OS &nbsp;·&nbsp; v2.0 &nbsp;·&nbsp; CORE INITIALIZED
          </p>

          <h1
            style={{
              fontSize: "clamp(64px, 12vw, 140px)",
              fontWeight: 800,
              lineHeight: 0.9,
              letterSpacing: "-0.05em",
              color: "#ffffff",
              margin: "0 0 1rem",
              textShadow: "0 0 100px rgba(139,92,246,0.5), 0 0 200px rgba(139,92,246,0.2)",
            }}
          >
            Zoe
          </h1>
          <h1
            style={{
              fontSize: "clamp(64px, 12vw, 140px)",
              fontWeight: 800,
              lineHeight: 0.9,
              letterSpacing: "-0.05em",
              color: "transparent",
              WebkitTextStroke: "1.5px rgba(167,139,250,0.45)",
              margin: "0 0 2.5rem",
            }}
          >
            OS
          </h1>

          <p
            style={{
              fontSize: "clamp(13px, 1.4vw, 16px)",
              color: "rgba(255,255,255,0.32)",
              maxWidth: "420px",
              margin: "0 auto 3rem",
              lineHeight: 1.7,
              letterSpacing: "0.03em",
            }}
          >
            A living operating system for the cross-cultural mind.
          </p>

          <div
            style={{
              display: "flex",
              gap: "16px",
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={onInitialize}
              style={{
                padding: "13px 28px",
                background: zoeMode
                  ? "rgba(239,68,68,0.15)"
                  : "rgba(139,92,246,0.10)",
                border: zoeMode
                  ? "1px solid rgba(239,68,68,0.4)"
                  : "1px solid rgba(139,92,246,0.35)",
                borderRadius: "2px",
                color: zoeMode ? "#f87171" : "#a78bfa",
                fontFamily: "monospace",
                fontSize: "10px",
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                cursor: "pointer",
                transition: "all 0.3s ease",
                backdropFilter: "blur(12px)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = zoeMode
                  ? "rgba(239,68,68,0.28)"
                  : "rgba(139,92,246,0.22)";
                e.currentTarget.style.borderColor = zoeMode
                  ? "rgba(239,68,68,0.7)"
                  : "rgba(167,139,250,0.7)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = zoeMode
                  ? "rgba(239,68,68,0.15)"
                  : "rgba(139,92,246,0.10)";
                e.currentTarget.style.borderColor = zoeMode
                  ? "rgba(239,68,68,0.4)"
                  : "rgba(139,92,246,0.35)";
              }}
            >
              INITIALIZE_OS
            </button>
            <button
              onClick={onReadMethod}
              style={{
                padding: "13px 28px",
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.10)",
                borderRadius: "2px",
                color: "rgba(255,255,255,0.38)",
                fontFamily: "monospace",
                fontSize: "10px",
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                cursor: "pointer",
                transition: "all 0.3s ease",
                backdropFilter: "blur(12px)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgba(167,139,250,0.45)";
                e.currentTarget.style.color = "rgba(255,255,255,0.7)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)";
                e.currentTarget.style.color = "rgba(255,255,255,0.38)";
              }}
            >
              READ_METHOD
            </button>
          </div>
        </div>
      </motion.div>

      {/* Scroll indicator */}
      <div
        style={{
          position: "absolute",
          bottom: "28px",
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "6px",
          zIndex: 10,
        }}
      >
        <span
          style={{
            fontFamily: "monospace",
            fontSize: "9px",
            letterSpacing: "0.2em",
            color: "rgba(255,255,255,0.12)",
            textTransform: "uppercase",
          }}
        >
          scroll
        </span>
        <div
          style={{
            width: "1px",
            height: "40px",
            background:
              "linear-gradient(to bottom, rgba(167,139,250,0.4), transparent)",
          }}
        />
      </div>
    </section>
  );
}
