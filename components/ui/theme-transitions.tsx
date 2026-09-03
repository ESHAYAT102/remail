"use client";

import { useEffect, useLayoutEffect } from "react";
import type { ThemePreference } from "@/lib/preferences";

function withoutThemeTransitions(change: () => void) {
  const style = document.createElement("style");
  style.append(
    document.createTextNode("*,*::before,*::after{transition:none !important}"),
  );
  document.head.append(style);
  change();
  void document.body.offsetHeight;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => style.remove());
  });
}

export function DisableThemeTransitions() {
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (!document.documentElement.dataset.theme) {
        withoutThemeTransitions(() => {});
      }
    };
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);
  return null;
}

export function SyncThemePreference({ preference }: { preference: ThemePreference }) {
  useLayoutEffect(() => {
    const root = document.documentElement;
    const next = preference === "system" ? undefined : preference;
    if (root.dataset.theme === next) return;
    withoutThemeTransitions(() => {
      if (next) root.dataset.theme = next;
      else delete root.dataset.theme;
    });
  }, [preference]);
  return null;
}
