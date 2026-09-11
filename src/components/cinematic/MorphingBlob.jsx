import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const VERTEX = /* glsl */ `
  uniform float uTime;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying float vDisplacement;

  // Simple 3D noise approximation
  float noise3D(vec3 p) {
    return sin(p.x * 3.7 + uTime * 0.7) * cos(p.y * 4.1 - uTime * 0.5) *
           sin(p.z * 3.3 + uTime * 0.6) * 0.5 + 0.5;
  }

  void main() {
    vec3 pos = position;
    float n1 = noise3D(pos * 1.8);
    float n2 = noise3D(pos * 3.2 + vec3(1.0, 2.0, 3.0));
    float n3 = noise3D(pos * 5.5 + vec3(3.0, 1.0, 2.0));

    float displacement = (n1 * 0.35 + n2 * 0.2 + n3 * 0.1);
    vec3 newPos = pos + normal * displacement * 0.8;

    vNormal = normalize(normalMatrix * normal);
    vPosition = newPos;
    vDisplacement = displacement;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPos, 1.0);
  }
`;

const FRAGMENT = /* glsl */ `
  uniform float uTime;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying float vDisplacement;

  void main() {
    // Fresnel-like edge glow
    vec3 viewDir = normalize(vec3(0.0, 0.0, 1.0));
    float fresnel = 1.0 - abs(dot(vNormal, viewDir));
    fresnel = pow(fresnel, 3.0);

    vec3 baseColor = mix(
      vec3(0.15, 0.08, 0.30),
      vec3(0.35, 0.20, 0.55),
      vDisplacement
    );

    vec3 edgeColor = vec3(0.50, 0.32, 0.70);

    vec3 col = mix(baseColor, edgeColor, fresnel * 0.6);

    // Subtle shimmer
    col += vec3(0.08, 0.04, 0.15) * sin(vPosition.y * 10.0 + uTime) * 0.15;
    col += vec3(0.05, 0.02, 0.10) * fresnel * 0.3;

    float alpha = 0.18 + fresnel * 0.15;
    gl_FragColor = vec4(col, alpha);
  }
`;

export default function MorphingBlob() {
  const meshRef = useRef();

  const geo = useMemo(() => {
    return new THREE.IcosahedronGeometry(1.8, 32);
  }, []);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.material.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 0, -1.2]} geometry={geo}>
      <shaderMaterial
        vertexShader={VERTEX}
        fragmentShader={FRAGMENT}
        uniforms={{ uTime: { value: 0 } }}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}
