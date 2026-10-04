import type { Workspace } from '../domain/types';

/**
 * Scenario identity colours in a fixed order (validated for colour-vision deficiency and contrast against the
 * paper surface in light and dark mode; see docs/DESIGN.md). Colour follows the scenario's position in the
 * workspace, never its position in the current comparison, and every line also has its own dash pattern and
 * a direct label, so identity never depends on colour alone.
 */
export const SERIES = 8;
const DASHES = ['', '10 6', '3 5', '14 5 3 5', '6 4', '1 4', '18 6', '8 3 2 3'];

export function scenarioIndex(ws: Workspace, id: string): number {
  return (
    Math.max(
      0,
      ws.scenarios.findIndex((s) => s.id === id),
    ) % SERIES
  );
}

export function seriesVar(index: number): string {
  return `var(--series-${index + 1})`;
}

export function dash(index: number): string {
  return DASHES[index % DASHES.length] ?? '';
}
