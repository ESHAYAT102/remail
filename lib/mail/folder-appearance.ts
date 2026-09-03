export const folderTones = [
  "rose",
  "amber",
  "green",
  "blue",
  "violet",
] as const;

export type FolderTone = (typeof folderTones)[number] | "neutral";

export function folderToneForSeed(seed: string): FolderTone {
  if (!seed) return "neutral";
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (Math.imul(hash, 31) + seed.charCodeAt(index)) >>> 0;
  }
  return folderTones[hash % folderTones.length];
}
