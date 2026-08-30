"use client";

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

export type ForecastProduct = {
  productId: string;
  productName: string;
  category?: string | null;
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

type ForecastDashboardProps = {
  products: ForecastProduct[];
};

export default function ForecastDashboard({
  products,
}: ForecastDashboardProps) {
  return (
    <div className="space-y-4">
      {products.map((product) => (
        <div
          key={product.productId}
          className="rounded-xl border border-gray-200 bg-white p-5"
        >
          <h3 className="font-semibold text-gray-900">
            {product.productName}
          </h3>

          <p className="mt-1 text-sm text-gray-500">
            {product.category || "Uncategorized"} •{" "}
            {product.unit}
          </p>

          <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
            <div>
              <p className="text-xs text-gray-500">
                Current Stock
              </p>
              <p className="font-semibold">
                {product.currentStock}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500">
                Daily Demand
              </p>
              <p className="font-semibold">
                {product.forecast?.dailyDemand ?? 0}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500">
                7 Day Forecast
              </p>
              <p className="font-semibold">
                {product.forecast?.next7Days ?? 0}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500">
                Recommended Purchase
              </p>
              <p className="font-semibold">
                {product.inventory?.recommendedPurchase ?? 0}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}