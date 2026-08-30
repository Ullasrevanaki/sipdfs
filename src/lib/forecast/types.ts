export type DemandHistoryPoint = {
  date: string;
  quantity: number;
};

export type ForecastInput = {
  history: DemandHistoryPoint[];
  currentStock: number;
  minimumStock: number;
};

export type ForecastResult = {
  forecastDailyDemand: number;
  next7Days: number;
  next14Days: number;
  next30Days: number;

  averages: {
    last7Days: number;
    last30Days: number;
    last90Days: number;
    last6Months: number;
    last12Months: number;
  };

  weights: {
    last7Days: number;
    last30Days: number;
    last90Days: number;
    last6Months: number;
    last12Months: number;
  };

  trend: {
    factor: number;
    direction: "INCREASING" | "DECREASING" | "STABLE";
  };
};