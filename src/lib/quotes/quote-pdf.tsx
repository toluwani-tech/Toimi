import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";

import { calculateQuoteTotals, formatEuros } from "@/lib/quotes/calculations";

export type QuotePdfData = {
  number: number;
  title: string | null;
  createdAt: Date;
  vatRatePercent: number;
  reverseVatApplies: boolean;
  discountPercent: number;
  notes: string | null;
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

export function QuotePdfDocument({ quote }: { quote: QuotePdfData }) {
  const totals = calculateQuoteTotals(
    quote.items.map((item) => ({ quantity: item.quantity, unitPriceCents: item.unitPriceCents })),
    {
      discountPercent: quote.discountPercent,
      vatRatePercent: quote.vatRatePercent,
      reverseVatApplies: quote.reverseVatApplies,
    }
  );

  const customerAddress = [
    quote.customer.street,
    [quote.customer.postalCode, quote.customer.city].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <Document title={`Tarjous ${quote.number}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Tarjous #{quote.number}</Text>
            {quote.title && <Text>{quote.title}</Text>}
            <Text style={styles.muted}>
              {new Intl.DateTimeFormat("fi-FI", { dateStyle: "long" }).format(quote.createdAt)}
            </Text>
          </View>
          <View>
            <Text>{quote.company.name}</Text>
            {quote.company.businessId && <Text style={styles.muted}>Y-tunnus {quote.company.businessId}</Text>}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Asiakas</Text>
          <Text>{quote.customer.name}</Text>
          {customerAddress && <Text style={styles.muted}>{customerAddress}</Text>}
          {quote.customer.email && <Text style={styles.muted}>{quote.customer.email}</Text>}
          {quote.customer.phone && <Text style={styles.muted}>{quote.customer.phone}</Text>}
        </View>

        <View style={styles.section}>
          <View style={styles.tableHeaderRow}>
            <Text style={styles.colDescription}>Kuvaus</Text>
            <Text style={styles.colType}>Tyyppi</Text>
            <Text style={styles.colQuantity}>Määrä</Text>
            <Text style={styles.colUnitPrice}>À-hinta</Text>
            <Text style={styles.colLineTotal}>Yhteensä</Text>
          </View>
          {quote.items.map((item, index) => (
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
          {quote.discountPercent > 0 && (
            <View style={styles.totalsRow}>
              <Text>Alennus ({quote.discountPercent}%)</Text>
              <Text>-{formatEuros(totals.discountCents)}</Text>
            </View>
          )}
          <View style={styles.totalsRow}>
            <Text>{quote.reverseVatApplies ? "ALV (käännetty)" : `ALV (${quote.vatRatePercent}%)`}</Text>
            <Text>{formatEuros(totals.vatCents)}</Text>
          </View>
          <View style={styles.totalsRowFinal}>
            <Text>Yhteensä</Text>
            <Text>{formatEuros(totals.totalCents)}</Text>
          </View>
        </View>

        {quote.reverseVatApplies && (
          <Text style={styles.notes}>
            Käännetty arvonlisävero: ostaja on velvollinen suorittamaan veron (AVL 8 c §).
          </Text>
        )}
        {quote.notes && <Text style={styles.notes}>{quote.notes}</Text>}
      </Page>
    </Document>
  );
}

export async function renderQuotePdfBuffer(quote: QuotePdfData): Promise<Buffer> {
  return renderToBuffer(<QuotePdfDocument quote={quote} />);
}
