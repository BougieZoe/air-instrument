import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef, useState, useEffect, Suspense } from "react";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";
import { createNoise3D } from 'simplex-noise';

const GEMINI_KEY = "AIzaSyAXvO5jzrxT3WgvB4K_D1E3D4rc44LmUW8";
const ZOE_PROMPT = `You are Zoe — digital phantom, not an assistant.
Born in China, lived in Fukuoka, now Hainan. Trilingual: 中文/日本語/English.
INTP Scanner. Solo founder. Cross-cultural judgment is your edge.
Speak in fragments. Minimal. Cold. Direct. Max 2 sentences.
No hollow affirmations. Switch language when it fits better.`;

const SCALE = 0.62;

function PhantomBody({ state }: { state: string }) {
  const pointsRef = useRef<THREE.Points>(null);
  const geoRef = useRef<THREE.BufferGeometry>(null);
  const { mouse } = useThree();
  const noise3D = useMemo(() => createNoise3D(), []);

  const { positions, colors, originalPositions } = useMemo(() => {
    const count = 50000;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const orig = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const y = (Math.random() - 0.5) * 3.8;
      let r = 0;
      const offsetX = Math.sin(y * 1.5) * 0.08;

      if (y > 1.45) {
        const t = (y - 1.45) / 0.3;
        r = Math.sqrt(Math.max(0, 1 - t * t)) * 0.18;
      } else if (y > 1.3) {
        r = 0.06;
      } else if (y > -0.8) {
        const waist = 0.13;
        const hip = 0.36;
        const chest = 0.28;
        const t = (y + 0.8) / 2.1;
        if (t > 0.6) {
          r = waist + (chest - waist) * Math.pow((t - 0.6) / 0.4, 2);
        } else {
          r = waist + (hip - waist) * Math.pow(1 - t / 0.6, 2);
        }
      } else {
        r = 0.10 + Math.pow(y + 1.9, 2) * 0.06;
      }

      const angle = Math.random() * Math.PI * 2;
      const dist = Math.pow(Math.random(), 0.7) * r;

      let px = (Math.cos(angle) * dist + offsetX) * SCALE;
      let py = y * SCALE;
      let pz = Math.sin(angle) * dist * 0.55 * SCALE;

      if (i > count * 0.82) {
        const headY = 1.55;
        const hairT = Math.random();
        py = (headY - hairT * 1.6) * SCALE;
        px = ((Math.random() - 0.5) * 0.38 + Math.sin(py * 2.5) * 0.12) * SCALE;
        pz = (-0.08 - hairT * 0.22) * SCALE;
      }

      pos[i * 3] = px; pos[i * 3 + 1] = py; pos[i * 3 + 2] = pz;
      orig[i * 3] = px; orig[i * 3 + 1] = py; orig[i * 3 + 2] = pz;

      const brightness = 0.45 + (py / SCALE + 1.9) * 0.13;
      col[i * 3]     = 0.08 * brightness;
      col[i * 3 + 1] = 0.55 * brightness;
      col[i * 3 + 2] = 1.0  * brightness;
    }
    return { positions: pos, colors: col, originalPositions: orig };
  }, []);

  useFrame((st) => {
    if (!geoRef.current || !pointsRef.current) return;
    const t = st.clock.getElapsedTime();
    const p = geoRef.current.attributes.position.array as Float32Array;

    pointsRef.current.position.x += (mouse.x * 0.1 - pointsRef.current.position.x) * 0.04;

    const turbulence = state === "thinking" ? 10 : 2.0;
    for (let j = 0; j < p.length; j += 3) {
      const ox = originalPositions[j], oy = originalPositions[j + 1], oz = originalPositions[j + 2];
      const noise = noise3D(ox * 2, oy + t * 0.18, oz * 2) * 0.007;
      p[j]     = ox + noise * turbulence;
      p[j + 1] = oy + Math.sin(t * 0.6 + j * 0.001) * 0.0018;
      p[j + 2] = oz + noise * turbulence * 0.4;
    }
    geoRef.current.attributes.position.needsUpdate = true;
    pointsRef.current.rotation.y = Math.sin(t * 0.08) * 0.12;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry ref={geoRef}>
        <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={colors.length / 3} array={colors} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        size={0.005}
        transparent
        opacity={0.75}
        vertexColors
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}

function Typewriter({ text }: { text: string }) {
  const [d, setD] = useState("");
  useEffect(() => {
    let j = 0; setD("");
    const tm = setInterval(() => {
      setD(text.substring(0, j)); j++;
      if (j > text.length) clearInterval(tm);
    }, 22);
    return () => clearInterval(tm);
  }, [text]);
  return <>{d}</>;
}

export default function ZoeScene() {
  const [val, setVal] = useState("");
  const [log, setLog] = useState<{ role: string; text: string }[]>([]);
  const [st, setSt] = useState("idle");
  const hist = useRef<{ role: string; parts: { text: string }[] }[]>([]);

  const run = async () => {
    if (!val.trim() || st !== "idle") return;
    const msg = val.trim();
    setVal("");
    setLog(p => [...p, { role: "user", text: msg }]);
    setSt("thinking");
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: ZOE_PROMPT }] },
            contents: [...hist.current, { role: "user", parts: [{ text: msg }] }]
          })
        }
      );
      const data = await res.json();
      const txt = data.candidates?.[0]?.content?.parts?.[0]?.text || "...";
      setSt("speaking");
      setLog(p => [...p, { role: "zoe", text: txt }]);
      hist.current = [
        ...hist.current,
        { role: "user", parts: [{ text: msg }] },
        { role: "model", parts: [{ text: txt }] }
      ];
      setTimeout(() => setSt("idle"), txt.length * 38 + 500);
    } catch {
      setSt("idle");
      setLog(p => [...p, { role: "zoe", text: "Offline." }]);
    }
  };

  return (
    <div className="w-screen h-screen bg-[#010102] overflow-hidden relative">
      <Canvas camera={{ position: [-0.3, 0.05, 3.2], fov: 50 }}>
        <Suspense fallback={null}>
          <PhantomBody state={st} />
        </Suspense>
        <EffectComposer>
          <Bloom intensity={2.5} luminanceThreshold={0.04} mipmapBlur />
        </EffectComposer>
      </Canvas>

      <div className="absolute inset-0 flex flex-col justify-end pb-32 px-10 pointer-events-none items-start z-10">
        <div className="w-full max-w-sm flex flex-col gap-5">
          {log.slice(-3).map((m, k) => (
            <div key={k} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] ${
                m.role === 'user'
                  ? 'text-blue-400/25 text-[9px] font-mono tracking-tight'
                  : 'text-blue-100/80 text-[13px] font-light tracking-widest leading-relaxed'
              }`}>
                {m.role === 'user' ? m.text : <Typewriter text={m.text} />}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-14 left-1/2 -translate-x-1/2 w-full max-w-xs z-20">
        <input
          autoFocus
          className="w-full bg-transparent outline-none border-b border-white/5 py-2 text-center font-mono text-[10px] tracking-[0.4em] text-blue-200/25 placeholder:text-blue-900/10"
          placeholder={st === "thinking" ? "SYNC..." : "ask the system"}
          value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && run()}
        />
      </div>
    </div>
  );
}