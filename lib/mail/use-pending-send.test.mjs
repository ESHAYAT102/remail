import assert from "node:assert/strict";
import test from "node:test";
import {
  canDeliverPending,
  createPendingSendController,
  pendingBelongsToThread,
  UNDO_WINDOW_MS,
} from "./use-pending-send.ts";

function pending(overrides = {}) {
  return {
    id: "local-1",
    input: {
      to: "reader@example.com",
      subject: "Hello",
      text: "Hello",
      inReplyTo: "message-1",
      threadId: "thread-1",
    },
    files: [],
    queuedAt: 1,
    sendAt: 2,
    status: "queued",
    ...overrides,
  };
}

test("only queued and failed messages can start delivery", () => {
  assert.equal(canDeliverPending(pending()), true);
  assert.equal(canDeliverPending(pending({ status: "failed" })), true);
  assert.equal(canDeliverPending(pending({ status: "sending" })), false);
  assert.equal(canDeliverPending(pending({ status: "sent" })), false);
});

test("a pending reply only renders in its own conversation", () => {
  const item = pending();
  assert.equal(pendingBelongsToThread(item, "thread-1", new Set()), true);
  assert.equal(pendingBelongsToThread(item, "thread-2", new Set()), false);
  assert.equal(
    pendingBelongsToThread(
      pending({ input: { ...item.input, threadId: undefined } }),
      "thread-2",
      new Set(["message-1"]),
    ),
    true,
  );
});

function controllerHarness(fetchResponse) {
  let nextTimer = 0;
  const timers = new Map();
  const reports = [];
  const delivered = [];
  const failures = [];
  const controller = createPendingSendController(
    {
      endpoint: "/api/mail/send",
      buildBody: () => new FormData(),
      onDelivered: (item, result) => delivered.push({ item, result }),
      onFailed: (item, error) => failures.push({ item, error }),
    },
    {
      now: () => 1_000,
      createId: () => "local-1",
      fetch: fetchResponse,
      schedule(callback, delay) {
        nextTimer += 1;
        timers.set(nextTimer, { callback, delay });
        return nextTimer;
      },
      cancel(timer) {
        timers.delete(timer);
      },
      reportError: (message, error) => reports.push({ message, error }),
    },
  );
  return { controller, delivered, failures, reports, timers };
}

test("queue and page flush clean up delivery timers", () => {
  const { controller, timers } = controllerHarness(async () => ({
    ok: true,
    json: async () => ({ id: "message-1", threadId: "thread-1", sentAt: "now" }),
  }));
  const item = controller.queue(pending().input);
  assert.equal(timers.size, 1);
  assert.equal(timers.values().next().value.delay, UNDO_WINDOW_MS);

  assert.equal(controller.undo(item.id)?.id, item.id);
  assert.equal(timers.size, 0);
  assert.deepEqual(controller.getPending(), []);

  controller.queue(pending().input);
  const beacons = [];
  controller.flush((url, body) => {
    beacons.push({ url, body });
    return true;
  });
  assert.equal(beacons.length, 1);
  assert.equal(beacons[0].url, "/api/mail/send");
  assert.equal(timers.size, 0);
  assert.deepEqual(controller.getPending(), []);
});

test("failed delivery stays retryable and a success remains until reconciliation", async () => {
  let attempts = 0;
  const { controller, delivered, failures, timers } = controllerHarness(async () => {
    attempts += 1;
    if (attempts === 1) {
      return { ok: false, json: async () => ({ error: "Provider unavailable." }) };
    }
    return {
      ok: true,
      json: async () => ({
        id: "message-2",
        threadId: "thread-1",
        sentAt: "2026-09-02T22:00:00.000Z",
      }),
    };
  });
  const item = controller.queue(pending().input);

  assert.equal(await controller.deliver(item.id), false);
  assert.equal(controller.getPending()[0].status, "failed");
  assert.equal(controller.getPending()[0].error, "Provider unavailable.");
  assert.equal(failures.length, 1);

  assert.equal(await controller.deliver(item.id), true);
  assert.equal(attempts, 2);
  assert.equal(controller.getPending()[0].status, "sent");
  assert.equal(controller.getPending()[0].delivery.id, "message-2");
  assert.equal(delivered.length, 1);
  assert.equal(timers.size, 0);

  controller.forget(item.id);
  assert.deepEqual(controller.getPending(), []);
});

test("a malformed accepted response is observable without offering a duplicate retry", async () => {
  const { controller, delivered, reports } = controllerHarness(async () => ({
    ok: true,
    json: async () => {
      throw new SyntaxError("invalid JSON");
    },
  }));
  const item = controller.queue(pending().input);

  assert.equal(await controller.deliver(item.id), true);
  assert.equal(controller.getPending()[0].status, "sent");
  assert.equal(controller.getPending()[0].delivery.id, item.id);
  assert.equal(delivered.length, 1);
  assert.deepEqual(
    reports.map(({ message }) => message),
    ["mail/send returned malformed success metadata"],
  );
});

test("concurrent delivery attempts only send once", async () => {
  let resolveResponse;
  let requests = 0;
  const response = new Promise((resolve) => {
    resolveResponse = resolve;
  });
  const { controller } = controllerHarness(() => {
    requests += 1;
    return response;
  });
  const item = controller.queue(pending().input);

  const first = controller.deliver(item.id);
  assert.equal(await controller.deliver(item.id), false);
  assert.equal(requests, 1);
  resolveResponse({
    ok: true,
    json: async () => ({ id: "message-3", threadId: "thread-1", sentAt: "now" }),
  });
  assert.equal(await first, true);
  assert.equal(requests, 1);
});
