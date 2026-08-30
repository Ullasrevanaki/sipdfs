import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Prisma } from "@/generated/prisma/client";

async function createPurchase(formData: FormData) {
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

  await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: {
        id: product.id,
      },
      data: {
        currentStock: {
          increment: new Prisma.Decimal(quantity),
        },
      },
    });

    await tx.inventoryTransaction.create({
      data: {
        productId: product.id,
        type: "PURCHASE",
        quantity: new Prisma.Decimal(quantity),
        note: note || null,
      },
    });
  });

  redirect("/dashboard/purchases");
}

export default async function NewPurchasePage() {
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
            href="/dashboard/purchases"
            className="text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            ← Back to Purchases
          </Link>

          <h1 className="mt-5 text-3xl font-semibold">
            Add Purchase
          </h1>

          <p className="mt-1 text-sm font-medium text-gray-600">
            {user.store.name}
          </p>

          <p className="mt-2 text-gray-500">
            Record stock received from a supplier.
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
                Add a product before recording a purchase.
              </p>

              <Link
                href="/dashboard/products/new"
                className="mt-6 inline-block rounded-lg bg-gray-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
              >
                + Add Product
              </Link>
            </div>
          ) : (
            <form action={createPurchase} className="space-y-6">

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
                      {product.name} — Current stock:{" "}
                      {product.currentStock.toString()}{" "}
                      {product.unit}
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
                  Quantity
                </label>

                <input
                  id="quantity"
                  name="quantity"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  placeholder="Example: 10"
                  className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-gray-900"
                />

                <p className="mt-2 text-xs text-gray-500">
                  Enter the quantity received from the supplier.
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
                  placeholder="Optional purchase note"
                  className="mt-2 w-full resize-none rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-gray-900"
                />
              </div>

              {/* INFORMATION */}
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-sm font-semibold text-gray-700">
                  What happens when you save?
                </p>

                <ul className="mt-2 space-y-1 text-sm text-gray-500">
                  <li>• Product stock will increase.</li>
                  <li>• A purchase transaction will be recorded.</li>
                  <li>• Inventory will be updated automatically.</li>
                </ul>
              </div>

              {/* ACTIONS */}
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Link
                  href="/dashboard/purchases"
                  className="rounded-lg border border-gray-300 px-5 py-3 text-center text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                  Cancel
                </Link>

                <button
                  type="submit"
                  className="rounded-lg bg-gray-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
                >
                  Save Purchase
                </button>
              </div>

            </form>
          )}
        </div>
      </div>
    </main>
  );
}