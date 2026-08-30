import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const ML_SERVICE_URL =
  process.env.ML_SERVICE_URL ||
  "http://127.0.0.1:8000";

const INDIA_TIME_ZONE =
  "Asia/Kolkata";

const FORECAST_HORIZONS = {
  "7d": 7,
  "14d": 14,
  "30d": 30,
} as const;

const HISTORY_WINDOWS = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  "6m": 180,
  "12m": 365,
} as const;

const MODEL_FAMILIES = [
  "AUTOMOTIVE",
  "BABY CARE",
  "BEAUTY",
  "BEVERAGES",
  "BOOKS",
  "BREAD/BAKERY",
  "CELEBRATION",
  "CLEANING",
  "DAIRY",
  "DELI",
  "EGGS",
  "FROZEN FOODS",
  "GROCERY I",
  "GROCERY II",
  "HARDWARE",
  "HOME AND KITCHEN I",
  "HOME AND KITCHEN II",
  "HOME APPLIANCES",
  "HOME CARE",
  "LADIESWEAR",
  "LAWN AND GARDEN",
  "LINGERIE",
  "LIQUOR,WINE,BEER",
  "MAGAZINES",
  "MEATS",
  "PERSONAL CARE",
  "PET SUPPLIES",
  "PLAYERS AND ELECTRONICS",
  "POULTRY",
  "PREPARED FOODS",
  "PRODUCE",
  "SCHOOL AND OFFICE SUPPLIES",
  "SEAFOOD",
] as const;

type ModelFamily =
  (typeof MODEL_FAMILIES)[number];

type HistoryWindow =
  keyof typeof HISTORY_WINDOWS;

function round(
  value: number,
  decimals = 2
) {
  const factor =
    10 ** decimals;

  return (
    Math.round(
      value * factor
    ) / factor
  );
}

function average(
  values: number[]
) {
  if (!values.length) {
    return 0;
  }

  return (
    values.reduce(
      (sum, value) =>
        sum + value,
      0
    ) / values.length
  );
}

function normalize(
  value: string
) {
  return value
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");
}

function resolveModelFamily(
  category: string | null,
  productName: string
): ModelFamily {
  const categoryValue =
    category
      ? normalize(category)
      : "";

  const nameValue =
    productName
      ? normalize(productName)
      : "";

  if (
    MODEL_FAMILIES.includes(
      categoryValue as ModelFamily
    )
  ) {
    return categoryValue as ModelFamily;
  }

  const categoryMap:
    Record<string, ModelFamily> = {
    BEVERAGE: "BEVERAGES",
    BEVERAGES: "BEVERAGES",
    DRINK: "BEVERAGES",
    DRINKS: "BEVERAGES",

    GROCERY: "GROCERY I",
    GROCERIES: "GROCERY I",
    FOOD: "GROCERY I",
    SNACKS: "GROCERY I",

    BAKERY: "BREAD/BAKERY",
    BREAD: "BREAD/BAKERY",

    FROZEN: "FROZEN FOODS",
    "FROZEN FOOD":
      "FROZEN FOODS",

    MEAT: "MEATS",

    PERSONAL: "PERSONAL CARE",

    PET: "PET SUPPLIES",

    HOME:
      "HOME AND KITCHEN I",

    CLEANING: "CLEANING",
    DAIRY: "DAIRY",
    BEAUTY: "BEAUTY",
    POULTRY: "POULTRY",
    SEAFOOD: "SEAFOOD",
    HARDWARE: "HARDWARE",
  };

  if (
    categoryMap[categoryValue]
  ) {
    return categoryMap[
      categoryValue
    ];
  }

  if (
    nameValue.includes("MILK") ||
    nameValue.includes("CURD") ||
    nameValue.includes("YOGURT") ||
    nameValue.includes("CHEESE")
  ) {
    return "DAIRY";
  }

  if (
    nameValue.includes("WATER") ||
    nameValue.includes("JUICE") ||
    nameValue.includes("COLA") ||
    nameValue.includes("DRINK")
  ) {
    return "BEVERAGES";
  }

  if (
    nameValue.includes("BREAD") ||
    nameValue.includes("CAKE") ||
    nameValue.includes("BAKERY")
  ) {
    return "BREAD/BAKERY";
  }

  if (
    nameValue.includes("CHICKEN") ||
    nameValue.includes("POULTRY")
  ) {
    return "POULTRY";
  }

  if (
    nameValue.includes("FISH") ||
    nameValue.includes("SEAFOOD")
  ) {
    return "SEAFOOD";
  }

  if (
    nameValue.includes("MEAT") ||
    nameValue.includes("MUTTON") ||
    nameValue.includes("BEEF")
  ) {
    return "MEATS";
  }

  if (
    nameValue.includes("SOAP") ||
    nameValue.includes("DETERGENT") ||
    nameValue.includes("CLEANER")
  ) {
    return "CLEANING";
  }

  if (
    nameValue.includes("SHAMPOO") ||
    nameValue.includes("CREAM") ||
    nameValue.includes("COSMETIC")
  ) {
    return "BEAUTY";
  }

  return "GROCERY I";
}

function indiaDateKey(
  date: Date
) {
  return new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone:
        INDIA_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }
  ).format(date);
}

/*
 * Calendar-day arithmetic is performed
 * in UTC so an IST date never shifts
 * backward/forward when converted to ISO.
 */
function addCalendarDays(
  dateKey: string,
  days: number
) {
  const [
    year,
    month,
    day,
  ] = dateKey
    .split("-")
    .map(Number);

  const date = new Date(
    Date.UTC(
      year,
      month - 1,
      day
    )
  );

  date.setUTCDate(
    date.getUTCDate() + days
  );

  return date
    .toISOString()
    .slice(0, 10);
}

function getHistoryDates(
  endDateKey: string,
  days: number
) {
  const startDateKey =
    addCalendarDays(
      endDateKey,
      -(days - 1)
    );

  const dates: string[] = [];

  for (
    let i = 0;
    i < days;
    i++
  ) {
    dates.push(
      addCalendarDays(
        startDateKey,
        i
      )
    );
  }

  return dates;
}

function buildDailyDemand(
  sales: Array<{
    productId: string;
    quantity: unknown;
    soldAt: Date | null;
  }>,
  endDateKey: string,
  historyDays: number
) {
  const dates =
    getHistoryDates(
      endDateKey,
      historyDays
    );

  const dailyDemand =
    new Map<
      string,
      Map<string, number>
    >();

  for (const date of dates) {
    dailyDemand.set(
      date,
      new Map()
    );
  }

  for (const sale of sales) {
    if (!sale.soldAt) {
      continue;
    }

    const dateKey =
      indiaDateKey(
        sale.soldAt
      );

    if (
      !dailyDemand.has(
        dateKey
      )
    ) {
      continue;
    }

    const productMap =
      dailyDemand.get(
        dateKey
      )!;

    const quantity =
      Number(
        sale.quantity
      ) || 0;

    productMap.set(
      sale.productId,
      (
        productMap.get(
          sale.productId
        ) || 0
      ) + quantity
    );
  }

  return dailyDemand;
}

function getDemand(
  dailyDemand: Map<
    string,
    Map<string, number>
  >,
  productId: string,
  todayKey: string,
  daysAgo: number
) {
  const key =
    addCalendarDays(
      todayKey,
      -daysAgo
    );

  return Number(
    dailyDemand
      .get(key)
      ?.get(productId) || 0
  );
}

function getHistoryValues(
  dailyDemand: Map<
    string,
    Map<string, number>
  >,
  productId: string,
  todayKey: string,
  historyDays: number
) {
  const values: number[] =
    [];

  for (
    let i = 1;
    i <= historyDays;
    i++
  ) {
    values.push(
      getDemand(
        dailyDemand,
        productId,
        todayKey,
        i
      )
    );
  }

  return values;
}

function getDailyHistory(
  dailyDemand: Map<
    string,
    Map<string, number>
  >,
  productId: string,
  todayKey: string,
  historyDays: number
) {
  const dates =
    getHistoryDates(
      todayKey,
      historyDays
    );

  return dates.map(
    (date) => ({
      date,
      quantity: round(
        dailyDemand
          .get(date)
          ?.get(productId) ||
          0
      ),
    })
  );
}

function calculateTrend(
  values: number[]
) {
  if (!values.length) {
    return {
      value: 0,
      direction:
        "stable" as const,
    };
  }

  const midpoint =
    Math.floor(
      values.length / 2
    );

  const olderValues =
    values.slice(
      midpoint
    );

  const recentValues =
    values.slice(
      0,
      midpoint
    );

  const older =
    average(
      olderValues
    );

  const recent =
    average(
      recentValues
    );

  const difference =
    recent - older;

  const threshold =
    Math.max(
      0.1,
      Math.abs(older) * 0.05
    );

  if (
    difference > threshold
  ) {
    return {
      value: difference,
      direction:
        "increasing" as const,
    };
  }

  if (
    difference < -threshold
  ) {
    return {
      value: difference,
      direction:
        "decreasing" as const,
    };
  }

  return {
    value: difference,
    direction:
      "stable" as const,
  };
}

async function getMLPrediction(
  input: {
    store_nbr: number;
    family: string;
    onpromotion: number;
    date: string;
    lag_1: number;
    lag_7: number;
    lag_14: number;
    lag_28: number;
    rolling_mean_7: number;
    rolling_mean_14: number;
    rolling_mean_28: number;
  }
) {
  const response =
    await fetch(
      `${ML_SERVICE_URL}/predict`,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify(
          input
        ),
        cache: "no-store",
      }
    );

  const data =
    await response.json();

  if (!response.ok) {
    throw new Error(
      typeof data?.detail ===
        "string"
        ? data.detail
        : "ML prediction failed"
    );
  }

  return Number(
    data?.prediction
      ?.predicted_demand ?? 0
  );
}

export async function GET(
  request: Request
) {
  try {
    const session =
      await auth();

    if (
      !session?.user?.email
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Unauthorized.",
        },
        { status: 401 }
      );
    }

    const user =
      await prisma.user.findUnique(
        {
          where: {
            email:
              session.user.email,
          },
          include: {
            store: true,
          },
        }
      );

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error:
            "User not found.",
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

    const url =
      new URL(request.url);

    const productId =
      url.searchParams.get(
        "productId"
      );

    const requestedHistory =
      url.searchParams.get(
        "history"
      ) || "30d";

    const historyWindow =
      (
        requestedHistory in
        HISTORY_WINDOWS
          ? requestedHistory
          : "30d"
      ) as HistoryWindow;

    const historyDays =
      HISTORY_WINDOWS[
        historyWindow
      ];

    const products =
      await prisma.product.findMany(
        {
          where: {
            storeId,
            ...(productId
              ? {
                  id: productId,
                }
              : {}),
          },
          orderBy: {
            name: "asc",
          },
        }
      );

    if (!products.length) {
      return NextResponse.json({
        success: true,

        model: {
          name: "XGBoost",
          service:
            ML_SERVICE_URL,
        },

        history: {
          window:
            historyWindow,
          days:
            historyDays,
        },

        forecastHorizons:
          FORECAST_HORIZONS,

        summary: {
          products: 0,
          productsWithDemand: 0,
          criticalProducts: 0,
          lowStockProducts: 0,
          highRiskProducts: 0,
          totalForecast: 0,
          totalForecast7: 0,
          totalForecast14: 0,
          totalForecast30: 0,
        },

        products: [],
      });
    }

    const todayKey =
      indiaDateKey(
        new Date()
      );

    const startDateKey =
      addCalendarDays(
        todayKey,
        -(historyDays - 1)
      );

    const startDate =
      new Date(
        `${startDateKey}T00:00:00+05:30`
      );

    const endDate =
      new Date(
        `${todayKey}T23:59:59.999+05:30`
      );

    const sales =
      await prisma.inventoryTransaction.findMany(
        {
          where: {
            storeId,
            type: "SALE",

            ...(productId
              ? {
                  productId,
                }
              : {}),

            soldAt: {
              gte: startDate,
              lte: endDate,
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

    const dailyDemand =
      buildDailyDemand(
        sales,
        todayKey,
        historyDays
      );

    /*
     * IMPORTANT:
     * store.id is a Prisma identifier.
     * It is not necessarily the same as
     * the ML dataset's store_nbr.
     *
     * Until a dedicated store_nbr mapping
     * exists, preserve the previous stable
     * numeric/hash behaviour.
     */
    let storeNbr =
      Number(storeId);

    if (
      !Number.isFinite(
        storeNbr
      )
    ) {
      storeNbr = 0;

      for (
        let i = 0;
        i < storeId.length;
        i++
      ) {
        storeNbr =
          (
            storeNbr * 31 +
            storeId.charCodeAt(i)
          ) % 100000;
      }
    }

    storeNbr =
      Math.max(
        1,
        storeNbr
      );

    const forecastResults:
      Array<any> = [];

    for (
      const product of products
    ) {
      const family =
        resolveModelFamily(
          product.category,
          product.name
        );

      const values =
        getHistoryValues(
          dailyDemand,
          product.id,
          todayKey,
          historyDays
        );

      const averageDailyDemand =
        average(values);

      const rollingMean =
        (days: number) => {
          const list: number[] =
            [];

          for (
            let i = 1;
            i <= days;
            i++
          ) {
            list.push(
              getDemand(
                dailyDemand,
                product.id,
                todayKey,
                i
              )
            );
          }

          return average(list);
        };

      const lag1 =
        getDemand(
          dailyDemand,
          product.id,
          todayKey,
          1
        );

      const lag7 =
        historyDays >= 7
          ? getDemand(
              dailyDemand,
              product.id,
              todayKey,
              7
            )
          : average(values);

      const lag14 =
        historyDays >= 14
          ? getDemand(
              dailyDemand,
              product.id,
              todayKey,
              14
            )
          : average(values);

      const lag28 =
        historyDays >= 28
          ? getDemand(
              dailyDemand,
              product.id,
              todayKey,
              28
            )
          : average(values);

      const rollingMean7 =
        rollingMean(
          Math.min(
            7,
            historyDays
          )
        );

      const rollingMean14 =
        rollingMean(
          Math.min(
            14,
            historyDays
          )
        );

      const rollingMean28 =
        rollingMean(
          Math.min(
            28,
            historyDays
          )
        );

      let forecastDailyDemand =
        0;

      try {
        forecastDailyDemand =
          await getMLPrediction(
            {
              store_nbr:
                storeNbr,

              family,

              onpromotion: 0,

              date:
                todayKey,

              lag_1:
                lag1,

              lag_7:
                lag7,

              lag_14:
                lag14,

              lag_28:
                lag28,

              rolling_mean_7:
                rollingMean7,

              rolling_mean_14:
                rollingMean14,

              rolling_mean_28:
                rollingMean28,
            }
          );
      } catch (error) {
        console.error(
          `[Forecast] ML prediction failed for ${product.name}:`,
          error
        );

        forecastDailyDemand =
          Math.max(
            0,
            averageDailyDemand
          );
      }

      forecastDailyDemand =
        Math.max(
          0,
          Number(
            forecastDailyDemand
          ) || 0
        );

      const next7Days =
        forecastDailyDemand *
        7;

      const next14Days =
        forecastDailyDemand *
        14;

      const next30Days =
        forecastDailyDemand *
        30;

      const currentStock =
        Number(
          product.currentStock
        ) || 0;

      const minimumStock =
        Number(
          product.minimumStock
        ) || 0;

      const estimatedDaysUntilStockout =
        forecastDailyDemand > 0 &&
        currentStock > 0
          ? currentStock /
            forecastDailyDemand
          : null;

      const safetyStock =
        minimumStock;

      const targetStock =
        next30Days +
        safetyStock;

      const recommendedPurchase =
        Math.max(
          0,
          targetStock -
            currentStock
        );

      let stockStatus:
        | "critical"
        | "low"
        | "adequate"
        | "no_demand";

      if (
        forecastDailyDemand === 0
      ) {
        stockStatus =
          "no_demand";
      } else if (
        currentStock <= 0
      ) {
        stockStatus =
          "critical";
      } else if (
        currentStock <
        minimumStock
      ) {
        stockStatus =
          "low";
      } else if (
        estimatedDaysUntilStockout !==
          null &&
        estimatedDaysUntilStockout <
          7
      ) {
        stockStatus =
          "critical";
      } else {
        stockStatus =
          "adequate";
      }

      const stockoutRisk =
        forecastDailyDemand <= 0
          ? "NO_RISK"
          : estimatedDaysUntilStockout !==
                null &&
              estimatedDaysUntilStockout <
                7
            ? "HIGH"
            : estimatedDaysUntilStockout !==
                  null &&
                estimatedDaysUntilStockout <
                  14
              ? "MEDIUM"
              : "LOW";

      const inventoryDecision =
        stockoutRisk === "HIGH" ||
        recommendedPurchase > 0
          ? "BUY"
          : stockoutRisk ===
              "MEDIUM"
            ? "MONITOR"
            : "NO_ACTION";

      const trend =
        calculateTrend(
          values
        );

      const history =
        getDailyHistory(
          dailyDemand,
          product.id,
          todayKey,
          historyDays
        );

      const salesDays =
        history.filter(
          (item) =>
            item.quantity > 0
        ).length;

      const zeroSalesDays =
        historyDays -
        salesDays;

      const recent7 =
        history.slice(
          -Math.min(
            7,
            history.length
          )
        );

      const recent30 =
        history.slice(
          -Math.min(
            30,
            history.length
          )
        );

      const recent90 =
        history.slice(
          -Math.min(
            90,
            history.length
          )
        );

      forecastResults.push({
        productId:
          product.id,

        productName:
          product.name,

        category:
          product.category,

        modelFamily:
          family,

        unit:
          product.unit,

        currentStock:
          round(
            currentStock
          ),

        minimumStock:
          round(
            minimumStock
          ),

        forecast: {
          dailyDemand:
            round(
              forecastDailyDemand
            ),

          next7Days:
            round(
              next7Days
            ),

          next14Days:
            round(
              next14Days
            ),

          next30Days:
            round(
              next30Days
            ),

          trend:
            trend.direction,
        },

        demand: {
          totalDemand:
            round(
              history.reduce(
                (sum, item) =>
                  sum +
                  item.quantity,
                0
              )
            ),

          averageDailyDemand:
            round(
              averageDailyDemand
            ),

          salesDays,

          zeroSalesDays,

          recent7DayAverage:
            round(
              average(
                recent7
                  .map(
                    (item) =>
                      item.quantity
                  )
              )
            ),

          recent30DayAverage:
            round(
              average(
                recent30
                  .map(
                    (item) =>
                      item.quantity
                  )
              )
            ),

          recent90DayAverage:
            round(
              average(
                recent90
                  .map(
                    (item) =>
                      item.quantity
                  )
              )
            ),
        },

        trend: {
          value:
            round(
              trend.value,
              4
            ),

          direction:
            trend.direction,
        },

        inventory: {
          estimatedDaysUntilStockout:
            estimatedDaysUntilStockout ===
              null
              ? null
              : round(
                  estimatedDaysUntilStockout
                ),

          safetyStock:
            round(
              safetyStock
            ),

          targetStock:
            round(
              targetStock
            ),

          recommendedPurchase:
            round(
              recommendedPurchase
            ),

          stockStatus,

          stockoutRisk,

          inventoryDecision,
        },

        mlInput: {
          store_nbr:
            storeNbr,

          family,

          onpromotion: 0,

          date:
            todayKey,

          lag_1:
            round(lag1),

          lag_7:
            round(lag7),

          lag_14:
            round(lag14),

          lag_28:
            round(lag28),

          rolling_mean_7:
            round(
              rollingMean7
            ),

          rolling_mean_14:
            round(
              rollingMean14
            ),

          rolling_mean_28:
            round(
              rollingMean28
            ),
        },

        history,
      });
    }

    const totalForecast7 =
      forecastResults.reduce(
        (
          sum,
          product
        ) =>
          sum +
          product.forecast
            .next7Days,
        0
      );

    const totalForecast14 =
      forecastResults.reduce(
        (
          sum,
          product
        ) =>
          sum +
          product.forecast
            .next14Days,
        0
      );

    const totalForecast30 =
      forecastResults.reduce(
        (
          sum,
          product
        ) =>
          sum +
          product.forecast
            .next30Days,
        0
      );

    const productsWithDemand =
      forecastResults.filter(
        (product) =>
          product.demand
            .totalDemand > 0
      ).length;

    const criticalProducts =
      forecastResults.filter(
        (product) =>
          product.inventory
            .stockStatus ===
          "critical"
      ).length;

    const lowStockProducts =
      forecastResults.filter(
        (product) =>
          product.inventory
            .stockStatus ===
          "low"
      ).length;

    const highRiskProducts =
      forecastResults.filter(
        (product) =>
          product.inventory
            .stockoutRisk ===
          "HIGH"
      ).length;

    const totalHistoricalDemand =
      forecastResults.reduce(
        (
          sum,
          product
        ) =>
          sum +
          product.demand
            .totalDemand,
        0
      );

    return NextResponse.json({
      success: true,

      model: {
        name: "XGBoost",
        service:
          ML_SERVICE_URL,
      },

      horizon: "7d",

      forecastDays: 7,

      history: {
        window:
          historyWindow,

        days:
          historyDays,

        startDate:
          `${startDateKey}T00:00:00+05:30`,

        endDate:
          `${todayKey}T23:59:59+05:30`,
      },

      forecastHorizons:
        FORECAST_HORIZONS,

      summary: {
        products:
          forecastResults.length,

        productsWithDemand,

        criticalProducts,

        lowStockProducts,

        highRiskProducts,

        totalHistoricalDemand:
          round(
            totalHistoricalDemand
          ),

        totalForecast:
          round(
            totalForecast30
          ),

        totalForecast7:
          round(
            totalForecast7
          ),

        totalForecast14:
          round(
            totalForecast14
          ),

        totalForecast30:
          round(
            totalForecast30
          ),
      },

      products:
        forecastResults,
    });
  } catch (error) {
    console.error(
      "[Forecast API Error]",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Unable to generate forecast.";

    if (
      message.includes(
        "fetch failed"
      ) ||
      message.includes(
        "ECONNREFUSED"
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Forecasting ML service is unavailable. Please make sure the FastAPI service is running on port 8000.",
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}