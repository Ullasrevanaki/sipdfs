import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import AppShell from "@/components/layout/AppShell";

function n(value: unknown) {
  return Number(value ?? 0);
}

export default async function ReportsPage() {
  const session = await auth();

  if (!session?.user?.email) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { store: true },
  });

  if (!user) redirect("/login");
  if (!user.store) redirect("/onboarding");

  const storeId = user.store.id;

  const [products, transactions, recommendations, alerts] =
    await Promise.all([
      prisma.product.findMany({
        where: { storeId },
        orderBy: { name: "asc" },
      }),

      prisma.inventoryTransaction.findMany({
        where: { storeId },
        include: { product: true },
        orderBy: { createdAt: "desc" },
      }),

      prisma.reorderRecommendation.findMany({
        where: { storeId, status: "ACTIVE" },
        include: { product: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),

      prisma.stockAlert.findMany({
        where: { storeId, status: "ACTIVE" },
        include: { product: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

  const sales = transactions.filter((t) => t.type === "SALE");
  const purchases = transactions.filter((t) => t.type === "PURCHASE");

  const totalStock = products.reduce(
    (sum, p) => sum + n(p.currentStock),
    0
  );

  const lowStock = products.filter(
    (p) => n(p.currentStock) > 0 && n(p.currentStock) <= n(p.minimumStock)
  ).length;

  const outOfStock = products.filter(
    (p) => n(p.currentStock) <= 0
  ).length;

  const soldUnits = sales.reduce(
    (sum, t) => sum + n(t.quantity),
    0
  );

  const purchasedUnits = purchases.reduce(
    (sum, t) => sum + n(t.quantity),
    0
  );

  const salesValue = sales.reduce(
    (sum, t) =>
      sum + n(t.quantity) * n(t.sellingPrice),
    0
  );

  return (
    <AppShell
      storeName={user.store.name}
      userName={user.name || "User"}
      userEmail={user.email || ""}
    >
      <div>
        <h1 className="text-3xl font-semibold">Reports</h1>

        <p className="mt-1 text-sm font-medium text-gray-600">
          {user.store.name}
        </p>

        <p className="mt-2 text-gray-500">
          Store performance, inventory and transaction reports.
        </p>
      </div>

      {/* SUMMARY */}

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Card title="Total Products" value={products.length} />
        <Card title="Current Stock" value={totalStock} />
        <Card title="Low Stock" value={lowStock} />
        <Card title="Out of Stock" value={outOfStock} />
      </div>

      {/* SALES / PURCHASES */}

      <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Card title="Units Sold" value={soldUnits} />
        <Card title="Sales Value" value={`₹${salesValue.toFixed(2)}`} />
        <Card title="Units Purchased" value={purchasedUnits} />
        <Card title="Transactions" value={transactions.length} />
      </div>

      {/* PRODUCT REPORT */}

      <section className="mt-8 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-5">
          <h2 className="text-lg font-semibold">
            Product Stock Report
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Current inventory position across all products.
          </p>
        </div>

        {products.length === 0 ? (
          <Empty text="No products available." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-6 py-4">Product</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Stock</th>
                  <th className="px-6 py-4">Minimum</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {products.map((product) => {
                  const stock = n(product.currentStock);
                  const minimum = n(product.minimumStock);

                  const status =
                    stock <= 0
                      ? "Out of Stock"
                      : stock <= minimum
                        ? "Low Stock"
                        : "In Stock";

                  return (
                    <tr
                      key={product.id}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-6 py-4 font-semibold">
                        {product.name}
                      </td>

                      <td className="px-6 py-4 text-gray-600">
                        {product.category || "—"}
                      </td>

                      <td className="px-6 py-4">
                        {stock} {product.unit}
                      </td>

                      <td className="px-6 py-4 text-gray-600">
                        {minimum} {product.unit}
                      </td>

                      <td className="px-6 py-4">
                        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold">
                          {status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* TRANSACTION SUMMARY */}

      <section className="mt-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">
          Transaction Summary
        </h2>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <Card
            title="Sales Transactions"
            value={sales.length}
          />

          <Card
            title="Purchase Transactions"
            value={purchases.length}
          />

          <Card
            title="Other Transactions"
            value={
              transactions.filter(
                (t) =>
                  t.type !== "SALE" &&
                  t.type !== "PURCHASE"
              ).length
            }
          />
        </div>
      </section>

      {/* LAYER 8 */}

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">
            AI Recommendations
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Active recommendations from Layer 8.
          </p>

          <div className="mt-5 space-y-3">
            {recommendations.length === 0 ? (
              <Empty text="No active recommendations." />
            ) : (
              recommendations.map((r) => (
                <div
                  key={r.id}
                  className="rounded-lg border border-gray-200 p-4"
                >
                  <div className="flex justify-between gap-4">
                    <div>
                      <p className="font-semibold">
                        {r.product.name}
                      </p>

                      <p className="mt-1 text-sm text-gray-500">
                        {r.reason || "Inventory recommendation"}
                      </p>
                    </div>

                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold">
                      {r.decision}
                    </span>
                  </div>

                  <p className="mt-3 text-sm text-gray-600">
                    Recommended: {n(r.recommendedQuantity)}{" "}
                    {r.product.unit}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">
            Active Alerts
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Current alerts from Layer 8.
          </p>

          <div className="mt-5 space-y-3">
            {alerts.length === 0 ? (
              <Empty text="No active alerts." />
            ) : (
              alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="rounded-lg border border-gray-200 p-4"
                >
                  <div className="flex justify-between gap-4">
                    <div>
                      <p className="font-semibold">
                        {alert.product.name}
                      </p>

                      <p className="mt-1 text-sm text-gray-500">
                        {alert.message}
                      </p>
                    </div>

                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold">
                      {alert.severity}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* RECENT ACTIVITY */}

      <section className="mt-8 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-5">
          <h2 className="text-lg font-semibold">
            Recent Activity
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Latest inventory transactions.
          </p>
        </div>

        {transactions.length === 0 ? (
          <Empty text="No transaction history." />
        ) : (
          <div className="divide-y divide-gray-200">
            {transactions.slice(0, 10).map((t) => (
              <div
                key={t.id}
                className="flex flex-col gap-2 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-semibold">
                    {t.product.name}
                  </p>

                  <p className="text-sm text-gray-500">
                    {new Date(t.createdAt).toLocaleString("en-IN")}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold">
                    {t.type}
                  </span>

                  <span className="font-medium">
                    {n(t.quantity)} {t.unit || t.product.unit}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}

function Card({
  title,
  value,
}: {
  title: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="px-6 py-10 text-center text-sm text-gray-500">
      {text}
    </div>
  );
}