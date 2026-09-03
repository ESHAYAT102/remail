"use client";

import { useEffect, useState } from "react";
import { MailShellLoading } from "./mail-shell-loading";

export function MailHydrationShell() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const hasRenderedShell = () =>
      Boolean(document.querySelector("body > [data-mail-shell]"));

    if (hasRenderedShell()) {
      const readyFrame = requestAnimationFrame(() => setReady(true));
      return () => cancelAnimationFrame(readyFrame);
    }

    const observer = new MutationObserver(() => {
      if (!hasRenderedShell()) return;
      observer.disconnect();
      setReady(true);
    });
    observer.observe(document.body, { childList: true });
    return () => observer.disconnect();
  }, []);

  return ready ? null : <MailShellLoading />;
}
