"use client";

import { useCallback, useRef, useState } from "react";

export function useFileDrop(onFiles: (files: File[]) => void) {
  const [dragging, setDragging] = useState(false);
  const counterRef = useRef(0);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const onDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    counterRef.current += 1;
    if (counterRef.current === 1) setDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    counterRef.current -= 1;
    if (counterRef.current <= 0) {
      counterRef.current = 0;
      setDragging(false);
    }
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      counterRef.current = 0;
      setDragging(false);
      const dropped = Array.from(e.dataTransfer.files);
      if (dropped.length > 0) onFiles(dropped);
    },
    [onFiles],
  );

  return { dragging, onDragOver, onDragEnter, onDragLeave, onDrop };
}
