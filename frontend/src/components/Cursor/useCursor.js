import { useEffect, useRef, useCallback } from "react";


const INTERACTIVE_SELECTORS = [
  "a",
  "button",
  "input",
  "textarea",
  "select",
  "label",
  '[role="button"]',
  '[role="link"]',
  '[role="menuitem"]',
  '[role="tab"]',
  "[data-cursor-hover]",
];

const INTERACTIVE_SELECTOR_STRING = INTERACTIVE_SELECTORS.join(",");

/**
 * Checks whether the current device should use a custom cursor.
 * Returns false for touch devices, coarse pointers, or reduced motion.
 */
function shouldEnableCustomCursor() {
  if (typeof window === "undefined") return false;

  const hasCoarsePointer = window.matchMedia("(pointer: coarse)").matches;
  const hasFinePointer = window.matchMedia("(pointer: fine)").matches;
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;
  const isTouchOnly = "ontouchstart" in window && !hasFinePointer;

  return !hasCoarsePointer && !prefersReducedMotion && !isTouchOnly;
}

/**
 * Finds the closest interactive ancestor of an element.
 */
function getInteractiveAncestor(el) {
  if (!el) return null;
  return el.closest(INTERACTIVE_SELECTOR_STRING);
}

/**
 * Gets the cursor style of an element, walking up ancestors.
 */
function hasCursorPointer(el) {
  let current = el;
  while (current && current !== document.body) {
    const style = window.getComputedStyle(current);
    if (style.cursor === "pointer") return true;
    current = current.parentElement;
  }
  return false;
}

/**
 * useCursor — Physics-driven premium cursor hook.
 *
 * Manages two layers:
 *  1. Cursor Dot — instant tracking, no lag
 *  2. Cursor Follower — spring-interpolated ring with hover/click states
 *
 * @returns {{ dotRef, followerRef, isEnabled }}
 */
export function useCursor() {
  const dotRef = useRef(null);
  const followerRef = useRef(null);
  const isEnabled = useRef(shouldEnableCustomCursor());

  // --- Mutable state refs (no re-renders) ---
  const mouse = useRef({ x: -100, y: -100 });
  const followerPos = useRef({ x: -100, y: -100 });
  const followerVel = useRef({ x: 0, y: 0 });
  const isHovering = useRef(false);
  const isPressed = useRef(false);
  const hoveredElement = useRef(null);
  const magnetOffset = useRef({ x: 0, y: 0 });
  const rafId = useRef(null);
  const isVisible = useRef(false);
  const firstMove = useRef(true); // Snap follower on first mouse move
  const idleTimer = useRef(null); // Timer for idle breathing effect
  const IDLE_DELAY = 800; // ms before breathing kicks in

  // --- Position history for delayed target ---
  const positionHistory = useRef([]); // Array of { time, x, y }
  const TARGET_DELAY = 80; // Ring's target is 80ms behind the dot

  // --- Spring physics constants ---
  const SPRING_STIFFNESS = 0.045; // Spring chase speed
  const SPRING_DAMPING = 0.82; // Smooth deceleration
  const MAGNETIC_STRENGTH = 0.15; // 15% pull toward element center
  const MAGNETIC_RADIUS = 80; // Pixel radius for magnetic activation

  /**
   * Looks up the position from TARGET_DELAY ms ago in the history buffer.
   * Interpolates between the two nearest samples for smooth results.
   */
  const getDelayedTarget = useCallback((now) => {
    const history = positionHistory.current;
    const delayedTime = now - TARGET_DELAY;

    if (history.length < 2) {
      return history.length === 1
        ? { x: history[0].x, y: history[0].y }
        : { x: mouse.current.x, y: mouse.current.y };
    }

    // Find bracketing samples
    let i = history.length - 1;
    while (i > 0 && history[i].time > delayedTime) i--;

    if (i < history.length - 1) {
      const a = history[i];
      const b = history[i + 1];
      const t = Math.max(0, Math.min(1, (delayedTime - a.time) / (b.time - a.time)));
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    }
    return { x: history[0].x, y: history[0].y };
  }, []);

  /**
   * Core animation loop — runs every frame via rAF.
   * Dot tracks instantly. Ring chases a delayed target with spring physics.
   */
  const animate = useCallback(() => {
    const dot = dotRef.current;
    const follower = followerRef.current;

    if (!dot || !follower) {
      rafId.current = requestAnimationFrame(animate);
      return;
    }

    const now = performance.now();

    // --- Dot: instant position (no interpolation) ---
    dot.style.transform = `translate3d(${mouse.current.x}px, ${mouse.current.y}px, 0)`;

    // --- Record current position with timestamp ---
    const liveX = mouse.current.x + magnetOffset.current.x;
    const liveY = mouse.current.y + magnetOffset.current.y;
    positionHistory.current.push({ time: now, x: liveX, y: liveY });

    // Prune old entries (keep last 500ms)
    const cutoff = now - 500;
    while (positionHistory.current.length > 2 && positionHistory.current[0].time < cutoff) {
      positionHistory.current.shift();
    }

    // --- Follower: spring toward the DELAYED target (not live mouse) ---
    const target = getDelayedTarget(now);
    const dx = target.x - followerPos.current.x;
    const dy = target.y - followerPos.current.y;

    // Apply spring acceleration + velocity damping
    followerVel.current.x += dx * SPRING_STIFFNESS;
    followerVel.current.y += dy * SPRING_STIFFNESS;
    followerVel.current.x *= SPRING_DAMPING;
    followerVel.current.y *= SPRING_DAMPING;

    // Update position
    followerPos.current.x += followerVel.current.x;
    followerPos.current.y += followerVel.current.y;

    // --- Compute follower scale ---
    let scale = 1;
    if (isPressed.current) {
      scale = isHovering.current ? 0.88 : 0.91;
    } else if (isHovering.current) {
      scale = 1; // Scale is handled via CSS class for size change
    }

    // Apply GPU-accelerated transform
    follower.style.transform = `translate3d(${followerPos.current.x}px, ${followerPos.current.y}px, 0) scale(${scale})`;

    rafId.current = requestAnimationFrame(animate);
  }, [getDelayedTarget]);

  useEffect(() => {
    if (!isEnabled.current) return;

    // Hide default cursor globally
    document.documentElement.style.cursor = "none";
    document.body.style.cursor = "none";

    // --- Mouse move handler ---
    const onMouseMove = (e) => {
      mouse.current.x = e.clientX;
      mouse.current.y = e.clientY;

      // --- Idle breathing: cancel on movement, restart timer ---
      if (followerRef.current) {
        followerRef.current.classList.remove("cursor-follower--idle");
      }
      clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(() => {
        if (followerRef.current && !isHovering.current && !isPressed.current) {
          followerRef.current.classList.add("cursor-follower--idle");
        }
      }, IDLE_DELAY);

      // Show cursor elements on first move
      if (!isVisible.current) {
        isVisible.current = true;
        // Snap follower to mouse so it doesn't fly in from top-left
        followerPos.current.x = e.clientX;
        followerPos.current.y = e.clientY;
        followerVel.current.x = 0;
        followerVel.current.y = 0;
        if (dotRef.current) dotRef.current.style.opacity = "1";
        if (followerRef.current) followerRef.current.style.opacity = "1";
      }

      // --- Hover detection ---
      const target = document.elementFromPoint(e.clientX, e.clientY);
      const interactive =
        getInteractiveAncestor(target) ||
        (target && hasCursorPointer(target) ? target : null);

      if (interactive && !isHovering.current) {
        // Enter hover — cancel idle breathing
        isHovering.current = true;
        hoveredElement.current = interactive;
        if (followerRef.current) {
          followerRef.current.classList.add("cursor-follower--hover");
          followerRef.current.classList.remove("cursor-follower--idle");
        }
      } else if (!interactive && isHovering.current) {
        // Leave hover
        isHovering.current = false;
        hoveredElement.current = null;
        magnetOffset.current = { x: 0, y: 0 };
        if (followerRef.current) {
          followerRef.current.classList.remove("cursor-follower--hover");
        }
      }

      // --- Magnetic effect (subtle drift toward element center) ---
      if (isHovering.current && hoveredElement.current) {
        const rect = hoveredElement.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const distX = centerX - e.clientX;
        const distY = centerY - e.clientY;
        const dist = Math.sqrt(distX * distX + distY * distY);

        if (dist < MAGNETIC_RADIUS) {
          const strength = (1 - dist / MAGNETIC_RADIUS) * MAGNETIC_STRENGTH;
          magnetOffset.current.x = distX * strength;
          magnetOffset.current.y = distY * strength;
        } else {
          magnetOffset.current.x = 0;
          magnetOffset.current.y = 0;
        }
      }
    };

    // --- Mouse down/up handlers ---
    const onMouseDown = () => {
      isPressed.current = true;
      if (followerRef.current) {
        followerRef.current.classList.add("cursor-follower--pressed");
        followerRef.current.classList.remove("cursor-follower--idle");
      }
      clearTimeout(idleTimer.current);
    };

    const onMouseUp = () => {
      isPressed.current = false;
      if (followerRef.current) {
        followerRef.current.classList.remove("cursor-follower--pressed");
      }
    };

    // --- Mouse enter/leave window ---
    const onMouseLeave = () => {
      isVisible.current = false;
      if (dotRef.current) dotRef.current.style.opacity = "0";
      if (followerRef.current) followerRef.current.style.opacity = "0";
    };

    const onMouseEnter = () => {
      isVisible.current = true;
      if (dotRef.current) dotRef.current.style.opacity = "1";
      if (followerRef.current) followerRef.current.style.opacity = "1";
    };

    // --- Bind events ---
    document.addEventListener("mousemove", onMouseMove, { passive: true });
    document.addEventListener("mousedown", onMouseDown, { passive: true });
    document.addEventListener("mouseup", onMouseUp, { passive: true });
    document.documentElement.addEventListener("mouseleave", onMouseLeave, {
      passive: true,
    });
    document.documentElement.addEventListener("mouseenter", onMouseEnter, {
      passive: true,
    });

    // --- Hide cursor on all interactive elements via stylesheet ---
    const styleSheet = document.createElement("style");
    styleSheet.id = "cursor-hide-styles";
    styleSheet.textContent = `
      *, *::before, *::after { cursor: none !important; }
    `;
    document.head.appendChild(styleSheet);

    // --- Start animation loop ---
    rafId.current = requestAnimationFrame(animate);

    // --- Cleanup ---
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("mouseup", onMouseUp);
      document.documentElement.removeEventListener("mouseleave", onMouseLeave);
      document.documentElement.removeEventListener("mouseenter", onMouseEnter);

      if (rafId.current) cancelAnimationFrame(rafId.current);
      clearTimeout(idleTimer.current);

      document.documentElement.style.cursor = "";
      document.body.style.cursor = "";

      const sheet = document.getElementById("cursor-hide-styles");
      if (sheet) sheet.remove();
    };
  }, [animate]);

  return {
    dotRef,
    followerRef,
    isEnabled: isEnabled.current,
  };
}

export default useCursor;
