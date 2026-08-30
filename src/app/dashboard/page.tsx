import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import AppShell from "@/components/layout/AppShell";

function number(value: unknown) {
  return Number(value ?? 0);
}

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: {
      email: session.user.email,
    },
    include: {
      store: true,
    },
  });

  if (!user) {
    redirect("/login");
  }

  if (!user.store) {
    redirect("/onboarding");
  }

  const storeId = user.store.id;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    products,
    lowStockProducts,
    outOfStockProducts,
    activeRecommendations,
    activeAlerts,
    salesTransactions,
    purchaseTransactions,
    recentTransactions,
    trendTransactions,
  ] = await Promise.all([
    prisma.product.findMany({
      where: {
        storeId,
      },
      orderBy: {
        name: "asc",
      },
    }),

    prisma.product.findMany({
      where: {
        storeId,
        currentStock: {
          gt: 0,
        },
        minimumStock: {
          gt: 0,
        },
      },
    }),

    prisma.product.findMany({
      where: {
        storeId,
        currentStock: {
          lte: 0,
        },
      },
    }),

    prisma.reorderRecommendation.findMany({
      where: {
        storeId,
        status: "ACTIVE",
      },
      include: {
        product: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
    }),

    prisma.stockAlert.findMany({
      where: {
        storeId,
        status: "ACTIVE",
      },
      include: {
        product: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
    }),

    prisma.inventoryTransaction.findMany({
      where: {
        storeId,
        type: "SALE",
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
      select: {
        quantity: true,
        sellingPrice: true,
      },
    }),

    prisma.inventoryTransaction.findMany({
      where: {
        storeId,
        type: "PURCHASE",
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
      select: {
        quantity: true,
      },
    }),

    prisma.inventoryTransaction.findMany({
      where: {
        storeId,
      },
      include: {
        product: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 8,
    }),

    prisma.inventoryTransaction.findMany({
      where: {
        storeId,
        type: {
          in: ["SALE", "PURCHASE"],
        },
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
      select: {
        type: true,
        quantity: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    }),
  ]);

  const productCount = products.length;

  const currentStock = products.reduce(
    (sum, product) =>
      sum + number(product.currentStock),
    0
  );

  const lowStockCount = lowStockProducts.filter(
    (product) =>
      number(product.currentStock) <=
      number(product.minimumStock)
  ).length;

  const outOfStockCount = outOfStockProducts.length;

  const healthyProductCount =
    productCount -
    lowStockCount -
    outOfStockCount;

  const inventoryHealth =
    productCount === 0
      ? 0
      : Math.max(
          0,
          Math.round(
            (healthyProductCount / productCount) * 100
          )
        );

  const salesQuantity = salesTransactions.reduce(
    (sum, transaction) =>
      sum + number(transaction.quantity),
    0
  );

  const salesValue = salesTransactions.reduce(
    (sum, transaction) =>
      sum +
      number(transaction.quantity) *
        number(transaction.sellingPrice),
    0
  );

  const purchaseQuantity =
    purchaseTransactions.reduce(
      (sum, transaction) =>
        sum + number(transaction.quantity),
      0
    );

  const trendMap = new Map<
    string,
    { sales: number; purchases: number }
  >();

  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - i);

    const key = date.toISOString().slice(0, 10);

    trendMap.set(key, {
      sales: 0,
      purchases: 0,
    });
  }

  for (const transaction of trendTransactions) {
    const key = new Date(transaction.createdAt)
      .toISOString()
      .slice(0, 10);

    const day = trendMap.get(key);

    if (!day) continue;

    if (transaction.type === "SALE") {
      day.sales += number(transaction.quantity);
    }

    if (transaction.type === "PURCHASE") {
      day.purchases += number(transaction.quantity);
    }
  }

  const trendDays = Array.from(
    trendMap.entries()
  ).map(([date, values]) => ({
    date,
    sales: values.sales,
    purchases: values.purchases,
  }));

  const trendMaximum = Math.max(
    1,
    ...trendDays.flatMap((day) => [
      day.sales,
      day.purchases,
    ])
  );

  return (
    <AppShell
      storeName={user.store.name}
      userName={user.name || "User"}
      userEmail={user.email || ""}
    >
      {/* HEADER */}

      <div>
        <h1 className="text-3xl font-semibold">
          Dashboard
        </h1>

        <p className="mt-1 text-sm font-medium text-gray-600">
          {user.store.name}
        </p>

        <p className="mt-2 text-gray-500">
          Overview of your store inventory and operations.
        </p>
      </div>

      {/* KPI CARDS */}

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardCard
          title="Total Products"
          value={productCount.toString()}
        />

        <DashboardCard
          title="Current Stock"
          value={currentStock.toString()}
        />

        <DashboardCard
          title="Low Stock"
          value={lowStockCount.toString()}
        />

        <DashboardCard
          title="Out of Stock"
          value={outOfStockCount.toString()}
        />
      </div>

      {/* AI / OPERATIONS */}

      <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardCard
          title="AI Recommendations"
          value={activeRecommendations.length.toString()}
        />

        <DashboardCard
          title="Active Alerts"
          value={activeAlerts.length.toString()}
        />

        <DashboardCard
          title="30-Day Sales"
          value={salesQuantity.toString()}
        />

        <DashboardCard
          title="30-Day Purchases"
          value={purchaseQuantity.toString()}
        />
      </div>

      {/* INVENTORY HEALTH */}

      <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">
              Inventory Health
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Current stock condition across your products.
            </p>
          </div>

          <span className="text-2xl font-semibold">
            {inventoryHealth}%
          </span>
        </div>

        <div className="mt-5 h-3 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-gray-900"
            style={{
              width: `${inventoryHealth}%`,
            }}
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-5 text-sm text-gray-600">
          <span>
            Healthy: {healthyProductCount}
          </span>

          <span>
            Low stock: {lowStockCount}
          </span>

          <span>
            Out of stock: {outOfStockCount}
          </span>
        </div>
      </div>

      {/* RECOMMENDATIONS + ALERTS */}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* RECOMMENDATIONS */}

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">
                AI Recommendations
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Recommendations generated by Layer 8.
              </p>
            </div>

            <a
              href="/dashboard/inventory"
              className="text-sm font-semibold text-gray-700 hover:underline"
            >
              View all
            </a>
          </div>

          <div className="mt-5 space-y-3">
            {activeRecommendations.length === 0 ? (
              <EmptyState text="No active recommendations." />
            ) : (
              activeRecommendations.map(
                (recommendation) => (
                  <div
                    key={recommendation.id}
                    className="rounded-lg border border-gray-200 p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold">
                          {recommendation.product.name}
                        </p>

                        <p className="mt-1 text-sm text-gray-500">
                          {recommendation.reason ||
                            "Inventory recommendation"}
                        </p>
                      </div>

                      <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold">
                        {recommendation.decision}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-600">
                      <span>
                        Stock:{" "}
                        {number(
                          recommendation.currentStock
                        )}
                      </span>

                      <span>
                        Buy:{" "}
                        {number(
                          recommendation.recommendedQuantity
                        )}
                      </span>

                      <span>
                        Target:{" "}
                        {number(
                          recommendation.targetStock
                        )}
                      </span>
                    </div>
                  </div>
                )
              )
            )}
          </div>
        </div>

        {/* ALERTS */}

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">
                Active Alerts
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Current inventory alerts from Layer 8.
              </p>
            </div>

            <a
              href="/dashboard/alerts"
              className="text-sm font-semibold text-gray-700 hover:underline"
            >
              View all
            </a>
          </div>

          <div className="mt-5 space-y-3">
            {activeAlerts.length === 0 ? (
              <EmptyState text="No active inventory alerts." />
            ) : (
              activeAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="rounded-lg border border-gray-200 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
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

                  <div className="mt-3 text-sm text-gray-600">
                    Stock:{" "}
                    {number(alert.currentStock)}
                    {" / "}
                    Minimum:{" "}
                    {number(alert.minimumStock)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 30-DAY OPERATIONS */}

      <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">
          30-Day Operations
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Activity recorded during the last 30 days.
        </p>

        <div className="mt-5 grid gap-5 sm:grid-cols-3">
          <SummaryItem
            label="Units Sold"
            value={salesQuantity.toString()}
          />

          <SummaryItem
            label="Sales Value"
            value={`₹${salesValue.toFixed(2)}`}
          />

          <SummaryItem
            label="Units Purchased"
            value={purchaseQuantity.toString()}
          />
        </div>
      </div>

      {/* TREND */}

      <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">
              30-Day Operations Trend
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Daily sales and purchase quantities.
            </p>
          </div>

          <div className="flex gap-4 text-sm text-gray-600">
            <span>Sales</span>
            <span>Purchases</span>
          </div>
        </div>

        <div className="mt-6">
          <div className="flex h-48 items-end gap-1 overflow-x-auto rounded-lg border border-gray-100 bg-gray-50 p-3">
            {trendDays.map((day) => (
              <div
                key={day.date}
                className="group flex h-full min-w-[12px] flex-1 items-end gap-0.5"
                title={`${day.date} — Sales: ${day.sales}, Purchases: ${day.purchases}`}
              >
                <div
                  className="w-1/2 rounded-t bg-gray-900"
                  style={{
                    height: `${Math.max(
                      day.sales > 0 ? 4 : 1,
                      (day.sales / trendMaximum) * 100
                    )}%`,
                  }}
                />

                <div
                  className="w-1/2 rounded-t bg-gray-300"
                  style={{
                    height: `${Math.max(
                      day.purchases > 0 ? 4 : 1,
                      (day.purchases / trendMaximum) * 100
                    )}%`,
                  }}
                />
              </div>
            ))}
          </div>

          <div className="mt-3 flex justify-between text-xs text-gray-400">
            <span>{trendDays[0]?.date}</span>

            <span>
              {trendDays[trendDays.length - 1]?.date}
            </span>
          </div>

          <div className="mt-4 flex flex-wrap gap-5 text-sm text-gray-600">
            <span>
              Sales: {salesQuantity} units
            </span>

            <span>
              Purchases: {purchaseQuantity} units
            </span>
          </div>
        </div>
      </div>

      {/* RECENT ACTIVITY */}

      <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">
          Recent Activity
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Latest inventory transactions.
        </p>

        <div className="mt-5 overflow-x-auto">
          {recentTransactions.length === 0 ? (
            <EmptyState text="No inventory activity yet." />
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500">
                  <th className="pb-3 font-medium">
                    Product
                  </th>

                  <th className="pb-3 font-medium">
                    Type
                  </th>

                  <th className="pb-3 font-medium">
                    Quantity
                  </th>

                  <th className="pb-3 font-medium">
                    Date
                  </th>
                </tr>
              </thead>

              <tbody>
                {recentTransactions.map(
                  (transaction) => (
                    <tr
                      key={transaction.id}
                      className="border-b border-gray-100 last:border-0"
                    >
                      <td className="py-3 font-medium">
                        {transaction.product.name}
                      </td>

                      <td className="py-3">
                        {transaction.type}
                      </td>

                      <td className="py-3">
                        {number(transaction.quantity)}
                      </td>

                      <td className="py-3 text-gray-500">
                        {transaction.createdAt.toLocaleDateString(
                          "en-IN"
                        )}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* QUICK ACTIONS */}

      <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">
          Quick Actions
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Manage your store quickly from here.
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          <a
            href="/dashboard/products/new"
            className="rounded-lg bg-gray-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
          >
            + Add Product
          </a>

          <a
            href="/dashboard/sales/new"
            className="rounded-lg border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            + Record Sale
          </a>

          <a
            href="/dashboard/purchases/new"
            className="rounded-lg border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            + Record Purchase
          </a>

          <a
            href="/dashboard/reports"
            className="rounded-lg border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            View Reports
          </a>
        </div>
      </div>
    </AppShell>
  );
}

function DashboardCard({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-gray-500">
        {title}
      </p>

      <p className="mt-2 text-2xl font-semibold">
        {value}
      </p>
    </div>
  );
}

function SummaryItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <p className="text-sm text-gray-500">
        {label}
      </p>

      <p className="mt-2 text-xl font-semibold">
        {value}
      </p>
    </div>
  );
}

function EmptyState({
  text,
}: {
  text: string;
}) {
  return (
    <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
      {text}
    </div>
  );
}