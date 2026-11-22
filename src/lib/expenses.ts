// Domain types and aggregation helpers for the household budget. Pure module:
// safe to import from client code (DB types are imported as types only).

import type { Category, Expense } from "#/db/schema";
import { type Currency, DEFAULT_CURRENCY, type Money, sumMoney } from "./money";

export type { Category, Expense };

/** A category with its chart color, as used by the dashboard charts. */
export interface ChartCategory extends Category {
	/** CSS custom property holding the category's chart color. */
	color: string;
}

/** Number of validated category color tokens (`--cat-1`…`--cat-6`). */
const CATEGORY_COLOR_COUNT = 6;
/** Neutral color for categories beyond the validated palette. */
const OVERFLOW_COLOR = "var(--sea-ink-soft)";

/**
 * Assigns chart colors in fixed slot order: the category with the lowest id
 * gets `--cat-1`, the next `--cat-2`, and so on. Tokens are never reused, so
 * categories past the sixth share a neutral color.
 */
export function withChartColors(categories: Category[]): ChartCategory[] {
	return [...categories]
		.sort((a, b) => a.id - b.id)
		.map((category, index) => ({
			...category,
			color:
				index < CATEGORY_COLOR_COUNT
					? `var(--cat-${index + 1})`
					: OVERFLOW_COLOR,
		}));
}

export const MONTH_NAMES = [
	"January",
	"February",
	"March",
	"April",
	"May",
	"June",
	"July",
	"August",
	"September",
	"October",
	"November",
	"December",
];

/** Compact axis label for an amount in minor units (e.g. 1500 PLN -> "1.5K"). */
export function formatCompact(amount: number) {
	const value = amount / 100;
	return value >= 1000 ? `${Math.round(value / 100) / 10}K` : `${value}`;
}

/** First day of the month (1-12) as `YYYY-MM-DD`. */
export function monthStart(year: number, month: number) {
	return `${year}-${String(month).padStart(2, "0")}-01`;
}

/** Expenses within a year, optionally narrowed to a month (1-12). */
export function filterExpenses(
	expenses: Expense[],
	year: number,
	month?: number,
) {
	const prefix =
		month === undefined
			? `${year}-`
			: `${year}-${String(month).padStart(2, "0")}-`;
	return expenses.filter((e) => e.date.startsWith(prefix));
}

export function sumAmounts(
	expenses: Expense[],
	currency: Currency = DEFAULT_CURRENCY,
): Money {
	return sumMoney(
		expenses.map((e) => e.amount),
		currency,
	);
}

/** Totals per category, in the given category order. */
export function totalsByCategory(
	expenses: Expense[],
	categories: ChartCategory[],
) {
	return categories.map((category) => ({
		category,
		total: sumAmounts(expenses.filter((e) => e.categoryId === category.id)),
	}));
}

/** For each of the 12 months: totals per category. */
export function monthlyTotalsByCategory(
	expenses: Expense[],
	year: number,
	categories: ChartCategory[],
) {
	return MONTH_NAMES.map((_, index) =>
		totalsByCategory(filterExpenses(expenses, year, index + 1), categories),
	);
}
