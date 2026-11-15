import { describe, expect, it } from "vitest";

import { formatMoney, money, sumMoney } from "#/lib/money";

describe("money", () => {
	it("defaults to PLN", () => {
		expect(money(1250)).toEqual({ amount: 1250, currency: "PLN" });
	});

	it("rejects fractional minor units", () => {
		expect(() => money(12.5)).toThrow();
	});

	it("sums amounts of one currency", () => {
		expect(sumMoney([money(100), money(250)])).toEqual(money(350));
	});

	it("refuses to sum mixed currencies", () => {
		expect(() => sumMoney([money(100), money(100, "EUR")])).toThrow();
	});

	it("formats in the money's currency", () => {
		expect(formatMoney(money(123400))).toBe("PLN\u00a01,234");
		expect(formatMoney(money(123400, "EUR"))).toBe("€1,234");
	});
});
