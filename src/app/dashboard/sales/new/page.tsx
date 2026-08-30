import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";

async function createSale(formData: FormData) {
  "use server";

  const session = await auth();

  if (!session?.user?.email) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: {
      email: session.user.email,
    },
    include: {
      store: true,
    },
  });

  if (!user) {
    redirect("/login");
  }

  if (!user.store) {
    redirect("/onboarding");
  }

  const productId = String(formData.get("productId") || "").trim();
  const quantityValue = String(formData.get("quantity") || "").trim();
  const soldAtValue = String(formData.get("soldAt") || "").trim();
  const note = String(formData.get("note") || "").trim();

  if (!productId) {
    throw new Error("Product is required.");
  }

  if (!quantityValue) {
    throw new Error("Quantity is required.");
  }

  const quantity = Number(quantityValue);

  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error("Quantity must be greater than zero.");
  }

  const product = await prisma.product.findFirst({
    where: {
      id: productId,
      storeId: user.store.id,
    },
  });

  if (!product) {
    throw new Error("Invalid product selected.");
  }

  const currentStock = Number(product.currentStock);

  if (quantity > currentStock) {
    throw new Error(
      `Insufficient stock. Available stock: ${currentStock} ${product.unit}.`
    );
  }

  const soldAt = soldAtValue
    ? new Date(soldAtValue)
    : new Date();

  if (Number.isNaN(soldAt.getTime())) {
    throw new Error("Invalid sale date.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: {
        id: product.id,
      },
      data: {
        currentStock: {
          decrement: quantity,
        },
      },
    });

    await tx.inventoryTransaction.create({
      data: {
        storeId: user.store!.id,
        productId: product.id,
        type: "SALE",
        quantity: quantity,
        unit: product.unit,
        sellingPrice: product.sellingPrice,
        soldAt,
        note: note || null,
      },
    });
  });

  redirect("/dashboard/sales");
}

export default async function NewSalePage() {
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: {
      email: session.user.email,
    },
    include: {
      store: true,
    },
  });

  if (!user) {
    redirect("/login");
  }

  if (!user.store) {
    redirect("/onboarding");
  }

  const products = await prisma.product.findMany({
    where: {
      storeId: user.store.id,
    },
    orderBy: {
      name: "asc",
    },
  });

  return (
    <main className="min-h-screen bg-gray-50 p-8 text-gray-900">
      <div className="mx-auto max-w-3xl">

        {/* HEADER */}
        <div>
          <Link
            href="/dashboard/sales"
            className="text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            ← Back to Sales
          </Link>

          <h1 className="mt-5 text-3xl font-semibold">
            Add Sale
          </h1>

          <p className="mt-1 text-sm font-medium text-gray-600">
            {user.store.name}
          </p>

          <p className="mt-2 text-gray-500">
            Record a product sale and update inventory.
          </p>
        </div>

        {/* FORM */}
        <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">

          {products.length === 0 ? (
            <div className="py-10 text-center">

              <h2 className="text-lg font-semibold">
                No products available
              </h2>

              <p className="mt-2 text-sm text-gray-500">
                Add a product before recording a sale.
              </p>

              <Link
                href="/dashboard/products/new"
                className="mt-6 inline-block rounded-lg bg-gray-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
              >
                + Add Product
              </Link>

            </div>
          ) : (
            <form action={createSale} className="space-y-6">

              {/* PRODUCT */}
              <div>
                <label
                  htmlFor="productId"
                  className="block text-sm font-semibold text-gray-700"
                >
                  Product
                </label>

                <select
                  id="productId"
                  name="productId"
                  required
                  defaultValue=""
                  className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-gray-900"
                >
                  <option value="" disabled>
                    Select a product
                  </option>

                  {products.map((product) => (
                    <option
                      key={product.id}
                      value={product.id}
                    >
                      {product.name} — Stock:{" "}
                      {product.currentStock.toString()}{" "}
                      {product.unit} — ₹
                      {product.sellingPrice.toString()}
                    </option>
                  ))}
                </select>
              </div>

              {/* QUANTITY */}
              <div>
                <label
                  htmlFor="quantity"
                  className="block text-sm font-semibold text-gray-700"
                >
                  Quantity Sold
                </label>

                <input
                  id="quantity"
                  name="quantity"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  placeholder="Example: 5"
                  className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-gray-900"
                />

                <p className="mt-2 text-xs text-gray-500">
                  Enter how many units were sold.
                </p>
              </div>

              {/* SALE DATE */}
              <div>
                <label
                  htmlFor="soldAt"
                  className="block text-sm font-semibold text-gray-700"
                >
                  Sale Date & Time
                </label>

                <input
                  id="soldAt"
                  name="soldAt"
                  type="datetime-local"
                  defaultValue={new Date(
                    Date.now() -
                      new Date().getTimezoneOffset() * 60000
                  )
                    .toISOString()
                    .slice(0, 16)}
                  className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-gray-900"
                />

                <p className="mt-2 text-xs text-gray-500">
                  This date is used for historical demand analysis
                  and future forecasting.
                </p>
              </div>

              {/* NOTE */}
              <div>
                <label
                  htmlFor="note"
                  className="block text-sm font-semibold text-gray-700"
                >
                  Note
                </label>

                <textarea
                  id="note"
                  name="note"
                  rows={4}
                  placeholder="Optional sale note"
                  className="mt-2 w-full resize-none rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-gray-900"
                />
              </div>

              {/* INFORMATION */}
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-sm font-semibold text-gray-700">
                  What happens when you save?
                </p>

                <ul className="mt-2 space-y-1 text-sm text-gray-500">
                  <li>
                    • Product stock will decrease.
                  </li>

                  <li>
                    • A sale transaction will be recorded.
                  </li>

                  <li>
                    • Quantity, unit and selling price will be stored.
                  </li>

                  <li>
                    • The exact sale date will be stored for forecasting.
                  </li>

                  <li>
                    • Inventory will be updated automatically.
                  </li>
                </ul>
              </div>

              {/* ACTIONS */}
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">

                <Link
                  href="/dashboard/sales"
                  className="rounded-lg border border-gray-300 px-5 py-3 text-center text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                  Cancel
                </Link>

                <button
                  type="submit"
                  className="rounded-lg bg-gray-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
                >
                  Save Sale
                </button>

              </div>

            </form>
          )}

        </div>
      </div>
    </main>
  );
}