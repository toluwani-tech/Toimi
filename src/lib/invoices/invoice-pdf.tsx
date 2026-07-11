import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";

import { calculateLineItemTotals, formatEuros } from "@/lib/money";

export type InvoicePdfData = {
  number: number;
  title: string | null;
  createdAt: Date;
  dueDate: Date | null;
  vatRatePercent: number;
  reverseVatApplies: boolean;
  discountPercent: number;
  notes: string | null;
  paidCents: number;
  company: { name: string; businessId: string | null };
  customer: {
    name: string;
    email: string | null;
    phone: string | null;
    street: string | null;
    postalCode: string | null;
    city: string | null;
  };
  items: {
    type: "LABOR" | "MATERIAL";
    description: string;
    quantity: number;
    unitPriceCents: number;
  }[];
};

const typeLabel = { LABOR: "Työ", MATERIAL: "Materiaali" } as const;

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
  title: { fontSize: 18, fontWeight: 700, marginBottom: 4 },
  muted: { color: "#666666" },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 11, fontWeight: 700, marginBottom: 4 },
  tableHeaderRow: {
    flexDirection: "row",
    borderBottom: "1px solid #333333",
    paddingBottom: 4,
    marginBottom: 4,
    fontWeight: 700,
  },
  tableRow: { flexDirection: "row", paddingVertical: 3, borderBottom: "1px solid #eeeeee" },
  colDescription: { flexGrow: 1 },
  colType: { width: 60 },
  colQuantity: { width: 50, textAlign: "right" },
  colUnitPrice: { width: 70, textAlign: "right" },
  colLineTotal: { width: 70, textAlign: "right" },
  totalsBlock: { marginTop: 12, alignSelf: "flex-end", width: 220 },
  totalsRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  totalsRowFinal: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 6,
    marginTop: 4,
    borderTop: "1px solid #333333",
    fontWeight: 700,
  },
  notes: { marginTop: 24, fontSize: 9, color: "#666666" },
});

export function InvoicePdfDocument({ invoice }: { invoice: InvoicePdfData }) {
  const totals = calculateLineItemTotals(
    invoice.items.map((item) => ({ quantity: item.quantity, unitPriceCents: item.unitPriceCents })),
    {
      discountPercent: invoice.discountPercent,
      vatRatePercent: invoice.vatRatePercent,
      reverseVatApplies: invoice.reverseVatApplies,
    }
  );
  const balanceDueCents = Math.max(totals.totalCents - invoice.paidCents, 0);

  const customerAddress = [
    invoice.customer.street,
    [invoice.customer.postalCode, invoice.customer.city].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <Document title={`Lasku ${invoice.number}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Lasku #{invoice.number}</Text>
            {invoice.title && <Text>{invoice.title}</Text>}
            <Text style={styles.muted}>
              {new Intl.DateTimeFormat("fi-FI", { dateStyle: "long" }).format(invoice.createdAt)}
            </Text>
            {invoice.dueDate && (
              <Text style={styles.muted}>
                Eräpäivä {new Intl.DateTimeFormat("fi-FI", { dateStyle: "long" }).format(invoice.dueDate)}
              </Text>
            )}
          </View>
          <View>
            <Text>{invoice.company.name}</Text>
            {invoice.company.businessId && (
              <Text style={styles.muted}>Y-tunnus {invoice.company.businessId}</Text>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Asiakas</Text>
          <Text>{invoice.customer.name}</Text>
          {customerAddress && <Text style={styles.muted}>{customerAddress}</Text>}
          {invoice.customer.email && <Text style={styles.muted}>{invoice.customer.email}</Text>}
          {invoice.customer.phone && <Text style={styles.muted}>{invoice.customer.phone}</Text>}
        </View>

        <View style={styles.section}>
          <View style={styles.tableHeaderRow}>
            <Text style={styles.colDescription}>Kuvaus</Text>
            <Text style={styles.colType}>Tyyppi</Text>
            <Text style={styles.colQuantity}>Määrä</Text>
            <Text style={styles.colUnitPrice}>À-hinta</Text>
            <Text style={styles.colLineTotal}>Yhteensä</Text>
          </View>
          {invoice.items.map((item, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={styles.colDescription}>{item.description}</Text>
              <Text style={styles.colType}>{typeLabel[item.type]}</Text>
              <Text style={styles.colQuantity}>{item.quantity}</Text>
              <Text style={styles.colUnitPrice}>{formatEuros(item.unitPriceCents)}</Text>
              <Text style={styles.colLineTotal}>
                {formatEuros(Math.round(item.quantity * item.unitPriceCents))}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.totalsBlock}>
          <View style={styles.totalsRow}>
            <Text>Välisumma</Text>
            <Text>{formatEuros(totals.subtotalCents)}</Text>
          </View>
          {invoice.discountPercent > 0 && (
            <View style={styles.totalsRow}>
              <Text>Alennus ({invoice.discountPercent}%)</Text>
              <Text>-{formatEuros(totals.discountCents)}</Text>
            </View>
          )}
          <View style={styles.totalsRow}>
            <Text>{invoice.reverseVatApplies ? "ALV (käännetty)" : `ALV (${invoice.vatRatePercent}%)`}</Text>
            <Text>{formatEuros(totals.vatCents)}</Text>
          </View>
          <View style={styles.totalsRowFinal}>
            <Text>Yhteensä</Text>
            <Text>{formatEuros(totals.totalCents)}</Text>
          </View>
          {invoice.paidCents > 0 && (
            <>
              <View style={styles.totalsRow}>
                <Text>Maksettu</Text>
                <Text>-{formatEuros(invoice.paidCents)}</Text>
              </View>
              <View style={styles.totalsRowFinal}>
                <Text>Jäljellä</Text>
                <Text>{formatEuros(balanceDueCents)}</Text>
              </View>
            </>
          )}
        </View>

        {invoice.reverseVatApplies && (
          <Text style={styles.notes}>
            Käännetty arvonlisävero: ostaja on velvollinen suorittamaan veron (AVL 8 c §).
          </Text>
        )}
        {invoice.notes && <Text style={styles.notes}>{invoice.notes}</Text>}
      </Page>
    </Document>
  );
}

export async function renderInvoicePdfBuffer(invoice: InvoicePdfData): Promise<Buffer> {
  return renderToBuffer(<InvoicePdfDocument invoice={invoice} />);
}
