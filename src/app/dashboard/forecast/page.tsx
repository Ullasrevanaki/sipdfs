"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/layout/AppShell";

type Horizon = "7d" | "30d" | "90d" | "6m" | "12m";

type HorizonOption = {
  value: Horizon;
  label: string;
  description: string;
};

type TrendDirection =
  | "increasing"
  | "decreasing"
  | "stable";

type StockStatus =
  | "healthy"
  | "adequate"
  | "low"
  | "critical"
  | "no_demand";

type ForecastProduct = {
  productId: string;
  productName: string;
  category?: string | null;
  modelFamily?: string;
  unit: string;

  currentStock: number;
  minimumStock: number;

  forecast?: {
    dailyDemand: number;
    forecastDemand?: number;
    next7Days: number;
    next14Days: number;
    next30Days: number;
    trend?: TrendDirection;
  };

  inventory?: {
    estimatedDaysUntilStockout: number | null;
    safetyStock: number;
    targetStock?: number;
    recommendedPurchase: number;
    stockStatus: StockStatus;
    stockoutRisk?: "NO_RISK" | "LOW" | "MEDIUM" | "HIGH";
    inventoryDecision?: "BUY" | "MONITOR" | "NO_ACTION";
  };

  demand?: {
    totalDemand: number;
    averageDailyDemand: number;
    salesDays: number;
    zeroSalesDays: number;
    recent7DayAverage: number;
    recent30DayAverage: number;
    recent90DayAverage: number;
  };

  trend?: {
    value: number;
    direction: TrendDirection;
  };

  history?: {
    days?: number;
    averageDailyDemand?: number;
    date?: string;
    quantity?: number;
  }[];

  mlInput?: Record<string, unknown>;
};

type ApiProduct = {
  productId: string;
  productName: string;
  category?: string | null;
  unit: string;

  currentStock?: number;
  minimumStock?: number;

  forecast?: {
    dailyDemand?: number;
    forecastDemand?: number;
    next7Days?: number;
    next14Days?: number;
    next30Days?: number;
    trend?: string;
  };

  inventory?: {
    estimatedDaysUntilStockout?: number | null;
    safetyStock?: number;
    targetStock?: number;
    recommendedPurchase?: number;
    stockStatus?: string;
    stockoutRisk?: string;
    inventoryDecision?: string;
  };

  demand?: {
    totalDemand?: number;
    averageDailyDemand?: number;
    salesDays?: number;
    zeroSalesDays?: number;
    recent7DayAverage?: number;
    recent30DayAverage?: number;
    recent90DayAverage?: number;

    daily?: number;
    next7Days?: number;
    next14Days?: number;
    next30Days?: number;
    historicalAverage?: number;
    trend?: string;
  };

  trend?: {
    value?: number;
    direction?: string;
  };

  risk?: {
    stockStatus?: string;
    stockoutRisk?: string;
    estimatedDaysUntilStockout?: number | null;
    priority?: string;
  };

  reorder?: {
    safetyStock?: number;
    targetStock?: number;
    recommendedPurchase?: number;
    decision?: string;
  };

  history?: {
    days?: number;
    averageDailyDemand?: number;
    date?: string;
    quantity?: number;
  }[];

  mlInput?: Record<string, unknown>;
};

type ApiResponse = {
  success: boolean;

  error?: string;

  model?: {
    name?: string;
    service?: string;
  };

  history?: {
    window?: Horizon;
    days?: number;
    startDate?: string;
    endDate?: string;
  };

  summary?: {
    products?: number;
    productsWithDemand?: number;
    productsWithSales?: number;

    criticalProducts?: number;
    critical?: number;

    lowStockProducts?: number;
    lowStock?: number;

    highRiskProducts?: number;
    highRisk?: number;

    totalForecast?: number;
    totalForecast7?: number;
    totalForecast14?: number;
    totalForecast30?: number;

    totalRecommendedPurchase?: number;

    buy?: number;
    monitor?: number;
    noAction?: number;
  };

  products?: ApiProduct[];

  intelligence?: ApiProduct[];

  recommendations?: {
    productId: string;
    productName: string;
    unit: string;
    priority?: string;
    currentStock?: number;
    recommendedPurchase?: number;
    targetStock?: number;
    reason?: string;
  }[];

  alerts?: unknown[];
};

type DashboardSummary = {
  products: number;
  productsWithDemand: number;
  criticalProducts: number;
  lowStockProducts: number;
  highRiskProducts: number;

  totalForecast7: number;
  totalForecast14: number;
  totalForecast30: number;

  totalRecommendedPurchase: number;

  buy: number;
  monitor: number;
  noAction: number;
};

const HORIZONS: HorizonOption[] = [
  {
    value: "7d",
    label: "Last 7 Days",
    description: "Recent demand",
  },
  {
    value: "30d",
    label: "Last 30 Days",
    description: "Short-term pattern",
  },
  {
    value: "90d",
    label: "Last 90 Days",
    description: "Medium-term pattern",
  },
  {
    value: "6m",
    label: "Last 6 Months",
    description: "Longer-term pattern",
  },
  {
    value: "12m",
    label: "Last 12 Months",
    description: "Annual pattern",
  },
];

function number(value: unknown): number {
  const n = Number(value ?? 0);

  if (!Number.isFinite(n)) {
    return 0;
  }

  return n;
}

function formatNumber(value: unknown): string {
  const n = number(value);

  return n.toFixed(2).replace(/\.00$/, "");
}

function formatDate(value?: string): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function normalizeTrend(
  value?: string
): TrendDirection {
  const trend = value?.toLowerCase();

  if (trend === "increasing") {
    return "increasing";
  }

  if (trend === "decreasing") {
    return "decreasing";
  }

  return "stable";
}

function normalizeStockStatus(
  value?: string
): StockStatus {
  const status = value?.toLowerCase();

  if (status === "critical") {
    return "critical";
  }

  if (status === "low") {
    return "low";
  }

  if (status === "healthy") {
    return "healthy";
  }

  if (status === "adequate") {
    return "adequate";
  }

  return "no_demand";
}

function normalizeProduct(
  product: ApiProduct
): ForecastProduct {
  const dailyDemand = number(
    product.forecast?.dailyDemand ??
      product.demand?.daily ??
      product.demand?.averageDailyDemand ??
      product.demand?.historicalAverage
  );

  const next7Days = number(
    product.forecast?.next7Days ??
      product.demand?.next7Days
  );

  const next14Days = number(
    product.forecast?.next14Days ??
      product.demand?.next14Days
  );

  const next30Days = number(
    product.forecast?.next30Days ??
      product.demand?.next30Days
  );

  const trend = normalizeTrend(
    product.trend?.direction ??
      product.forecast?.trend ??
      product.demand?.trend
  );

  const stockStatus = normalizeStockStatus(
    product.inventory?.stockStatus ??
      product.risk?.stockStatus
  );

  return {
    productId: product.productId,
    productName: product.productName,
    category: product.category,
    unit: product.unit,

    currentStock: number(
      product.currentStock
    ),

    minimumStock: number(
      product.minimumStock
    ),

    forecast: {
      dailyDemand,
      forecastDemand: number(
        product.forecast?.forecastDemand
      ),
      next7Days,
      next14Days,
      next30Days,
      trend,
    },

    inventory: {
      estimatedDaysUntilStockout:
        product.inventory
          ?.estimatedDaysUntilStockout ??
        product.risk
          ?.estimatedDaysUntilStockout ??
        null,

      safetyStock: number(
        product.inventory?.safetyStock ??
          product.reorder?.safetyStock
      ),

      targetStock: number(
        product.inventory?.targetStock ??
          product.reorder?.targetStock
      ),

      recommendedPurchase: number(
        product.inventory
          ?.recommendedPurchase ??
          product.reorder
            ?.recommendedPurchase
      ),

      stockStatus,

      stockoutRisk:
        (product.inventory?.stockoutRisk ??
          product.risk?.stockoutRisk ??
          "NO_RISK") as
          | "NO_RISK"
          | "LOW"
          | "MEDIUM"
          | "HIGH",

      inventoryDecision:
        (product.inventory
          ?.inventoryDecision ??
          product.reorder?.decision ??
          "NO_ACTION") as
          | "BUY"
          | "MONITOR"
          | "NO_ACTION",
    },

    demand: {
      totalDemand: number(
        product.demand?.totalDemand
      ),

      averageDailyDemand: number(
        product.demand
          ?.averageDailyDemand ??
          product.demand
            ?.historicalAverage
      ),

      salesDays: number(
        product.demand?.salesDays
      ),

      zeroSalesDays: number(
        product.demand?.zeroSalesDays
      ),

      recent7DayAverage: number(
        product.demand
          ?.recent7DayAverage
      ),

      recent30DayAverage: number(
        product.demand
          ?.recent30DayAverage
      ),

      recent90DayAverage: number(
        product.demand
          ?.recent90DayAverage
      ),
    },

    trend: {
      value: number(
        product.trend?.value ??
          dailyDemand
      ),
      direction: trend,
    },

    history: product.history ?? [],

    mlInput: product.mlInput,
  };
}

function buildSummary(
  result: ApiResponse,
  products: ForecastProduct[]
): DashboardSummary {
  const apiSummary =
    result.summary ?? {};

  const productsWithDemand =
    number(
      apiSummary.productsWithDemand ??
        apiSummary.productsWithSales
    ) ||
    products.filter(
      (product) =>
        number(
          product.demand?.totalDemand
        ) > 0
    ).length;

  const criticalProducts =
    number(
      apiSummary.criticalProducts ??
        apiSummary.critical
    ) ||
    products.filter(
      (product) =>
        product.inventory
          ?.stockStatus === "critical"
    ).length;

  const lowStockProducts =
    number(
      apiSummary.lowStockProducts ??
        apiSummary.lowStock
    ) ||
    products.filter(
      (product) =>
        product.inventory
          ?.stockStatus === "low"
    ).length;

  const highRiskProducts =
    number(
      apiSummary.highRiskProducts ??
        apiSummary.highRisk
    ) ||
    products.filter(
      (product) =>
        product.inventory
          ?.stockoutRisk === "HIGH"
    ).length;

  const totalRecommendedPurchase =
    number(
      apiSummary.totalRecommendedPurchase
    ) ||
    products.reduce(
      (sum, product) =>
        sum +
        number(
          product.inventory
            ?.recommendedPurchase
        ),
      0
    );

  const buy =
    number(apiSummary.buy) ||
    products.filter(
      (product) =>
        product.inventory
          ?.inventoryDecision === "BUY"
    ).length;

  const monitor =
    number(apiSummary.monitor) ||
    products.filter(
      (product) =>
        product.inventory
          ?.inventoryDecision === "MONITOR"
    ).length;

  const noAction =
    number(apiSummary.noAction) ||
    products.filter(
      (product) =>
        product.inventory
          ?.inventoryDecision === "NO_ACTION"
    ).length;

  return {
    products:
      number(apiSummary.products) ||
      products.length,

    productsWithDemand,

    criticalProducts,

    lowStockProducts,

    highRiskProducts,

    totalForecast7: number(
      apiSummary.totalForecast7
    ) ||
      products.reduce(
        (sum, product) =>
          sum +
          number(
            product.forecast
              ?.next7Days
          ),
        0
      ),

    totalForecast14: number(
      apiSummary.totalForecast14
    ) ||
      products.reduce(
        (sum, product) =>
          sum +
          number(
            product.forecast
              ?.next14Days
          ),
        0
      ),

    totalForecast30: number(
      apiSummary.totalForecast30
    ) ||
      products.reduce(
        (sum, product) =>
          sum +
          number(
            product.forecast
              ?.next30Days
          ),
        0
      ),

    totalRecommendedPurchase,

    buy,
    monitor,
    noAction,
  };
}

export default function ForecastPage() {
  const [historyWindow, setHistoryWindow] =
    useState<Horizon>("7d");

  const [forecast, setForecast] =
    useState<ApiResponse | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadForecast() {
      try {
        setLoading(true);
        setError("");

        const params =
          new URLSearchParams();

        /*
         * `horizon` is the future prediction
         * horizon.
         *
         * `history` is the historical window
         * used by the forecasting engine.
         */
        params.set("horizon", "7d");
        params.set(
          "history",
          historyWindow
        );

        const response = await fetch(
          `/api/forecast/predict?${params.toString()}`,
          {
            method: "GET",
            cache: "no-store",
          }
        );

        const result =
          (await response.json()) as ApiResponse;

        if (!response.ok) {
          throw new Error(
            result.error ||
              "Failed to load forecast."
          );
        }

        if (!cancelled) {
          setForecast(result);
        }
      } catch (err) {
        if (!cancelled) {
          console.error(
            "Forecast dashboard error:",
            err
          );

          setForecast(null);

          setError(
            err instanceof Error
              ? err.message
              : "Failed to load forecast."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadForecast();

    return () => {
      cancelled = true;
    };
  }, [historyWindow]);

  const products: ForecastProduct[] =
    (forecast?.products ??
      forecast?.intelligence ??
      []
    ).map(normalizeProduct);

  const summary =
    forecast
      ? buildSummary(
          forecast,
          products
        )
      : null;

  const selectedHistory =
    HORIZONS.find(
      (item) =>
        item.value === historyWindow
    );

  return (
    <AppShell
      storeName="Store"
      userName="User"
      userEmail=""
    >
      {/* HEADER */}

      <div>
        <h1 className="text-3xl font-semibold">
          Forecast & Demand
        </h1>

        <p className="mt-2 max-w-2xl text-gray-500">
          Analyze historical demand and
          generate future demand predictions
          for inventory planning.
        </p>
      </div>

      {/* HISTORY SELECTOR */}

      <div className="mt-8 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">
          Forecast History
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Select how much historical sales
          data the forecasting engine should use.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {HORIZONS.map((item) => {
            const active =
              historyWindow === item.value;

            return (
              <button
                key={item.value}
                type="button"
                disabled={loading}
                onClick={() =>
                  setHistoryWindow(
                    item.value
                  )
                }
                className={`rounded-lg border p-4 text-left transition ${
                  active
                    ? "border-gray-900 bg-gray-900 text-white shadow-sm"
                    : "border-gray-200 bg-white text-gray-900 hover:border-gray-400"
                } ${
                  loading
                    ? "cursor-wait opacity-70"
                    : "cursor-pointer"
                }`}
              >
                <p className="font-semibold">
                  {item.label}
                </p>

                <p
                  className={`mt-1 text-xs ${
                    active
                      ? "text-gray-300"
                      : "text-gray-500"
                  }`}
                >
                  {item.description}
                </p>

                {active && (
                  <p className="mt-3 text-xs font-semibold">
                    ✓ Selected
                  </p>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-5 flex flex-col gap-2 rounded-lg bg-gray-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Active History Window
            </p>

            <p className="mt-1 font-semibold">
              {selectedHistory?.label ||
                historyWindow}
            </p>
          </div>

          <p className="text-sm text-gray-500">
            {loading
              ? "Loading forecast..."
              : forecast
                ? `${forecast.history?.days ?? 0} days of sales history`
                : "Waiting for forecast data"}
          </p>
        </div>
      </div>

      {/* ERROR */}

      {error && (
        <div className="mt-8 rounded-xl border border-red-200 bg-red-50 p-6">
          <h2 className="text-lg font-semibold text-red-700">
            Forecast could not be loaded
          </h2>

          <p className="mt-2 text-sm text-red-600">
            {error}
          </p>

          <button
            type="button"
            onClick={() =>
              setHistoryWindow(
                historyWindow
              )
            }
            className="mt-5 rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      )}

      {/* LOADING */}

      {loading && !error && (
        <div className="mt-8 rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />

          <p className="mt-4 text-sm font-medium text-gray-600">
            Generating forecast...
          </p>

          <p className="mt-1 text-xs text-gray-400">
            Using{" "}
            {selectedHistory?.label.toLowerCase()}
            {" "}of sales history
          </p>
        </div>
      )}

      {/* RESULTS */}

      {!loading &&
        !error &&
        forecast && (
          <>
            {/* SUMMARY */}

            <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-5">
              <ForecastCard
                title="Products"
                value={String(
                  summary?.products ??
                    products.length
                )}
                subtitle="Products analyzed"
              />

              <ForecastCard
                title="Products With Demand"
                value={String(
                  summary?.productsWithDemand ??
                    0
                )}
                subtitle="Products with sales"
              />

              <ForecastCard
                title="7-Day Forecast"
                value={formatNumber(
                  summary?.totalForecast7
                )}
                subtitle="Expected units"
              />

              <ForecastCard
                title="14-Day Forecast"
                value={formatNumber(
                  summary?.totalForecast14
                )}
                subtitle="Expected units"
              />

              <ForecastCard
                title="30-Day Forecast"
                value={formatNumber(
                  summary?.totalForecast30
                )}
                subtitle="Expected units"
              />
            </div>

            {/* HISTORY */}

            <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-700">
                    Historical Data Used
                  </p>

                  <p className="mt-1 text-sm text-gray-500">
                    {formatDate(
                      forecast.history
                        ?.startDate
                    )}{" "}
                    →{" "}
                    {formatDate(
                      forecast.history
                        ?.endDate
                    )}
                  </p>
                </div>

                <div className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700">
                  {forecast.history?.days ??
                    0}{" "}
                  days
                </div>
              </div>
            </div>

            {/* INVENTORY STATUS */}

            <div className="mt-8 grid gap-5 md:grid-cols-3">
              <StatusCard
                title="Low Stock"
                value={String(
                  summary?.lowStockProducts ??
                    0
                )}
                description="Products below the required stock level"
              />

              <StatusCard
                title="Critical"
                value={String(
                  summary?.criticalProducts ??
                    0
                )}
                description="Products at high stock-out risk"
              />

              <StatusCard
                title="Recommended Purchase"
                value={formatNumber(
                  summary?.totalRecommendedPurchase
                )}
                description="Total units recommended for purchase"
              />
            </div>

            {/* INTELLIGENCE SUMMARY */}

            <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold">
                    Inventory Intelligence
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    Forecast-driven inventory
                    decisions.
                  </p>
                </div>

                <div className="text-sm text-gray-500">
                  Model:{" "}
                  <span className="font-semibold text-gray-900">
                    {forecast.model
                      ?.name ||
                      "XGBoost"}
                  </span>
                </div>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                <DecisionCard
                  title="BUY"
                  value={summary?.buy ?? 0}
                />

                <DecisionCard
                  title="MONITOR"
                  value={
                    summary?.monitor ?? 0
                  }
                />

                <DecisionCard
                  title="NO ACTION"
                  value={
                    summary?.noAction ?? 0
                  }
                />
              </div>
            </div>

            {/* PRODUCT TABLE */}

            <div className="mt-8 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-200 px-6 py-5">
                <h2 className="text-lg font-semibold">
                  Product Forecast
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Demand, trend and inventory
                  intelligence for each product.
                </p>
              </div>

              {products.length === 0 ? (
                <div className="px-6 py-16 text-center">
                  <h3 className="text-lg font-semibold">
                    No products found
                  </h3>

                  <p className="mt-2 text-sm text-gray-500">
                    Add products and record
                    sales to generate forecasts.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                      <tr>
                        <th className="px-6 py-4 font-semibold">
                          Product
                        </th>

                        <th className="px-6 py-4 font-semibold">
                          Current Stock
                        </th>

                        <th className="px-6 py-4 font-semibold">
                          Daily Demand
                        </th>

                        <th className="px-6 py-4 font-semibold">
                          7 Days
                        </th>

                        <th className="px-6 py-4 font-semibold">
                          14 Days
                        </th>

                        <th className="px-6 py-4 font-semibold">
                          30 Days
                        </th>

                        <th className="px-6 py-4 font-semibold">
                          Trend
                        </th>

                        <th className="px-6 py-4 font-semibold">
                          Status
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-200">
                      {products.map(
                        (product) => {
                          const trend =
                            normalizeTrend(
                              product
                                .trend
                                ?.direction
                            );

                          const status =
                            normalizeStockStatus(
                              product
                                .inventory
                                ?.stockStatus
                            );

                          return (
                            <tr
                              key={
                                product.productId
                              }
                              className="transition hover:bg-gray-50"
                            >
                              <td className="px-6 py-5">
                                <p className="font-semibold">
                                  {
                                    product.productName
                                  }
                                </p>

                                <p className="mt-1 text-xs text-gray-500">
                                  {
                                    product.unit
                                  }
                                </p>
                              </td>

                              <td className="px-6 py-5">
                                <p className="font-semibold">
                                  {formatNumber(
                                    product.currentStock
                                  )}
                                </p>

                                <p className="mt-1 text-xs text-gray-500">
                                  Minimum:{" "}
                                  {formatNumber(
                                    product.minimumStock
                                  )}
                                </p>
                              </td>

                              <td className="px-6 py-5 font-semibold">
                                {formatNumber(
                                  product
                                    .forecast
                                    ?.dailyDemand
                                )}
                              </td>

                              <td className="px-6 py-5">
                                {formatNumber(
                                  product
                                    .forecast
                                    ?.next7Days
                                )}
                              </td>

                              <td className="px-6 py-5">
                                {formatNumber(
                                  product
                                    .forecast
                                    ?.next14Days
                                )}
                              </td>

                              <td className="px-6 py-5">
                                {formatNumber(
                                  product
                                    .forecast
                                    ?.next30Days
                                )}
                              </td>

                              <td className="px-6 py-5">
                                <TrendBadge
                                  direction={
                                    trend
                                  }
                                />
                              </td>

                              <td className="px-6 py-5">
                                <StockBadge
                                  status={
                                    status
                                  }
                                />
                              </td>
                            </tr>
                          );
                        }
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* PRODUCT DETAILS */}

            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              {products.map(
                (product) => (
                  <ProductForecastCard
                    key={
                      product.productId
                    }
                    product={product}
                  />
                )
              )}
            </div>
          </>
        )}
    </AppShell>
  );
}

function ForecastCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string;
  subtitle: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-gray-500">
        {title}
      </p>

      <p className="mt-3 text-2xl font-semibold">
        {value}
      </p>

      <p className="mt-1 text-xs text-gray-400">
        {subtitle}
      </p>
    </div>
  );
}

function StatusCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-gray-500">
        {title}
      </p>

      <p className="mt-3 text-2xl font-semibold">
        {value}
      </p>

      <p className="mt-2 text-xs leading-5 text-gray-500">
        {description}
      </p>
    </div>
  );
}

function DecisionCard({
  title,
  value,
}: {
  title: string;
  value: number;
}) {
  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {title}
      </p>

      <p className="mt-2 text-2xl font-semibold text-gray-900">
        {value}
      </p>
    </div>
  );
}

function ProductForecastCard({
  product,
}: {
  product: ForecastProduct;
}) {
  const forecast =
    product.forecast ?? {
      dailyDemand: 0,
      next7Days: 0,
      next14Days: 0,
      next30Days: 0,
    };

  const inventory =
    product.inventory ?? {
      estimatedDaysUntilStockout: null,
      safetyStock: 0,
      recommendedPurchase: 0,
      stockStatus:
        "no_demand" as StockStatus,
    };

  const demand =
    product.demand ?? {
      totalDemand: 0,
      averageDailyDemand: 0,
      salesDays: 0,
      zeroSalesDays: 0,
      recent7DayAverage: 0,
      recent30DayAverage: 0,
      recent90DayAverage: 0,
    };

  const trend =
    normalizeTrend(
      product.trend?.direction ??
        forecast.trend
    );

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {product.productName}
          </h3>

          <p className="mt-1 text-sm text-gray-500">
            {product.category ||
              "Uncategorized"}{" "}
            • {product.unit}
          </p>
        </div>

        <StockBadge
          status={normalizeStockStatus(
            inventory.stockStatus
          )}
        />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Metric
          label="Total historical demand"
          value={`${formatNumber(
            demand.totalDemand
          )} ${product.unit}`}
        />

        <Metric
          label="Average daily demand"
          value={`${formatNumber(
            demand.averageDailyDemand
          )} ${product.unit}`}
        />

        <Metric
          label="Daily forecast"
          value={`${formatNumber(
            forecast.dailyDemand
          )} ${product.unit}`}
        />

        <Metric
          label="Estimated stockout"
          value={
            inventory.estimatedDaysUntilStockout ==
            null
              ? "Not estimated"
              : `${formatNumber(
                  inventory.estimatedDaysUntilStockout
                )} days`
          }
        />

        <Metric
          label="Recommended purchase"
          value={`${formatNumber(
            inventory.recommendedPurchase
          )} ${product.unit}`}
        />

        <Metric
          label="Safety stock"
          value={`${formatNumber(
            inventory.safetyStock
          )} ${product.unit}`}
        />

        <Metric
          label="Current stock"
          value={`${formatNumber(
            product.currentStock
          )} ${product.unit}`}
        />

        <Metric
          label="Trend"
          value={
            trend === "increasing"
              ? "Increasing"
              : trend === "decreasing"
                ? "Decreasing"
                : "Stable"
          }
        />
      </div>

      <div className="mt-6 rounded-lg border border-gray-200 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-800">
              Inventory Recommendation
            </p>

            <p className="mt-1 text-sm text-gray-500">
              Based on current stock and
              predicted demand.
            </p>
          </div>

          <div className="text-left sm:text-right">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Decision
            </p>

            <p className="mt-1 text-xl font-semibold">
              {inventory.inventoryDecision ??
                "NO_ACTION"}
            </p>
          </div>
        </div>
      </div>

      {Array.isArray(
        product.history
      ) &&
        product.history.length > 0 && (
          <div className="mt-6 overflow-hidden rounded-lg border border-gray-200">
            <div className="border-b border-gray-200 bg-gray-50 px-5 py-4">
              <h3 className="text-sm font-semibold text-gray-800">
                Recent Daily Demand
              </h3>
            </div>

            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-white text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">
                      Date
                    </th>

                    <th className="px-5 py-3 text-right font-semibold">
                      Quantity Sold
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {product.history.map(
                    (point, index) => (
                      <tr
                        key={`${point.date ?? "row"}-${index}`}
                        className="border-t border-gray-100"
                      >
                        <td className="px-5 py-3">
                          {formatDate(
                            point.date
                          )}
                        </td>

                        <td className="px-5 py-3 text-right font-medium">
                          {formatNumber(
                            point.quantity
                          )}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
    </div>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </p>

      <p className="mt-2 text-lg font-semibold text-gray-900">
        {value}
      </p>
    </div>
  );
}

function TrendBadge({
  direction,
}: {
  direction: TrendDirection;
}) {
  if (direction === "increasing") {
    return (
      <span className="rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
        ↑ Increasing
      </span>
    );
  }

  if (direction === "decreasing") {
    return (
      <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
        ↓ Decreasing
      </span>
    );
  }

  return (
    <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-700">
      → Stable
    </span>
  );
}

function StockBadge({
  status,
}: {
  status: StockStatus;
}) {
  if (status === "critical") {
    return (
      <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
        Critical
      </span>
    );
  }

  if (status === "low") {
    return (
      <span className="rounded-full border border-yellow-200 bg-yellow-50 px-3 py-1 text-xs font-semibold text-yellow-700">
        Low Stock
      </span>
    );
  }

  if (
    status === "adequate" ||
    status === "healthy"
  ) {
    return (
      <span className="rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
        Adequate
      </span>
    );
  }

  return (
    <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-700">
      No Demand
    </span>
  );
}