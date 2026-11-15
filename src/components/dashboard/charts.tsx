import { useState } from "react";
import { type Category, formatCompact, MONTH_NAMES } from "#/lib/expenses";
import { formatMoney, type Money, sumMoney } from "#/lib/money";

type CategoryTotals = { category: Category; total: Money }[];

/** Legend with each category's total for the period (the chart's values as text). */
export function CategoryLegend({ totals }: { totals: CategoryTotals }) {
	return (
		<ul className="m-0 flex list-none flex-wrap gap-x-4 gap-y-1.5 p-0 text-xs text-[var(--sea-ink-soft)]">
			{totals.map(({ category, total }) => (
				<li key={category.id} className="flex items-center gap-1.5">
					<span
						className="h-2.5 w-2.5 rounded-[3px]"
						style={{ background: category.color }}
					/>
					{category.name}
					<span className="tabular-nums text-[var(--sea-ink)]">
						{formatMoney(total)}
					</span>
				</li>
			))}
		</ul>
	);
}

function niceMax(value: number) {
	if (value <= 0) return 100_00;
	const magnitude = 10 ** Math.floor(Math.log10(value));
	const step = [1, 2, 2.5, 5, 10].find((s) => s * magnitude >= value / 4) ?? 10;
	return Math.ceil(value / (step * magnitude)) * step * magnitude;
}

const WIDTH = 720;
const HEIGHT = 260;
const PAD = { top: 12, right: 8, bottom: 28, left: 44 };
const BAR = 24;
const GAP = 2;
const RADIUS = 4;

/** Path for a column segment; only the topmost segment gets rounded corners. */
function segmentPath(x: number, y: number, h: number, rounded: boolean) {
	if (!rounded || h < RADIUS) return `M${x},${y}h${BAR}v${h}h${-BAR}Z`;
	const r = RADIUS;
	return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + BAR - r}Q${x + BAR},${y} ${x + BAR},${y + r}V${y + h}Z`;
}

/** Year view: stacked columns, one per month, segmented by category. */
export function YearChart({
	months,
	currentMonth,
}: {
	months: CategoryTotals[];
	currentMonth?: number;
}) {
	const [hovered, setHovered] = useState<number | null>(null);
	const monthTotals = months.map((m) => sumMoney(m.map((c) => c.total)));
	const max = niceMax(Math.max(...monthTotals.map((t) => t.amount)));
	const plotW = WIDTH - PAD.left - PAD.right;
	const plotH = HEIGHT - PAD.top - PAD.bottom;
	const band = plotW / 12;
	const y = (v: number) => PAD.top + plotH - (v / max) * plotH;
	const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);

	return (
		<div className="relative">
			<svg
				viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
				className="block h-auto w-full"
				role="img"
				aria-label="Monthly expenses by category"
			>
				{ticks.map((t) => (
					<g key={t}>
						<line
							x1={PAD.left}
							x2={WIDTH - PAD.right}
							y1={y(t)}
							y2={y(t)}
							stroke="var(--chart-grid)"
							strokeWidth={1}
						/>
						<text
							x={PAD.left - 8}
							y={y(t)}
							dy="0.32em"
							textAnchor="end"
							className="fill-[var(--sea-ink-soft)] text-[11px]"
						>
							{formatCompact(t)}
						</text>
					</g>
				))}
				{months.map((categories, i) => {
					const x = PAD.left + band * i + (band - BAR) / 2;
					const visible = categories.filter((c) => c.total.amount > 0);
					let cursor = 0;
					return (
						// biome-ignore lint/a11y/noStaticElementInteractions: hover only reveals the tooltip; data is also in the legend totals
						<g
							key={MONTH_NAMES[i]}
							onMouseEnter={() => setHovered(i)}
							onMouseLeave={() => setHovered(null)}
							opacity={hovered === null || hovered === i ? 1 : 0.45}
						>
							<rect
								x={PAD.left + band * i}
								y={PAD.top}
								width={band}
								height={plotH}
								fill="transparent"
							/>
							{visible.map((c, idx) => {
								const top = y(cursor + c.total.amount);
								const bottom = y(cursor);
								cursor += c.total.amount;
								const isTop = idx === visible.length - 1;
								const h = Math.max(0, bottom - top - (isTop ? 0 : GAP));
								return (
									<path
										key={c.category.id}
										d={segmentPath(x, top + (isTop ? 0 : GAP), h, isTop)}
										fill={c.category.color}
									/>
								);
							})}
							<text
								x={x + BAR / 2}
								y={HEIGHT - 8}
								textAnchor="middle"
								className={`text-[11px] ${i + 1 === currentMonth ? "fill-[var(--sea-ink)] font-bold" : "fill-[var(--sea-ink-soft)]"}`}
							>
								{MONTH_NAMES[i].slice(0, 3)}
							</text>
						</g>
					);
				})}
			</svg>
			{hovered !== null && monthTotals[hovered].amount > 0 && (
				<div
					className="pointer-events-none absolute top-2 z-10 min-w-44 rounded-xl border border-[var(--line)] bg-[var(--header-bg)] p-3 text-xs shadow-lg backdrop-blur"
					style={
						hovered < 6
							? { left: `${((hovered + 1) / 12) * 100}%` }
							: { right: `${((12 - hovered) / 12) * 100}%` }
					}
				>
					<p className="m-0 mb-1.5 font-bold text-[var(--sea-ink)]">
						{MONTH_NAMES[hovered]} · {formatMoney(monthTotals[hovered])}
					</p>
					{[...months[hovered]].reverse().map((c) => (
						<p
							key={c.category.id}
							className="m-0 flex items-center gap-1.5 text-[var(--sea-ink-soft)]"
						>
							<span
								className="h-2 w-2 rounded-full"
								style={{ background: c.category.color }}
							/>
							<span className="flex-1">{c.category.name}</span>
							<span className="tabular-nums text-[var(--sea-ink)]">
								{formatMoney(c.total)}
							</span>
						</p>
					))}
				</div>
			)}
		</div>
	);
}

/** Month view: horizontal bars of spending per category, largest first. */
export function MonthChart({ totals }: { totals: CategoryTotals }) {
	const sorted = [...totals].sort((a, b) => b.total.amount - a.total.amount);
	const max = Math.max(...sorted.map((c) => c.total.amount), 1);
	const sum = sorted.reduce((s, c) => s + c.total.amount, 0);

	return (
		<ul className="m-0 flex list-none flex-col gap-3 p-0">
			{sorted.map(({ category, total }) => (
				<li
					key={category.id}
					className="grid grid-cols-[6.5rem_1fr] items-center gap-3 text-sm"
				>
					<span className="flex items-center gap-2 text-[var(--sea-ink-soft)]">
						<span
							className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
							style={{ background: category.color }}
						/>
						{category.name}
					</span>
					<span className="flex items-center gap-2">
						<span
							className="h-5 rounded-r-[4px]"
							style={{
								width: `calc(${(total.amount / max) * 75}% )`,
								minWidth: total.amount > 0 ? 2 : 0,
								background: category.color,
							}}
						/>
						<span className="whitespace-nowrap tabular-nums text-[var(--sea-ink)]">
							{formatMoney(total)}
							<span className="ml-1.5 text-xs text-[var(--sea-ink-soft)]">
								{sum > 0 ? `${Math.round((total.amount / sum) * 100)}%` : "–"}
							</span>
						</span>
					</span>
				</li>
			))}
		</ul>
	);
}
