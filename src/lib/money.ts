export type LineItemInput = {
  quantity: number;
  unitPriceCents: number;
};

export type LineItemTotalsInput = {
  discountPercent: number;
  vatRatePercent: number;
  reverseVatApplies: boolean;
};

export type LineItemTotals = {
  subtotalCents: number;
  discountCents: number;
  vatCents: number;
  totalCents: number;
};

/**
 * Shared money math for Quotes and Invoices — both go from a list of line items
 * (quantity × unit price in cents) to subtotal/discount/VAT/total. Kept as one
 * function rather than duplicated per module since the rounding behavior has to
 * match exactly everywhere it's used.
 */
export function calculateLineItemTotals(
  items: LineItemInput[],
  { discountPercent, vatRatePercent, reverseVatApplies }: LineItemTotalsInput
): LineItemTotals {
  const subtotalCents = items.reduce(
    (sum, item) => sum + Math.round(item.quantity * item.unitPriceCents),
    0
  );
  const discountCents = Math.round((subtotalCents * discountPercent) / 100);
  const afterDiscountCents = subtotalCents - discountCents;
  // Construction reverse-charge VAT: the buyer accounts for VAT, not the seller —
  // the document shows 0% VAT regardless of the nominal rate, with an explanatory note.
  const vatCents = reverseVatApplies ? 0 : Math.round((afterDiscountCents * vatRatePercent) / 100);
  const totalCents = afterDiscountCents + vatCents;

  return { subtotalCents, discountCents, vatCents, totalCents };
}

export function formatEuros(cents: number): string {
  return new Intl.NumberFormat("fi-FI", { style: "currency", currency: "EUR" }).format(cents / 100);
}
