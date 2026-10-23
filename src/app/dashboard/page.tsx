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

function formatCurrency(value: number) {
  return `₹${new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(value)}`;
}

function formatDate(date: Date) {
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatShortDate(date: Date) {
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
}

function formatTimeAgo(date: Date) {
  const diff = Math.max(0, Date.now() - date.getTime());
  const minutes = Math.max(1, Math.floor(diff / 60000));

  if (minutes < 60) {
    return `${minutes} min ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours} hr${hours === 1 ? "" : "s"} ago`;
  }

  const days = Math.floor(hours / 24);

  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function getRecommendationCategory(
  decision: string,
  reason: string
) {
  const text = `${decision} ${reason}`.toLowerCase();

  if (
    text.includes("slow") ||
    text.includes("moving")
  ) {
    return "Slow Moving";
  }

  if (
    text.includes("overstock") ||
    text.includes("over stock")
  ) {
    return "Overstock";
  }

  if (text.includes("price")) {
    return "Price";
  }

  return "Restock";
}

function getAlertCategory(
  message: string,
  severity: string,
  currentStock: number,
  minimumStock: number
) {
  const text = `${message} ${severity}`.toLowerCase();

  if (
    text.includes("expir") ||
    text.includes("expiry")
  ) {
    return "Expiry";
  }

  if (text.includes("price")) {
    return "Price Change";
  }

  if (currentStock <= 0) {
    return "Out of Stock";
  }

  if (currentStock <= minimumStock) {
    return "Low Stock";
  }

  return "Inventory";
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
  thirtyDaysAgo.setHours(0, 0, 0, 0);
  thirtyDaysAgo.setDate(
    thirtyDaysAgo.getDate() - 29
  );

  const [
    products,
    activeRecommendations,
    activeAlerts,
    salesTransactions,
    purchaseTransactions,
    recentTransactions,
  ] = await Promise.all([
    prisma.product.findMany({
      where: {
        storeId,
      },
      select: {
        id: true,
        name: true,
        currentStock: true,
        minimumStock: true,
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
    type: "PURCHASE",
    createdAt: {
      gte: thirtyDaysAgo,
    },
  },
  select: {
  id: true,
  quantity: true,
  createdAt: true,
  sellingPrice: true,
},
  orderBy: {
    createdAt: "asc",
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
        id: true,
        quantity: true,
        
        createdAt: true,
      },
      orderBy: {
        createdAt: "asc",
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
      take: 5,
    }),
  ]);

  /* =========================================================
     INVENTORY CALCULATIONS
     ========================================================= */

  const productCount = products.length;

  const currentStock = products.reduce(
    (sum, product) =>
      sum + number(product.currentStock),
    0
  );

  const outOfStockCount = products.filter(
    (product) =>
      number(product.currentStock) <= 0
  ).length;

  const lowStockCount = products.filter(
    (product) => {
      const stock = number(
        product.currentStock
      );

      const minimum = number(
        product.minimumStock
      );

      return stock > 0 && stock <= minimum;
    }
  ).length;

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

  /* =========================================================
     30 DAY OPERATIONS
     ========================================================= */

  const salesQuantity =
    salesTransactions.reduce(
      (sum, transaction) =>
        sum + number(transaction.quantity),
      0
    );

  const salesValue =
    salesTransactions.reduce(
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

  const transactionCount =
    salesTransactions.length +
    purchaseTransactions.length;

  /* =========================================================
     DAILY TREND DATA
     ========================================================= */

  const salesByDay = new Map<string, number>();
  const purchasesByDay = new Map<
    string,
    number
  >();

  for (const transaction of salesTransactions) {
    const key = transaction.createdAt
      .toISOString()
      .slice(0, 10);

    salesByDay.set(
      key,
      (salesByDay.get(key) ?? 0) +
        number(transaction.quantity)
    );
  }

  for (const transaction of purchaseTransactions) {
    const key = transaction.createdAt
      .toISOString()
      .slice(0, 10);

    purchasesByDay.set(
      key,
      (purchasesByDay.get(key) ?? 0) +
        number(transaction.quantity)
    );
  }

  const trendDays = Array.from(
    { length: 30 },
    (_, index) => {
      const date = new Date(
        thirtyDaysAgo
      );

      date.setDate(
        date.getDate() + index
      );

      const key = date
        .toISOString()
        .slice(0, 10);

      return {
        date: key,
        label: formatShortDate(date),
        sales: salesByDay.get(key) ?? 0,
        purchases:
          purchasesByDay.get(key) ?? 0,
      };
    }
  );

  const trendMaximum = Math.max(
    10,
    ...trendDays.flatMap((day) => [
      day.sales,
      day.purchases,
    ])
  );

  /* =========================================================
     CATEGORY COUNTS
     ========================================================= */

  const recommendationCategories = {
    all: activeRecommendations.length,

    restock: activeRecommendations.filter(
      (item) =>
        getRecommendationCategory(
          item.decision,
          item.reason || ""
        ) === "Restock"
    ).length,

    slowMoving:
      activeRecommendations.filter(
        (item) =>
          getRecommendationCategory(
            item.decision,
            item.reason || ""
          ) === "Slow Moving"
      ).length,

    overstock:
      activeRecommendations.filter(
        (item) =>
          getRecommendationCategory(
            item.decision,
            item.reason || ""
          ) === "Overstock"
      ).length,

    price: activeRecommendations.filter(
      (item) =>
        getRecommendationCategory(
          item.decision,
          item.reason || ""
        ) === "Price"
    ).length,
  };

  const alertCategories = {
    all: activeAlerts.length,

    outOfStock:
      activeAlerts.filter(
        (item) =>
          number(item.currentStock) <= 0
      ).length,

    lowStock: activeAlerts.filter(
      (item) => {
        const current = number(
          item.currentStock
        );

        const minimum = number(
          item.minimumStock
        );

        return (
          current > 0 &&
          current <= minimum
        );
      }
    ).length,

    expiry: activeAlerts.filter(
      (item) =>
        getAlertCategory(
          item.message,
          item.severity,
          number(item.currentStock),
          number(item.minimumStock)
        ) === "Expiry"
    ).length,

    price: activeAlerts.filter(
      (item) =>
        getAlertCategory(
          item.message,
          item.severity,
          number(item.currentStock),
          number(item.minimumStock)
        ) === "Price Change"
    ).length,
  };

  /* =========================================================
     GREETING
     ========================================================= */

  const now = new Date();

  const hour = now.getHours();

  const greeting =
    hour < 12
      ? "Good Morning"
      : hour < 17
      ? "Good Afternoon"
      : "Good Evening";

  return (
    <AppShell
      storeName={user.store.name}
      userName={user.name || "User"}
      userEmail={user.email || ""}
    >
      {/* =====================================================
          WELCOME HEADER
          ===================================================== */}

      <section className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[25px] font-bold tracking-tight text-[#102d25]">
            {greeting}, {user.name || "there"}! 👋
          </h1>

          <p className="mt-1 text-sm text-[#70877f]">
            Here's what's happening with your
            store today.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-[#dce9e5] bg-white px-4 py-2.5 shadow-sm">
            <p className="text-[10px] font-medium text-[#83968f]">
              Today
            </p>

            <p className="mt-0.5 text-xs font-bold text-[#203d34]">
              {now.toLocaleDateString(
                "en-IN",
                {
                  weekday: "long",
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                }
              )}
            </p>
          </div>
        </div>
      </section>

      {/* =====================================================
          KPI CARDS
          ===================================================== */}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          title="Total Products"
          value={formatNumber(productCount)}
          icon="▣"
          tone="green"
          change="+0%"
          label="vs last month"
          direction="up"
        />

        <KpiCard
          title="Current Stock"
          value={formatNumber(currentStock)}
          icon="◈"
          tone="blue"
          change="+0%"
          label="vs last month"
          direction="up"
        />

        <KpiCard
          title="Low Stock"
          value={formatNumber(lowStockCount)}
          icon="!"
          tone="yellow"
          change="+0%"
          label="vs last month"
          direction="up"
        />

        <KpiCard
          title="Out of Stock"
          value={formatNumber(outOfStockCount)}
          icon="×"
          tone="red"
          change="+0%"
          label="vs last month"
          direction="up"
        />

        <KpiCard
          title="AI Recommendations"
          value={formatNumber(
            activeRecommendations.length
          )}
          icon="✦"
          tone="purple"
          change="+0%"
          label="vs last month"
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
          label=""
          direction="none"
        />
      </section>

      {/* =====================================================
          HEALTH / OPERATIONS / TREND
          ===================================================== */}

      <section className="mt-4 grid gap-4 xl:grid-cols-[1.15fr_0.9fr_1.15fr]">
        {/* INVENTORY HEALTH */}

        <DashboardSection
          title="Inventory Health"
          subtitle="Current stock condition across your products."
          icon="♥"
          iconTone="green"
          action={
            <span
              className={`rounded-lg px-3 py-1.5 text-[10px] font-bold ${
                inventoryHealth >= 80
                  ? "bg-[#e4f8ee] text-[#129664]"
                  : inventoryHealth >= 50
                  ? "bg-[#fff3cf] text-[#b87b00]"
                  : "bg-[#ffe5e8] text-[#df3650]"
              }`}
            >
              {inventoryHealth >= 80
                ? "● Good"
                : inventoryHealth >= 50
                ? "● Monitor"
                : "● Needs Attention"}
            </span>
          }
        >
          <div className="flex items-center gap-5">
            <InventoryDonut
              healthy={healthyCount}
              low={lowStockCount}
              out={outOfStockCount}
              total={productCount}
            />

            <div className="min-w-0 flex-1 space-y-4">
              <InventoryLegend
                color="bg-[#20a875]"
                label="Healthy Stock"
                count={healthyCount}
                percentage={getPercentage(
                  healthyCount,
                  productCount
                )}
              />

              <InventoryLegend
                color="bg-[#f7b51c]"
                label="Low Stock"
                count={lowStockCount}
                percentage={getPercentage(
                  lowStockCount,
                  productCount
                )}
              />

              <InventoryLegend
                color="bg-[#ef4760]"
                label="Out of Stock"
                count={outOfStockCount}
                percentage={getPercentage(
                  outOfStockCount,
                  productCount
                )}
              />
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between rounded-xl border border-[#dcefea] bg-[#f0faf6] px-3 py-2.5">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#d9f2e7] text-sm">
                💡
              </span>

              <p className="text-[10px] font-medium text-[#317160]">
                {outOfStockCount > 0
                  ? `${outOfStockCount} products are out of stock. Restock soon to avoid lost sales.`
                  : lowStockCount > 0
                  ? `${lowStockCount} products need attention. Consider restocking soon.`
                  : "Your inventory is in good condition."}
              </p>
            </div>

            <a
              href="/dashboard/inventory"
              className="hidden text-[10px] font-bold text-[#128c67] sm:block"
            >
              View Details →
            </a>
          </div>
        </DashboardSection>

        {/* 30 DAY OPERATIONS */}

        <DashboardSection
          title="30-Day Operations"
          subtitle="Key metrics from the last 30 days."
          icon="▥"
          iconTone="blue"
          action={
            <a
              href="/dashboard/reports"
              className="text-[10px] font-bold text-[#138d69]"
            >
              View Details →
            </a>
          }
        >
          <div className="grid grid-cols-2 gap-2.5">
            <OperationMetric
              label="Units Sold"
              value={formatNumber(
                salesQuantity
              )}
              change="+0%"
              tone="green"
              icon="🛒"
            />

            <OperationMetric
              label="Sales Value"
              value={formatCurrency(
                salesValue
              )}
              change="+0%"
              tone="blue"
              icon="₹"
            />

            <OperationMetric
              label="Units Purchased"
              value={formatNumber(
                purchaseQuantity
              )}
              change="+0%"
              tone="purple"
              icon="📦"
            />

            <OperationMetric
              label="Transactions"
              value={formatNumber(
                transactionCount
              )}
              change="+0%"
              tone="yellow"
              icon="▤"
            />
          </div>
        </DashboardSection>

        {/* TREND */}

        <DashboardSection
          title="30-Day Operations Trend"
          subtitle="Daily sales and purchase quantities."
          icon="⌁"
          iconTone="blue"
          action={
            <span className="rounded-lg border border-[#dce7e4] bg-white px-3 py-1.5 text-[9px] font-semibold text-[#566f66]">
              Last 30 Days⌄
            </span>
          }
        >
          <div className="flex items-center justify-end gap-4 text-[10px]">
            <span className="flex items-center gap-1.5 text-[#526d64]">
              <span className="h-2 w-2 rounded-full bg-[#20a875]" />
              Sales (Units)
            </span>

            <span className="flex items-center gap-1.5 text-[#526d64]">
              <span className="h-2 w-2 rounded-full bg-[#287ce0]" />
              Purchases (Units)
            </span>
          </div>

          <RealisticTrendChart
            days={trendDays}
            maximum={trendMaximum}
          />

          <div className="flex justify-between px-1 text-[9px] text-[#899b94]">
            <span>
              {trendDays[0]?.label}
            </span>

            <span>
              {trendDays[
                trendDays.length - 1
              ]?.label}
            </span>
          </div>
        </DashboardSection>
      </section>

      {/* =====================================================
          AI + ALERTS
          ===================================================== */}

      <section className="mt-4 grid gap-4 xl:grid-cols-2">
        {/* AI RECOMMENDATIONS */}

        <DashboardSection
          title="AI Recommendations"
          subtitle="Smart suggestions to optimize your inventory and reduce losses."
          icon="✦"
          iconTone="purple"
          action={
            <a
              href="/dashboard/inventory"
              className="text-[10px] font-bold text-[#138d69]"
            >
              View all →
            </a>
          }
        >
          <div className="flex overflow-x-auto border-b border-[#edf1ef]">
            <RecommendationTab
              label="All"
              count={
                recommendationCategories.all
              }
              active
            />

            <RecommendationTab
              label="Restock"
              count={
                recommendationCategories.restock
              }
            />

            <RecommendationTab
              label="Slow Moving"
              count={
                recommendationCategories.slowMoving
              }
            />

            <RecommendationTab
              label="Overstock"
              count={
                recommendationCategories.overstock
              }
            />

            <RecommendationTab
              label="Price"
              count={
                recommendationCategories.price
              }
            />
          </div>

          <div className="mt-2 space-y-2">
            {activeRecommendations.length ===
            0 ? (
              <EmptyState text="No active AI recommendations." />
            ) : (
              activeRecommendations.map(
                (recommendation) => (
                  <AdvancedRecommendationRow
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
          subtitle="Important inventory alerts that need your attention."
          icon="♧"
          iconTone="red"
          action={
            <a
              href="/dashboard/alerts"
              className="text-[10px] font-bold text-[#138d69]"
            >
              View all →
            </a>
          }
        >
          <div className="flex gap-2 overflow-x-auto border-b border-[#edf1ef] pb-2">
            <AlertTab
              label="All"
              count={alertCategories.all}
              active
            />

            <AlertTab
              label="Out of Stock"
              count={
                alertCategories.outOfStock
              }
            />

            <AlertTab
              label="Low Stock"
              count={
                alertCategories.lowStock
              }
            />

            <AlertTab
              label="Expiry"
              count={
                alertCategories.expiry
              }
            />

            <AlertTab
              label="Price Change"
              count={
                alertCategories.price
              }
            />
          </div>

          <div className="mt-2 space-y-2">
            {activeAlerts.length === 0 ? (
              <div className="flex min-h-[255px] flex-col items-center justify-center rounded-xl border border-[#e0ebe7] bg-gradient-to-b from-[#fbfefd] to-[#f4faf7] text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#e7f7f0] text-3xl">
                  🔔
                </div>

                <p className="mt-4 text-sm font-bold text-[#203e35]">
                  No active inventory alerts.
                </p>

                <p className="mt-1 max-w-sm text-xs text-[#8a9c95]">
                  You're all caught up! We'll
                  notify you when attention is
                  needed.
                </p>
              </div>
            ) : (
              activeAlerts.map((alert) => (
                <AdvancedAlertRow
                  key={alert.id}
                  productName={
                    alert.product.name
                  }
                  message={alert.message}
                  severity={alert.severity}
                  currentStock={number(
                    alert.currentStock
                  )}
                  minimumStock={number(
                    alert.minimumStock
                  )}
                  createdAt={
                    alert.createdAt
                  }
                />
              ))
            )}
          </div>
        </DashboardSection>
      </section>

      {/* =====================================================
          TRANSACTIONS + QUICK ACTIONS
          ===================================================== */}

      <section className="mt-4 grid gap-4 xl:grid-cols-2">
        {/* RECENT TRANSACTIONS */}

        <DashboardSection
          title="Recent Inventory Transactions"
          subtitle="Latest stock movements in your store."
          icon="◷"
          iconTone="green"
          action={
            <a
              href="/dashboard/inventory"
              className="text-[10px] font-bold text-[#138d69]"
            >
              View all →
            </a>
          }
        >
          {recentTransactions.length ===
          0 ? (
            <EmptyState text="No inventory activity yet." />
          ) : (
            <div className="overflow-hidden rounded-xl border border-[#dfe9e5]">
              <div className="grid grid-cols-[2fr_0.8fr_0.65fr_1fr_1fr] gap-2 bg-[#f7faf9] px-3 py-2.5 text-[9px] font-bold uppercase tracking-wide text-[#71877f]">
                <span>Product</span>
                <span>Type</span>
                <span>Qty</span>
                <span>Date</span>
                <span>Status</span>
              </div>

              {recentTransactions.map(
                (transaction) => {
                  const isSale =
                    transaction.type ===
                    "SALE";

                  return (
                    <div
                      key={transaction.id}
                      className="grid grid-cols-[2fr_0.8fr_0.65fr_1fr_1fr] items-center gap-2 border-t border-[#edf1ef] px-3 py-3 transition hover:bg-[#fbfdfc]"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[10px] font-bold text-[#203d34]">
                          {
                            transaction.product
                              .name
                          }
                        </p>

                        <p className="mt-0.5 text-[8px] text-[#91a29c]">
                          {formatTimeAgo(
                            transaction.createdAt
                          )}
                        </p>
                      </div>

                      <span
                        className={`w-fit rounded-md px-2 py-1 text-[8px] font-bold ${
                          isSale
                            ? "bg-[#dff6eb] text-[#15966a]"
                            : "bg-[#e4efff] text-[#287ce0]"
                        }`}
                      >
                        {transaction.type}
                      </span>

                      <span className="text-[10px] font-semibold text-[#4f6960]">
                        {formatNumber(
                          number(
                            transaction.quantity
                          )
                        )}
                      </span>

                      <span className="text-[9px] text-[#71877f]">
                        {formatDate(
                          transaction.createdAt
                        )}
                      </span>

                      <span className="w-fit rounded-md bg-[#e4f7ee] px-2 py-1 text-[8px] font-bold text-[#15966a]">
                        Completed
                      </span>
                    </div>
                  );
                }
              )}
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

          {/* KEEP AS IT IS */}

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

/* ============================================================
   INVENTORY DONUT
   ============================================================ */

function InventoryDonut({
  healthy,
  low,
  out,
  total,
}: {
  healthy: number;
  low: number;
  out: number;
  total: number;
}) {
  const radius = 55;
  const circumference =
    2 * Math.PI * radius;

  const healthyLength =
    total > 0
      ? (healthy / total) * circumference
      : 0;

  const lowLength =
    total > 0
      ? (low / total) * circumference
      : 0;

  const outLength =
    total > 0
      ? (out / total) * circumference
      : 0;

  const healthyOffset = 0;

  const lowOffset =
    -healthyLength;

  const outOffset =
    -(healthyLength + lowLength);

  return (
    <div className="relative h-[150px] w-[150px] shrink-0">
      <svg
        viewBox="0 0 150 150"
        className="h-full w-full -rotate-90"
      >
        <circle
          cx="75"
          cy="75"
          r={radius}
          fill="none"
          stroke="#edf2f0"
          strokeWidth="19"
        />

        {total > 0 && (
          <>
            <circle
              cx="75"
              cy="75"
              r={radius}
              fill="none"
              stroke="#20a875"
              strokeWidth="19"
              strokeDasharray={`${healthyLength} ${circumference}`}
              strokeDashoffset={
                healthyOffset
              }
              strokeLinecap="butt"
            />

            <circle
              cx="75"
              cy="75"
              r={radius}
              fill="none"
              stroke="#f7b51c"
              strokeWidth="19"
              strokeDasharray={`${lowLength} ${circumference}`}
              strokeDashoffset={
                lowOffset
              }
              strokeLinecap="butt"
            />

            <circle
              cx="75"
              cy="75"
              r={radius}
              fill="none"
              stroke="#ef4760"
              strokeWidth="19"
              strokeDasharray={`${outLength} ${circumference}`}
              strokeDashoffset={
                outOffset
              }
              strokeLinecap="butt"
            />
          </>
        )}
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <p className="text-[22px] font-bold text-[#102d25]">
          {total}
        </p>

        <p className="text-[9px] leading-3 text-[#70867e]">
          Total
          <br />
          Products
        </p>
      </div>
    </div>
  );
}

/* ============================================================
   INVENTORY LEGEND
   ============================================================ */

function InventoryLegend({
  color,
  label,
  count,
  percentage,
}: {
  color: string;
  label: string;
  count: number;
  percentage: number;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className={`h-3 w-3 rounded-full ${color}`}
      />

      <span className="flex-1 text-[11px] font-medium text-[#526b62]">
        {label}
      </span>

      <span className="w-7 text-right text-[11px] font-bold text-[#243e35]">
        {count}
      </span>

      <span
        className={`w-9 text-right text-[11px] font-bold ${
          color.includes("20a875")
            ? "text-[#14966a]"
            : color.includes("f7b51c")
            ? "text-[#d99800]"
            : "text-[#e63d54]"
        }`}
      >
        {percentage}%
      </span>
    </div>
  );
}

/* ============================================================
   REALISTIC TREND CHART
   ============================================================ */

function RealisticTrendChart({
  days,
  maximum,
}: {
  days: {
    date: string;
    label: string;
    sales: number;
    purchases: number;
  }[];
  maximum: number;
}) {
  const width = 650;
  const height = 220;

  const left = 38;
  const right = 12;
  const top = 12;
  const bottom = 28;

  const chartWidth =
    width - left - right;

  const chartHeight =
    height - top - bottom;

  const getPoint = (
    value: number,
    index: number
  ) => {
    const x =
      left +
      (index /
        Math.max(1, days.length - 1)) *
        chartWidth;

    const y =
      top +
      chartHeight -
      (value / maximum) * chartHeight;

    return { x, y };
  };

  const salesPoints = days.map(
    (day, index) =>
      getPoint(day.sales, index)
  );

  const purchasePoints = days.map(
    (day, index) =>
      getPoint(day.purchases, index)
  );

  const smoothPath = (
    points: { x: number; y: number }[]
  ) => {
    if (!points.length) return "";

    let path = `M ${points[0].x} ${points[0].y}`;

    for (
      let i = 1;
      i < points.length;
      i++
    ) {
      const previous =
        points[i - 1];

      const current = points[i];

      const controlX =
        (previous.x + current.x) / 2;

      path += ` C ${controlX} ${previous.y}, ${controlX} ${current.y}, ${current.x} ${current.y}`;
    }

    return path;
  };

  const salesPath =
    smoothPath(salesPoints);

  const purchasePath =
    smoothPath(purchasePoints);

  const salesArea =
    `${salesPath} L ${salesPoints.at(-1)?.x ?? left} ${top + chartHeight} L ${left} ${top + chartHeight} Z`;

  const purchaseArea =
    `${purchasePath} L ${purchasePoints.at(-1)?.x ?? left} ${top + chartHeight} L ${left} ${top + chartHeight} Z`;

  const ySteps = 4;

  return (
    <div className="mt-2 overflow-hidden rounded-xl bg-[#f8fbfa]">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-[185px] w-full"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient
            id="salesArea"
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop
              offset="0%"
              stopColor="#20a875"
              stopOpacity="0.18"
            />

            <stop
              offset="100%"
              stopColor="#20a875"
              stopOpacity="0"
            />
          </linearGradient>

          <linearGradient
            id="purchaseArea"
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop
              offset="0%"
              stopColor="#287ce0"
              stopOpacity="0.13"
            />

            <stop
              offset="100%"
              stopColor="#287ce0"
              stopOpacity="0"
            />
          </linearGradient>
        </defs>

        {/* GRID */}

        {Array.from(
          { length: ySteps + 1 },
          (_, index) => {
            const y =
              top +
              (index / ySteps) *
                chartHeight;

            const value = Math.round(
              maximum -
                (index / ySteps) *
                  maximum
            );

            return (
              <g key={`grid-${index}`}>
                <line
                  x1={left}
                  x2={width - right}
                  y1={y}
                  y2={y}
                  stroke="#e5eeeb"
                  strokeWidth="1"
                />

                <text
                  x="4"
                  y={y + 3}
                  fontSize="9"
                  fill="#91a29b"
                >
                  {value}
                </text>
              </g>
            );
          }
        )}

        {/* VERTICAL GUIDES */}

        {[0, 5, 10, 15, 20, 25, 29].map(
          (index) => {
            const point =
              getPoint(
                0,
                index
              );

            return (
              <line
                key={`vertical-${index}`}
                x1={point.x}
                x2={point.x}
                y1={top}
                y2={
                  top + chartHeight
                }
                stroke="#edf3f1"
                strokeWidth="1"
              />
            );
          }
        )}

        {/* AREAS */}

        {salesPoints.length > 0 && (
          <path
            d={salesArea}
            fill="url(#salesArea)"
          />
        )}

        {purchasePoints.length > 0 && (
          <path
            d={purchaseArea}
            fill="url(#purchaseArea)"
          />
        )}

        {/* LINES */}

        <path
          d={salesPath}
          fill="none"
          stroke="#20a875"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <path
          d={purchasePath}
          fill="none"
          stroke="#287ce0"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* POINTS */}

        {salesPoints.map(
          (point, index) => (
            <circle
              key={`sale-point-${index}`}
              cx={point.x}
              cy={point.y}
              r="2.7"
              fill="white"
              stroke="#20a875"
              strokeWidth="2"
            />
          )
        )}

        {purchasePoints.map(
          (point, index) => (
            <circle
              key={`purchase-point-${index}`}
              cx={point.x}
              cy={point.y}
              r="2.7"
              fill="white"
              stroke="#287ce0"
              strokeWidth="2"
            />
          )
        )}
      </svg>
    </div>
  );
}

/* ============================================================
   KPI CARD
   ============================================================ */

function KpiCard({
  title,
  value,
  icon,
  tone,
  change,
  label,
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
  label: string;
  direction:
    | "up"
    | "down"
    | "none";
}) {
  const tones = {
    green: {
      card:
        "border-[#d7eee4] bg-[#f3fbf7]",
      icon:
        "bg-[#ddf6e9] text-[#129866]",
    },

    blue: {
      card:
        "border-[#d7e6f8] bg-[#f3f8ff]",
      icon:
        "bg-[#deedff] text-[#287ce0]",
    },

    yellow: {
      card:
        "border-[#f2e1b7] bg-[#fffbf1]",
      icon:
        "bg-[#ffedbd] text-[#d99500]",
    },

    red: {
      card:
        "border-[#f2d5da] bg-[#fff6f7]",
      icon:
        "bg-[#ffdde2] text-[#e73550]",
    },

    purple: {
      card:
        "border-[#e3dafa] bg-[#faf8ff]",
      icon:
        "bg-[#eadfff] text-[#7047d9]",
    },

    cyan: {
      card:
        "border-[#d6e7f3] bg-[#f3faff]",
      icon:
        "bg-[#dcedff] text-[#287fe0]",
    },
  };

  const selected = tones[tone];

  return (
    <div
      className={`min-h-[142px] rounded-xl border p-3.5 shadow-[0_2px_8px_rgba(20,50,40,0.025)] transition hover:-translate-y-0.5 hover:shadow-md ${selected.card}`}
    >
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg font-bold ${selected.icon}`}
      >
        {icon}
      </div>

      <p className="mt-3 text-[10px] font-medium text-[#627b72]">
        {title}
      </p>

      <p className="mt-1 text-[22px] font-bold tracking-tight text-[#102d25]">
        {value}
      </p>

      <p className="mt-2 text-[8px] font-medium text-[#81948d]">
        {direction === "up" && (
          <span className="mr-1 font-bold text-[#15966a]">
            ↗
          </span>
        )}

        {direction === "down" && (
          <span className="mr-1 font-bold text-[#e63d54]">
            ↘
          </span>
        )}

        {change} {label}
      </p>
    </div>
  );
}

/* ============================================================
   DASHBOARD SECTION
   ============================================================ */

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
    <div className="rounded-2xl border border-[#dfe9e5] bg-white p-4 shadow-[0_2px_10px_rgba(20,50,40,0.035)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-bold ${iconClasses[iconTone]}`}
          >
            {icon}
          </div>

          <div className="min-w-0">
            <h2 className="text-[14px] font-bold text-[#132f27]">
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

/* ============================================================
   OPERATION METRIC
   ============================================================ */

function OperationMetric({
  label,
  value,
  change,
  tone,
  icon,
}: {
  label: string;
  value: string;
  change: string;
  tone:
    | "green"
    | "blue"
    | "purple"
    | "yellow";
  icon: string;
}) {
  const classes = {
    green:
      "border-[#d8eee5] bg-[#f8fcfa] text-[#149669]",
    blue:
      "border-[#dbe9f8] bg-[#f8fbff] text-[#287ce0]",
    purple:
      "border-[#e6def8] bg-[#fbf9ff] text-[#7047d9]",
    yellow:
      "border-[#f3e5bf] bg-[#fffdf6] text-[#cf9000]",
  };

  return (
    <div
      className={`rounded-xl border p-3 ${classes[tone]}`}
    >
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-sm shadow-sm">
          {icon}
        </span>

        <p className="truncate text-[9px] font-medium text-[#71877f]">
          {label}
        </p>
      </div>

      <p className="mt-2 text-[17px] font-bold text-[#152f27]">
        {value}
      </p>

      <p className="mt-1 text-[8px] font-semibold text-[#15966a]">
        ↗ {change}
        <span className="ml-1 font-normal text-[#8b9d96]">
          vs previous 30 days
        </span>
      </p>
    </div>
  );
}

/* ============================================================
   RECOMMENDATION TAB
   ============================================================ */

function RecommendationTab({
  label,
  count,
  active = false,
}: {
  label: string;
  count: number;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      className={`shrink-0 border-b-2 px-3 py-2 text-[10px] font-semibold ${
        active
          ? "border-[#7047e8] text-[#7047e8]"
          : "border-transparent text-[#70857c]"
      }`}
    >
      {label} ({count})
    </button>
  );
}

/* ============================================================
   ALERT TAB
   ============================================================ */

function AlertTab({
  label,
  count,
  active = false,
}: {
  label: string;
  count: number;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      className={`shrink-0 rounded-full border px-3 py-1.5 text-[9px] font-semibold ${
        active
          ? "border-[#ffd5da] bg-[#ffe6e9] text-[#e73b51]"
          : "border-[#e4ebe8] bg-white text-[#70857c]"
      }`}
    >
      {label} ({count})
    </button>
  );
}

/* ============================================================
   ADVANCED RECOMMENDATION
   ============================================================ */

function AdvancedRecommendationRow({
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
  const category =
    getRecommendationCategory(
      decision,
      reason
    );

  const isOutOfStock =
    stock <= 0;

  const categoryStyle =
    category === "Slow Moving"
      ? "bg-[#edf2f5] text-[#536777]"
      : category === "Overstock"
      ? "bg-[#fff0df] text-[#d47719]"
      : category === "Price"
      ? "bg-[#eaf0ff] text-[#3869c8]"
      : isOutOfStock
      ? "bg-[#ffe2e5] text-[#e63d54]"
      : "bg-[#fff0cc] text-[#c88a08]";

  const icon =
    category === "Slow Moving"
      ? "◷"
      : category === "Overstock"
      ? "↘"
      : category === "Price"
      ? "₹"
      : isOutOfStock
      ? "!"
      : "↗";

  const badge =
    category === "Restock"
      ? isOutOfStock
        ? "Out of Stock"
        : "Low Stock"
      : category;

  const action =
    isOutOfStock
      ? "Restock"
      : category === "Slow Moving"
      ? "Review"
      : category === "Overstock"
      ? "Reduce Stock"
      : category === "Price"
      ? "Review"
      : "Buy Now";

  return (
    <div className="group rounded-xl border border-[#e2eae7] bg-white p-3 transition hover:border-[#d4e4de] hover:shadow-sm">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-lg font-bold ${
            isOutOfStock
              ? "bg-[#fff0d9] text-[#c27b12]"
              : category === "Slow Moving"
              ? "bg-[#edf5fb] text-[#4380b8]"
              : category === "Overstock"
              ? "bg-[#fff1e4] text-[#d47719]"
              : "bg-[#edf8f3] text-[#1b9a6d]"
          }`}
        >
          {icon}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-[11px] font-bold text-[#19372e]">
              {productName}
            </p>

            <span
              className={`rounded-full px-2 py-0.5 text-[8px] font-bold ${categoryStyle}`}
            >
              {badge}
            </span>
          </div>

          <p className="mt-1 truncate text-[9px] text-[#71867e]">
            {reason}
          </p>

          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[8px] text-[#61786f]">
            <span>
              Stock:{" "}
              <b className="text-[#263f36]">
                {stock}
              </b>
            </span>

            <span>
              Buy:{" "}
              <b className="text-[#263f36]">
                {buy}
              </b>
            </span>

            <span>
              Target:{" "}
              <b className="text-[#263f36]">
                {target}
              </b>
            </span>
          </div>
        </div>

        <button
          type="button"
          className={`hidden shrink-0 rounded-lg px-4 py-2 text-[9px] font-bold sm:block ${
            isOutOfStock
              ? "bg-[#ffe2e5] text-[#e43d54]"
              : "bg-[#eee7ff] text-[#6746d8]"
          }`}
        >
          {action}
        </button>

        <button
          type="button"
          className="shrink-0 text-lg text-[#82958d] opacity-70 group-hover:opacity-100"
          aria-label="More options"
        >
          ⋮
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   ADVANCED ALERT
   ============================================================ */

function AdvancedAlertRow({
  productName,
  message,
  severity,
  currentStock,
  minimumStock,
  createdAt,
}: {
  productName: string;
  message: string;
  severity: string;
  currentStock: number;
  minimumStock: number;
  createdAt: Date;
}) {
  const category = getAlertCategory(
    message,
    severity,
    currentStock,
    minimumStock
  );

  const isOut =
    currentStock <= 0;

  const isLow =
    currentStock > 0 &&
    currentStock <= minimumStock;

  const categoryStyle =
    category === "Expiry"
      ? "bg-[#fff0df] text-[#d86d13]"
      : isOut
      ? "bg-[#ffe1e5] text-[#e53c52]"
      : isLow
      ? "bg-[#fff1c9] text-[#c88a08]"
      : "bg-[#e9f1ff] text-[#3c70ca]";

  const action =
    category === "Expiry"
      ? "View"
      : isOut
      ? "Restock"
      : isLow
      ? "Buy Now"
      : "View";

  return (
    <div className="group rounded-xl border border-[#e2eae7] bg-white p-3 transition hover:border-[#d6e4df] hover:shadow-sm">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-lg ${
            category === "Expiry"
              ? "bg-[#fff3e6]"
              : isOut
              ? "bg-[#fff0d9]"
              : "bg-[#edf5fb]"
          }`}
        >
          {category === "Expiry"
            ? "◷"
            : isOut
            ? "📦"
            : "⚠"}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-[11px] font-bold text-[#19372e]">
              {productName}
            </p>

            <span
              className={`rounded-full px-2 py-0.5 text-[8px] font-bold ${categoryStyle}`}
            >
              {category}
            </span>
          </div>

          <p className="mt-1 truncate text-[9px] text-[#71867e]">
            {message}
          </p>

          <div className="mt-2 flex flex-wrap gap-x-4 text-[8px] text-[#61786f]">
            <span>
              Current:{" "}
              <b className="text-[#263f36]">
                {currentStock}
              </b>
            </span>

            <span>
              Minimum:{" "}
              <b className="text-[#263f36]">
                {minimumStock}
              </b>
            </span>

            <span>
              {formatTimeAgo(
                createdAt
              )}
            </span>
          </div>
        </div>

        <button
          type="button"
          className={`hidden shrink-0 rounded-lg px-4 py-2 text-[9px] font-bold sm:block ${
            isOut
              ? "bg-[#ffe2e5] text-[#e43d54]"
              : "bg-[#eee7ff] text-[#6746d8]"
          }`}
        >
          {action}
        </button>

        <button
          type="button"
          className="text-lg text-[#82958d]"
          aria-label="More options"
        >
          ⋮
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   QUICK ACTION
   ============================================================ */

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
      className={`group rounded-xl p-3.5 text-white transition hover:-translate-y-0.5 hover:shadow-lg ${className}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="text-xl font-light">
            {icon}
          </span>

          <div>
            <p className="text-xs font-bold">
              {title}
            </p>

            <p className="mt-0.5 text-[8px] opacity-80">
              {subtitle}
            </p>
          </div>
        </div>

        <span className="text-lg opacity-80 transition group-hover:translate-x-1">
          →
        </span>
      </div>
    </a>
  );
}

/* ============================================================
   EMPTY STATE
   ============================================================ */

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

/* ============================================================
   PERCENTAGE
   ============================================================ */

function getPercentage(
  value: number,
  total: number
) {
  if (!total) return 0;

  return Math.round(
    (value / total) * 100
  );
}