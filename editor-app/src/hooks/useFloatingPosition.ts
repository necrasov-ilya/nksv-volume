import { useEffect, useState } from 'react';

export type FloatingPlacement = 'above' | 'below';

export interface AnchorRect {
  left: number;
  top: number;
  bottom: number;
}

export interface ContainerRect {
  left: number;
  right: number;
  top: number;
  bottom: number;
  height: number;
  width: number;
}

export interface FloatingPositionResult {
  placement: FloatingPlacement;
  left: number;
  top: number;
  visible: boolean;
}

export interface UseFloatingPositionOptions {
  anchor: AnchorRect | null;
  container: ContainerRect | null;
  pane?: ContainerRect | null;
  measuredHeight?: number;
  fallbackHeight?: number;
  gap?: number;
  edgeGap?: number;
  prefer?: FloatingPlacement;
}

const DEFAULT_GAP = 10;
const DEFAULT_FALLBACK_HEIGHT = 44;

export function useFloatingPosition(options: UseFloatingPositionOptions): FloatingPositionResult {
  const {
    anchor, container, pane, measuredHeight, fallbackHeight = DEFAULT_FALLBACK_HEIGHT,
    gap = DEFAULT_GAP, edgeGap = 0, prefer = 'above',
  } = options;

  const [placement, setPlacement] = useState<FloatingPlacement>(prefer);
  const [left, setLeft] = useState(0);

  useEffect(() => {
    if (!anchor || !container) {
      setLeft(0);
      return;
    }
    const viewportTop = pane?.top ?? 0;
    const viewportBottom = pane?.bottom ?? window.innerHeight;
    const height = measuredHeight ?? fallbackHeight;
    const spaceAbove = anchor.top - viewportTop;
    const spaceBelow = viewportBottom - anchor.bottom;
    const need = height + gap;

    let nextPlacement: FloatingPlacement;
    if (spaceAbove >= need && (prefer === 'above' || spaceBelow < need)) nextPlacement = 'above';
    else if (spaceBelow >= need) nextPlacement = 'below';
    else nextPlacement = spaceAbove > spaceBelow ? 'above' : 'below';

    setPlacement(nextPlacement);
    setLeft(computeLeft(anchor, container, edgeGap));
  }, [anchor, container, pane, measuredHeight, fallbackHeight, gap, edgeGap, prefer]);

  const top = !anchor ? 0 : placement === 'above' ? anchor.top : anchor.bottom;
  return { placement, left, top, visible: !!anchor };
}

function computeLeft(anchor: AnchorRect, container: ContainerRect, edgeGap: number): number {
  const center = (anchor.left + anchor.left) / 2;
  const minLeft = container.left + edgeGap;
  const maxLeft = container.right - edgeGap;
  if (maxLeft < minLeft) return (minLeft + maxLeft) / 2;
  return Math.max(minLeft, Math.min(center, maxLeft));
}
