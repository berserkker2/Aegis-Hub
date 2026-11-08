import { useRef, useState, useEffect } from 'react';

interface UseDragScrollOptions {
  dragThreshold?: number;
}

export function useDragScroll<T extends HTMLElement = HTMLDivElement>(
  externalRef?: React.RefObject<T | null>,
  options: UseDragScrollOptions = {}
) {
  const localRef = useRef<T | null>(null);
  const targetRef = externalRef || localRef;
  const [isDragging, setIsDragging] = useState(false);

  const isDownRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const hasDraggedRef = useRef(false);
  const threshold = options.dragThreshold ?? 6;

  useEffect(() => {
    const el = targetRef.current;
    if (!el) return;

    // Prevent default browser image dragging (ghost drag)
    const onDragStart = (e: DragEvent) => {
      e.preventDefault();
    };

    const onMouseDown = (e: MouseEvent) => {
      // Only handle left mouse button
      if (e.button !== 0) return;

      // Do not drag if clicking directly on an action button, input or link
      const target = e.target as HTMLElement | null;
      if (target?.closest('button, input, select, textarea, a, [data-drag-ignore="true"]')) {
        return;
      }

      isDownRef.current = true;
      hasDraggedRef.current = false;
      startXRef.current = e.pageX - el.offsetLeft;
      scrollLeftRef.current = el.scrollLeft;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDownRef.current) return;

      const x = e.pageX - el.offsetLeft;
      const walk = x - startXRef.current;

      if (!hasDraggedRef.current && Math.abs(walk) > threshold) {
        hasDraggedRef.current = true;
        setIsDragging(true);
      }

      if (hasDraggedRef.current) {
        e.preventDefault();
        el.scrollLeft = scrollLeftRef.current - walk;
      }
    };

    const onMouseUp = () => {
      if (!isDownRef.current) return;
      isDownRef.current = false;

      if (hasDraggedRef.current) {
        // Prevent card's onClick from triggering right after dragging
        const captureClick = (clickEvent: MouseEvent) => {
          clickEvent.stopPropagation();
          clickEvent.preventDefault();
          window.removeEventListener('click', captureClick, true);
        };
        window.addEventListener('click', captureClick, true);

        setTimeout(() => {
          window.removeEventListener('click', captureClick, true);
          hasDraggedRef.current = false;
          setIsDragging(false);
        }, 50);
      } else {
        setIsDragging(false);
      }
    };

    el.addEventListener('dragstart', onDragStart);
    el.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      el.removeEventListener('dragstart', onDragStart);
      el.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [targetRef, threshold]);

  return {
    ref: targetRef,
    isDragging,
  };
}
