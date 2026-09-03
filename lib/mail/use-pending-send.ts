"use client";

import { useEffect, useState } from "react";
import type { ComposeInput, SendResult } from "./types";

export const UNDO_WINDOW_MS = 30_000;

export type PendingSendStatus = "queued" | "sending" | "sent" | "failed";

export type PendingSend = {
  id: string;
  input: ComposeInput;
  files: File[];
  queuedAt: number;
  sendAt: number;
  status: PendingSendStatus;
  error?: string;
  delivery?: SendResult;
};

export type PendingSendOptions = {
  buildBody: (input: ComposeInput, files: File[]) => FormData;
  endpoint: string;
  onDelivered: (pending: PendingSend, result: SendResult) => void | Promise<void>;
  onFailed?: (pending: PendingSend, error: string) => void;
};

type SendResponse = {
  ok: boolean;
  json: () => Promise<unknown>;
};

type PendingSendDependencies = {
  now?: () => number;
  createId?: () => string;
  fetch?: (url: string, init: { method: "POST"; body: FormData }) => Promise<SendResponse>;
  schedule?: (callback: () => void, delay: number) => unknown;
  cancel?: (timer: unknown) => void;
  reportError?: (message: string, error: unknown) => void;
};

export function canDeliverPending(item: PendingSend) {
  return item.status === "queued" || item.status === "failed";
}

export function pendingBelongsToThread(item: PendingSend, threadId: string, messageIds: Set<string>) {
  return Boolean(
    item.input.inReplyTo &&
      (item.input.threadId === threadId ||
        item.delivery?.threadId === threadId ||
        messageIds.has(item.input.inReplyTo)),
  );
}

export function createPendingSendController(
  initialOptions: PendingSendOptions,
  dependencies: PendingSendDependencies = {},
) {
  let options = initialOptions;
  const queued = new Map<string, PendingSend>();
  const timers = new Map<string, unknown>();
  const listeners = new Set<(items: PendingSend[]) => void>();
  const now = dependencies.now ?? Date.now;
  const createId = dependencies.createId ?? (() => crypto.randomUUID());
  const request =
    dependencies.fetch ??
    ((url: string, init: { method: "POST"; body: FormData }) => fetch(url, init));
  const schedule =
    dependencies.schedule ??
    ((callback: () => void, delay: number) => setTimeout(callback, delay));
  const cancel =
    dependencies.cancel ??
    ((timer: unknown) => clearTimeout(timer as ReturnType<typeof setTimeout>));
  const reportError =
    dependencies.reportError ??
    ((message: string, error: unknown) => console.error(message, error));

  const items = () => Array.from(queued.values());

  const notify = () => {
    const next = items();
    for (const listener of listeners) listener(next);
  };

  const clearDeliveryTimer = (id: string) => {
    const timer = timers.get(id);
    if (timer !== undefined) cancel(timer);
    timers.delete(id);
  };

  const forget = (id: string) => {
    clearDeliveryTimer(id);
    if (!queued.delete(id)) return;
    notify();
  };

  const update = (id: string, patch: Partial<PendingSend>) => {
    const current = queued.get(id);
    if (!current) return null;
    const next = { ...current, ...patch };
    queued.set(id, next);
    notify();
    return next;
  };

  const deliver = async (id: string) => {
    const item = queued.get(id);
    if (!item || !canDeliverPending(item)) return false;
    clearDeliveryTimer(id);
    const sending = update(id, { status: "sending", error: undefined });
    if (!sending) return false;

    let response: SendResponse | null = null;
    try {
      response = await request(options.endpoint, {
        method: "POST",
        body: options.buildBody(sending.input, sending.files),
      });
    } catch {
      response = null;
    }

    if (!response?.ok) {
      let payload: { error?: string } | null = null;
      try {
        const value = await response?.json();
        payload = value && typeof value === "object" ? value as { error?: string } : null;
      } catch {
        payload = null;
      }
      const error = payload?.error ?? "Unable to send. Check your connection and try again.";
      const failed = update(id, { status: "failed", error });
      if (failed) options.onFailed?.(failed, error);
      return false;
    }

    let payload: Partial<SendResult> | null = null;
    let malformedPayloadReported = false;
    try {
      const value = await response.json();
      payload = value && typeof value === "object" ? value as Partial<SendResult> : null;
    } catch (error) {
      reportError("mail/send returned malformed success metadata", error);
      malformedPayloadReported = true;
    }
    if (
      !malformedPayloadReported &&
      (!payload ||
        typeof payload.id !== "string" ||
        typeof payload.threadId !== "string" ||
        typeof payload.sentAt !== "string")
    ) {
      reportError(
        "mail/send returned incomplete success metadata",
        new Error("The accepted send response is missing delivery identifiers."),
      );
    }

    // A successful POST means the provider accepted the message. Keep the
    // optimistic card instead of offering a retry that could deliver twice.
    const result: SendResult = {
      id: typeof payload?.id === "string" ? payload.id : id,
      threadId:
        typeof payload?.threadId === "string"
          ? payload.threadId
          : sending.input.threadId || payload?.id || id,
      sentAt:
        typeof payload?.sentAt === "string" ? payload.sentAt : new Date(now()).toISOString(),
    };
    const sent = update(id, { status: "sent", delivery: result });
    if (!sent) return true;
    try {
      await options.onDelivered(sent, result);
    } catch (error) {
      reportError("mail/send could not refresh the delivered message", error);
    }
    return true;
  };

  const queue = (input: ComposeInput, files: File[] = []) => {
    const queuedAt = now();
    const item: PendingSend = {
      id: createId(),
      input,
      files,
      queuedAt,
      sendAt: queuedAt + UNDO_WINDOW_MS,
      status: "queued",
    };
    queued.set(item.id, item);
    notify();
    timers.set(
      item.id,
      schedule(() => void deliver(item.id), UNDO_WINDOW_MS),
    );
    return item;
  };

  const undo = (id: string) => {
    const item = queued.get(id);
    if (!item || item.status === "sending" || item.status === "sent") return null;
    forget(id);
    return item;
  };

  const sendNow = (id: string) => {
    const item = queued.get(id);
    if (!item || !canDeliverPending(item)) return false;
    void deliver(id);
    return true;
  };

  const flush = (sendBeacon: (url: string, body: FormData) => boolean) => {
    for (const item of queued.values()) {
      if (item.status !== "queued") continue;
      sendBeacon(options.endpoint, options.buildBody(item.input, item.files));
    }
    for (const id of timers.keys()) clearDeliveryTimer(id);
    queued.clear();
    notify();
  };

  const dispose = () => {
    for (const id of timers.keys()) clearDeliveryTimer(id);
    queued.clear();
    listeners.clear();
  };

  return {
    deliver,
    dispose,
    flush,
    forget,
    getPending: items,
    queue,
    sendNow,
    setOptions(next: PendingSendOptions) {
      options = next;
    },
    subscribe(listener: (items: PendingSend[]) => void) {
      listeners.add(listener);
      listener(items());
      return () => {
        listeners.delete(listener);
      };
    },
    undo,
  };
}

/**
 * Holds a message for {@link UNDO_WINDOW_MS} so it can be recalled, then posts it.
 * A hold that only lives in this tab would drop the message when the tab closes,
 * so anything still waiting is flushed over the wire on the way out.
 */
export function usePendingSend(options: PendingSendOptions) {
  const [controller] = useState(() => createPendingSendController(options));
  const [pending, setPending] = useState<PendingSend[]>(() => controller.getPending());

  useEffect(() => {
    controller.setOptions(options);
  }, [controller, options]);

  useEffect(() => controller.subscribe(setPending), [controller]);

  useEffect(() => {
    const flush = () => {
      controller.flush((url, body) => navigator.sendBeacon(url, body));
    };
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      controller.dispose();
    };
  }, [controller]);

  return {
    pending,
    queue: controller.queue,
    undo: controller.undo,
    sendNow: controller.sendNow,
    settle: controller.forget,
  };
}
