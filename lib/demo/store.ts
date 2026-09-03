import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type {
  DomainSetup,
  MailCollection,
  MailViewId,
  ThreadDetail,
} from "@/lib/mail/types";
import {
  defaultUserPreferences,
  normalizeUserPreferences,
  type UserPreferences,
} from "@/lib/preferences";

export type DemoAccount = {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  mailboxSecret: string;
};

type DemoFile = {
  users: DemoAccount[];
  domains: Record<string, DomainSetup[]>;
  sent: Record<string, ThreadDetail[]>;
  collections: Record<string, MailCollection[]>;
  threadFolders: Record<string, Record<string, MailViewId>>;
  preferences: Record<string, UserPreferences>;
};

const FILE = path.join(process.cwd(), ".data", "demo.json");

type GlobalStore = {
  data: DemoFile;
  loaded: boolean;
};

const globalForStore = globalThis as typeof globalThis & {
  __redaktDemo?: GlobalStore;
};

function hashPassword(password: string, salt = randomBytes(16).toString("hex")) {
  const hash = scryptSync(password, salt, 32).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const next = scryptSync(password, salt, 32);
  const prev = Buffer.from(hash, "hex");
  return prev.length === next.length && timingSafeEqual(prev, next);
}

function emptyStore(): DemoFile {
  return {
    users: [],
    domains: {},
    sent: {},
    collections: {},
    threadFolders: {},
    preferences: {},
  };
}

function seed(data: DemoFile) {
  if (data.users.some((user) => user.email === "ada@redakt.local")) return;
  data.users.push({
    id: "demo",
    email: "ada@redakt.local",
    name: "Ada Meridian",
    passwordHash: hashPassword("demo"),
    mailboxSecret: "demo",
  });
}

function load(): DemoFile {
  const slot = (globalForStore.__redaktDemo ??= { data: emptyStore(), loaded: false });
  if (slot.loaded) {
    slot.data.preferences ??= {};
    slot.data.collections ??= {};
    slot.data.threadFolders ??= {};
    return slot.data;
  }
  try {
    const parsed = JSON.parse(readFileSync(FILE, "utf8")) as DemoFile;
    slot.data = {
      users: parsed.users ?? [],
      domains: parsed.domains ?? {},
      sent: parsed.sent ?? {},
      collections: parsed.collections ?? {},
      threadFolders: parsed.threadFolders ?? {},
      preferences: parsed.preferences ?? {},
    };
  } catch {
    slot.data = emptyStore();
  }
  seed(slot.data);
  slot.loaded = true;
  persist();
  return slot.data;
}

function persist() {
  const data = load();
  mkdirSync(path.dirname(FILE), { recursive: true });
  writeFileSync(FILE, JSON.stringify(data, null, 2));
}

export function findDemoUser(id: string) {
  return load().users.find((user) => user.id === id) ?? null;
}

export function findDemoUserByEmail(email: string) {
  const needle = email.trim().toLowerCase();
  return load().users.find((user) => user.email === needle) ?? null;
}

export function createDemoUser(input: { email: string; name: string; password: string }) {
  const data = load();
  const email = input.email.trim().toLowerCase();
  const existing = data.users.find((user) => user.email === email);
  if (existing) {
    if (!verifyPassword(input.password, existing.passwordHash)) return null;
    return existing;
  }
  const user: DemoAccount = {
    id: `usr_${randomBytes(8).toString("hex")}`,
    email,
    name: input.name.trim() || email.split("@")[0],
    passwordHash: hashPassword(input.password),
    mailboxSecret: input.password,
  };
  data.users.push(user);
  persist();
  return user;
}

export function authenticateDemoUser(email: string, password: string) {
  const user = findDemoUserByEmail(email);
  if (!user || !verifyPassword(password, user.passwordHash)) return null;
  return user;
}

export function updateDemoUserName(id: string, name: string) {
  const user = findDemoUser(id);
  if (!user) return null;
  user.name = name.trim();
  persist();
  return user;
}

export function updateDemoMailboxSecret(id: string, secret: string) {
  const user = findDemoUser(id);
  if (!user) return null;
  user.mailboxSecret = secret;
  persist();
  return user;
}

export function changeDemoPassword(
  id: string,
  currentPassword: string,
  nextPassword: string,
) {
  const user = findDemoUser(id);
  if (!user || !verifyPassword(currentPassword, user.passwordHash)) return false;
  user.passwordHash = hashPassword(nextPassword);
  persist();
  return true;
}

export function deleteDemoUser(id: string, password: string) {
  const data = load();
  const index = data.users.findIndex((user) => user.id === id);
  const user = data.users[index];
  if (!user || !verifyPassword(password, user.passwordHash)) return false;
  data.users.splice(index, 1);
  delete data.domains[id];
  delete data.sent[id];
  delete data.collections[id];
  delete data.threadFolders[id];
  delete data.preferences[id];
  persist();
  return true;
}

export function getDemoUserPreferences(id: string) {
  return normalizeUserPreferences(load().preferences[id] ?? defaultUserPreferences);
}

export function saveDemoUserPreferences(id: string, preferences: UserPreferences) {
  const data = load();
  data.preferences[id] = normalizeUserPreferences(preferences);
  persist();
  return data.preferences[id];
}

export function listDemoDomains(userId: string) {
  return load().domains[userId] ?? [];
}

export function saveDemoDomain(userId: string, domain: DomainSetup) {
  const data = load();
  const current = data.domains[userId] ?? [];
  const next = current.filter((item) => item.id !== domain.id);
  next.unshift(domain);
  data.domains[userId] = next;
  persist();
  return domain;
}

export function getDemoDomain(userId: string, id: string) {
  return listDemoDomains(userId).find((item) => item.id === id) ?? null;
}

export function listDemoSent(userId: string) {
  return load().sent[userId] ?? [];
}

export function saveDemoSent(userId: string, thread: ThreadDetail) {
  const data = load();
  const current = data.sent[userId] ?? [];
  data.sent[userId] = [thread, ...current.filter((item) => item.id !== thread.id)];
  persist();
  return thread;
}

export function listDemoCollections(userId: string) {
  return load().collections[userId] ?? [];
}

export function saveDemoCollection(
  userId: string,
  collection: MailCollection,
) {
  const data = load();
  const current = data.collections[userId] ?? [];
  data.collections[userId] = [
    ...current.filter((item) => item.id !== collection.id),
    collection,
  ];
  persist();
  return collection;
}

export function deleteDemoCollection(userId: string, collectionId: string) {
  const data = load();
  const current = data.collections[userId] ?? [];
  if (!current.some((collection) => collection.id === collectionId)) {
    return false;
  }
  data.collections[userId] = current.filter(
    (collection) => collection.id !== collectionId,
  );
  const deletedView = `collection:${collectionId}`;
  data.threadFolders[userId] = Object.fromEntries(
    Object.entries(data.threadFolders[userId] ?? {}).map(([threadId, folder]) => [
      threadId,
      folder === deletedView ? "inbox" : folder,
    ]),
  );
  persist();
  return true;
}

export function listDemoThreadFolders(userId: string) {
  return load().threadFolders[userId] ?? {};
}

export function saveDemoThreadFolder(
  userId: string,
  threadId: string,
  folder: MailViewId,
) {
  const data = load();
  data.threadFolders[userId] = {
    ...(data.threadFolders[userId] ?? {}),
    [threadId]: folder,
  };
  persist();
  return folder;
}
