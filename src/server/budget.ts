// Server functions and query options for budget data. `db` is only used
// inside handlers, which the Start compiler strips from the client bundle.

import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { and, asc, desc, gte, lt } from "drizzle-orm";
import { db } from "#/db";
import { categories, expenses, toExpense } from "#/db/schema";
import { monthStart } from "#/lib/expenses";

export const getCategories = createServerFn({ method: "GET" }).handler(() =>
	db.select().from(categories).orderBy(asc(categories.id)),
);

/** All expenses dated within `year`, newest first. */
export const getExpensesForYear = createServerFn({ method: "GET" })
	.inputValidator((year: unknown) => {
		if (!Number.isInteger(year)) throw new Error("year must be an integer");
		return year as number;
	})
	.handler(async ({ data: year }) => {
		const rows = await db
			.select()
			.from(expenses)
			.where(
				and(
					gte(expenses.date, monthStart(year, 1)),
					lt(expenses.date, monthStart(year + 1, 1)),
				),
			)
			.orderBy(desc(expenses.date), desc(expenses.id));
		return rows.map(toExpense);
	});

export const categoriesQuery = () =>
	queryOptions({
		queryKey: ["categories"],
		queryFn: () => getCategories(),
	});

export const yearExpensesQuery = (year: number) =>
	queryOptions({
		queryKey: ["expenses", { year }],
		queryFn: () => getExpensesForYear({ data: year }),
	});
