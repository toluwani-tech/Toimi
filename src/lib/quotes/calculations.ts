export type QuoteLineItemInput = {
  quantity: number;
  unitPriceCents: number;
};

export type QuoteTotalsInput = {
  discountPercent: number;
  vatRatePercent: number;
  reverseVatApplies: boolean;
};

export type QuoteTotals = {
  subtotalCents: number;
  discountCents: number;
  vatCents: number;
  totalCents: number;
};

export function calculateQuoteTotals(
  items: QuoteLineItemInput[],
  { discountPercent, vatRatePercent, reverseVatApplies }: QuoteTotalsInput
): QuoteTotals {
  const subtotalCents = items.reduce(
    (sum, item) => sum + Math.round(item.quantity * item.unitPriceCents),
    0
  );
  const discountCents = Math.round((subtotalCents * discountPercent) / 100);
  const afterDiscountCents = subtotalCents - discountCents;
  // Construction reverse-charge VAT: the buyer accounts for VAT, not the seller —
  // the quote shows 0% VAT regardless of the nominal rate, with an explanatory note.
  const vatCents = reverseVatApplies ? 0 : Math.round((afterDiscountCents * vatRatePercent) / 100);
  const totalCents = afterDiscountCents + vatCents;

  return { subtotalCents, discountCents, vatCents, totalCents };
}

export function formatEuros(cents: number): string {
  return new Intl.NumberFormat("fi-FI", { style: "currency", currency: "EUR" }).format(cents / 100);
}
