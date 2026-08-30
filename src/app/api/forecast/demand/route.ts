import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const HISTORY_WINDOWS = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  "6m": 180,
  "12m": 365,
} as const;

const FORECAST_HORIZONS = {
  "7d": 7,
  "14d": 14,
  "30d": 30,
} as const;

type HistoryWindow = keyof typeof HISTORY_WINDOWS;

function round(value: number, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function getDateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function addCalendarDays(dateKey: string, days: number) {
  const [year, month, day] = dateKey
    .split("-")
    .map(Number);

  const date = new Date(
    Date.UTC(year, month - 1, day)
  );

  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString().slice(0, 10);
}

function getTodayKey() {
  return getDateKey(new Date());
}

function getHistoryDates(
  endDateKey: string,
  days: number
) {
  const startDateKey = addCalendarDays(
    endDateKey,
    -(days - 1)
  );

  const dates: string[] = [];

  for (let i = 0; i < days; i++) {
    dates.push(
      addCalendarDays(startDateKey, i)
    );
  }

  return dates;
}

function getDailyHistory(
  sales: Array<{
    productId: string;
    quantity: unknown;
    soldAt: Date | null;
  }>,
  productId: string,
  endDateKey: string,
  days: number
) {
  const dates = getHistoryDates(
    endDateKey,
    days
  );

  const demand = new Map<string, number>();

  for (const date of dates) {
    demand.set(date, 0);
  }

  for (const sale of sales) {
    if (!sale.soldAt) {
      continue;
    }

    if (sale.productId !== productId) {
      continue;
    }

    const dateKey = getDateKey(sale.soldAt);

    if (!demand.has(dateKey)) {
      continue;
    }

    demand.set(
      dateKey,
      (demand.get(dateKey) || 0) +
        (Number(sale.quantity) || 0)
    );
  }

  return dates.map((date) => ({
    date,
    quantity: round(
      demand.get(date) || 0
    ),
  }));
}

function calculateDemandMetrics(
  history: Array<{
    date: string;
    quantity: number;
  }>
) {
  const days = history.length;

  const totalDemand = history.reduce(
    (total, day) =>
      total + day.quantity,
    0
  );

  const averageDailyDemand =
    days > 0
      ? totalDemand / days
      : 0;

  const salesDays = history.filter(
    (day) => day.quantity > 0
  ).length;

  const zeroSalesDays =
    days - salesDays;

  return {
    totalDemand: round(totalDemand),
    averageDailyDemand:
      round(averageDailyDemand),
    salesDays,
    zeroSalesDays,
  };
}

function average(
  history: Array<{
    date: string;
    quantity: number;
  }>
) {
  if (!history.length) {
    return 0;
  }

  return (
    history.reduce(
      (sum, item) =>
        sum + item.quantity,
      0
    ) / history.length
  );
}

function calculateTrend(
  average7: number,
  average30: number,
  average90: number
) {
  if (
    average7 === 0 &&
    average30 === 0 &&
    average90 === 0
  ) {
    return {
      value: 0,
      direction: "stable" as const,
    };
  }

  const recentWeight =
    average30 > 0
      ? average7 / average30
      : average7 > 0
        ? 2
        : 1;

  const longWeight =
    average90 > 0
      ? average30 / average90
      : average30 > 0
        ? 2
        : 1;

  const trend =
    (recentWeight - 1) * 0.6 +
    (longWeight - 1) * 0.4;

  let direction:
    | "increasing"
    | "decreasing"
    | "stable";

  if (trend > 0.08) {
    direction = "increasing";
  } else if (trend < -0.08) {
    direction = "decreasing";
  } else {
    direction = "stable";
  }

  return {
    value: trend,
    direction,
  };
}

export async function GET(
  request: Request
) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized.",
        },
        { status: 401 }
      );
    }

    const user =
      await prisma.user.findUnique({
        where: {
          email: session.user.email,
        },
        include: {
          store: true,
        },
      });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "User not found.",
        },
        { status: 404 }
      );
    }

    if (!user.store) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Store setup is incomplete.",
        },
        { status: 400 }
      );
    }

    const storeId =
      user.store.id;

    const url = new URL(
      request.url
    );

    const requestedHorizon =
      url.searchParams.get(
        "horizon"
      ) || "30d";

    const historyWindow =
      (
        requestedHorizon in
        HISTORY_WINDOWS
          ? requestedHorizon
          : "30d"
      ) as HistoryWindow;

    const historyDays =
      HISTORY_WINDOWS[
        historyWindow
      ];

    const productId =
      url.searchParams.get(
        "productId"
      );

    const endDate =
      new Date();

    const endDateKey =
      getDateKey(endDate);

    const startDateKey =
      addCalendarDays(
        endDateKey,
        -(historyDays - 1)
      );

    const products =
      await prisma.product.findMany({
        where: {
          storeId,
          ...(productId
            ? { id: productId }
            : {}),
        },
        orderBy: {
          name: "asc",
        },
      });

    if (!products.length) {
      return NextResponse.json({
        success: true,
        history: {
          window: historyWindow,
          days: historyDays,
          startDate:
            `${startDateKey}T00:00:00+05:30`,
          endDate:
            `${endDateKey}T23:59:59+05:30`,
        },
        forecastHorizons:
          FORECAST_HORIZONS,
        summary: {
          products: 0,
          productsWithDemand: 0,
          totalDemand: 0,
          averageDailyDemand: 0,
        },
        products: [],
      });
    }

    const startDate =
      new Date(
        `${startDateKey}T00:00:00+05:30`
      );

    const endDateInclusive =
      new Date(
        `${endDateKey}T23:59:59.999+05:30`
      );

    const sales =
      await prisma.inventoryTransaction.findMany(
        {
          where: {
            storeId,
            type: "SALE",
            ...(productId
              ? { productId }
              : {}),
            soldAt: {
              gte: startDate,
              lte: endDateInclusive,
            },
          },
          orderBy: {
            soldAt: "asc",
          },
          select: {
            productId: true,
            quantity: true,
            soldAt: true,
          },
        }
      );

    const result =
      products.map((product) => {
        const history =
          getDailyHistory(
            sales,
            product.id,
            endDateKey,
            historyDays
          );

        const metrics =
          calculateDemandMetrics(
            history
          );

        const history7 =
          getDailyHistory(
            sales,
            product.id,
            endDateKey,
            Math.min(7, historyDays)
          );

        const history30 =
          getDailyHistory(
            sales,
            product.id,
            endDateKey,
            Math.min(30, historyDays)
          );

        const history90 =
          getDailyHistory(
            sales,
            product.id,
            endDateKey,
            Math.min(90, historyDays)
          );

        const average7 =
          average(history7);

        const average30 =
          average(history30);

        const average90 =
          average(history90);

        const trend =
          calculateTrend(
            average7,
            average30,
            average90
          );

        return {
          productId: product.id,
          productName: product.name,
          unit: product.unit,

          currentStock:
            Number(
              product.currentStock
            ) || 0,

          minimumStock:
            Number(
              product.minimumStock
            ) || 0,

          sellingPrice:
            Number(
              product.sellingPrice
            ) || 0,

          historyWindow,
          historyDays,

          history,

          summary: {
            totalDemand:
              metrics.totalDemand,

            averageDailyDemand:
              metrics.averageDailyDemand,

            salesDays:
              metrics.salesDays,

            zeroSalesDays:
              metrics.zeroSalesDays,
          },

          recent7DayAverage:
            round(average7),

          recent30DayAverage:
            round(average30),

          recent90DayAverage:
            round(average90),

          trend: {
            value: round(
              trend.value,
              4
            ),
            direction:
              trend.direction,
          },
        };
      });

    const totalDemand =
      result.reduce(
        (sum, product) =>
          sum +
          product.summary.totalDemand,
        0
      );

    const averageDailyDemand =
      result.length > 0
        ? result.reduce(
            (sum, product) =>
              sum +
              product.summary
                .averageDailyDemand,
            0
          ) / result.length
        : 0;

    const productsWithDemand =
      result.filter(
        (product) =>
          product.summary
            .totalDemand > 0
      ).length;

    return NextResponse.json({
      success: true,

      history: {
        window: historyWindow,
        days: historyDays,
        startDate:
          `${startDateKey}T00:00:00+05:30`,
        endDate:
          `${endDateKey}T23:59:59+05:30`,
      },

      forecastHorizons:
        FORECAST_HORIZONS,

      summary: {
        products: result.length,
        productsWithDemand,
        totalDemand:
          round(totalDemand),
        averageDailyDemand:
          round(
            averageDailyDemand
          ),
      },

      products: result,
    });
  } catch (error) {
    console.error(
      "[Demand API Error]",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to calculate demand.",
      },
      { status: 500 }
    );
  }
}