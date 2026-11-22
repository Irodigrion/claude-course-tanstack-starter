// Seeds the DB with the default categories and generated sample expenses for
// last year and the current year (up to today). Run with `npm run db:seed`;
// pass `--force` to wipe existing categories and expenses first.

import { sql } from "drizzle-orm";
import { money } from "#/lib/money";
import { db } from "./index.ts";
import {
	categories,
	expenses,
	type NewExpense,
	toNewExpenseRow,
} from "./schema.ts";

/** Default categories, in chart color slot order (`--cat-1`…`--cat-6`). */
const SAMPLE_CATEGORIES: Record<
	string,
	{ names: string[]; min: number; max: number; perMonth: number }
> = {
	Food: {
		names: ["Groceries", "Bakery", "Restaurant", "Market"],
		min: 40,
		max: 320,
		perMonth: 8,
	},
	Bills: {
		names: ["Electricity", "Internet", "Water", "Phone"],
		min: 60,
		max: 280,
		perMonth: 3,
	},
	Transport: {
		names: ["Fuel", "Train ticket", "Parking", "Car service"],
		min: 20,
		max: 350,
		perMonth: 4,
	},
	Mortgage: {
		names: ["Mortgage installment"],
		min: 2400,
		max: 2400,
		perMonth: 1,
	},
	Health: {
		names: ["Pharmacy", "Dentist", "Doctor visit"],
		min: 30,
		max: 400,
		perMonth: 1,
	},
	Other: {
		names: ["Gift", "Books", "Haircut", "Cinema"],
		min: 25,
		max: 200,
		perMonth: 2,
	},
};

function seededRandom(seed: number) {
	let state = seed;
	return () => {
		state = (state * 1664525 + 1013904223) % 4294967296;
		return state / 4294967296;
	};
}

function generateSampleExpenses(
	years: number[],
	lastDate: Date,
	categoryIds: Map<string, number>,
): NewExpense[] {
	const random = seededRandom(42);
	const result: NewExpense[] = [];
	for (const year of years) {
		for (let month = 1; month <= 12; month++) {
			const daysInMonth = new Date(year, month, 0).getDate();
			for (const [category, item] of Object.entries(SAMPLE_CATEGORIES)) {
				for (let i = 0; i < item.perMonth; i++) {
					const day =
						category === "Mortgage"
							? 10
							: 1 + Math.floor(random() * daysInMonth);
					const date = new Date(year, month - 1, day);
					if (date > lastDate) continue;
					const amount = Math.round(
						(item.min + random() * (item.max - item.min)) * 100,
					);
					result.push({
						name: item.names[Math.floor(random() * item.names.length)],
						date: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
						categoryId: categoryIds.get(category) as number,
						amount: money(amount),
					});
				}
			}
		}
	}
	return result;
}

const force = process.argv.includes("--force");
const [{ count }] = await db
	.select({ count: sql<number>`count(*)` })
	.from(categories);
if (count > 0 && !force) {
	console.error(
		"Database already has categories; run with --force to wipe and reseed.",
	);
	process.exit(1);
}

const today = new Date();
db.transaction((tx) => {
	tx.delete(expenses).run();
	tx.delete(categories).run();
	// Restart autoincrement ids so color slots follow the default order.
	tx.run(
		sql`DELETE FROM sqlite_sequence WHERE name IN ('expenses', 'categories')`,
	);

	const inserted = tx
		.insert(categories)
		.values(Object.keys(SAMPLE_CATEGORIES).map((name) => ({ name })))
		.returning()
		.all();
	const categoryIds = new Map(inserted.map((c) => [c.name, c.id]));

	const rows = generateSampleExpenses(
		[today.getFullYear() - 1, today.getFullYear()],
		today,
		categoryIds,
	)
		.sort((a, b) => a.date.localeCompare(b.date))
		.map(toNewExpenseRow);
	tx.insert(expenses).values(rows).run();

	console.log(
		`Seeded ${inserted.length} categories and ${rows.length} expenses.`,
	);
});
