import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { compactMoney, money } from '../domain/format';
import { monthLabel, monthShort } from '../domain/months';
import type { Currency } from '../domain/types';
import { dash, seriesVar } from './colors';

export interface Series {
  id: string;
  name: string;
  /** Colour slot (scenario position in the workspace). */
  index: number;
  values: number[];
}

function niceStep(range: number, target: number): number {
  const raw = range / Math.max(1, target);
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  return (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
}

export function niceTicks(min: number, max: number, target = 5): number[] {
  if (min === max) {
    const pad = Math.abs(min) * 0.1 || 1;
    min -= pad;
    max += pad;
  }
  const step = niceStep(max - min, target);
  const start = Math.floor(min / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= max + step * 0.5; v += step) ticks.push(Math.round(v * 1e6) / 1e6);
  if (ticks[ticks.length - 1]! < max) ticks.push(ticks[ticks.length - 1]! + step);
  return ticks;
}

/** Pushes label positions apart so none are closer than `gap`, keeping their order. */
export function spreadLabels(ys: number[], gap: number, top: number, bottom: number): number[] {
  const order = ys.map((y, i) => ({ y, i })).sort((a, b) => a.y - b.y);
  const placed = order.map((o) => o.y);
  for (let k = 1; k < placed.length; k++) placed[k] = Math.max(placed[k]!, placed[k - 1]! + gap);
  const overflow = (placed.at(-1) ?? 0) - bottom;
  if (overflow > 0) for (let k = 0; k < placed.length; k++) placed[k]! -= overflow;
  for (let k = placed.length - 2; k >= 0; k--) placed[k] = Math.min(placed[k]!, placed[k + 1]! - gap);
  for (let k = 0; k < placed.length; k++) placed[k] = Math.max(placed[k]!, top);
  const out = new Array<number>(ys.length);
  order.forEach((o, k) => (out[o.i] = placed[k]!));
  return out;
}

function useWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(720);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.clientWidth);
    const ro = new ResizeObserver((entries) => setWidth(Math.round(entries[0]?.contentRect.width ?? 720)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}

export function BalanceChart({
  series,
  startMonth,
  currency,
  title,
}: {
  series: Series[];
  startMonth: string;
  currency: Currency;
  title: string;
}) {
  const [wrapRef, width] = useWidth<HTMLDivElement>();
  const [cursor, setCursor] = useState<number | null>(null);
  const descId = useId();
  const months = series[0]?.values.length ?? 0;
  const narrow = width < 560;
  const height = narrow ? 260 : 340;
  const m = { top: 16, right: narrow ? 12 : 168, bottom: 34, left: narrow ? 52 : 70 };
  const innerW = Math.max(10, width - m.left - m.right);
  const innerH = height - m.top - m.bottom;

  const all = series.flatMap((s) => s.values);
  const ticks = niceTicks(Math.min(0, ...all), Math.max(0, ...all), narrow ? 4 : 6);
  const yMin = ticks[0]!;
  const yMax = ticks[ticks.length - 1]!;
  const x = (i: number) => m.left + (months <= 1 ? innerW / 2 : (i / (months - 1)) * innerW);
  const y = (v: number) => m.top + innerH - ((v - yMin) / (yMax - yMin)) * innerH;
  const xEvery = months <= 12 ? (narrow ? 2 : 1) : months <= 24 ? (narrow ? 6 : 3) : narrow ? 12 : 6;

  const labelYs = spreadLabels(
    series.map((s) => y(s.values.at(-1) ?? 0)),
    18,
    m.top + 6,
    m.top + innerH,
  );

  const pick = (clientX: number, rect: DOMRect) => {
    const px = clientX - rect.left - m.left;
    const i = Math.round((px / innerW) * (months - 1));
    setCursor(Math.min(months - 1, Math.max(0, i)));
  };

  const live = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (cursor === null || !live.current) return;
    live.current.textContent = `${monthLabel(startMonth, cursor)}: ${series
      .map((s) => `${s.name} ${money(s.values[cursor] ?? 0, currency)}`)
      .join('; ')}`;
  }, [cursor, series, startMonth, currency]);

  const tooltipLeft = cursor === null ? 0 : x(cursor);
  const flip = tooltipLeft > width - 240;

  return (
    <figure className="chart">
      <figcaption>
        <span className="chart__title">{title}</span>
        <ul className="legend" aria-label="Scenarios">
          {series.map((s) => (
            <li key={s.id}>
              <svg width="34" height="10" aria-hidden="true">
                <line
                  x1="1"
                  x2="33"
                  y1="5"
                  y2="5"
                  stroke={seriesVar(s.index)}
                  strokeWidth="2.5"
                  strokeDasharray={dash(s.index)}
                />
              </svg>
              {s.name}
            </li>
          ))}
        </ul>
      </figcaption>
      <div
        ref={wrapRef}
        className="chart__plot"
        tabIndex={0}
        role="group"
        aria-label={`${title}. Use the left and right arrow keys to read values month by month.`}
        aria-describedby={descId}
        onKeyDown={(e) => {
          const last = months - 1;
          const cur = cursor ?? -1;
          const keys: Record<string, number> = {
            ArrowRight: cur + 1,
            ArrowLeft: cur < 0 ? last : cur - 1,
            Home: 0,
            End: last,
            PageUp: cur - 6,
            PageDown: cur + 6,
          };
          if (e.key === 'Escape') return setCursor(null);
          const next = keys[e.key];
          if (next === undefined) return;
          e.preventDefault();
          setCursor(Math.min(last, Math.max(0, next)));
        }}
        onPointerMove={(e) => pick(e.clientX, e.currentTarget.getBoundingClientRect())}
        onPointerLeave={() => setCursor(null)}
        onBlur={() => setCursor(null)}
      >
        <svg width={width} height={height} aria-hidden="true">
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={m.left}
                x2={m.left + innerW}
                y1={y(t)}
                y2={y(t)}
                className={t === 0 ? 'chart__zero' : 'chart__grid'}
              />
              <text x={m.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="chart__tick">
                {compactMoney(t, currency)}
              </text>
            </g>
          ))}
          {Array.from({ length: months }, (_, i) => i)
            .filter((i) => i % xEvery === 0)
            .map((i) => (
              <text key={i} x={x(i)} y={height - 10} textAnchor="middle" className="chart__tick">
                {monthShort(startMonth, i)}
                {(i === 0 || monthShort(startMonth, i) === 'Jan') &&
                  ` ${monthLabel(startMonth, i).slice(-2)}`}
              </text>
            ))}
          {series.map((s) => (
            <path
              key={s.id}
              d={s.values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('')}
              fill="none"
              stroke={seriesVar(s.index)}
              strokeWidth={2}
              strokeDasharray={dash(s.index)}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}
          {!narrow &&
            series.map((s, k) => (
              <g key={s.id}>
                <line
                  x1={m.left + innerW + 4}
                  x2={m.left + innerW + 14}
                  y1={labelYs[k]}
                  y2={labelYs[k]}
                  stroke={seriesVar(s.index)}
                  strokeWidth={2}
                />
                <text x={m.left + innerW + 18} y={labelYs[k]} dy="0.32em" className="chart__label">
                  {s.name.length > 20 ? `${s.name.slice(0, 19)}…` : s.name}
                </text>
              </g>
            ))}
          {cursor !== null && (
            <g>
              <line x1={x(cursor)} x2={x(cursor)} y1={m.top} y2={m.top + innerH} className="chart__cursor" />
              {series.map((s) => (
                <circle
                  key={s.id}
                  cx={x(cursor)}
                  cy={y(s.values[cursor] ?? 0)}
                  r={4.5}
                  fill={seriesVar(s.index)}
                  className="chart__dot"
                />
              ))}
            </g>
          )}
        </svg>
        {cursor !== null && (
          <div
            className="chart__tooltip"
            style={{
              left: flip ? undefined : tooltipLeft + 12,
              right: flip ? width - tooltipLeft + 12 : undefined,
            }}
          >
            <strong>{monthLabel(startMonth, cursor)}</strong>
            <ul>
              {series.map((s) => (
                <li key={s.id}>
                  <svg width="18" height="8" aria-hidden="true">
                    <line
                      x1="1"
                      x2="17"
                      y1="4"
                      y2="4"
                      stroke={seriesVar(s.index)}
                      strokeWidth="2.5"
                      strokeDasharray={dash(s.index)}
                    />
                  </svg>
                  <span>{s.name}</span>
                  <span className="num">{money(s.values[cursor] ?? 0, currency)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <p id={descId} className="visually-hidden">
        Closing balance per month from {monthLabel(startMonth, 0)} to {monthLabel(startMonth, months - 1)}.
        The same figures are in the monthly table below.
      </p>
      <p ref={live} className="visually-hidden" aria-live="polite" />
    </figure>
  );
}
