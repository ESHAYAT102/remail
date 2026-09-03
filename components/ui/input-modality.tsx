"use client";

import { useEffect } from "react";

/** Keys that move focus rather than the caret. */
const FOCUS_KEYS = new Set([
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Home",
  "End",
  "PageUp",
  "PageDown",
]);

function isTextEntry(node: EventTarget | null) {
  const element = node as HTMLElement | null;
  if (!element) return false;
  return (
    element.tagName === "INPUT" ||
    element.tagName === "TEXTAREA" ||
    element.isContentEditable
  );
}

/**
 * Records whether the last interaction came from a pointer or the keyboard.
 *
 * `:focus-visible` alone is not enough: the spec has it match text fields on
 * click, so clicking into the composer draws a focus ring. The stylesheet reads
 * this flag to suppress the ring for pointer input, and defaults to showing it
 * so a failure here can never leave a keyboard user without an indicator.
 */
export function TrackInputModality() {
  useEffect(() => {
    const root = document.documentElement;

    const onPointerDown = () => {
      root.dataset.modality = "pointer";
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      // Inside a text field the arrows move the caret, so only Tab counts.
      const movesFocus =
        event.key === "Tab" ||
        (FOCUS_KEYS.has(event.key) && !isTextEntry(event.target));
      if (movesFocus) root.dataset.modality = "keyboard";
    };

    window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, []);

  return null;
}
