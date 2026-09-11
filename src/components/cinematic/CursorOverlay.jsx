import { useEffect, useRef, useCallback, useState, memo } from "react";
import { motion, useSpring, useMotionValue } from "framer-motion";

/* ── Particle Trail Canvas ── */
const TrailCanvas = memo(({ mouseRef }) => {
  const canvasRef = useRef(null);
  const pointsRef = useRef([]);
  const MAX_POINTS = 40;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animId;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      animId = requestAnimationFrame(draw);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      pointsRef.current.push({ x: mx, y: my, life: 1 });
      if (pointsRef.current.length > MAX_POINTS) {
        pointsRef.current.shift();
      }

      for (let i = 1; i < pointsRef.current.length; i++) {
        const prev = pointsRef.current[i - 1];
        const curr = pointsRef.current[i];
        curr.life -= 0.018;

        if (curr.life <= 0) continue;

        const alpha = curr.life * 0.5;
        const size = curr.life * 3;
        ctx.beginPath();
        ctx.moveTo(prev.x, prev.y);
        ctx.lineTo(curr.x, curr.y);
        ctx.strokeStyle = `rgba(167,139,250,${alpha})`;
        ctx.lineWidth = size;
        ctx.lineCap = "round";
        ctx.stroke();

        // Glow
        ctx.beginPath();
        ctx.arc(curr.x, curr.y, size * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(139,92,246,${alpha * 0.3})`;
        ctx.fill();
      }

      // Remove dead points
      pointsRef.current = pointsRef.current.filter((p) => p.life > 0);
    };

    draw();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, [mouseRef]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9998,
        pointerEvents: "none",
      }}
    />
  );
});

TrailCanvas.displayName = "TrailCanvas";

/* ── Cursor Ring ── */
const CursorRing = memo(({ mouseX, mouseY, isHovering, zoeMode }) => {
  return (
    <motion.div
      style={{
        position: "fixed",
        left: mouseX,
        top: mouseY,
        width: isHovering ? 48 : 28,
        height: isHovering ? 48 : 28,
        marginLeft: isHovering ? -24 : -14,
        marginTop: isHovering ? -24 : -14,
        borderRadius: "50%",
        border: `1px solid ${zoeMode ? "rgba(239,68,68,0.5)" : "rgba(167,139,250,0.4)"}`,
        background: "transparent",
        pointerEvents: "none",
        zIndex: 9999,
        transition: "width 0.3s ease, height 0.3s ease, margin 0.3s ease, border-color 0.3s ease",
        mixBlendMode: "difference",
      }}
    >
      {isHovering && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: "absolute",
            inset: -4,
            borderRadius: "50%",
            border: `1px solid ${zoeMode ? "rgba(239,68,68,0.15)" : "rgba(167,139,250,0.15)"}`,
          }}
        />
      )}
    </motion.div>
  );
});

CursorRing.displayName = "CursorRing";

/* ── Cursor Dot ── */
const CursorDot = memo(({ mouseX, mouseY, isHovering, zoeMode }) => {
  return (
    <motion.div
      style={{
        position: "fixed",
        left: mouseX,
        top: mouseY,
        width: isHovering ? 6 : 4,
        height: isHovering ? 6 : 4,
        marginLeft: isHovering ? -3 : -2,
        marginTop: isHovering ? -3 : -2,
        borderRadius: "50%",
        background: zoeMode ? "#f87171" : "#a78bfa",
        pointerEvents: "none",
        zIndex: 10000,
        transition: "width 0.3s ease, height 0.3s ease, margin 0.3s ease",
        boxShadow: zoeMode
          ? "0 0 10px rgba(239,68,68,0.6), 0 0 20px rgba(239,68,68,0.3)"
          : "0 0 10px rgba(139,92,246,0.6), 0 0 20px rgba(139,92,246,0.3)",
      }}
    />
  );
});

CursorDot.displayName = "CursorDot";

/* ── Main CursorOverlay ── */
export default function CursorOverlay({ zoeMode }) {
  const mouseRef = useRef({ x: -100, y: -100 });
  const rawX = useMotionValue(-100);
  const rawY = useMotionValue(-100);
  const springX = useSpring(rawX, { stiffness: 170, damping: 26, mass: 0.4 });
  const springY = useSpring(rawY, { stiffness: 170, damping: 26, mass: 0.4 });
  const [isHovering, setIsHovering] = useState(false);

  const updateHoverState = useCallback((e) => {
    const target = e.target;
    const interactive =
      target.closest("button") ||
      target.closest("a") ||
      target.closest("input") ||
      target.closest("textarea") ||
      target.closest("[data-cursor-hover]");
    setIsHovering(!!interactive);
  }, []);

  useEffect(() => {
    const onMove = (e) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
      rawX.set(e.clientX);
      rawY.set(e.clientY);
      updateHoverState(e);
    };

    window.addEventListener("mousemove", onMove);
    document.body.style.cursor = "none";

    // Apply cursor:none to all elements
    const style = document.createElement("style");
    style.id = "custom-cursor-hide";
    style.textContent =
      "*, *::before, *::after { cursor: none !important; }";
    document.head.appendChild(style);

    return () => {
      window.removeEventListener("mousemove", onMove);
      document.body.style.cursor = "";
      const el = document.getElementById("custom-cursor-hide");
      if (el) el.remove();
    };
  }, [rawX, rawY, updateHoverState]);

  return (
    <>
      <TrailCanvas mouseRef={mouseRef} />
      <CursorRing
        mouseX={springX}
        mouseY={springY}
        isHovering={isHovering}
        zoeMode={zoeMode}
      />
      <CursorDot
        mouseX={springX}
        mouseY={springY}
        isHovering={isHovering}
        zoeMode={zoeMode}
      />
    </>
  );
}
