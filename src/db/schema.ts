import { relations, sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

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
		/** Amount in grosze (PLN × 100) */
		amount: integer().notNull(),
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
export type Expense = typeof expenses.$inferSelect;
export type NewExpense = typeof expenses.$inferInsert;
