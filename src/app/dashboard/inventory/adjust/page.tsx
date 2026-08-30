import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import AppShell from "@/components/layout/AppShell";

async function adjustStock(formData: FormData) {
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
  const adjustmentType = String(
    formData.get("adjustmentType") || ""
  ).trim();
  const quantityValue = String(
    formData.get("quantity") || ""
  ).trim();
  const note = String(formData.get("note") || "").trim();

  if (!productId) {
    throw new Error("Product is required.");
  }

  if (
    adjustmentType !== "ADD" &&
    adjustmentType !== "REMOVE"
  ) {
    throw new Error("Invalid adjustment type.");
  }

  const quantity = Number(quantityValue);

  if (!quantityValue || !Number.isFinite(quantity) || quantity <= 0) {
    throw new Error("Quantity must be greater than zero.");
  }

  const product = await prisma.product.findFirst({
    where: {
      id: productId,
      storeId: user.store.id,
    },
  });

  if (!product) {
    throw new Error("Product not found.");
  }

  const currentStock = Number(product.currentStock);

  if (adjustmentType === "REMOVE" && quantity > currentStock) {
    throw new Error("Cannot remove more stock than currently available.");
  }

  const newStock =
    adjustmentType === "ADD"
      ? currentStock + quantity
      : currentStock - quantity;

  await prisma.$transaction([
    prisma.product.update({
      where: {
        id: product.id,
      },
      data: {
        currentStock: newStock.toString(),
      },
    }),

    prisma.inventoryTransaction.create({
      data: {
        productId: product.id,
        type: "ADJUSTMENT",
        quantity: quantity.toString(),
        note:
          note ||
          (adjustmentType === "ADD"
            ? "Stock added"
            : "Stock removed"),
      },
    }),
  ]);

  redirect("/dashboard/inventory");
}

export default async function InventoryAdjustmentPage() {
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
    <AppShell
      storeName={user.store.name}
      userName={user.name || "User"}
      userEmail={user.email || ""}
    >
      <div className="mx-auto max-w-3xl">
        {/* HEADER */}
        <div>
          <a
            href="/dashboard/inventory"
            className="text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            ← Back to Inventory
          </a>

          <h1 className="mt-5 text-3xl font-semibold">
            Adjust Stock
          </h1>

          <p className="mt-2 text-gray-500">
            Add or remove stock for a product.
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
                Add a product before adjusting inventory.
              </p>

              <a
                href="/dashboard/products/new"
                className="mt-6 inline-block rounded-lg bg-gray-900 px-5 py-3 text-sm font-semibold text-white hover:bg-gray-800"
              >
                + Add Product
              </a>
            </div>
          ) : (
            <form action={adjustStock} className="space-y-6">
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
                  className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-gray-900"
                >
                  <option value="">
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

              {/* ADJUSTMENT TYPE */}
              <div>
                <label
                  htmlFor="adjustmentType"
                  className="block text-sm font-semibold text-gray-700"
                >
                  Adjustment Type
                </label>

                <select
                  id="adjustmentType"
                  name="adjustmentType"
                  required
                  defaultValue="ADD"
                  className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-gray-900"
                >
                  <option value="ADD">
                    Add Stock
                  </option>

                  <option value="REMOVE">
                    Remove Stock
                  </option>
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
                  placeholder="Enter quantity"
                  className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-gray-900"
                />
              </div>

              {/* NOTE */}
              <div>
                <label
                  htmlFor="note"
                  className="block text-sm font-semibold text-gray-700"
                >
                  Note
                  <span className="ml-1 font-normal text-gray-400">
                    (optional)
                  </span>
                </label>

                <textarea
                  id="note"
                  name="note"
                  rows={3}
                  placeholder="Example: Physical stock count"
                  className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-gray-900"
                />
              </div>

              {/* ACTIONS */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  className="rounded-lg bg-gray-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
                >
                  Save Adjustment
                </button>

                <a
                  href="/dashboard/inventory"
                  className="rounded-lg border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                  Cancel
                </a>
              </div>
            </form>
          )}
        </div>
      </div>
    </AppShell>
  );
}