import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Scroll-driven camera controller.
 * Moves the camera along z and tilts slightly based on scroll progress.
 */
export function CameraController({ maxScroll = 1000, zRange = 1.2, tiltRange = 0.08 }) {
  const scrollRef = useRef(0);
  const targetRef = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      targetRef.current = Math.min(window.scrollY / maxScroll, 1);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [maxScroll]);

  useFrame(({ camera }) => {
    // Smooth interpolation
    scrollRef.current += (targetRef.current - scrollRef.current) * 0.05;
    const t = scrollRef.current;

    // Move camera back and up as user scrolls
    camera.position.z = 3 + t * zRange;
    camera.position.y = t * 0.3;
    camera.rotation.x = -t * tiltRange;
    camera.rotation.y = t * 0.02;
  });

  return null;
}

/**
 * Hook: returns current smoothed scroll progress [0..1].
 */
export function useScrollDriver(maxScroll = 1000) {
  const progressRef = useRef(0);
  const targetRef = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      targetRef.current = Math.min(window.scrollY / maxScroll, 1);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [maxScroll]);

  useFrame(() => {
    progressRef.current += (targetRef.current - progressRef.current) * 0.06;
  });

  return progressRef;
}
