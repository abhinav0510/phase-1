"use client";

import { motion, type Variants } from "framer-motion";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const EASE = [0.22, 1, 0.36, 1] as const;

/** Fades and lifts each page in on navigation. */
export function PageFade({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.04 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};

/** Wrap a grid/row so its <Item>s cascade in. */
export function Stagger({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div variants={container} initial="hidden" animate="show" className={className}>
      {children}
    </motion.div>
  );
}

export function Item({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div variants={item} className={className}>
      {children}
    </motion.div>
  );
}

/** Reveals once when scrolled into view. */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, ease: EASE, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** Progress bar whose fill grows in from zero. */
export function ProgressBar({
  pct,
  className,
  barClassName,
}: {
  pct: number;
  className?: string;
  barClassName?: string;
}) {
  const p = Math.max(0, Math.min(100, pct));
  return (
    <div className={className ?? "h-2 w-full overflow-hidden rounded-full bg-navy-100"}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${p}%` }}
        transition={{ duration: 0.9, ease: EASE, delay: 0.2 }}
        className={barClassName ?? "h-full rounded-full bg-iris"}
      />
    </div>
  );
}

/** Lifts slightly on hover; use around cards that link somewhere. */
export function Hover({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div whileHover={{ y: -3 }} transition={{ duration: 0.25, ease: EASE }} className={className}>
      {children}
    </motion.div>
  );
}
