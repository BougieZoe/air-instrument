import React, { Suspense, useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, Bloom, Noise, Vignette, ChromaticAberration } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import gsap from 'gsap';
import ParticleField, { Emotion } from './ParticleField';
import SpeakInput from './SpeakInput';
import AbsorbedText from './AbsorbedText';
import { useGemini } from '../../lib/gemini';
import { useAmbientAudio } from '../../lib/useAmbientAudio';

const SceneContent: React.FC<{ 
  emotion: Emotion, 
  clickPulse: number, 
  clickPos: THREE.Vector2,
  faceStrength: number,
  isUnstable: boolean,
  isNoticing: boolean,
  attentionFocus: number,
  idleStrength: number
}> = ({ emotion, clickPulse, clickPos, faceStrength, isUnstable, isNoticing, attentionFocus, idleStrength }) => {
  const bloomRef = useRef<any>(null);
  const driftRef = useRef({ speed: 0.1, range: 0.5, bloomBase: 0.35, camZ: 7, focusShift: 0 });
  const { mouse } = useThree();

  const emotionConfigs = useMemo(() => ({
    calm: { speed: 0.08, range: 0.4, bloomBase: 0.3 },
    curious: { speed: 0.25, range: 1.2, bloomBase: 0.6 },
    intense: { speed: 0.7, range: 2.5, bloomBase: 1.1 }
  }), []);

  useEffect(() => {
    if (isNoticing) {
      gsap.to(driftRef.current, { camZ: 5.2, focusShift: 0.4, duration: 2.5, ease: "power2.inOut" });
    } else {
      const targetCamZ = 7 + idleStrength * 3; // Pull back camera when idle
      gsap.to(driftRef.current, { camZ: targetCamZ, focusShift: 0, duration: 4.5, ease: "power2.inOut" });
    }
  }, [isNoticing, idleStrength]);

  useEffect(() => {
    const target = emotionConfigs[emotion];
    gsap.to(driftRef.current, { 
      speed: isUnstable ? target.speed * 1.5 : target.speed, 
      range: isUnstable ? target.range * 1.2 : target.range, 
      bloomBase: isUnstable ? target.bloomBase * 1.4 : target.bloomBase,
      duration: isUnstable ? 1 : 4, 
      ease: isUnstable ? "rough" : "power3.inOut" 
    });
  }, [emotion, emotionConfigs, isUnstable]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const { speed, range, bloomBase, camZ } = driftRef.current;
    
    // Idle Camera Behavior: Slower, wider, less focused
    const curSpeed = speed * (1.0 - idleStrength * 0.5);
    const curRange = range * (1.0 + idleStrength * 0.5);

    const baseX = Math.sin(t * curSpeed) * curRange;
    const baseY = Math.cos(t * curSpeed * 0.8) * (curRange * 0.4);
    
    const attX = mouse.x * attentionFocus * 0.4;
    const attY = mouse.y * attentionFocus * 0.2;

    state.camera.position.x = baseX + attX;
    state.camera.position.y = baseY + attY;
    state.camera.position.z = THREE.MathUtils.lerp(state.camera.position.z, camZ + Math.sin(t * curSpeed * 0.3) * (curRange * 0.5), 0.05);
    
    state.camera.lookAt(attX * 0.5, 0.3 + attY * 0.5, 0);

    if (bloomRef.current) {
      const freq = emotion === 'calm' ? 0.5 : emotion === 'curious' ? 1.0 : 2.2;
      // Slow rhythmic pulse for idle
      const pulseFreq = freq * (1.0 - idleStrength * 0.6);
      const pulse = Math.sin(t * pulseFreq) * 0.5 + 0.5;
      bloomRef.current.intensity = (bloomBase + faceStrength * 0.5 + attentionFocus * 0.1) * (0.85 + pulse * 0.3) * (1.0 - idleStrength * 0.2);
    }
  });

  return (
    <>
      <color attach="background" args={['#000000']} />
      <fogExp2 attach="fog" args={['#000000', 0.08 + idleStrength * 0.04]} />
      
      <Suspense fallback={null}>
        <ParticleField 
          count={5000} 
          emotion={emotion} 
          clickPulse={clickPulse} 
          clickPos={clickPos} 
          faceStrength={faceStrength + driftRef.current.focusShift * 0.3}
          attentionFocus={attentionFocus}
          idleStrength={idleStrength}
        />
      </Suspense>

      <EffectComposer disableNormalPass multisampling={0}>
        <Bloom 
          ref={bloomRef}
          luminanceThreshold={0.2} 
          mipmapBlur 
          intensity={0.5} 
          radius={0.7} 
        />
        <ChromaticAberration
          blendFunction={BlendFunction.SCREEN}
          offset={new THREE.Vector2(0.0008, 0.0008)}
        />
        <Noise opacity={0.05 + idleStrength * 0.05} premultiply />
        <Vignette eskil={false} offset={0.05} darkness={1.3 + idleStrength * 0.2} />
      </EffectComposer>
    </>
  );
};

const ZoeScene: React.FC = () => {
  const { sendMessage, streamedText, isTyping, currentEmotion, showFace, isUnstable } = useGemini();
  const { init: initAudio, resume: resumeAudio } = useAmbientAudio(currentEmotion);
  
  const [clickPulse, setClickPulse] = useState(0);
  const [clickPos, setClickPos] = useState(new THREE.Vector2(0, 0));
  const [isNoticing, setIsNoticing] = useState(false);
  const [attentionFocus, setAttentionFocus] = useState(0);
  const [idleStrength, setIdleStrength] = useState(0);
  
  const clickAnim = useRef<gsap.core.Tween | null>(null);
  const attentionTimer = useRef<NodeJS.Timeout | null>(null);
  const prevMouse = useRef(new THREE.Vector2(0, 0));
  const lastActivity = useRef(Date.now());

  useFrame((state) => {
    const now = Date.now();
    const timeSinceActivity = now - lastActivity.current;

    // Idle Detection
    if (timeSinceActivity > 15000) { // 15s for deep idle
      setIdleStrength(Math.min(1, (timeSinceActivity - 15000) / 10000));
    } else {
      setIdleStrength(0);
    }

    const dist = state.mouse.distanceTo(prevMouse.current);
    if (dist > 0.001) lastActivity.current = now;
    prevMouse.current.copy(state.mouse);

    const isNearby = state.mouse.length() < 0.8;
    if (isNearby && dist < 0.01 && !isNoticing) {
      if (!attentionTimer.current) {
        attentionTimer.current = setTimeout(() => {
          setAttentionFocus(1);
        }, 1200);
      }
    } else {
      if (attentionTimer.current) {
        clearTimeout(attentionTimer.current);
        attentionTimer.current = null;
      }
      if (!isNearby || dist > 0.05) {
        setAttentionFocus(0);
      }
    }
  });

  const handleGlobalInteraction = useCallback((e: any) => {
    lastActivity.current = Date.now();
    initAudio();
    resumeAudio();
    const x = (e.clientX / window.innerWidth) * 2 - 1;
    const y = -(e.clientY / window.innerHeight) * 2 + 1;
    setClickPos(new THREE.Vector2(x, y));
    if (clickAnim.current) clickAnim.current.kill();
    setClickPulse(0);
    clickAnim.current = gsap.to({ val: 0 }, {
      val: 1, duration: 1.5, ease: "power2.out",
      onUpdate: function() { setClickPulse(this.targets()[0].val); }
    });
  }, [initAudio, resumeAudio]);

  useEffect(() => {
    window.addEventListener('mousedown', handleGlobalInteraction);
    window.addEventListener('keydown', () => lastActivity.current = Date.now());
    return () => {
      window.removeEventListener('mousedown', handleGlobalInteraction);
      window.removeEventListener('keydown', () => lastActivity.current = Date.now());
    };
  }, [handleGlobalInteraction]);

  const handleSendMessage = async (prompt: string) => {
    lastActivity.current = Date.now();
    setIsNoticing(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    sendMessage(prompt);
  };

  useEffect(() => {
    if (!isTyping && streamedText) {
      const timer = setTimeout(() => setIsNoticing(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isTyping, streamedText]);

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden font-instrument cursor-none">
      <Canvas
        camera={{ position: [0, 0, 7], fov: 35 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance", stencil: false, depth: true }}
      >
        <SceneContent 
          emotion={currentEmotion} 
          clickPulse={clickPulse} 
          clickPos={clickPos} 
          faceStrength={showFace ? 1 : 0}
          isUnstable={isUnstable}
          isNoticing={isNoticing}
          attentionFocus={attentionFocus}
          idleStrength={idleStrength}
        />
      </Canvas>
      <AbsorbedText text={streamedText} isTyping={isTyping} idleStrength={idleStrength} />
      <SpeakInput onSend={handleSendMessage} isTyping={isTyping} onInteraction={() => lastActivity.current = Date.now()} />
      <div className="fixed inset-0 pointer-events-none">
        <div className={`absolute inset-0 opacity-[0.04] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.3)_50%),linear-gradient(90deg,rgba(255,0,0,0.08),rgba(0,255,0,0.03),rgba(0,0,255,0.08))] z-50 bg-[length:100%_2px,4px_100%] transition-opacity duration-1000 ${isUnstable ? 'opacity-[0.1]' : ''}`} />
        <div className="absolute top-12 left-12 flex flex-col gap-1 opacity-30">
          <div className="w-6 h-[0.5px] bg-white" />
          <div className="font-mono text-[8px] uppercase tracking-[1em] text-white">ZOE_OS // CORE</div>
        </div>
        <div className="absolute bottom-12 right-12 flex flex-col items-end gap-1 opacity-30">
          <div className={`font-mono text-[8px] uppercase tracking-[1em] text-white select-none transition-colors duration-1000 ${isUnstable ? 'text-red-500/50' : ''}`}>
            {isUnstable ? 'SYSTEM_UNSTABLE' : idleStrength > 0.5 ? 'DEEP_THOUGHT' : currentEmotion === 'calm' ? 'STABLE' : 'PROCESSING'}
          </div>
          <div className={`w-12 h-[0.5px] transition-colors duration-1000 ${isUnstable ? 'bg-red-500/50' : 'bg-white'}`} />
        </div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_20%,rgba(0,0,0,1)_100%)]" />
      </div>
      <CustomCursor />
    </div>
  );
};

const CustomCursor: React.FC = () => {
  const cursorRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const moveCursor = (e: MouseEvent) => {
      if (cursorRef.current) { cursorRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`; }
    };
    window.addEventListener('mousemove', moveCursor);
    return () => window.removeEventListener('mousemove', moveCursor);
  }, []);
  return <div ref={cursorRef} className="fixed top-0 left-0 w-2 h-2 bg-white/40 rounded-full pointer-events-none z-[100] -ml-1 -mt-1 mix-blend-difference blur-[1px] transition-transform duration-75 ease-out" />;
};

export default ZoeScene;
