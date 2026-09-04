"use client";

import { useEffect, useState } from "react";
import { MailShellLoading } from "./mail-shell-loading";

const SHELL_TIMEOUT_MS = 8_000;

export function MailHydrationShell() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const hasRenderedShell = () =>
      Boolean(document.querySelector("body > [data-mail-shell]"));

    if (hasRenderedShell()) {
      const readyFrame = requestAnimationFrame(() => setReady(true));
      return () => cancelAnimationFrame(readyFrame);
    }

    const timeout = setTimeout(() => setReady(true), SHELL_TIMEOUT_MS);

    const observer = new MutationObserver(() => {
      if (!hasRenderedShell()) return;
      clearTimeout(timeout);
      observer.disconnect();
      setReady(true);
    });
    observer.observe(document.body, { childList: true });
    return () => {
      clearTimeout(timeout);
      observer.disconnect();
    };
  }, []);

  return ready ? null : <MailShellLoading />;
}
