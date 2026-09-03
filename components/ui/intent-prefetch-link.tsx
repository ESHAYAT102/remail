"use client";

import Link from "next/link";
import { useState, type ComponentProps } from "react";

type IntentPrefetchLinkProps = Omit<
  ComponentProps<typeof Link>,
  "prefetch"
> & {
  prefetchOnMount?: boolean;
};

export function IntentPrefetchLink({
  prefetchOnMount = false,
  onFocus,
  onMouseEnter,
  ...props
}: IntentPrefetchLinkProps) {
  const [hasIntent, setHasIntent] = useState(false);
  const prefetch = prefetchOnMount || hasIntent;

  return (
    <Link
      {...props}
      prefetch={prefetch}
      onFocus={(event) => {
        setHasIntent(true);
        onFocus?.(event);
      }}
      onMouseEnter={(event) => {
        setHasIntent(true);
        onMouseEnter?.(event);
      }}
    />
  );
}
