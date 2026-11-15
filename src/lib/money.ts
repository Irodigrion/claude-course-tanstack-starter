// Money value type shared by the DB layer and the UI. Pure module: safe to
// import from client code.

/** Supported ISO 4217 currency codes. Add a code here to make it selectable. */
export const CURRENCIES = ["PLN", "EUR", "USD"] as const;

export type Currency = (typeof CURRENCIES)[number];

export const DEFAULT_CURRENCY: Currency = "PLN";

export interface Money {
	/** Integer amount in the currency's minor unit (e.g. grosze, cents). */
	amount: number;
	currency: Currency;
}

export function money(
	amount: number,
	currency: Currency = DEFAULT_CURRENCY,
): Money {
	if (!Number.isInteger(amount)) {
		throw new Error(`Money amount must be an integer, got ${amount}`);
	}
	return { amount, currency };
}

export function isCurrency(value: unknown): value is Currency {
	return (CURRENCIES as readonly unknown[]).includes(value);
}

/** Adds amounts of the same currency; mixing currencies is an error. */
export function sumMoney(
	items: Money[],
	currency: Currency = DEFAULT_CURRENCY,
): Money {
	let amount = 0;
	for (const item of items) {
		if (item.currency !== currency) {
			throw new Error(
				`Cannot add ${item.currency} to ${currency} without conversion`,
			);
		}
		amount += item.amount;
	}
	return { amount, currency };
}

// All supported currencies use 2 minor-unit digits.
const MINOR_UNITS = 100;

const formatters = new Map<Currency, Intl.NumberFormat>();

export function formatMoney({ amount, currency }: Money) {
	let formatter = formatters.get(currency);
	if (!formatter) {
		formatter = new Intl.NumberFormat("en-US", {
			style: "currency",
			currency,
			maximumFractionDigits: 0,
		});
		formatters.set(currency, formatter);
	}
	return formatter.format(amount / MINOR_UNITS);
}
