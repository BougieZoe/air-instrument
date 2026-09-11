import { motion } from "framer-motion";
import { useMemo } from "react";

/**
 * Per-character staggered text reveal — Lusion-style.
 * Splits children into individual characters and animates them
 * one by one with spring-based reveal.
 */
export default function CharReveal({
  children,
  as: Tag = "span",
  className = "",
  staggerMs = 18,
  delay = 0,
  once = true,
  threshold = 0.3,
  style = {},
  spring = { stiffness: 80, damping: 14 },
}) {
  const chars = useMemo(() => {
    if (typeof children !== "string") return [];
    return [...children];
  }, [children]);

  const container = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: staggerMs / 1000,
        delayChildren: delay,
      },
    },
  };

  const child = {
    hidden: {
      opacity: 0,
      y: 20,
      rotateX: -12,
      filter: "blur(4px)",
    },
    visible: {
      opacity: 1,
      y: 0,
      rotateX: 0,
      filter: "blur(0px)",
      transition: {
        type: "spring",
        ...spring,
      },
    },
  };

  return (
    <Tag
      className={className}
      style={{ display: "inline", ...style }}
    >
      <motion.span
        variants={container}
        initial="hidden"
        whileInView="visible"
        viewport={{ once, margin: `-${Math.round(threshold * 100)}px 0px` }}
        style={{ display: "inline" }}
      >
        {chars.map((char, i) => (
          <motion.span
            key={i}
            variants={child}
            style={{
              display: "inline-block",
              whiteSpace: char === " " ? "pre" : "normal",
            }}
          >
            {char === " " ? "\u00A0" : char}
          </motion.span>
        ))}
      </motion.span>
    </Tag>
  );
}
