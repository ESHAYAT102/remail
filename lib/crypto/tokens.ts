import { createHash, timingSafeEqual } from "node:crypto";

function digest(value: string) {
  return createHash("sha256").update(value).digest();
}

export function matchesBearerToken(
  authorization: string | null,
  secret: string | null,
) {
  if (!authorization || !secret) return false;
  return timingSafeEqual(
    digest(authorization),
    digest(`Bearer ${secret}`),
  );
}
