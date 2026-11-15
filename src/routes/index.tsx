import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
	CategoryLegend,
	MonthChart,
	YearChart,
} from "#/components/dashboard/charts";
import {
	filterExpenses,
	formatMoney,
	getCategory,
	MONTH_NAMES,
	monthlyTotalsByCategory,
	SAMPLE_EXPENSES,
	sumAmounts,
	totalsByCategory,
} from "#/lib/expenses";

type View = "month" | "year";

interface DashboardSearch {
	view?: View;
	year?: number;
	month?: number;
}

export const Route = createFileRoute("/")({
	// All params are optional so plain links to "/" stay valid; defaults
	// (month view, current year and month) are applied in the component.
	validateSearch: (search: Record<string, unknown>): DashboardSearch => {
		const year = Number(search.year);
		const month = Number(search.month);
		return {
			view: search.view === "year" ? "year" : undefined,
			year: Number.isInteger(year) && year > 1900 ? year : undefined,
			month:
				Number.isInteger(month) && month >= 1 && month <= 12
					? month
					: undefined,
		};
	},
	component: Dashboard,
});

const RECENT_LIMIT = 10;

function Dashboard() {
	const search = Route.useSearch();
	const now = new Date();
	const view: View = search.view ?? "month";
	const year = search.year ?? now.getFullYear();
	const month = search.month ?? now.getMonth() + 1;

	const periodExpenses =
		view === "year"
			? filterExpenses(SAMPLE_EXPENSES, year)
			: filterExpenses(SAMPLE_EXPENSES, year, month);
	const monthExpenses = filterExpenses(SAMPLE_EXPENSES, year, month);
	const total = sumAmounts(periodExpenses);
	const categoryTotals = totalsByCategory(periodExpenses);
	const topCategory = [...categoryTotals].sort((a, b) => b.total - a.total)[0];

	const monthsWithData =
		view === "year"
			? new Set(periodExpenses.map((e) => e.date.slice(5, 7))).size
			: 0;

	const prev =
		view === "year"
			? { year: year - 1, month }
			: month === 1
				? { year: year - 1, month: 12 }
				: { year, month: month - 1 };
	const next =
		view === "year"
			? { year: year + 1, month }
			: month === 12
				? { year: year + 1, month: 1 }
				: { year, month: month + 1 };

	const periodLabel =
		view === "year" ? `${year}` : `${MONTH_NAMES[month - 1]} ${year}`;

	return (
		<main className="page-wrap flex flex-col gap-6 px-4 pb-10 pt-10">
			{/* Header: view switch + period navigation */}
			<section className="flex flex-wrap items-end justify-between gap-4">
				<div>
					<p className="island-kicker mb-1">Household budget</p>
					<h1 className="display-title m-0 text-3xl font-bold tracking-tight text-[var(--sea-ink)] sm:text-4xl">
						{periodLabel}
					</h1>
				</div>
				<div className="flex flex-wrap items-center gap-3">
					<fieldset className="m-0 inline-flex rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] p-1">
						<legend className="sr-only">View</legend>
						{(["month", "year"] as const).map((v) => (
							<Link
								key={v}
								to="/"
								search={{ view: v, year, month }}
								className={`rounded-full px-4 py-1.5 text-sm font-semibold no-underline transition ${
									view === v
										? "bg-[var(--lagoon-deep)] text-white"
										: "text-[var(--sea-ink-soft)] hover:text-[var(--sea-ink)]"
								}`}
							>
								{v === "month" ? "Month" : "Year"}
							</Link>
						))}
					</fieldset>
					<div className="inline-flex items-center gap-1">
						<Link
							to="/"
							search={{ view, ...prev }}
							aria-label={view === "year" ? "Previous year" : "Previous month"}
							className="grid h-9 w-9 place-items-center rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] text-[var(--sea-ink)]"
						>
							<ChevronLeft size={18} />
						</Link>
						<Link
							to="/"
							search={{ view, ...next }}
							aria-label={view === "year" ? "Next year" : "Next month"}
							className="grid h-9 w-9 place-items-center rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] text-[var(--sea-ink)]"
						>
							<ChevronRight size={18} />
						</Link>
					</div>
				</div>
			</section>

			{/* Summary tiles */}
			<section className="grid gap-4 sm:grid-cols-3">
				<StatTile label="Total spent" value={formatMoney(total)} />
				<StatTile
					label={view === "year" ? "Monthly average" : "Expenses recorded"}
					value={
						view === "year"
							? formatMoney(monthsWithData ? total / monthsWithData : 0)
							: String(periodExpenses.length)
					}
				/>
				<StatTile
					label="Top category"
					value={topCategory.total > 0 ? topCategory.category.name : "–"}
					detail={
						topCategory.total > 0 ? formatMoney(topCategory.total) : undefined
					}
				/>
			</section>

			{/* Chart */}
			<section className="island-shell rounded-[1.5rem] p-5 sm:p-6">
				<div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
					<h2 className="m-0 text-base font-bold text-[var(--sea-ink)]">
						{view === "year"
							? "Expenses by category, month by month"
							: "Spending by category"}
					</h2>
					{view === "year" && <CategoryLegend totals={categoryTotals} />}
				</div>
				{total === 0 ? (
					<p className="m-0 py-10 text-center text-sm text-[var(--sea-ink-soft)]">
						No expenses in {periodLabel}.
					</p>
				) : view === "year" ? (
					<YearChart
						months={monthlyTotalsByCategory(SAMPLE_EXPENSES, year)}
						currentMonth={month}
					/>
				) : (
					<MonthChart totals={categoryTotals} />
				)}
			</section>

			{/* Recent expenses for the selected month */}
			<section className="island-shell rounded-[1.5rem] p-5 sm:p-6">
				<h2 className="m-0 mb-4 text-base font-bold text-[var(--sea-ink)]">
					Recent expenses · {MONTH_NAMES[month - 1]} {year}
				</h2>
				{monthExpenses.length === 0 ? (
					<p className="m-0 text-sm text-[var(--sea-ink-soft)]">
						No expenses recorded this month.
					</p>
				) : (
					<ul className="m-0 list-none divide-y divide-[var(--line)] p-0">
						{monthExpenses.slice(0, RECENT_LIMIT).map((expense) => {
							const category = getCategory(expense.categoryId);
							return (
								<li
									key={expense.id}
									className="flex items-center gap-3 py-2.5 text-sm"
								>
									<span
										className="h-2.5 w-2.5 shrink-0 rounded-full"
										style={{ background: category.color }}
									/>
									<span className="min-w-0 flex-1">
										<span className="block font-semibold text-[var(--sea-ink)]">
											{expense.name}
										</span>
										<span className="block text-xs text-[var(--sea-ink-soft)]">
											{category.name} · {expense.date}
										</span>
									</span>
									<span className="tabular-nums font-semibold text-[var(--sea-ink)]">
										{formatMoney(expense.amount)}
									</span>
								</li>
							);
						})}
					</ul>
				)}
			</section>
		</main>
	);
}

function StatTile({
	label,
	value,
	detail,
}: {
	label: string;
	value: string;
	detail?: string;
}) {
	return (
		<div className="island-shell rounded-[1.25rem] p-5">
			<p className="m-0 mb-1 text-xs font-semibold text-[var(--sea-ink-soft)]">
				{label}
			</p>
			<p className="m-0 text-2xl font-bold tabular-nums text-[var(--sea-ink)]">
				{value}
			</p>
			{detail && (
				<p className="m-0 mt-0.5 text-sm text-[var(--sea-ink-soft)]">
					{detail}
				</p>
			)}
		</div>
	);
}
