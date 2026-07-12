import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatEuros } from "@/lib/money";
import { db } from "@/lib/db";

const companyFormLabel = {
  TOIMINIMI: "Toiminimi",
  OY: "Oy",
  UNDECIDED: "Ei valittu",
} as const;

const roleLabel = {
  SUPER_ADMIN: "Pääkäyttäjä",
  ADMIN: "Ylläpitäjä",
  OWNER: "Omistaja",
  MANAGER: "Esihenkilö",
  EMPLOYEE: "Työntekijä",
  ACCOUNTANT: "Kirjanpitäjä",
} as const;

export default async function AdminDashboardPage() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [totalCompanies, totalUsers, companiesThisMonth, revenueAgg, companies, users] = await Promise.all([
    db.company.count(),
    db.user.count(),
    db.company.count({ where: { createdAt: { gte: monthStart } } }),
    db.payment.aggregate({ _sum: { amountCents: true } }),
    db.company.findMany({
      include: {
        _count: { select: { members: true, quotes: true, jobs: true, invoices: true, expenses: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.user.findMany({
      include: {
        companyMembers: { include: { company: true }, orderBy: { createdAt: "asc" }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const totalRevenueCents = revenueAgg._sum.amountCents ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Ylläpito</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              <h3>Yrityksiä</h3>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{totalCompanies}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              <h3>Käyttäjiä</h3>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{totalUsers}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              <h3>Uusia yrityksiä tässä kuussa</h3>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{companiesThisMonth}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              <h3>Liikevaihto yhteensä (alusta)</h3>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{formatEuros(totalRevenueCents)}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Yritykset</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {companies.length === 0 ? (
            <p className="text-muted-foreground">Ei vielä yrityksiä.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nimi</TableHead>
                  <TableHead>Yritysmuoto</TableHead>
                  <TableHead className="text-right">Jäseniä</TableHead>
                  <TableHead className="text-right">Tarjouksia</TableHead>
                  <TableHead className="text-right">Töitä</TableHead>
                  <TableHead className="text-right">Laskuja</TableHead>
                  <TableHead className="text-right">Kuluja</TableHead>
                  <TableHead>Luotu</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.map((company) => (
                  <TableRow key={company.id}>
                    <TableCell className="font-medium">{company.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{companyFormLabel[company.form]}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{company._count.members}</TableCell>
                    <TableCell className="text-right">{company._count.quotes}</TableCell>
                    <TableCell className="text-right">{company._count.jobs}</TableCell>
                    <TableCell className="text-right">{company._count.invoices}</TableCell>
                    <TableCell className="text-right">{company._count.expenses}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Intl.DateTimeFormat("fi-FI", { dateStyle: "short" }).format(company.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Käyttäjät</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <p className="text-muted-foreground">Ei vielä käyttäjiä.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nimi</TableHead>
                  <TableHead>Sähköposti</TableHead>
                  <TableHead>Yritys</TableHead>
                  <TableHead>Rooli</TableHead>
                  <TableHead>Luotu</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => {
                  const primaryMembership = user.companyMembers[0];
                  return (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name ?? "—"}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{primaryMembership?.company.name ?? "—"}</TableCell>
                      <TableCell>
                        {primaryMembership ? (
                          <Badge variant="secondary">{roleLabel[primaryMembership.role]}</Badge>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Intl.DateTimeFormat("fi-FI", { dateStyle: "short" }).format(user.createdAt)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
