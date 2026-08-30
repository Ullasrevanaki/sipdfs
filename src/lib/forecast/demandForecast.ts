import {
  ForecastInput,
  ForecastResult,
} from "./types";

/*
 * ============================================================
 * DEMAND FORECAST ENGINE
 * ============================================================
 *
 * This is the application-level forecasting engine.
 *
 * It combines:
 *
 * - Recent demand
 * - Short-term demand
 * - Medium-term demand
 * - Long-term demand
 * - Trend
 *
 * The ML model in the API can provide the primary prediction.
 * This engine is used for demand analysis and fallback logic.
 * ============================================================
 */

const WEIGHTS = {
  last7Days: 0.35,
  last30Days: 0.30,
  last90Days: 0.20,
  last6Months: 0.10,
  last12Months: 0.05,
};

/*
 * ============================================================
 * AVERAGE
 * ============================================================
 *
 * IMPORTANT:
 *
 * Only divide by the number of days that actually exist.
 *
 * Example:
 *
 * If 30 days of history are available:
 *
 * last90Days = total / 30
 *
 * NOT:
 *
 * total / 90
 *
 * This prevents artificially reducing demand when the database
 * does not yet contain a full historical window.
 * ============================================================
 */

function calculateAverage(
  history: {
    date: string;
    quantity: number;
  }[],
  days: number
): number {
  if (
    days <= 0 ||
    history.length === 0
  ) {
    return 0;
  }

  const recentHistory =
    history.slice(
      -days
    );

  if (
    recentHistory.length === 0
  ) {
    return 0;
  }

  const total =
    recentHistory.reduce(
      (
        sum,
        day
      ) =>
        sum +
        Math.max(
          0,
          Number(
            day.quantity
          ) || 0
        ),
      0
    );

  /*
   * Divide by actual number of
   * available days.
   */
  return (
    total /
    recentHistory.length
  );
}

/*
 * ============================================================
 * TREND
 * ============================================================
 */

function calculateTrend(
  last7Days: number,
  last30Days: number
): {
  factor: number;
  direction:
    | "INCREASING"
    | "DECREASING"
    | "STABLE";
} {
  /*
   * No historical demand.
   */
  if (
    last30Days <= 0
  ) {
    return {
      factor: 1,
      direction: "STABLE",
    };
  }

  const ratio =
    last7Days /
    last30Days;

  /*
   * Demand is increasing.
   */
  if (
    ratio > 1.10
  ) {
    return {
      factor: 1.05,
      direction:
        "INCREASING",
    };
  }

  /*
   * Demand is decreasing.
   */
  if (
    ratio < 0.90
  ) {
    return {
      factor: 0.95,
      direction:
        "DECREASING",
    };
  }

  /*
   * Demand is stable.
   */
  return {
    factor: 1,
    direction:
      "STABLE",
  };
}

/*
 * ============================================================
 * FORECAST
 * ============================================================
 */

export function calculateDemandForecast(
  input: ForecastInput
): ForecastResult {
  const {
    history,
  } = input;

  /*
   * ----------------------------------------------------------
   * HISTORICAL AVERAGES
   * ----------------------------------------------------------
   */

  const last7Days =
    calculateAverage(
      history,
      7
    );

  const last30Days =
    calculateAverage(
      history,
      30
    );

  const last90Days =
    calculateAverage(
      history,
      90
    );

  const last6Months =
    calculateAverage(
      history,
      180
    );

  const last12Months =
    calculateAverage(
      history,
      365
    );

  /*
   * ----------------------------------------------------------
   * WEIGHTED DEMAND
   * ----------------------------------------------------------
   */

  const weightedDemand =
    last7Days *
      WEIGHTS.last7Days +

    last30Days *
      WEIGHTS.last30Days +

    last90Days *
      WEIGHTS.last90Days +

    last6Months *
      WEIGHTS.last6Months +

    last12Months *
      WEIGHTS.last12Months;

  /*
   * ----------------------------------------------------------
   * TREND
   * ----------------------------------------------------------
   */

  const trend =
    calculateTrend(
      last7Days,
      last30Days
    );

  /*
   * ----------------------------------------------------------
   * DAILY FORECAST
   * ----------------------------------------------------------
   */

  const forecastDailyDemand =
    Math.max(
      0,
      weightedDemand *
        trend.factor
    );

  /*
   * ----------------------------------------------------------
   * FUTURE DEMAND
   * ----------------------------------------------------------
   */

  const next7Days =
    forecastDailyDemand *
    7;

  const next14Days =
    forecastDailyDemand *
    14;

  const next30Days =
    forecastDailyDemand *
    30;

  /*
   * ----------------------------------------------------------
   * RESULT
   * ----------------------------------------------------------
   */

  return {
    forecastDailyDemand:
      Number(
        forecastDailyDemand.toFixed(
          2
        )
      ),

    next7Days:
      Number(
        next7Days.toFixed(
          2
        )
      ),

    next14Days:
      Number(
        next14Days.toFixed(
          2
        )
      ),

    next30Days:
      Number(
        next30Days.toFixed(
          2
        )
      ),

    averages: {
      last7Days:
        Number(
          last7Days.toFixed(
            2
          )
        ),

      last30Days:
        Number(
          last30Days.toFixed(
            2
          )
        ),

      last90Days:
        Number(
          last90Days.toFixed(
            2
          )
        ),

      last6Months:
        Number(
          last6Months.toFixed(
            2
          )
        ),

      last12Months:
        Number(
          last12Months.toFixed(
            2
          )
        ),
    },

    weights: {
      last7Days:
        WEIGHTS.last7Days,

      last30Days:
        WEIGHTS.last30Days,

      last90Days:
        WEIGHTS.last90Days,

      last6Months:
        WEIGHTS.last6Months,

      last12Months:
        WEIGHTS.last12Months,
    },

    trend,
  };
}