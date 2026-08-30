import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const ML_SERVICE_URL =
  process.env.ML_SERVICE_URL || "http://127.0.0.1:8000";

const INDIA_TIME_ZONE = "Asia/Kolkata";

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

type ModelFamily = (typeof MODEL_FAMILIES)[number];

function round(value: number, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function normalize(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, " ");
}

function resolveModelFamily(
  category: string | null,
  productName: string
): ModelFamily {
  const categoryValue = category ? normalize(category) : "";
  const nameValue = productName ? normalize(productName) : "";

  if (
    MODEL_FAMILIES.includes(
      categoryValue as ModelFamily
    )
  ) {
    return categoryValue as ModelFamily;
  }

  const categoryMap: Record<string, ModelFamily> = {
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
    "FROZEN FOOD": "FROZEN FOODS",
    MEAT: "MEATS",
    PERSONAL: "PERSONAL CARE",
    PET: "PET SUPPLIES",
    HOME: "HOME AND KITCHEN I",
    CLEANING: "CLEANING",
    DAIRY: "DAIRY",
    BEAUTY: "BEAUTY",
    POULTRY: "POULTRY",
    SEAFOOD: "SEAFOOD",
    HARDWARE: "HARDWARE",
  };

  if (categoryMap[categoryValue]) {
    return categoryMap[categoryValue];
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

function indiaDateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: INDIA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function dateFromKey(dateKey: string) {
  return new Date(`${dateKey}T00:00:00+05:30`);
}

function addCalendarDays(
  dateKey: string,
  days: number
) {
  const date = dateFromKey(dateKey);

  date.setDate(
    date.getDate() + days
  );

  return date.toISOString().slice(0, 10);
}

async function getMLPrediction(input: {
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
}) {
  const response = await fetch(
    `${ML_SERVICE_URL}/predict`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
      cache: "no-store",
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.detail ||
        data?.error ||
        "ML prediction failed"
    );
  }

  return Number(
    data?.prediction ??
      data?.predicted_demand ??
      data?.forecast ??
      data?.yhat ??
      0
  );
}

/*
 * Layer 8
 *
 * Synchronize the generated recommendations with
 * the persistent ReorderRecommendation table.
 *
 * Same store + same product + ACTIVE:
 *     UPDATE existing record
 *
 * No ACTIVE record:
 *     CREATE new record
 *
 * Existing ACTIVE record no longer recommended:
 *     RESOLVE record
 */
async function persistRecommendations(
  storeId: string,
  recommendations: Array<{
    productId: string;
    productName: string;
    unit: string;
    priority: string;
    currentStock: number;
    recommendedPurchase: number;
    targetStock: number;
    reason: string;
    forecastDemand: number;
    safetyStock: number;
    decision: string;
  }>
) {
  const activeRecommendations =
    await prisma.reorderRecommendation.findMany({
      where: {
        storeId,
        status: "ACTIVE",
      },
      select: {
        id: true,
        productId: true,
      },
    });

  const generatedProductIds =
    new Set(
      recommendations.map(
        (item) => item.productId
      )
    );

  const operations = recommendations.map(
    (recommendation) =>
      prisma.reorderRecommendation.findFirst({
        where: {
          storeId,
          productId:
            recommendation.productId,
          status: "ACTIVE",
        },
      }).then(async (existing) => {
        if (existing) {
          return prisma.reorderRecommendation.update({
            where: {
              id: existing.id,
            },
            data: {
              recommendedQuantity:
                recommendation.recommendedPurchase,

              targetStock:
                recommendation.targetStock,

              currentStock:
                recommendation.currentStock,

              priority:
                recommendation.priority,

              decision:
                recommendation.decision,

              reason:
                recommendation.reason,

              forecastDemand:
                recommendation.forecastDemand,

              safetyStock:
                recommendation.safetyStock,

              status: "ACTIVE",
            },
          });
        }

        return prisma.reorderRecommendation.create({
          data: {
            storeId,

            productId:
              recommendation.productId,

            recommendedQuantity:
              recommendation.recommendedPurchase,

            targetStock:
              recommendation.targetStock,

            currentStock:
              recommendation.currentStock,

            priority:
              recommendation.priority,

            decision:
              recommendation.decision,

            reason:
              recommendation.reason,

            forecastDemand:
              recommendation.forecastDemand,

            safetyStock:
              recommendation.safetyStock,

            status: "ACTIVE",
          },
        });
      })
  );

  await Promise.all(operations);

  const recordsToResolve =
    activeRecommendations.filter(
      (record) =>
        !generatedProductIds.has(
          record.productId
        )
    );

  if (recordsToResolve.length > 0) {
    await prisma.reorderRecommendation.updateMany({
      where: {
        id: {
          in: recordsToResolve.map(
            (record) => record.id
          ),
        },
        status: "ACTIVE",
      },
      data: {
        status: "RESOLVED",
      },
    });
  }
}

/*
 * Layer 8
 *
 * Synchronize generated alerts with the
 * persistent StockAlert table.
 *
 * Same store + product + alert type + ACTIVE:
 *     UPDATE
 *
 * No ACTIVE matching alert:
 *     CREATE
 *
 * Existing active alerts no longer generated:
 *     RESOLVE
 */
async function persistAlerts(
  storeId: string,
  alerts: Array<{
    productId: string;
    productName: string;
    type: string;
    severity: string;
    currentStock: number;
    minimumStock: number;
    message: string;
  }>
) {
  const activeAlerts =
    await prisma.stockAlert.findMany({
      where: {
        storeId,
        status: "ACTIVE",
      },
      select: {
        id: true,
        productId: true,
        alertType: true,
      },
    });

  const generatedKeys =
    new Set(
      alerts.map(
        (alert) =>
          `${alert.productId}:${alert.type}`
      )
    );

  const operations = alerts.map(
    (alert) =>
      prisma.stockAlert.findFirst({
        where: {
          storeId,
          productId:
            alert.productId,
          alertType:
            alert.type,
          status: "ACTIVE",
        },
      }).then(async (existing) => {
        if (existing) {
          return prisma.stockAlert.update({
            where: {
              id: existing.id,
            },
            data: {
              severity:
                alert.severity,

              currentStock:
                alert.currentStock,

              minimumStock:
                alert.minimumStock,

              message:
                alert.message,

              status: "ACTIVE",
            },
          });
        }

        return prisma.stockAlert.create({
          data: {
            storeId,

            productId:
              alert.productId,

            alertType:
              alert.type,

            severity:
              alert.severity,

            currentStock:
              alert.currentStock,

            minimumStock:
              alert.minimumStock,

            message:
              alert.message,

            status: "ACTIVE",
          },
        });
      })
  );

  await Promise.all(operations);

  const recordsToResolve =
    activeAlerts.filter(
      (record) =>
        !generatedKeys.has(
          `${record.productId}:${record.alertType}`
        )
    );

  if (recordsToResolve.length > 0) {
    await prisma.stockAlert.updateMany({
      where: {
        id: {
          in: recordsToResolve.map(
            (record) => record.id
          ),
        },
        status: "ACTIVE",
      },
      data: {
        status: "RESOLVED",
      },
    });
  }
}

export async function GET(
  request: Request
) {
  try {
    const session = await auth();

    /*
     * The current NextAuth session contains the
     * authenticated user's email, but not user.id.
     *
     * Resolve the Prisma user using the email.
     */
    if (!session?.user?.email) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        {
          status: 401,
        }
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
        {
          status: 404,
        }
      );
    }

    if (!user.store) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Store setup is incomplete.",
        },
        {
          status: 400,
        }
      );
    }

    const storeId =
      user.store.id;

    const url =
      new URL(request.url);

    const requestedHistory =
      Number(
        url.searchParams
          .get("history")
          ?.replace("d", "")
      ) || 30;

    const historyDays =
      Math.min(
        365,
        Math.max(
          1,
          requestedHistory
        )
      );

    const productId =
      url.searchParams.get(
        "productId"
      );

    const products =
      await prisma.product.findMany({
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
      });

    if (!products.length) {
      /*
       * Even when no products exist, resolve
       * previously active Layer 8 records.
       */
      await prisma.reorderRecommendation.updateMany({
        where: {
          storeId,
          status: "ACTIVE",
        },
        data: {
          status: "RESOLVED",
        },
      });

      await prisma.stockAlert.updateMany({
        where: {
          storeId,
          status: "ACTIVE",
        },
        data: {
          status: "RESOLVED",
        },
      });

      return NextResponse.json({
        success: true,

        intelligence: {
          products: [],
          recommendations: [],
          alerts: [],
        },

        summary: {
          products: 0,
          critical: 0,
          lowStock: 0,
          highRisk: 0,
          buy: 0,
          monitor: 0,
          noAction: 0,
          totalRecommendedPurchase: 0,
        },
      });
    }

    const endDate =
      new Date();

    const startDate =
      new Date(endDate);

    startDate.setDate(
      startDate.getDate() -
        historyDays
    );

    const sales =
      await prisma.inventoryTransaction.findMany({
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
      });

    const dailyDemand =
      new Map<
        string,
        Map<string, number>
      >();

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
        dailyDemand.set(
          dateKey,
          new Map()
        );
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
        (productMap.get(
          sale.productId
        ) || 0) + quantity
      );
    }

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
          (storeNbr * 31 +
            storeId.charCodeAt(
              i
            )) %
          100000;
      }
    }

    storeNbr =
      Math.max(
        1,
        storeNbr
      );

    const todayKey =
      indiaDateKey(
        new Date()
      );

    const intelligenceProducts: any[] =
      [];

    const recommendations: any[] =
      [];

    const alerts: any[] =
      [];

    /*
     * Calculate intelligence first.
     *
     * We intentionally do NOT write to the database
     * inside this loop.
     */
    for (const product of products) {
      const family =
        resolveModelFamily(
          product.category,
          product.name
        );

      const getDemand =
        (daysAgo: number) => {
          const key =
            addCalendarDays(
              todayKey,
              -daysAgo
            );

          return Number(
            dailyDemand
              .get(key)
              ?.get(product.id) ||
              0
          );
        };

      const values: number[] =
        [];

      for (
        let i = 1;
        i <= historyDays;
        i++
      ) {
        values.push(
          getDemand(i)
        );
      }

      const averageDailyDemand =
        values.length
          ? values.reduce(
              (
                sum,
                value
              ) =>
                sum + value,
              0
            ) /
            values.length
          : 0;

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
              getDemand(i)
            );
          }

          if (!list.length) {
            return 0;
          }

          return (
            list.reduce(
              (
                sum,
                value
              ) =>
                sum + value,
              0
            ) /
            list.length
          );
        };

      const lag1 =
        getDemand(1);

      const lag7 =
        historyDays >= 7
          ? getDemand(7)
          : averageDailyDemand;

      const lag14 =
        historyDays >= 14
          ? getDemand(14)
          : averageDailyDemand;

      const lag28 =
        historyDays >= 28
          ? getDemand(28)
          : averageDailyDemand;

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
          await getMLPrediction({
            store_nbr:
              storeNbr,

            family,

            onpromotion:
              0,

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
          });
      } catch (error) {
        console.error(
          `[Inventory Intelligence] ML prediction failed for ${product.name}:`,
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

      const forecast7 =
        forecastDailyDemand *
        7;

      const forecast14 =
        forecastDailyDemand *
        14;

      const forecast30 =
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

      const safetyStock =
        minimumStock;

      const targetStock =
        forecast30 +
        safetyStock;

      const recommendedPurchase =
        Math.max(
          0,
          targetStock -
            currentStock
        );

      const daysUntilStockout =
        forecastDailyDemand >
          0 &&
        currentStock > 0
          ? currentStock /
            forecastDailyDemand
          : null;

      let stockStatus:
        | "critical"
        | "low"
        | "adequate"
        | "no_demand";

      if (
        forecastDailyDemand ===
        0
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
        daysUntilStockout !==
          null &&
        daysUntilStockout < 7
      ) {
        stockStatus =
          "critical";
      } else {
        stockStatus =
          "adequate";
      }

      let stockoutRisk:
        | "HIGH"
        | "MEDIUM"
        | "LOW"
        | "NO_RISK";

      if (
        forecastDailyDemand <=
        0
      ) {
        stockoutRisk =
          "NO_RISK";
      } else if (
        daysUntilStockout !==
          null &&
        daysUntilStockout < 7
      ) {
        stockoutRisk =
          "HIGH";
      } else if (
        daysUntilStockout !==
          null &&
        daysUntilStockout < 14
      ) {
        stockoutRisk =
          "MEDIUM";
      } else {
        stockoutRisk =
          "LOW";
      }

      let inventoryDecision:
        | "BUY"
        | "MONITOR"
        | "NO_ACTION";

      if (
        stockoutRisk ===
          "HIGH" ||
        recommendedPurchase > 0
      ) {
        inventoryDecision =
          "BUY";
      } else if (
        stockoutRisk ===
        "MEDIUM"
      ) {
        inventoryDecision =
          "MONITOR";
      } else {
        inventoryDecision =
          "NO_ACTION";
      }

      const firstHalf =
        values.slice(
          Math.floor(
            values.length / 2
          )
        );

      const secondHalf =
        values.slice(
          0,
          Math.floor(
            values.length / 2
          )
        );

      const firstAverage =
        firstHalf.length
          ? firstHalf.reduce(
              (
                sum,
                value
              ) =>
                sum + value,
              0
            ) /
            firstHalf.length
          : 0;

      const secondAverage =
        secondHalf.length
          ? secondHalf.reduce(
              (
                sum,
                value
              ) =>
                sum + value,
              0
            ) /
            secondHalf.length
          : 0;

      let trend:
        | "increasing"
        | "decreasing"
        | "stable";

      if (
        firstAverage > 0 &&
        secondAverage >
          firstAverage * 1.1
      ) {
        trend =
          "increasing";
      } else if (
        firstAverage > 0 &&
        secondAverage <
          firstAverage * 0.9
      ) {
        trend =
          "decreasing";
      } else {
        trend =
          "stable";
      }

      const priority =
        stockoutRisk === "HIGH"
          ? "HIGH"
          : stockStatus ===
              "critical"
            ? "HIGH"
            : stockStatus ===
                "low"
              ? "MEDIUM"
              : "LOW";

      const intelligence = {
        productId:
          product.id,

        productName:
          product.name,

        category:
          product.category,

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

        demand: {
          daily:
            round(
              forecastDailyDemand
            ),

          next7Days:
            round(
              forecast7
            ),

          next14Days:
            round(
              forecast14
            ),

          next30Days:
            round(
              forecast30
            ),

          historicalAverage:
            round(
              averageDailyDemand
            ),

          trend,
        },

        risk: {
          stockStatus,

          stockoutRisk,

          estimatedDaysUntilStockout:
            daysUntilStockout ===
            null
              ? null
              : round(
                  daysUntilStockout
                ),

          priority,
        },

        reorder: {
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

          decision:
            inventoryDecision,
        },

        model: {
          family,

          service:
            ML_SERVICE_URL,
        },
      };

      intelligenceProducts.push(
        intelligence
      );

      if (
        recommendedPurchase > 0
      ) {
        recommendations.push({
          productId:
            product.id,

          productName:
            product.name,

          unit:
            product.unit,

          priority,

          currentStock:
            round(
              currentStock
            ),

          recommendedPurchase:
            round(
              recommendedPurchase
            ),

          targetStock:
            round(
              targetStock
            ),

          reason:
            currentStock <= 0
              ? "Product is out of stock."
              : currentStock <
                  minimumStock
                ? "Stock is below the minimum level."
                : "Forecasted demand requires replenishment.",

          forecastDemand:
            round(
              forecast30
            ),

          safetyStock:
            round(
              safetyStock
            ),

          decision:
            inventoryDecision,
        });
      }

      if (
        stockStatus ===
          "critical" ||
        stockoutRisk ===
          "HIGH"
      ) {
        alerts.push({
          productId:
            product.id,

          productName:
            product.name,

          type:
            currentStock <= 0
              ? "OUT_OF_STOCK"
              : "STOCKOUT_RISK",

          severity:
            stockoutRisk ===
            "HIGH"
              ? "HIGH"
              : "MEDIUM",

          currentStock:
            round(
              currentStock
            ),

          minimumStock:
            round(
              minimumStock
            ),

          estimatedDaysUntilStockout:
            daysUntilStockout ===
            null
              ? null
              : round(
                  daysUntilStockout
                ),

          message:
            currentStock <= 0
              ? `${product.name} is out of stock.`
              : `${product.name} may run out of stock soon.`,
        });
      }
    }

    /*
     * ---------------------------------------------------------
     * LAYER 8 PERSISTENCE
     * ---------------------------------------------------------
     *
     * At this point all intelligence has been calculated.
     *
     * Now synchronize recommendations and alerts with
     * PostgreSQL.
     */

    await persistRecommendations(
      storeId,
      recommendations
    );

    await persistAlerts(
      storeId,
      alerts
    );

    const critical =
      intelligenceProducts.filter(
        (product) =>
          product.risk
            .stockStatus ===
          "critical"
      ).length;

    const lowStock =
      intelligenceProducts.filter(
        (product) =>
          product.risk
            .stockStatus ===
          "low"
      ).length;

    const highRisk =
      intelligenceProducts.filter(
        (product) =>
          product.risk
            .stockoutRisk ===
          "HIGH"
      ).length;

    const buy =
      intelligenceProducts.filter(
        (product) =>
          product.reorder
            .decision ===
          "BUY"
      ).length;

    const monitor =
      intelligenceProducts.filter(
        (product) =>
          product.reorder
            .decision ===
          "MONITOR"
      ).length;

    const noAction =
      intelligenceProducts.filter(
        (product) =>
          product.reorder
            .decision ===
          "NO_ACTION"
      ).length;

    const totalRecommendedPurchase =
      recommendations.reduce(
        (
          sum,
          recommendation
        ) =>
          sum +
          recommendation.recommendedPurchase,
        0
      );

    return NextResponse.json({
      success: true,

      model: {
        name: "XGBoost",
        service:
          ML_SERVICE_URL,
      },

      history: {
        days:
          historyDays,

        startDate:
          indiaDateKey(
            startDate
          ),

        endDate:
          indiaDateKey(
            endDate
          ),
      },

      summary: {
        products:
          intelligenceProducts.length,

        critical,

        lowStock,

        highRisk,

        buy,

        monitor,

        noAction,

        totalRecommendedPurchase:
          round(
            totalRecommendedPurchase
          ),
      },

      intelligence:
        intelligenceProducts,

      recommendations,

      alerts,
    });
  } catch (error) {
    console.error(
      "[Inventory Intelligence API]",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Inventory intelligence failed",
      },
      {
        status: 500,
      }
    );
  }
}