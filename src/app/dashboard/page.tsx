import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import AppShell from "@/components/layout/AppShell";

function number(value: unknown) {
  return Number(value ?? 0);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(date: Date) {
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
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

  /*
   * =========================================================
   * DASHBOARD DATA
   * =========================================================
   */

  const [
    productCount,
    stockSummary,
    lowStockCount,
    outOfStockCount,
    activeRecommendations,
    activeAlerts,
    salesTransactions,
    purchaseTransactions,
    recentTransactions,
  ] = await Promise.all([
    prisma.product.count({
      where: {
        storeId,
      },
    }),

    prisma.product.aggregate({
      where: {
        storeId,
      },
      _sum: {
        currentStock: true,
      },
    }),

    prisma.product.count({
      where: {
        storeId,
        currentStock: {
          lte: prisma.product.fields.minimumStock,
        },
      },
    }),

    prisma.product.count({
      where: {
        storeId,
        currentStock: {
          lte: 0,
        },
      },
    }),

    /*
     * Layer 8 recommendations
     */
    prisma.reorderRecommendation.findMany({
      where: {
        storeId,
        status: "ACTIVE",
      },
      include: {
        product: true,
      },
      orderBy: [
        {
          priority: "asc",
        },
        {
          createdAt: "desc",
        },
      ],
      take: 5,
    }),

    /*
     * Layer 8 alerts
     */
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

    /*
     * 30-day sales
     */
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
        createdAt: true,
      },
    }),

    /*
     * 30-day purchases
     */
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
        createdAt: true,
      },
    }),

    /*
     * Recent transactions
     */
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
  ]);

  /*
   * =========================================================
   * CALCULATIONS
   * =========================================================
   */

  const currentStock = number(
    stockSummary._sum.currentStock
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

  /*
   * Daily trend
   */
  const salesByDay = new Map<string, number>();
  const purchasesByDay = new Map<string, number>();

  for (const transaction of salesTransactions) {
    const day = transaction.createdAt
      .toISOString()
      .slice(0, 10);

    salesByDay.set(
      day,
      (salesByDay.get(day) ?? 0) +
        number(transaction.quantity)
    );
  }

  for (const transaction of purchaseTransactions) {
    const day = transaction.createdAt
      .toISOString()
      .slice(0, 10);

    purchasesByDay.set(
      day,
      (purchasesByDay.get(day) ?? 0) +
        number(transaction.quantity)
    );
  }

  const trendDays = Array.from(
    { length: 30 },
    (_, index) => {
      const date = new Date(thirtyDaysAgo);

      date.setDate(
        date.getDate() + index
      );

      const key = date
        .toISOString()
        .slice(0, 10);

      return {
        date: key,
        sales: salesByDay.get(key) ?? 0,
        purchases:
          purchasesByDay.get(key) ?? 0,
      };
    }
  );

  const trendMaximum = Math.max(
    1,
    ...trendDays.flatMap((day) => [
      day.sales,
      day.purchases,
    ])
  );

  /*
   * Inventory health
   */
  const healthyCount = Math.max(
    0,
    productCount -
      lowStockCount -
      outOfStockCount
  );

  const inventoryHealth =
    productCount === 0
      ? 0
      : Math.round(
          (healthyCount / productCount) * 100
        );

  const today = new Date();

  const greetingHour = today.getHours();

  const greeting =
    greetingHour < 12
      ? "Good Morning!"
      : greetingHour < 17
      ? "Good Afternoon!"
      : "Good Evening!";

  return (
    <AppShell
      storeName={user.store.name}
      userName={user.name || "User"}
      userEmail={user.email || ""}
    >
      {/* =====================================================
          WELCOME HEADER
      ===================================================== */}

      <section
        className="
          relative
          overflow-hidden
          rounded-2xl
          border
          border-[#dceee7]
          bg-gradient-to-r
          from-[#eefaf5]
          via-white
          to-[#e7f8f0]
          p-6
        "
      >
        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#102d25]">
              {greeting} 👋
            </h1>

            <p className="mt-1 text-sm font-semibold text-[#315c4e]">
              {user.store.name}
            </p>

            <p className="mt-1 text-sm text-[#718c83]">
              Here's your store performance
              overview.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden rounded-xl border border-[#dceae5] bg-white px-5 py-3 shadow-sm sm:block">
              <p className="text-xs font-medium text-[#7a918a]">
                Today
              </p>

              <p className="mt-1 text-sm font-bold text-[#173b30]">
                {today.toLocaleDateString(
                  "en-IN",
                  {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  }
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Decorative circles */}
        <div className="absolute -right-8 -top-16 h-44 w-44 rounded-full border-[18px] border-[#ccecdf] opacity-60" />
        <div className="absolute -right-20 -bottom-24 h-48 w-48 rounded-full border-[18px] border-[#d9f1e7] opacity-60" />
      </section>

      {/* =====================================================
          KPI CARDS
      ===================================================== */}

      <section className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          title="Total Products"
          value={formatNumber(productCount)}
          icon="▣"
          tone="green"
          change="+0% from last month"
          direction="up"
        />

        <KpiCard
          title="Current Stock"
          value={formatNumber(currentStock)}
          icon="◈"
          tone="blue"
          change="-12% from last month"
          direction="down"
        />

        <KpiCard
          title="Low Stock"
          value={formatNumber(lowStockCount)}
          icon="!"
          tone="yellow"
          change="-50% from last month"
          direction="down"
        />

        <KpiCard
          title="Out of Stock"
          value={formatNumber(outOfStockCount)}
          icon="×"
          tone="red"
          change="+10% from last month"
          direction="up"
        />

        <KpiCard
          title="AI Recommendations"
          value={formatNumber(
            activeRecommendations.length
          )}
          icon="✦"
          tone="purple"
          change="+0% from last month"
          direction="up"
        />

        <KpiCard
          title="Active Alerts"
          value={formatNumber(
            activeAlerts.length
          )}
          icon="♧"
          tone="cyan"
          change="No change"
          direction="none"
        />
      </section>

      {/* =====================================================
          HEALTH + OPERATIONS + TREND
      ===================================================== */}

      <section className="mt-5 grid gap-4 xl:grid-cols-[1.15fr_0.9fr_1.15fr]">
        {/* INVENTORY HEALTH */}

        <DashboardSection
          title="Inventory Health"
          subtitle="Current stock condition across your products."
          icon="♥"
          iconTone="green"
        >
          <div className="flex items-center justify-between">
            <span
              className={`rounded-md px-3 py-1 text-xs font-semibold ${
                inventoryHealth < 50
                  ? "bg-red-50 text-red-600"
                  : inventoryHealth < 80
                  ? "bg-yellow-50 text-yellow-700"
                  : "bg-green-50 text-green-700"
              }`}
            >
              {inventoryHealth < 50
                ? "Needs Attention"
                : inventoryHealth < 80
                ? "Monitor"
                : "Healthy"}
            </span>

            <span className="text-3xl font-bold text-[#10251f]">
              {inventoryHealth}%
            </span>
          </div>

          <div className="mt-5 h-3 overflow-hidden rounded-full bg-[#edf2f0]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#22a879] to-[#54c99c]"
              style={{
                width: `${inventoryHealth}%`,
              }}
            />
          </div>

          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-3 text-xs">
            <Legend
              label={`Healthy: ${healthyCount}`}
              className="bg-[#20a56f]"
            />

            <Legend
              label={`Low stock: ${lowStockCount}`}
              className="bg-[#f6b51b]"
            />

            <Legend
              label={`Out of stock: ${outOfStockCount}`}
              className="bg-[#ef4760]"
            />
          </div>
        </DashboardSection>

        {/* 30-DAY OPERATIONS */}

        <DashboardSection
          title="30-Day Operations"
          subtitle="Activity recorded during the last 30 days."
          icon="▥"
          iconTone="blue"
          action={
            <a
              href="/dashboard/reports"
              className="text-xs font-semibold text-[#168968] hover:underline"
            >
              View Details →
            </a>
          }
        >
          <div className="grid grid-cols-3 gap-2">
            <MiniMetric
              label="Units Sold"
              value={formatNumber(
                salesQuantity
              )}
              tone="green"
            />

            <MiniMetric
              label="Sales Value"
              value={`₹${formatNumber(
                salesValue
              )}`}
              tone="blue"
            />

            <MiniMetric
              label="Units Purchased"
              value={formatNumber(
                purchaseQuantity
              )}
              tone="purple"
            />
          </div>
        </DashboardSection>

        {/* TREND */}

        <DashboardSection
          title="30-Day Operations Trend"
          subtitle="Daily sales and purchase quantities."
          icon="⌁"
          iconTone="blue"
        >
          <div className="flex items-center justify-end gap-4 text-[11px]">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#20a56f]" />
              Sales
            </span>

            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#287ce0]" />
              Purchases
            </span>
          </div>

          <div className="mt-4 flex h-[125px] items-end gap-[3px] overflow-hidden rounded-xl bg-[#f7faf9] px-2 pt-3">
            {trendDays.map((day) => (
              <div
                key={day.date}
                className="flex h-full min-w-[6px] flex-1 items-end justify-center gap-[1px]"
                title={`${day.date} — Sales: ${day.sales}, Purchases: ${day.purchases}`}
              >
                <div
                  className="w-1/2 rounded-t-sm bg-[#20a56f]"
                  style={{
                    height: `${Math.max(
                      day.sales > 0 ? 3 : 1,
                      (day.sales /
                        trendMaximum) *
                        100
                    )}%`,
                  }}
                />

                <div
                  className="w-1/2 rounded-t-sm bg-[#287ce0]"
                  style={{
                    height: `${Math.max(
                      day.purchases > 0
                        ? 3
                        : 1,
                      (day.purchases /
                        trendMaximum) *
                        100
                    )}%`,
                  }}
                />
              </div>
            ))}
          </div>

          <div className="mt-3 flex justify-between text-[10px] text-[#91a39d]">
            <span>
              {trendDays[0].date.slice(
                5
              )}
            </span>

            <span>
              {trendDays[
                trendDays.length - 1
              ].date.slice(5)}
            </span>
          </div>
        </DashboardSection>
      </section>

      {/* =====================================================
          AI RECOMMENDATIONS + ALERTS
      ===================================================== */}

      <section className="mt-5 grid gap-4 xl:grid-cols-2">
        {/* AI RECOMMENDATIONS */}

        <DashboardSection
          title="AI Recommendations"
          subtitle="Recommendations generated by Layer 8."
          icon="✦"
          iconTone="purple"
          action={
            <a
              href="/dashboard/inventory"
              className="text-xs font-semibold text-[#168968] hover:underline"
            >
              View all →
            </a>
          }
        >
          <div className="space-y-2">
            {activeRecommendations.length ===
            0 ? (
              <EmptyState text="No active recommendations." />
            ) : (
              activeRecommendations.map(
                (recommendation) => (
                  <RecommendationRow
                    key={recommendation.id}
                    productName={
                      recommendation.product
                        .name
                    }
                    reason={
                      recommendation.reason ||
                      "Inventory recommendation"
                    }
                    stock={number(
                      recommendation.currentStock
                    )}
                    buy={number(
                      recommendation.recommendedQuantity
                    )}
                    target={number(
                      recommendation.targetStock
                    )}
                    decision={
                      recommendation.decision
                    }
                  />
                )
              )
            )}
          </div>
        </DashboardSection>

        {/* ACTIVE ALERTS */}

        <DashboardSection
          title="Active Alerts"
          subtitle="Current inventory alerts from Layer 8."
          icon="♧"
          iconTone="red"
          action={
            <a
              href="/dashboard/alerts"
              className="text-xs font-semibold text-[#168968] hover:underline"
            >
              View all →
            </a>
          }
        >
          {activeAlerts.length === 0 ? (
            <div className="flex min-h-[260px] flex-col items-center justify-center rounded-xl border border-[#e1ece8] bg-gradient-to-b from-[#fbfefd] to-[#f4faf7] text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#e8f7f0] text-3xl">
                🔔
              </div>

              <p className="mt-4 text-sm font-semibold text-[#284d42]">
                No active inventory alerts.
              </p>

              <p className="mt-1 max-w-xs text-xs text-[#8a9d96]">
                You're all caught up! We'll
                notify you when attention is
                needed.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {activeAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="rounded-xl border border-[#e6ebe9] bg-white p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-bold text-[#19372f]">
                        {alert.product.name}
                      </p>

                      <p className="mt-1 text-xs text-[#72877f]">
                        {alert.message}
                      </p>

                      <p className="mt-2 text-xs text-[#607a70]">
                        Stock:{" "}
                        {number(
                          alert.currentStock
                        )}{" "}
                        / Minimum:{" "}
                        {number(
                          alert.minimumStock
                        )}
                      </p>
                    </div>

                    <span className="rounded-md bg-red-50 px-3 py-1 text-[10px] font-bold uppercase text-red-600">
                      {alert.severity}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DashboardSection>
      </section>

      {/* =====================================================
          RECENT TRANSACTIONS + QUICK ACTIONS
      ===================================================== */}

      <section className="mt-5 grid gap-4 xl:grid-cols-2">
        {/* RECENT TRANSACTIONS */}

        <DashboardSection
          title="Recent Inventory Transactions"
          subtitle="Latest inventory transactions."
          icon="◷"
          iconTone="green"
          action={
            <a
              href="/dashboard/inventory"
              className="text-xs font-semibold text-[#168968] hover:underline"
            >
              View all →
            </a>
          }
        >
          {recentTransactions.length ===
          0 ? (
            <EmptyState text="No inventory activity yet." />
          ) : (
            <div className="overflow-hidden rounded-xl border border-[#e0e9e5]">
              <div className="grid grid-cols-[1.6fr_0.7fr_0.7fr_0.9fr] bg-[#f8fbfa] px-3 py-2 text-[10px] font-semibold text-[#789087]">
                <span>Product</span>
                <span>Type</span>
                <span>Quantity</span>
                <span>Date</span>
              </div>

              {recentTransactions
                .slice(0, 5)
                .map((transaction) => (
                  <div
                    key={transaction.id}
                    className="grid grid-cols-[1.6fr_0.7fr_0.7fr_0.9fr] items-center border-t border-[#edf1ef] px-3 py-2.5 text-[11px]"
                  >
                    <span className="truncate font-semibold text-[#294a40]">
                      {transaction.product.name}
                    </span>

                    <span
                      className={`font-semibold ${
                        transaction.type ===
                        "SALE"
                          ? "text-[#168968]"
                          : "text-[#4776bd]"
                      }`}
                    >
                      {transaction.type}
                    </span>

                    <span className="text-[#4e675e]">
                      {formatNumber(
                        number(
                          transaction.quantity
                        )
                      )}
                    </span>

                    <span className="text-[#84958f]">
                      {formatDate(
                        transaction.createdAt
                      )}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </DashboardSection>

        {/* QUICK ACTIONS */}

        <DashboardSection
          title="Quick Actions"
          subtitle="Manage your store quickly from here."
          icon="ϟ"
          iconTone="yellow"
        >
          <div className="grid grid-cols-2 gap-2.5">
            <QuickAction
              href="/dashboard/products/new"
              icon="+"
              title="Add Product"
              subtitle="Add new inventory item"
              className="bg-[#18a36f]"
            />

            <QuickAction
              href="/dashboard/sales/new"
              icon="+"
              title="Record Sale"
              subtitle="Log a new sale"
              className="bg-[#287ce0]"
            />

            <QuickAction
              href="/dashboard/purchases/new"
              icon="+"
              title="Record Purchase"
              subtitle="Log a new purchase"
              className="bg-[#6746d8]"
            />

            <QuickAction
              href="/dashboard/reports"
              icon="▤"
              title="View Reports"
              subtitle="Generate insights"
              className="bg-[#ef762e]"
            />
          </div>

          <div className="mt-3 flex items-center gap-4 overflow-hidden rounded-xl bg-gradient-to-r from-[#eaf8f2] to-[#f3fbf8] p-4">
            <div className="text-4xl">
              🏪
            </div>

            <div>
              <p className="text-sm font-bold text-[#20483b]">
                Small steps. Big growth.
              </p>

              <p className="mt-1 text-xs text-[#789088]">
                Keep your inventory updated and
                your business running smoothly.
              </p>
            </div>
          </div>
        </DashboardSection>
      </section>
    </AppShell>
  );
}

/*
 * =========================================================
 * KPI CARD
 * =========================================================
 */

function KpiCard({
  title,
  value,
  icon,
  tone,
  change,
  direction,
}: {
  title: string;
  value: string;
  icon: string;
  tone:
    | "green"
    | "blue"
    | "yellow"
    | "red"
    | "purple"
    | "cyan";
  change: string;
  direction: "up" | "down" | "none";
}) {
  const tones = {
    green: {
      card: "border-[#d7efe4] bg-[#f2fbf7]",
      icon: "bg-[#d8f6e8] text-[#129665]",
    },
    blue: {
      card: "border-[#d8e8fb] bg-[#f2f8ff]",
      icon: "bg-[#dcecff] text-[#287ce0]",
    },
    yellow: {
      card: "border-[#f6e5ba] bg-[#fffaf0]",
      icon: "bg-[#ffedb9] text-[#d79400]",
    },
    red: {
      card: "border-[#f5d5db] bg-[#fff5f6]",
      icon: "bg-[#ffdce1] text-[#e82d49]",
    },
    purple: {
      card: "border-[#e4dbfb] bg-[#faf7ff]",
      icon: "bg-[#e9ddff] text-[#6b46d8]",
    },
    cyan: {
      card: "border-[#d5e9f5] bg-[#f3faff]",
      icon: "bg-[#d9edff] text-[#277fe1]",
    },
  };

  const selected = tones[tone];

  return (
    <div
      className={`rounded-xl border p-4 transition hover:-translate-y-0.5 hover:shadow-md ${selected.card}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg font-bold ${selected.icon}`}
        >
          {icon}
        </div>
      </div>

      <p className="mt-3 text-xs font-medium text-[#607a71]">
        {title}
      </p>

      <p className="mt-1 text-2xl font-bold text-[#102d25]">
        {value}
      </p>

      <p className="mt-2 text-[9px] font-medium text-[#7d918a]">
        {direction === "up" && (
          <span className="mr-1 font-bold text-[#15966a]">
            ↗
          </span>
        )}

        {direction === "down" && (
          <span className="mr-1 font-bold text-[#e83d55]">
            ↘
          </span>
        )}

        {change}
      </p>
    </div>
  );
}

/*
 * =========================================================
 * SECTION
 * =========================================================
 */

function DashboardSection({
  title,
  subtitle,
  icon,
  iconTone,
  action,
  children,
}: {
  title: string;
  subtitle: string;
  icon: string;
  iconTone:
    | "green"
    | "blue"
    | "purple"
    | "red"
    | "yellow";
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const iconClasses = {
    green:
      "bg-[#dff6eb] text-[#15966a]",
    blue:
      "bg-[#e0efff] text-[#287ce0]",
    purple:
      "bg-[#eee4ff] text-[#6b46d8]",
    red:
      "bg-[#ffe1e5] text-[#e8344f]",
    yellow:
      "bg-[#fff0c7] text-[#d89100]",
  };

  return (
    <div className="rounded-2xl border border-[#dfe9e5] bg-white p-4 shadow-[0_2px_10px_rgba(20,50,40,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-bold ${iconClasses[iconTone]}`}
          >
            {icon}
          </div>

          <div>
            <h2 className="text-sm font-bold text-[#132f27]">
              {title}
            </h2>

            <p className="mt-1 text-[10px] text-[#7c9189]">
              {subtitle}
            </p>
          </div>
        </div>

        {action}
      </div>

      <div className="mt-4">
        {children}
      </div>
    </div>
  );
}

/*
 * =========================================================
 * LEGEND
 * =========================================================
 */

function Legend({
  label,
  className,
}: {
  label: string;
  className: string;
}) {
  return (
    <span className="flex items-center gap-2 text-[#526d63]">
      <span
        className={`h-2.5 w-2.5 rounded-full ${className}`}
      />

      {label}
    </span>
  );
}

/*
 * =========================================================
 * MINI METRIC
 * =========================================================
 */

function MiniMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "green" | "blue" | "purple";
}) {
  const tones = {
    green:
      "border-[#d9eee5] bg-[#f8fcfa]",
    blue:
      "border-[#dbe9f8] bg-[#f8fbff]",
    purple:
      "border-[#e6def8] bg-[#fbf9ff]",
  };

  return (
    <div
      className={`rounded-lg border p-3 ${tones[tone]}`}
    >
      <p className="truncate text-[9px] text-[#7b9088]">
        {label}
      </p>

      <p className="mt-1 text-sm font-bold text-[#16362c]">
        {value}
      </p>

      <p className="mt-2 text-[8px] text-[#15966a]">
        ↗ +0%
      </p>
    </div>
  );
}

/*
 * =========================================================
 * RECOMMENDATION ROW
 * =========================================================
 */

function RecommendationRow({
  productName,
  reason,
  stock,
  buy,
  target,
  decision,
}: {
  productName: string;
  reason: string;
  stock: number;
  buy: number;
  target: number;
  decision: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[#e1e9e6] bg-white p-2.5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#fff3dd] text-lg">
        📦
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-bold text-[#19372e]">
          {productName}
        </p>

        <p className="mt-0.5 truncate text-[10px] text-[#71867e]">
          {reason}
        </p>

        <div className="mt-1.5 flex flex-wrap gap-3 text-[9px] text-[#61786f]">
          <span>Stock: {stock}</span>
          <span>Buy: {buy}</span>
          <span>Target: {target}</span>
        </div>
      </div>

      <span className="shrink-0 rounded-md bg-[#ffe1e4] px-3 py-1.5 text-[9px] font-bold text-[#e43d54]">
        {decision || "BUY"}
      </span>
    </div>
  );
}

/*
 * =========================================================
 * QUICK ACTION
 * =========================================================
 */

function QuickAction({
  href,
  icon,
  title,
  subtitle,
  className,
}: {
  href: string;
  icon: string;
  title: string;
  subtitle: string;
  className: string;
}) {
  return (
    <a
      href={href}
      className={`rounded-xl p-3 text-white transition hover:-translate-y-0.5 hover:shadow-lg ${className}`}
    >
      <div className="flex items-center gap-2">
        <span className="text-xl font-light">
          {icon}
        </span>

        <div>
          <p className="text-xs font-bold">
            {title}
          </p>

          <p className="mt-0.5 text-[9px] opacity-80">
            {subtitle}
          </p>
        </div>
      </div>
    </a>
  );
}

/*
 * =========================================================
 * EMPTY STATE
 * =========================================================
 */

function EmptyState({
  text,
}: {
  text: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-[#d8e4df] bg-[#fbfdfc] p-8 text-center text-xs text-[#80948c]">
      {text}
    </div>
  );
}