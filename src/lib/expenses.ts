// Domain types, sample data and aggregation helpers for the household budget.
// Sample data is a placeholder until expenses are stored in the database.

import {
	type Currency,
	DEFAULT_CURRENCY,
	type Money,
	money,
	sumMoney,
} from "./money";

export interface Category {
	id: string;
	name: string;
	/** CSS custom property holding the category's chart color (fixed slot order). */
	color: string;
}

export interface Expense {
	id: number;
	name: string;
	/** ISO date, YYYY-MM-DD */
	date: string;
	categoryId: string;
	amount: Money;
}

export const CATEGORIES: Category[] = [
	{ id: "food", name: "Food", color: "var(--cat-1)" },
	{ id: "bills", name: "Bills", color: "var(--cat-2)" },
	{ id: "transport", name: "Transport", color: "var(--cat-3)" },
	{ id: "mortgage", name: "Mortgage", color: "var(--cat-4)" },
	{ id: "health", name: "Health", color: "var(--cat-5)" },
	{ id: "other", name: "Other", color: "var(--cat-6)" },
];

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

export function getCategory(id: string) {
	return (
		CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1]
	);
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

/** Totals per category id, in CATEGORIES order. */
export function totalsByCategory(expenses: Expense[]) {
	return CATEGORIES.map((category) => ({
		category,
		total: sumAmounts(expenses.filter((e) => e.categoryId === category.id)),
	}));
}

/** For each of the 12 months: totals per category. */
export function monthlyTotalsByCategory(expenses: Expense[], year: number) {
	return MONTH_NAMES.map((_, index) =>
		totalsByCategory(filterExpenses(expenses, year, index + 1)),
	);
}

// --- Sample data -----------------------------------------------------------

function seededRandom(seed: number) {
	let state = seed;
	return () => {
		state = (state * 1664525 + 1013904223) % 4294967296;
		return state / 4294967296;
	};
}

const SAMPLE_ITEMS: Record<
	string,
	{ names: string[]; min: number; max: number; perMonth: number }
> = {
	food: {
		names: ["Groceries", "Bakery", "Restaurant", "Market"],
		min: 40,
		max: 320,
		perMonth: 8,
	},
	bills: {
		names: ["Electricity", "Internet", "Water", "Phone"],
		min: 60,
		max: 280,
		perMonth: 3,
	},
	transport: {
		names: ["Fuel", "Train ticket", "Parking", "Car service"],
		min: 20,
		max: 350,
		perMonth: 4,
	},
	mortgage: {
		names: ["Mortgage installment"],
		min: 2400,
		max: 2400,
		perMonth: 1,
	},
	health: {
		names: ["Pharmacy", "Dentist", "Doctor visit"],
		min: 30,
		max: 400,
		perMonth: 1,
	},
	other: {
		names: ["Gift", "Books", "Haircut", "Cinema"],
		min: 25,
		max: 200,
		perMonth: 2,
	},
};

function generateSampleExpenses(years: number[], lastDate: Date): Expense[] {
	const random = seededRandom(42);
	const expenses: Expense[] = [];
	let id = 1;
	for (const year of years) {
		for (let month = 1; month <= 12; month++) {
			const daysInMonth = new Date(year, month, 0).getDate();
			for (const [categoryId, item] of Object.entries(SAMPLE_ITEMS)) {
				for (let i = 0; i < item.perMonth; i++) {
					const day =
						categoryId === "mortgage"
							? 10
							: 1 + Math.floor(random() * daysInMonth);
					const date = new Date(year, month - 1, day);
					if (date > lastDate) continue;
					const amount = Math.round(
						(item.min + random() * (item.max - item.min)) * 100,
					);
					expenses.push({
						id: id++,
						name: item.names[Math.floor(random() * item.names.length)],
						date: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
						categoryId,
						amount: money(amount),
					});
				}
			}
		}
	}
	return expenses.sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
}

const today = new Date();
export const SAMPLE_EXPENSES = generateSampleExpenses(
	[today.getFullYear() - 1, today.getFullYear()],
	today,
);
