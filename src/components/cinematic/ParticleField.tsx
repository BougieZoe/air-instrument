import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';

const VERTEX_SHADER = /* glsl */ `
  uniform float uTime;
  uniform float uBreathing;
  uniform float uSilhouetteStrength;
  uniform float uFaceStrength;
  uniform float uDriftSpeed;
  uniform float uTurbulence;
  uniform vec2 uMouse;
  uniform float uInteractionStrength;
  uniform float uClickPulse;
  uniform vec2 uClickPos;
  uniform float uAttentionFocus;
  uniform float uIdleStrength;
  
  attribute float aSize;
  attribute vec3 aVelocity;
  attribute vec3 aTargetPosition;
  attribute vec3 aFacePosition;
  attribute float aOffset;
  
  varying float vAlpha;
  varying float vDistance;
  varying float vHighlight;

  void main() {
    vec3 voidPos = position;
    
    // 1. Organic Base Motion
    float t = uTime * uDriftSpeed;
    voidPos.x += sin(t + aVelocity.x * 20.0 + aOffset) * (0.4 + uTurbulence);
    voidPos.y += cos(t * 1.2 + aVelocity.y * 18.0 + aOffset) * (0.3 + uTurbulence);
    voidPos.z += sin(t * 0.8 + aVelocity.z * 22.0 + aOffset) * (0.4 + uTurbulence);

    // 2. Target Blend
    vec3 silhouettePos = aTargetPosition;
    vec3 facePos = aFacePosition;
    float jitter = sin(uTime * (5.0 + uTurbulence * 10.0) + aTargetPosition.y * 10.0) * (0.02 + uTurbulence * 0.05);
    silhouettePos.x += jitter;
    facePos.x += jitter * 0.5;

    vec3 mixedPos = mix(voidPos, silhouettePos, uSilhouetteStrength);
    vec3 finalPos = mix(mixedPos, facePos, uFaceStrength);

    // 3. Idle Dispersion
    float idleExpansion = 1.0 + uIdleStrength * 1.5;
    finalPos *= idleExpansion;

    // 4. Observant Awareness
    vec3 attentionPos = vec3(uMouse.x * 10.0, uMouse.y * 6.0, 0.0);
    float distToAttention = distance(finalPos, attentionPos);
    float attentionPull = smoothstep(5.0, 0.0, distToAttention) * uAttentionFocus * 0.4;
    finalPos = mix(finalPos, attentionPos, attentionPull * 0.1);

    // 5. Click Shockwave
    vec3 clickPos3D = vec3(uClickPos.x * 10.0, uClickPos.y * 6.0, 0.0);
    float distToClick = distance(finalPos, clickPos3D);
    float wave = sin(distToClick * 4.0 - uClickPulse * 15.0);
    float waveIntensity = smoothstep(0.5, 0.0, abs(distToClick - uClickPulse * 8.0)) * (1.0 - uClickPulse);
    finalPos += normalize(finalPos - clickPos3D) * wave * waveIntensity * (2.0 - uFaceStrength * 1.5);
    
    // 6. Breathing
    float breatheCycle = uBreathing * 0.5 + 0.5;
    float breatheAmount = 0.05 + uIdleStrength * 0.04;
    finalPos *= 1.0 + (breatheCycle * breatheAmount * (1.0 - uSilhouetteStrength - uFaceStrength * 0.5));

    vec4 mvPosition = modelViewMatrix * vec4(finalPos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    
    vDistance = -mvPosition.z;
    gl_PointSize = aSize * (500.0 / vDistance);
    
    float twinkle = 0.6 + 0.4 * sin(uTime * (1.5 + uTurbulence * 2.0) + aOffset * 10.0);
    float breathAlpha = (0.5 + 0.5 * breatheCycle) * (1.0 - uIdleStrength * 0.4);
    float distanceFade = smoothstep(25.0 - uIdleStrength * 8.0, 2.0, vDistance);
    
    float attentionHighlight = smoothstep(3.0, 0.0, distToAttention) * uAttentionFocus * 0.5;
    vHighlight = attentionHighlight + waveIntensity * 2.0 + uFaceStrength * 0.3;
    vAlpha = distanceFade * breathAlpha * twinkle * (1.0 + uSilhouetteStrength * 0.5 + uFaceStrength * 0.8 + attentionHighlight);
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  varying float vAlpha;
  varying float vHighlight;
  void main() {
    float dist = length(gl_PointCoord - 0.5);
    if (dist > 0.5) discard;
    float strength = pow(1.0 - (dist * 2.0), 3.5);
    vec3 color = mix(vec3(1.0), vec3(0.95, 0.98, 1.0), vHighlight);
    gl_FragColor = vec4(color, strength * vAlpha * (0.5 + vHighlight));
  }
`;

export type Emotion = 'calm' | 'curious' | 'intense';

interface ParticleFieldProps {
  count?: number;
  emotion: Emotion;
  clickPulse: number;
  clickPos: THREE.Vector2;
  faceStrength: number;
  attentionFocus: number;
  idleStrength: number;
}

const ParticleField: React.FC<ParticleFieldProps> = ({ 
  count = 4000, 
  emotion, 
  clickPulse, 
  clickPos, 
  faceStrength, 
  attentionFocus,
  idleStrength
}) => {
  const meshRef = useRef<THREE.Points>(null!);
  const { mouse } = useThree();
  
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uBreathing: { value: 0 },
    uSilhouetteStrength: { value: 0.15 },
    uFaceStrength: { value: 0 },
    uDriftSpeed: { value: 1.0 },
    uTurbulence: { value: 0.0 },
    uMouse: { value: new THREE.Vector2(0, 0) },
    uInteractionStrength: { value: 0.0 },
    uClickPulse: { value: 0 },
    uClickPos: { value: new THREE.Vector2(0, 0) },
    uAttentionFocus: { value: 0 },
    uIdleStrength: { value: 0 }
  }), []);

  const config = useMemo(() => ({
    calm: { drift: 0.4, turbulence: 0.0, silhouette: 0.1, breathFreq: 0.5, interaction: 0.2 },
    curious: { drift: 1.0, turbulence: 0.15, silhouette: 0.3, breathFreq: 1.0, interaction: 0.5 },
    intense: { drift: 2.5, turbulence: 0.6, silhouette: 0.6, breathFreq: 2.2, interaction: 0.8 }
  }), []);

  useEffect(() => {
    const target = config[emotion];
    gsap.to(uniforms.uDriftSpeed, { value: target.drift, duration: 3, ease: "power2.inOut" });
    gsap.to(uniforms.uTurbulence, { value: target.turbulence, duration: 3, ease: "power2.inOut" });
    gsap.to(uniforms.uSilhouetteStrength, { value: target.silhouette, duration: 3, ease: "power2.inOut" });
    gsap.to(uniforms.uInteractionStrength, { value: target.interaction, duration: 3, ease: "power2.inOut" });
  }, [emotion, config, uniforms]);

  useEffect(() => {
    gsap.to(uniforms.uFaceStrength, { value: faceStrength, duration: 2.5, ease: "expo.inOut" });
  }, [faceStrength, uniforms]);

  useEffect(() => {
    gsap.to(uniforms.uAttentionFocus, { value: attentionFocus, duration: 2, ease: "sine.inOut" });
  }, [attentionFocus, uniforms]);

  useEffect(() => {
    gsap.to(uniforms.uIdleStrength, { value: idleStrength, duration: 8, ease: "power1.inOut" });
  }, [idleStrength, uniforms]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    uniforms.uTime.value = t;
    // Slow down breathing rhythm when idle
    const freq = config[emotion].breathFreq * (1.0 - idleStrength * 0.4);
    uniforms.uBreathing.value = Math.sin(t * freq);
    
    uniforms.uMouse.value.lerp(mouse, 0.02);
    uniforms.uClickPulse.value = clickPulse;
    uniforms.uClickPos.value.copy(clickPos);
    
    if (meshRef.current) {
      meshRef.current.rotation.y = t * (0.006 * uniforms.uDriftSpeed.value);
    }
  });

  const { positions, targets, facePoints, sizes, velocities, offsets } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const target = new Float32Array(count * 3);
    const face = new Float32Array(count * 3);
    const siz = new Float32Array(count);
    const vel = new Float32Array(count * 3);
    const off = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const voidRadius = 8 + Math.random() * 10;
      const theta = Math.random() * Math.PI * 2, phi = Math.acos(2 * Math.random() - 1);
      pos[i3] = voidRadius * Math.sin(phi) * Math.cos(theta);
      pos[i3 + 1] = voidRadius * Math.sin(phi) * Math.sin(theta);
      pos[i3 + 2] = voidRadius * Math.cos(phi) - 4;

      const part = Math.random();
      if (part < 0.1) {
        target[i3] = (Math.random()-0.5)*0.5; target[i3+1] = 2.0+(Math.random()-0.5)*0.5; target[i3+2] = (Math.random()-0.5)*0.5;
      } else if (part < 0.5) {
        target[i3] = (Math.random()-0.5)*1.2; target[i3+1] = 0.8+(Math.random()-0.5)*2.0; target[i3+2] = (Math.random()-0.5)*0.8;
      } else {
        target[i3] = (Math.random()-0.5)*2.5; target[i3+1] = -0.5+(Math.random()-0.5)*3.0; target[i3+2] = (Math.random()-0.5)*0.6;
      }

      const fPart = Math.random();
      let fx=0, fy=0, fz=0;
      if (fPart < 0.4) {
        const angle = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * 0.8;
        fx = Math.cos(angle) * r;
        fy = 1.2 + Math.sin(angle) * r * 1.3;
        fz = (1.0 - Math.pow(r/0.8, 2.0)) * 0.3;
      } else if (fPart < 0.6) {
        const side = Math.random() > 0.5 ? 0.35 : -0.35;
        const r = Math.random() * 0.12;
        const a = Math.random() * Math.PI * 2;
        fx = side + Math.cos(a) * r;
        fy = 1.6 + Math.sin(a) * r;
        fz = 0.35;
      } else if (fPart < 0.8) {
        fx = (Math.random()-0.5) * 0.08;
        fy = 1.1 + Math.random() * 0.6;
        fz = 0.45 - Math.abs(fy - 1.4) * 0.2;
      } else {
        fx = (Math.random()-0.5) * 0.4;
        fy = 0.8 + Math.pow(fx, 2.0) * 0.1;
        fz = 0.3;
      }
      face[i3] = fx * 1.5; face[i3 + 1] = fy * 1.5; face[i3 + 2] = fz * 1.5;

      siz[i] = Math.random() * 1.5 + 0.3;
      vel[i3] = Math.random(); vel[i3+1] = Math.random(); vel[i3+2] = Math.random();
      off[i] = Math.random() * Math.PI * 2;
    }
    return { positions: pos, targets: target, facePoints: face, sizes: siz, velocities: vel, offsets: off };
  }, [count]);

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" array={positions} count={count} itemSize={3} />
        <bufferAttribute attach="attributes-aTargetPosition" array={targets} count={count} itemSize={3} />
        <bufferAttribute attach="attributes-aFacePosition" array={facePoints} count={count} itemSize={3} />
        <bufferAttribute attach="attributes-aSize" array={sizes} count={count} itemSize={1} />
        <bufferAttribute attach="attributes-aVelocity" array={velocities} count={count} itemSize={3} />
        <bufferAttribute attach="attributes-aOffset" array={offsets} count={count} itemSize={1} />
      </bufferGeometry>
      <shaderMaterial
        vertexShader={VERTEX_SHADER}
        fragmentShader={FRAGMENT_SHADER}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

export default ParticleField;
