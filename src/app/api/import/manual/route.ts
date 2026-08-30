import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: "Unauthorized." },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { store: true },
    });

    if (!user?.store) {
      return NextResponse.json(
        { success: false, error: "Store setup is incomplete." },
        { status: 400 }
      );
    }

    const body = await request.json();

    const name = String(body.name || "").trim();
    const category = String(body.category || "").trim() || null;
    const unit = String(body.unit || "").trim();

    const costPrice = Number(body.costPrice);
    const sellingPrice = Number(body.sellingPrice);
    const quantity = Number(body.quantity);

    if (!name || !unit) {
      return NextResponse.json(
        { success: false, error: "Product name and unit are required." },
        { status: 400 }
      );
    }

    if (
      !Number.isFinite(costPrice) ||
      costPrice < 0 ||
      !Number.isFinite(sellingPrice) ||
      sellingPrice < 0 ||
      !Number.isFinite(quantity) ||
      quantity < 0
    ) {
      return NextResponse.json(
        { success: false, error: "Invalid numeric values." },
        { status: 400 }
      );
    }

    const product = await prisma.$transaction(async (tx) => {
      const createdProduct = await tx.product.create({
        data: {
          storeId: user.store!.id,
          name,
          category,
          unit,
          costPrice,
          sellingPrice,
          currentStock: quantity,
          minimumStock: 0,
        },
      });

      if (quantity > 0) {
        await tx.inventoryTransaction.create({
          data: {
            storeId: user.store!.id,
            productId: createdProduct.id,
            type: "PURCHASE",
            quantity,
            unit,
            sellingPrice,
            note: "Initial stock imported manually",
          },
        });
      }

      return createdProduct;
    });

    return NextResponse.json({
      success: true,
      message: "Product imported successfully.",
      product: {
        id: product.id,
        name: product.name,
        category: product.category,
        unit: product.unit,
        currentStock: Number(product.currentStock),
      },
    });
  } catch (error) {
    console.error("[Manual Import Error]", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to import product.",
      },
      { status: 500 }
    );
  }
}