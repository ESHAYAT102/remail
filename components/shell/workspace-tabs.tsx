"use client";

import { useEffect, useRef, useState } from "react";
import * as stylex from "@stylexjs/stylex";
import { IconButton } from "@/components/ui/icon-button";
import { Icons } from "@/components/ui/icons";
import { IntentPrefetchLink } from "@/components/ui/intent-prefetch-link";
import { ContextMenu } from "@/components/ui/menu";
import {
  WORKSPACE_TAB_CONNECTOR,
  workspaceListProps,
  workspaceTabProps,
} from "@/components/ui/tabs";
import {
  isWorkspaceTabReorderable,
  workspaceTabIdsToClose,
  type WorkspaceTab,
  type WorkspaceTabCloseAction,
  type WorkspaceTabDropEdge,
} from "@/lib/mail/workspace-tabs";
import { colors, space } from "@/theme/tokens.stylex";

const CONNECTOR = WORKSPACE_TAB_CONNECTOR;
const TAB_DRAG_TYPE = "text/x-redakt-workspace-tab";

const BULK_CLOSE_ACTIONS = [
  { action: "others", label: "Close other tabs", icon: Icons.closeOthers },
  { action: "all", label: "Close all tabs", icon: Icons.closeAll },
  { action: "right", label: "Close tabs to the right", icon: Icons.closeRight },
  { action: "read", label: "Close read tabs", icon: Icons.check },
] satisfies ReadonlyArray<{
  action: WorkspaceTabCloseAction;
  label: string;
  icon: typeof Icons.close;
}>;

const styles = stylex.create({
  bar: {
    display: "flex",
    /* The strip's bottom edge is the pane's top edge, so the active tab can
       run into it. Nothing may sit below the tabs. */
    alignItems: "flex-end",
    minHeight: 36,
    /* Flush at the start so the first tab lines up with the pane's edge. */
    paddingInlineStart: 0,
    paddingInlineEnd: 4,
    paddingTop: 8,
    gap: space[2],
  },
  /* The tab rail scrolls independently so New tab stays on screen. */
  rail: {
    flex: 1,
    minWidth: 0,
    position: "relative",
    display: "flex",
    /* Keep the active tab above the edge fade without letting its sticky
       z-index escape this component and compete with portalled overlays. */
    isolation: "isolate",
  },
  tabs: {
    flex: 1,
    minWidth: 0,
    display: "flex",
    overflowX: "auto",
    overflowY: "hidden",
    scrollbarWidth: "none",
    overscrollBehaviorInline: "contain",
    "::-webkit-scrollbar": {
      display: "none",
    },
  },
  tabLink: {
    display: "inline-flex",
    alignItems: "center",
    gap: space[2],
    minWidth: 0,
    color: "inherit",
    textDecoration: "none",
  },
  viewportFade: {
    position: "absolute",
    insetBlockStart: 0,
    /* Fade only the 32px tab-content band. The bottom 4px belongs to the
       tab-to-pane join, where the pane and its shadows must remain visible. */
    insetBlockEnd: space[1],
    width: space[7],
    backgroundColor: colors.shell,
    pointerEvents: "none",
    zIndex: 0,
  },
  viewportFadeStart: {
    insetInlineStart: 0,
    maskImage:
      "linear-gradient(to right, #000 0, #000 19px, transparent 100%)",
  },
  viewportFadeEnd: {
    insetInlineEnd: 0,
    maskImage:
      "linear-gradient(to right, transparent 0, #000 calc(100% - 19px), #000 100%)",
  },
  newTab: {
    flexShrink: 0,
    /* Same clearance the inactive tabs keep, so nothing but the active tab
       meets the pane. */
    marginBlockEnd: 4,
  },
  close: {
    position: "relative",
    width: 16,
    height: 16,
    borderWidth: 0,
    backgroundColor: "transparent",
    color: colors.textFaint,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 4,
    padding: 0,
    flexShrink: 0,
    "::before": {
      content: "",
      position: "absolute",
      insetBlock: -4,
      insetInline: -4,
    },
    ":active": { transform: "scale(0.96)" },
    "@media (prefers-reduced-motion: no-preference)": {
      transitionProperty: "transform, background-color, color",
      transitionDuration: "150ms",
      transitionTimingFunction: "ease-out",
    },
    "@media (hover: hover)": {
      ":hover": { color: colors.text, backgroundColor: colors.surfaceHover },
    },
  },
  label: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    minWidth: 0,
  },
  dropIndicator: {
    position: "absolute",
    insetBlock: space[1],
    width: 2,
    borderRadius: 2,
    backgroundColor: colors.accent,
    pointerEvents: "none",
    zIndex: 3,
  },
  dropIndicatorBefore: {
    insetInlineStart: -5,
  },
  dropIndicatorAfter: {
    insetInlineEnd: -5,
  },
});

export function WorkspaceTabs({
  tabs,
  activeId,
  leading,
  folderIcon,
  onClose,
  onReorder,
  onCompose,
  onActiveEdgeChange,
}: {
  tabs: WorkspaceTab[];
  activeId: string | null;
  leading?: React.ReactNode;
  folderIcon?: React.ReactNode;
  onClose: (ids: string[]) => void;
  onReorder: (
    sourceId: string,
    targetId: string,
    edge: WorkspaceTabDropEdge,
  ) => void;
  onCompose: () => void;
  onActiveEdgeChange: (edge: WorkspaceTabEdge) => void;
}) {
  const railRef = useRef<HTMLElement>(null);
  const activeTabRef = useRef<HTMLDivElement>(null);
  const [activeEdge, setActiveEdge] = useState<WorkspaceTabEdge>(null);
  const [scrollEdges, setScrollEdges] = useState({ start: false, end: false });
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{
    id: string;
    edge: WorkspaceTabDropEdge;
  } | null>(null);
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    let measureFrame = 0;
    const revealActiveTab = () => {
      activeTabRef.current?.scrollIntoView({
        block: "nearest",
        inline: "nearest",
      });
    };
    const measureActiveEdge = () => {
      cancelAnimationFrame(measureFrame);
      measureFrame = requestAnimationFrame(() => {
        const rail = railRef.current;
        const activeTab = activeTabRef.current;
        if (!rail || !activeTab) return;
        const railRect = rail.getBoundingClientRect();
        const tabRect = activeTab.getBoundingClientRect();
        const nextScrollEdges = {
          start: rail.scrollLeft > 1,
          end: rail.scrollLeft < rail.scrollWidth - rail.clientWidth - 1,
        };
        setScrollEdges((current) =>
          current.start === nextScrollEdges.start &&
          current.end === nextScrollEdges.end
            ? current
            : nextScrollEdges,
        );
        const atStart = tabRect.left <= railRect.left + 1;
        const atEnd =
          tabRect.right >= railRect.right - CONNECTOR - 1;
        const nextEdge: WorkspaceTabEdge = atStart
          ? atEnd
            ? "both"
            : "start"
          : atEnd
            ? "end"
            : null;
        setActiveEdge((current) =>
          current === nextEdge ? current : nextEdge,
        );
        onActiveEdgeChange(nextEdge);
      });
    };
    revealActiveTab();

    const rail = railRef.current;
    if (!rail || typeof ResizeObserver === "undefined") return;
    measureActiveEdge();
    const observer = new ResizeObserver(() => {
      revealActiveTab();
      measureActiveEdge();
    });
    observer.observe(rail);
    rail.addEventListener("scroll", measureActiveEdge, { passive: true });
    return () => {
      cancelAnimationFrame(measureFrame);
      observer.disconnect();
      rail.removeEventListener("scroll", measureActiveEdge);
    };
  }, [activeId, onActiveEdgeChange, tabs]);

  const closeTabs = (ids: string[]) => {
    if (ids.length === 0) return;
    setAnnouncement(`Closed ${ids.length} ${ids.length === 1 ? "tab" : "tabs"}.`);
    onClose(ids);
  };

  const moveWithKeyboard = (
    tab: WorkspaceTab,
    key: "ArrowLeft" | "ArrowRight",
  ) => {
    const movable = tabs.filter(isWorkspaceTabReorderable);
    const index = movable.findIndex((item) => item.id === tab.id);
    const physicalDirection = key === "ArrowLeft" ? -1 : 1;
    const direction = document.dir === "rtl" ? -physicalDirection : physicalDirection;
    const target = movable[index + direction];
    if (!target) return false;
    onReorder(tab.id, target.id, direction < 0 ? "before" : "after");
    setAnnouncement(`Moved ${tab.title} ${key === "ArrowLeft" ? "left" : "right"}.`);
    return true;
  };

  return (
    <div {...stylex.props(styles.bar)}>
      <span className="sr-only" role="status" aria-live="polite">
        {announcement}
      </span>
      {leading}
      <div {...stylex.props(styles.rail)}>
        <nav
          ref={railRef}
          aria-label="Open mail views"
          {...stylex.props(styles.tabs)}
        >
          <div {...workspaceListProps()}>
            {tabs.map((tab, index) => {
              const reorderable = isWorkspaceTabReorderable(tab);
              const closeCurrent = workspaceTabIdsToClose(tabs, tab.id, "tab");

              return (
                <ContextMenu.Root key={tab.id}>
                  <ContextMenu.Trigger
                    render={
                      <div
                        ref={tab.id === activeId ? activeTabRef : undefined}
                        data-workspace-tab-id={tab.id}
                        draggable={reorderable}
                        onDragStart={(event) => {
                          if (
                            !reorderable ||
                            (event.target as HTMLElement).closest("button")
                          ) {
                            event.preventDefault();
                            return;
                          }
                          event.dataTransfer.effectAllowed = "move";
                          event.dataTransfer.setData(TAB_DRAG_TYPE, tab.id);
                          setDraggedId(tab.id);
                          setAnnouncement(`Moving ${tab.title}.`);
                        }}
                        onDragOver={(event) => {
                          const isWorkspaceTabDrag =
                            draggedId !== null ||
                            event.dataTransfer.types.includes(TAB_DRAG_TYPE);
                          if (
                            !reorderable ||
                            !isWorkspaceTabDrag ||
                            draggedId === tab.id
                          ) {
                            return;
                          }
                          event.preventDefault();
                          event.dataTransfer.dropEffect = "move";
                          const bounds = event.currentTarget.getBoundingClientRect();
                          const edge =
                            event.clientX < bounds.left + bounds.width / 2
                              ? "before"
                              : "after";
                          setDropTarget((current) =>
                            current?.id === tab.id && current.edge === edge
                              ? current
                              : { id: tab.id, edge },
                          );
                        }}
                        onDrop={(event) => {
                          event.preventDefault();
                          const sourceId =
                            draggedId || event.dataTransfer.getData(TAB_DRAG_TYPE);
                          const bounds = event.currentTarget.getBoundingClientRect();
                          const edge =
                            event.clientX < bounds.left + bounds.width / 2
                              ? "before"
                              : "after";
                          if (sourceId && sourceId !== tab.id) {
                            onReorder(sourceId, tab.id, edge);
                            const source = tabs.find((item) => item.id === sourceId);
                            if (source) setAnnouncement(`Moved ${source.title}.`);
                          }
                          setDraggedId(null);
                          setDropTarget(null);
                        }}
                        onDragEnd={() => {
                          setDraggedId(null);
                          setDropTarget(null);
                        }}
                        {...workspaceTabProps(
                          tab.id === activeId,
                          index === 0,
                          activeEdge === "start" || activeEdge === "both",
                          reorderable,
                          draggedId === tab.id,
                        )}
                      />
                    }
                  >
                    <IntentPrefetchLink
                      href={tab.href}
                      draggable={false}
                      prefetchOnMount={
                        tab.kind === "folder" || tab.kind === "thread"
                      }
                      aria-current={tab.id === activeId ? "page" : undefined}
                      aria-keyshortcuts={
                        reorderable ? "Alt+ArrowLeft Alt+ArrowRight" : undefined
                      }
                      onKeyDown={(event) => {
                        if (
                          !reorderable ||
                          !event.altKey ||
                          event.ctrlKey ||
                          event.metaKey ||
                          event.shiftKey ||
                          (event.key !== "ArrowLeft" &&
                            event.key !== "ArrowRight")
                        ) {
                          return;
                        }
                        if (moveWithKeyboard(tab, event.key)) {
                          event.preventDefault();
                        }
                      }}
                      {...stylex.props(styles.tabLink)}
                    >
                      {tab.kind === "settings" ? (
                        <Icons.settings size={13} />
                      ) : tab.kind === "compose" ? (
                        <Icons.compose size={13} />
                      ) : tab.kind === "folder" ? (
                        (folderIcon ?? <Icons.inbox size={13} />)
                      ) : null}
                      <span {...stylex.props(styles.label)}>{tab.title}</span>
                    </IntentPrefetchLink>
                    {tab.kind === "folder" ? null : (
                      <button
                        type="button"
                        aria-label={`Close ${tab.title}`}
                        {...stylex.props(styles.close)}
                        onClick={() => closeTabs(closeCurrent)}
                      >
                        <Icons.close size={12} />
                      </button>
                    )}
                    {dropTarget?.id === tab.id ? (
                      <span
                        aria-hidden="true"
                        {...stylex.props(
                          styles.dropIndicator,
                          dropTarget.edge === "before"
                            ? styles.dropIndicatorBefore
                            : styles.dropIndicatorAfter,
                        )}
                      />
                    ) : null}
                  </ContextMenu.Trigger>
                  <ContextMenu.Portal>
                    <ContextMenu.Positioner>
                      <ContextMenu.Popup aria-label={`Actions for ${tab.title}`}>
                        <ContextMenu.Item
                          disabled={closeCurrent.length === 0}
                          onClick={() => closeTabs(closeCurrent)}
                        >
                          <ContextMenu.Icon>
                            <Icons.close size={15} />
                          </ContextMenu.Icon>
                          <ContextMenu.Label>Close tab</ContextMenu.Label>
                        </ContextMenu.Item>
                        <ContextMenu.Separator />
                        {BULK_CLOSE_ACTIONS.map(({ action, label, icon: ActionIcon }) => {
                          const ids = workspaceTabIdsToClose(tabs, tab.id, action);
                          return (
                            <ContextMenu.Item
                              key={action}
                              disabled={ids.length === 0}
                              onClick={() => closeTabs(ids)}
                            >
                              <ContextMenu.Icon>
                                <ActionIcon size={15} />
                              </ContextMenu.Icon>
                              <ContextMenu.Label>{label}</ContextMenu.Label>
                            </ContextMenu.Item>
                          );
                        })}
                      </ContextMenu.Popup>
                    </ContextMenu.Positioner>
                  </ContextMenu.Portal>
                </ContextMenu.Root>
              );
            })}
          </div>
        </nav>
        {scrollEdges.start ? (
          <span
            aria-hidden
            {...stylex.props(styles.viewportFade, styles.viewportFadeStart)}
          />
        ) : null}
        {scrollEdges.end ? (
          <span
            aria-hidden
            {...stylex.props(styles.viewportFade, styles.viewportFadeEnd)}
          />
        ) : null}
      </div>
      <IconButton
        {...stylex.props(styles.newTab)}
        type="button"
        onClick={onCompose}
        aria-label="New tab"
      >
        <Icons.add size={14} />
      </IconButton>
    </div>
  );
}

export type WorkspaceTabEdge = "start" | "end" | "both" | null;
