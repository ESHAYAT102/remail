"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "motion/react";
import * as stylex from "@stylexjs/stylex";
import { formatShortWhen } from "@/lib/format";
import {
  parseThreadDropTargetKey,
  type ThreadDropTarget,
} from "@/lib/mail/thread-drag";
import { colors, elevation, fonts, radius, space } from "@/theme/tokens.stylex";
import type { Thread } from "@/lib/mail/types";

const STACK_WIDTH = 248;
const STACK_HEIGHT = 116;
const DROP_DURATION = 0.42;
const DROP_PATH_TIMES = [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1];
const positionSpring = { stiffness: 760, damping: 30, mass: 0.55 };
const cardSpring = {
  type: "spring" as const,
  stiffness: 520,
  damping: 25,
  mass: 0.65,
};
const dropTransition = {
  x: {
    duration: DROP_DURATION,
    times: DROP_PATH_TIMES,
    ease: "linear" as const,
  },
  y: {
    duration: DROP_DURATION,
    times: DROP_PATH_TIMES,
    ease: "linear" as const,
  },
  scale: {
    type: "spring" as const,
    duration: DROP_DURATION,
    bounce: 0,
  },
  opacity: {
    duration: DROP_DURATION,
    times: [0, 0.76, 1],
    ease: "easeOut" as const,
  },
};
const pile = [
  { x: 0, y: 0, rotate: 0 },
  { x: 0, y: 7, rotate: 0 },
  { x: 0, y: 14, rotate: 0 },
  { x: 0, y: 21, rotate: 0 },
] as const;

const styles = stylex.create({
  stack: {
    position: "fixed",
    insetBlockStart: 0,
    insetInlineStart: 0,
    zIndex: 100,
    width: STACK_WIDTH,
    height: STACK_HEIGHT,
    pointerEvents: "none",
    willChange: "transform, opacity",
  },
  card: {
    position: "absolute",
    insetBlockStart: 0,
    insetInlineStart: 0,
    display: "flex",
    width: STACK_WIDTH,
    minWidth: 0,
    flexDirection: "column",
    gap: 5,
    padding: space[3],
    overflow: "hidden",
    borderRadius: radius.lg,
    borderWidth: 0,
    backgroundColor: colors.surface,
    backgroundImage: colors.raised,
    boxShadow: elevation.card,
    transformOrigin: "18% 18%",
    willChange: "transform, opacity",
  },
  cardTop: {
    display: "flex",
    alignItems: "center",
    gap: space[2],
    minWidth: 0,
  },
  dot: {
    width: 6,
    height: 6,
    flexShrink: 0,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
  },
  from: {
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    color: colors.textMuted,
    fontSize: fonts.captionSize,
    lineHeight: fonts.captionLine,
    fontWeight: 500,
  },
  when: {
    marginInlineStart: "auto",
    flexShrink: 0,
    color: colors.textFaint,
    fontSize: fonts.microSize,
    lineHeight: fonts.microLine,
    fontVariantNumeric: "tabular-nums",
  },
  subject: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    color: colors.text,
    fontSize: fonts.uiSize,
    lineHeight: fonts.uiLine,
    fontWeight: 500,
  },
  snippet: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    color: colors.textFaint,
    fontSize: fonts.captionSize,
    lineHeight: fonts.captionLine,
  },
  count: {
    position: "absolute",
    insetBlockStart: -13,
    insetInlineEnd: -13,
    zIndex: 6,
    display: "inline-flex",
    minWidth: 26,
    height: 26,
    alignItems: "center",
    justifyContent: "center",
    paddingInline: space[1],
    borderRadius: radius.full,
    backgroundColor: colors.accent,
    boxShadow: elevation.liftAccent,
    color: colors.accentOnSolid,
    fontSize: fonts.captionSize,
    lineHeight: 1,
    fontWeight: 650,
    fontVariantNumeric: "tabular-nums",
  },
});

export type ThreadDragCard = Pick<
  Thread,
  "id" | "date" | "from" | "snippet" | "subject" | "unread"
>;

type DragPayload = {
  cards: ThreadDragCard[];
  total: number;
  onDrop: (target: ThreadDropTarget) => void;
};

type PendingDrop = {
  payload: DragPayload;
  target: ThreadDropTarget;
};

type Point = { x: number; y: number };

type DropFlight = {
  x: number[];
  y: number[];
};

type ThreadDragControlsValue = {
  beginDrag: (payload: DragPayload, point: Point) => void;
  updateDrag: (point: Point) => void;
  finishDrag: (point: Point) => void;
  cancelDrag: () => void;
};

type ThreadDragStateValue = {
  dragging: boolean;
  overTargetKey: string | null;
};

const ThreadDragControlsContext = createContext<ThreadDragControlsValue | null>(
  null,
);
const ThreadDragStateContext = createContext<ThreadDragStateValue | null>(null);

function dropTargetAt(point: Point) {
  return (
    document
      .elementFromPoint(point.x, point.y)
      ?.closest<HTMLElement>("[data-mail-drop-target]") ?? null
  );
}

function pointForStack(point: Point, dropTarget: HTMLElement | null) {
  const centeredX = point.x - STACK_WIDTH / 2;
  let x = centeredX;

  if (dropTarget) {
    const targetRect = dropTarget.getBoundingClientRect();
    const besideTarget = targetRect.right + 12;
    const beforeTarget = targetRect.left - STACK_WIDTH - 12;
    if (besideTarget + STACK_WIDTH <= window.innerWidth - 8) {
      x = besideTarget;
    } else if (beforeTarget >= 8) {
      x = beforeTarget;
    }
  }

  return {
    x: Math.max(8, Math.min(x, window.innerWidth - STACK_WIDTH - 8)),
    y: Math.max(
      8,
      Math.min(point.y - STACK_HEIGHT / 2, window.innerHeight - STACK_HEIGHT - 8),
    ),
  };
}

function dropFlightBetween(start: Point, end: Point): DropFlight {
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  const distance = Math.hypot(deltaX, deltaY);
  const midpoint = {
    x: (start.x + end.x) / 2,
    y: (start.y + end.y) / 2,
  };
  const normal = distance
    ? { x: -deltaY / distance, y: deltaX / distance }
    : { x: 0, y: -1 };
  const upwardDirection = normal.y > 0 ? -1 : 1;
  const arcStrength = Math.min(72, Math.max(32, distance * 0.22));
  const control = {
    x: Math.max(
      8,
      Math.min(
        midpoint.x + normal.x * arcStrength * upwardDirection,
        window.innerWidth - STACK_WIDTH - 8,
      ),
    ),
    y: Math.max(
      8,
      Math.min(
        midpoint.y + normal.y * arcStrength * upwardDirection,
        window.innerHeight - STACK_HEIGHT - 8,
      ),
    ),
  };
  const x: number[] = [];
  const y: number[] = [];

  for (let index = 0; index < DROP_PATH_TIMES.length; index += 1) {
    const progress = DROP_PATH_TIMES[index];
    const inverse = 1 - progress;
    x.push(
      inverse * inverse * start.x +
        2 * inverse * progress * control.x +
        progress * progress * end.x,
    );
    y.push(
      inverse * inverse * start.y +
        2 * inverse * progress * control.y +
        progress * progress * end.y,
    );
  }

  return { x, y };
}

export function ThreadDragProvider({ children }: { children: React.ReactNode }) {
  const reduceMotion = useReducedMotion();
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const springX = useSpring(pointerX, positionSpring);
  const springY = useSpring(pointerY, positionSpring);
  const activePayload = useRef<DragPayload | null>(null);
  const pendingDrop = useRef<PendingDrop | null>(null);
  const activeTargetKey = useRef<string | null>(null);
  const previousCursor = useRef("");
  const previousUserSelect = useRef("");
  const [payload, setPayload] = useState<DragPayload | null>(null);
  const [overTargetKey, setOverTargetKey] = useState<string | null>(null);
  const [dropping, setDropping] = useState(false);
  const [dropFlight, setDropFlight] = useState<DropFlight | null>(null);
  const [announcement, setAnnouncement] = useState("");

  const restoreDocument = useCallback(() => {
    document.documentElement.style.cursor = previousCursor.current;
    document.body.style.userSelect = previousUserSelect.current;
  }, []);

  const clearDrag = useCallback(() => {
    activePayload.current = null;
    pendingDrop.current = null;
    activeTargetKey.current = null;
    setPayload(null);
    setOverTargetKey(null);
    setDropping(false);
    setDropFlight(null);
    restoreDocument();
  }, [restoreDocument]);

  const positionAt = useCallback(
    (point: Point, dropTarget: HTMLElement | null, jump = false) => {
      const next = pointForStack(point, dropTarget);
      if (jump) {
        pointerX.jump(next.x);
        pointerY.jump(next.y);
        springX.jump(next.x);
        springY.jump(next.y);
      } else {
        pointerX.set(next.x);
        pointerY.set(next.y);
      }
    },
    [pointerX, pointerY, springX, springY],
  );

  const updateTarget = useCallback((nextTargetKey: string | null) => {
    if (activeTargetKey.current === nextTargetKey) return;
    activeTargetKey.current = nextTargetKey;
    setOverTargetKey(nextTargetKey);
  }, []);

  const beginDrag = useCallback(
    (nextPayload: DragPayload, point: Point) => {
      if (pendingDrop.current) return;
      if (activePayload.current) clearDrag();
      previousCursor.current = document.documentElement.style.cursor;
      previousUserSelect.current = document.body.style.userSelect;
      document.documentElement.style.cursor = "grabbing";
      document.body.style.userSelect = "none";
      activePayload.current = nextPayload;
      setPayload(nextPayload);
      setAnnouncement(
        `Dragging ${nextPayload.total} ${nextPayload.total === 1 ? "conversation" : "conversations"}. Drop on a folder.`,
      );
      const dropTarget = dropTargetAt(point);
      positionAt(point, dropTarget, true);
      updateTarget(dropTarget?.getAttribute("data-mail-drop-target") ?? null);
    },
    [clearDrag, positionAt, updateTarget],
  );

  const updateDrag = useCallback(
    (point: Point) => {
      if (!activePayload.current) return;
      const dropTarget = dropTargetAt(point);
      positionAt(point, dropTarget);
      updateTarget(dropTarget?.getAttribute("data-mail-drop-target") ?? null);
    },
    [positionAt, updateTarget],
  );

  const finishDrag = useCallback(
    (point: Point) => {
      const currentPayload = activePayload.current;
      if (!currentPayload) return;
      const dropTarget = dropTargetAt(point);
      const targetKey = dropTarget?.getAttribute("data-mail-drop-target");
      const target = parseThreadDropTargetKey(targetKey ?? undefined);
      if (!target || !dropTarget) {
        clearDrag();
        setAnnouncement("Move cancelled");
        return;
      }

      setAnnouncement(
        `Moving ${currentPayload.total} ${currentPayload.total === 1 ? "conversation" : "conversations"}`,
      );

      if (reduceMotion) {
        clearDrag();
        currentPayload.onDrop(target);
        return;
      }

      const targetRect = dropTarget.getBoundingClientRect();
      const destination = {
        x: targetRect.left + targetRect.width / 2 - STACK_WIDTH / 2,
        y: targetRect.top + targetRect.height / 2 - STACK_HEIGHT / 2,
      };
      activePayload.current = null;
      pendingDrop.current = { payload: currentPayload, target };
      restoreDocument();
      setDropFlight(
        dropFlightBetween(
          { x: springX.get(), y: springY.get() },
          destination,
        ),
      );
      pointerX.set(destination.x);
      pointerY.set(destination.y);
      setDropping(true);
    },
    [
      clearDrag,
      pointerX,
      pointerY,
      reduceMotion,
      restoreDocument,
      springX,
      springY,
    ],
  );

  const completeDrop = useCallback(() => {
    const pending = pendingDrop.current;
    if (!pending) return;
    pendingDrop.current = null;
    clearDrag();
    pending.payload.onDrop(pending.target);
  }, [clearDrag]);

  const cancelDrag = useCallback(() => {
    if (!activePayload.current) return;
    clearDrag();
    setAnnouncement("Move cancelled");
  }, [clearDrag]);

  useEffect(() => {
    if (!payload) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      cancelDrag();
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [cancelDrag, payload]);

  useEffect(
    () => () => {
      if (activePayload.current) restoreDocument();
    },
    [restoreDocument],
  );

  const controls = useMemo<ThreadDragControlsValue>(
    () => ({ beginDrag, updateDrag, finishDrag, cancelDrag }),
    [beginDrag, cancelDrag, finishDrag, updateDrag],
  );
  const state = useMemo<ThreadDragStateValue>(
    () => ({ dragging: Boolean(payload), overTargetKey }),
    [overTargetKey, payload],
  );
  const stackSx = stylex.props(styles.stack);
  const followedX = reduceMotion ? pointerX : springX;
  const followedY = reduceMotion ? pointerY : springY;

  return (
    <ThreadDragControlsContext.Provider value={controls}>
      <ThreadDragStateContext.Provider value={state}>
        {children}
        <span className="sr-only" role="status" aria-live="polite">
          {announcement}
        </span>
        <AnimatePresence initial={false}>
          {payload ? (
            <motion.div
              key="selected-thread-stack"
              data-thread-drag-stack=""
              data-thread-drag-dropping={dropping ? "" : undefined}
              aria-hidden="true"
              className={stackSx.className}
              style={
                dropping && dropFlight
                  ? stackSx.style
                  : { ...stackSx.style, x: followedX, y: followedY }
              }
              initial={
                reduceMotion ? false : { opacity: 0, scale: 0.9 }
              }
              animate={
                dropping && dropFlight
                  ? {
                      x: dropFlight.x,
                      y: dropFlight.y,
                      opacity: [1, 1, 0],
                      scale: 0.08,
                    }
                  : { opacity: 1, scale: overTargetKey ? 0.97 : 1 }
              }
              exit={
                reduceMotion
                  ? { opacity: 0 }
                  : { opacity: 0, scale: 0.94 }
              }
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : dropping
                    ? dropTransition
                    : {
                        type: "spring",
                        stiffness: 560,
                        damping: 28,
                        mass: 0.6,
                      }
              }
              onAnimationComplete={dropping ? completeDrop : undefined}
            >
              {payload.cards
                .slice(0, pile.length)
                .map((card, index) => ({ card, index }))
                .toReversed()
                .map(({ card, index }) => {
                  const position = pile[index];
                  const accepted = Boolean(overTargetKey);
                  const cardSx = stylex.props(styles.card);
                  return (
                    <motion.div
                      key={card.id}
                      className={cardSx.className}
                      style={{
                        ...cardSx.style,
                        zIndex: payload.cards.length - index,
                      }}
                      initial={
                        reduceMotion
                          ? false
                          : { x: 0, y: 0, rotate: 0, scale: 0.94, opacity: 0 }
                      }
                      animate={{
                        x: accepted ? position.x * 0.35 : position.x,
                        y: accepted ? position.y * 0.35 : position.y,
                        rotate: accepted ? position.rotate * 0.2 : position.rotate,
                        scale: accepted && index === 0 ? 1.015 : 1,
                        opacity: 1,
                      }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={reduceMotion ? { duration: 0 } : cardSpring}
                    >
                      <div {...stylex.props(styles.cardTop)}>
                        {card.unread ? (
                          <span {...stylex.props(styles.dot)} />
                        ) : null}
                        <span {...stylex.props(styles.from)}>
                          {card.from.name || card.from.email}
                        </span>
                        <span {...stylex.props(styles.when)}>
                          {formatShortWhen(card.date)}
                        </span>
                      </div>
                      <div {...stylex.props(styles.subject)}>
                        {card.subject || "No subject"}
                      </div>
                      <div {...stylex.props(styles.snippet)}>{card.snippet}</div>
                    </motion.div>
                  );
                })}
              {payload.total > 1 ? (
                <motion.span
                  {...stylex.props(styles.count)}
                  initial={reduceMotion ? false : { opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={reduceMotion ? { duration: 0 } : cardSpring}
                >
                  {payload.total}
                </motion.span>
              ) : null}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </ThreadDragStateContext.Provider>
    </ThreadDragControlsContext.Provider>
  );
}

export function useThreadDragControls() {
  const context = useContext(ThreadDragControlsContext);
  if (!context) throw new Error("Thread drag controls require ThreadDragProvider");
  return context;
}

export function useThreadDragState() {
  const context = useContext(ThreadDragStateContext);
  if (!context) throw new Error("Thread drag state requires ThreadDragProvider");
  return context;
}
