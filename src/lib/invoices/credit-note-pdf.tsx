import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";

import { calculateLineItemTotals, formatEuros } from "@/lib/money";

export type CreditNotePdfData = {
  number: number;
  invoiceNumber: number;
  reason: string | null;
  createdAt: Date;
  vatRatePercent: number;
  reverseVatApplies: boolean;
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

export function CreditNotePdfDocument({ creditNote }: { creditNote: CreditNotePdfData }) {
  const totals = calculateLineItemTotals(
    creditNote.items.map((item) => ({ quantity: item.quantity, unitPriceCents: item.unitPriceCents })),
    {
      discountPercent: 0,
      vatRatePercent: creditNote.vatRatePercent,
      reverseVatApplies: creditNote.reverseVatApplies,
    }
  );

  const customerAddress = [
    creditNote.customer.street,
    [creditNote.customer.postalCode, creditNote.customer.city].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <Document title={`Hyvityslasku ${creditNote.number}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Hyvityslasku #{creditNote.number}</Text>
            <Text style={styles.muted}>Viittaa laskuun #{creditNote.invoiceNumber}</Text>
            <Text style={styles.muted}>
              {new Intl.DateTimeFormat("fi-FI", { dateStyle: "long" }).format(creditNote.createdAt)}
            </Text>
          </View>
          <View>
            <Text>{creditNote.company.name}</Text>
            {creditNote.company.businessId && (
              <Text style={styles.muted}>Y-tunnus {creditNote.company.businessId}</Text>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Asiakas</Text>
          <Text>{creditNote.customer.name}</Text>
          {customerAddress && <Text style={styles.muted}>{customerAddress}</Text>}
          {creditNote.customer.email && <Text style={styles.muted}>{creditNote.customer.email}</Text>}
          {creditNote.customer.phone && <Text style={styles.muted}>{creditNote.customer.phone}</Text>}
        </View>

        <View style={styles.section}>
          <View style={styles.tableHeaderRow}>
            <Text style={styles.colDescription}>Kuvaus</Text>
            <Text style={styles.colType}>Tyyppi</Text>
            <Text style={styles.colQuantity}>Määrä</Text>
            <Text style={styles.colUnitPrice}>À-hinta</Text>
            <Text style={styles.colLineTotal}>Yhteensä</Text>
          </View>
          {creditNote.items.map((item, index) => (
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
          <View style={styles.totalsRow}>
            <Text>{creditNote.reverseVatApplies ? "ALV (käännetty)" : `ALV (${creditNote.vatRatePercent}%)`}</Text>
            <Text>{formatEuros(totals.vatCents)}</Text>
          </View>
          <View style={styles.totalsRowFinal}>
            <Text>Hyvitys yhteensä</Text>
            <Text>{formatEuros(totals.totalCents)}</Text>
          </View>
        </View>

        {creditNote.reverseVatApplies && (
          <Text style={styles.notes}>
            Käännetty arvonlisävero: ostaja on velvollinen suorittamaan veron (AVL 8 c §).
          </Text>
        )}
        {creditNote.reason && <Text style={styles.notes}>{creditNote.reason}</Text>}
      </Page>
    </Document>
  );
}

export async function renderCreditNotePdfBuffer(creditNote: CreditNotePdfData): Promise<Buffer> {
  return renderToBuffer(<CreditNotePdfDocument creditNote={creditNote} />);
}
