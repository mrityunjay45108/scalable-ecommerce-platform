import { Variants } from 'framer-motion';

/**
 * Standard luxury easing curve (fast, smooth, confident)
 */
export const LUXURY_EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Fade up animation variant for headers, text, and cards
 */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: LUXURY_EASE,
    },
  },
};

/**
 * Subtle fade in variant
 */
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.45,
      ease: 'easeOut',
    },
  },
};

/**
 * Scale in with opacity for badges, modals, and spotlight cards
 */
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.94 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.45,
      ease: LUXURY_EASE,
    },
  },
};

/**
 * Horizontal entrance variants
 */
export const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -28 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.55,
      ease: LUXURY_EASE,
    },
  },
};

export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 28 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.55,
      ease: LUXURY_EASE,
    },
  },
};

/**
 * Stagger container variant for lists, grids, and hero text
 */
export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.04,
    },
  },
};

/**
 * Custom stagger container factory
 */
export const createStaggerContainer = (
  staggerChildren = 0.08,
  delayChildren = 0.04,
): Variants => ({
  hidden: {},
  visible: {
    transition: {
      staggerChildren,
      delayChildren,
    },
  },
});

/**
 * Standard viewport configuration for scroll-reveals (triggers once, doesn't flicker)
 */
export const viewportOnce = {
  once: true,
  margin: '-40px' as const,
};

/**
 * Standard button micro-interaction
 */
export const buttonPress = {
  whileHover: { scale: 1.02, transition: { duration: 0.15 } },
  whileTap: { scale: 0.97, transition: { duration: 0.1 } },
};

/**
 * Standard card elevation on hover
 */
export const cardLift = {
  whileHover: {
    y: -5,
    transition: { duration: 0.25, ease: 'easeOut' },
  },
};
