import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type CsvRow = {
  date: string;
  product_name: string;
  category: string;
  unit: string;
  cost_price: string;
  selling_price: string;
  quantity: string;
  transaction_type: string;
};

export async function POST(request: Request) {
  try {
    // ---------------------------------------------------------
    // AUTHENTICATION
    // ---------------------------------------------------------

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

    // ---------------------------------------------------------
    // USER + STORE
    // ---------------------------------------------------------

    const user = await prisma.user.findUnique({
      where: {
        email: session.user.email,
      },
      include: {
        store: true,
      },
    });

    if (!user?.store) {
      return NextResponse.json(
        {
          success: false,
          error: "Store setup is incomplete.",
        },
        { status: 400 }
      );
    }

    const storeId = user.store.id;

    // ---------------------------------------------------------
    // REQUEST BODY
    // ---------------------------------------------------------

    const body = await request.json();

    const rows = body.rows as CsvRow[];

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No CSV rows were provided.",
        },
        { status: 400 }
      );
    }

    if (rows.length > 10000) {
      return NextResponse.json(
        {
          success: false,
          error:
            "CSV file contains too many rows. Maximum is 10,000.",
        },
        { status: 400 }
      );
    }

    // ---------------------------------------------------------
    // VALIDATE ALL ROWS
    // ---------------------------------------------------------

    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      const rowNumber = index + 2;

      const name = String(row?.product_name ?? "").trim();
      const category = String(row?.category ?? "").trim();
      const unit = String(row?.unit ?? "").trim();

      const quantity = Number(row?.quantity);
      const costPrice = Number(row?.cost_price);
      const sellingPrice = Number(row?.selling_price);

      const transactionType = String(
        row?.transaction_type ?? ""
      )
        .trim()
        .toUpperCase();

      const dateText = String(row?.date ?? "").trim();

      if (!dateText) {
        return NextResponse.json(
          {
            success: false,
            error: `Row ${rowNumber}: date is required.`,
          },
          { status: 400 }
        );
      }

      const parsedDate = new Date(dateText);

      if (Number.isNaN(parsedDate.getTime())) {
        return NextResponse.json(
          {
            success: false,
            error: `Row ${rowNumber}: date is invalid.`,
          },
          { status: 400 }
        );
      }

      if (!name) {
        return NextResponse.json(
          {
            success: false,
            error:
              `Row ${rowNumber}: product_name is required.`,
          },
          { status: 400 }
        );
      }

      if (!category) {
        return NextResponse.json(
          {
            success: false,
            error:
              `Row ${rowNumber}: category is required.`,
          },
          { status: 400 }
        );
      }

      if (!unit) {
        return NextResponse.json(
          {
            success: false,
            error:
              `Row ${rowNumber}: unit is required.`,
          },
          { status: 400 }
        );
      }

      if (!Number.isFinite(quantity) || quantity <= 0) {
        return NextResponse.json(
          {
            success: false,
            error:
              `Row ${rowNumber}: quantity must be greater than 0.`,
          },
          { status: 400 }
        );
      }

      if (!Number.isFinite(costPrice) || costPrice < 0) {
        return NextResponse.json(
          {
            success: false,
            error:
              `Row ${rowNumber}: cost_price is invalid.`,
          },
          { status: 400 }
        );
      }

      if (
        !Number.isFinite(sellingPrice) ||
        sellingPrice < 0
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              `Row ${rowNumber}: selling_price is invalid.`,
          },
          { status: 400 }
        );
      }

      if (transactionType !== "SALE") {
        return NextResponse.json(
          {
            success: false,
            error:
              `Row ${rowNumber}: transaction_type must be SALE.`,
          },
          { status: 400 }
        );
      }
    }

    // ---------------------------------------------------------
    // LOAD EXISTING PRODUCTS ONCE
    // ---------------------------------------------------------

    const existingProducts = await prisma.product.findMany({
      where: {
        storeId,
      },
      select: {
        id: true,
        name: true,
      },
    });

    const productMap = new Map<string, string>();

    for (const product of existingProducts) {
      productMap.set(
        product.name.trim().toLowerCase(),
        product.id
      );
    }

    // ---------------------------------------------------------
    // CREATE MISSING PRODUCTS
    // ---------------------------------------------------------

    let productsCreated = 0;
    let productsUpdated = 0;

    for (const row of rows) {
      const name = String(row.product_name).trim();
      const key = name.toLowerCase();

      const category = String(row.category).trim();
      const unit = String(row.unit).trim();

      const costPrice = Number(row.cost_price);
      const sellingPrice = Number(row.selling_price);

      const existingProductId = productMap.get(key);

      if (existingProductId) {
        await prisma.product.update({
          where: {
            id: existingProductId,
          },
          data: {
            category,
            unit,
            costPrice,
            sellingPrice,
          },
        });

        productsUpdated++;
        continue;
      }

      const product = await prisma.product.create({
        data: {
          storeId,
          name,
          category,
          unit,
          costPrice,
          sellingPrice,

          // IMPORTANT:
          // Historical sales must not change
          // today's physical inventory.
          currentStock: 0,

          minimumStock: 0,
        },
      });

      productMap.set(key, product.id);
      productsCreated++;
    }

    // ---------------------------------------------------------
    // PREPARE SALES TRANSACTIONS
    // ---------------------------------------------------------

    const transactions = rows.map((row) => {
      const name = String(row.product_name).trim();

      const productId = productMap.get(
        name.toLowerCase()
      );

      if (!productId) {
        throw new Error(
          `Product could not be resolved: ${name}`
        );
      }

      return {
        storeId,
        productId,
        type: "SALE" as const,
        quantity: Number(row.quantity),
        unit: String(row.unit).trim(),
        sellingPrice: Number(row.selling_price),
        soldAt: new Date(row.date),
        note: "Imported from CSV",
      };
    });

    // ---------------------------------------------------------
    // BULK INSERT
    // ---------------------------------------------------------

    const result =
      await prisma.inventoryTransaction.createMany({
        data: transactions,
      });

    // ---------------------------------------------------------
    // SUCCESS
    // ---------------------------------------------------------

    return NextResponse.json({
      success: true,

      message: "CSV imported successfully.",

      importedRows: result.count,

      productsCreated,

      productsUpdated,
    });
  } catch (error) {
    console.error("[CSV Import Error]", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to import CSV data.",
      },
      { status: 500 }
    );
  }
}