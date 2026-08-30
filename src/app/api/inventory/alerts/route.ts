import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
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
        { success: false, error: "Store not found" },
        { status: 404 }
      );
    }

    const alerts = await prisma.stockAlert.findMany({
      where: {
        storeId,
        status: "ACTIVE",
      },
      orderBy: {
        createdAt: "desc",
      },
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
      count: alerts.length,
      alerts: alerts.map((alert) => ({
        id: alert.id,
        productId: alert.productId,
        productName: alert.product.name,
        category: alert.product.category,
        unit: alert.product.unit,

        alertType: alert.alertType,
        severity: alert.severity,

        currentStock: Number(
          alert.currentStock
        ),

        minimumStock: Number(
          alert.minimumStock
        ),

        message: alert.message,
        status: alert.status,

        createdAt: alert.createdAt,
        updatedAt: alert.updatedAt,
      })),
    });
  } catch (error) {
    console.error(
      "[Alert Retrieval API]",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to retrieve alerts",
      },
      { status: 500 }
    );
  }
}