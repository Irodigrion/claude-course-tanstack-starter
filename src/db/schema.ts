import { relations, sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { CURRENCIES, DEFAULT_CURRENCY, type Money } from "#/lib/money";

export const categories = sqliteTable("categories", {
	id: integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
	name: text().notNull().unique(),
	createdAt: integer("created_at", { mode: "timestamp" }).default(
		sql`(unixepoch())`,
	),
});

export const expenses = sqliteTable(
	"expenses",
	{
		id: integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
		name: text().notNull(),
		/** ISO calendar date, YYYY-MM-DD */
		date: text().notNull(),
		categoryId: integer("category_id")
			.notNull()
			.references(() => categories.id, { onDelete: "restrict" }),
		/** Money amount in the currency's minor unit; see `Money` in #/lib/money. */
		amount: integer().notNull(),
		currency: text({ enum: CURRENCIES }).notNull().default(DEFAULT_CURRENCY),
		createdAt: integer("created_at", { mode: "timestamp" }).default(
			sql`(unixepoch())`,
		),
	},
	(table) => [
		index("expenses_date_idx").on(table.date),
		index("expenses_category_id_idx").on(table.categoryId),
	],
);

export const categoriesRelations = relations(categories, ({ many }) => ({
	expenses: many(expenses),
}));

export const expensesRelations = relations(expenses, ({ one }) => ({
	category: one(categories, {
		fields: [expenses.categoryId],
		references: [categories.id],
	}),
}));

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;

/** Raw rows: `amount` and `currency` are separate columns. */
export type ExpenseRow = typeof expenses.$inferSelect;
export type NewExpenseRow = typeof expenses.$inferInsert;

/** Domain types: `amount` and `currency` combined into `Money`. */
export type Expense = Omit<ExpenseRow, "amount" | "currency"> & {
	amount: Money;
};
export type NewExpense = Omit<NewExpenseRow, "amount" | "currency"> & {
	amount: Money;
};

export function toExpense({ amount, currency, ...rest }: ExpenseRow): Expense {
	return { ...rest, amount: { amount, currency } };
}

export function toNewExpenseRow({
	amount,
	...rest
}: NewExpense): NewExpenseRow {
	return { ...rest, amount: amount.amount, currency: amount.currency };
}
