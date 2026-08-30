import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        email: session.user.email,
      },
      select: {
        store: {
          select: {
            id: true,
          },
        },
      },
    });

    const storeId = user?.store?.id;

    if (!storeId) {
      return NextResponse.json(
        {
          success: false,
          error: "Store not found",
        },
        { status: 404 }
      );
    }

    const recommendations =
      await prisma.reorderRecommendation.findMany({
        where: {
          storeId,
          status: "ACTIVE",
        },
        orderBy: [
          { priority: "asc" },
          { createdAt: "desc" },
        ],
        include: {
          product: {
            select: {
              id: true,
              name: true,
              category: true,
              unit: true,
            },
          },
        },
      });

    return NextResponse.json({
      success: true,
      count: recommendations.length,
      recommendations: recommendations.map(
        (item) => ({
          id: item.id,
          productId: item.productId,
          productName: item.product.name,
          category: item.product.category,
          unit: item.product.unit,

          priority: item.priority,
          decision: item.decision,

          currentStock: Number(
            item.currentStock
          ),

          recommendedPurchase: Number(
            item.recommendedQuantity
          ),

          targetStock: Number(
            item.targetStock
          ),

          forecastDemand:
            item.forecastDemand === null
              ? null
              : Number(item.forecastDemand),

          safetyStock:
            item.safetyStock === null
              ? null
              : Number(item.safetyStock),

          reason: item.reason,

          status: item.status,

          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        })
      ),
    });
  } catch (error) {
    console.error(
      "[Recommendation Retrieval API]",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to retrieve recommendations",
      },
      { status: 500 }
    );
  }
}
