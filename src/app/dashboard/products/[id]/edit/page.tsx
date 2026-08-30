import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";

type EditProductPageProps = {
  params: Promise<{
    id: string;
  }>;
};

async function updateProduct(
  productId: string,
  formData: FormData
) {
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

  const name = String(formData.get("name") || "").trim();
  const category = String(formData.get("category") || "").trim();
  const unit = String(formData.get("unit") || "").trim();
  const costPrice = String(formData.get("costPrice") || "").trim();
  const sellingPrice = String(formData.get("sellingPrice") || "").trim();
  const currentStock = String(formData.get("currentStock") || "").trim();
  const minimumStock = String(formData.get("minimumStock") || "").trim();

  if (!name || !unit || !costPrice || !sellingPrice) {
    throw new Error("Required fields are missing.");
  }

  if (Number(costPrice) < 0 || Number(sellingPrice) < 0) {
    throw new Error("Prices cannot be negative.");
  }

  if (currentStock && Number(currentStock) < 0) {
    throw new Error("Current stock cannot be negative.");
  }

  if (minimumStock && Number(minimumStock) < 0) {
    throw new Error("Minimum stock cannot be negative.");
  }

  const product = await prisma.product.findFirst({
    where: {
      id: productId,
      storeId: user.store.id,
    },
  });

  if (!product) {
    notFound();
  }

  await prisma.product.update({
    where: {
      id: productId,
    },
    data: {
      name,
      category: category || null,
      unit,
      costPrice,
      sellingPrice,
      currentStock: currentStock || "0",
      minimumStock: minimumStock || "0",
    },
  });

  redirect("/dashboard/products");
}

export default async function EditProductPage({
  params,
}: EditProductPageProps) {
  const { id } = await params;

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

  const product = await prisma.product.findFirst({
    where: {
      id,
      storeId: user.store.id,
    },
  });

  if (!product) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-gray-50 p-8 text-gray-900">
      <div className="mx-auto max-w-3xl">

        <div>
          <a
            href="/dashboard/products"
            className="text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            ← Back to Products
          </a>

          <h1 className="mt-4 text-3xl font-semibold">
            Edit Product
          </h1>

          <p className="mt-1 text-sm font-medium text-gray-600">
            {user.store.name}
          </p>

          <p className="mt-2 text-gray-500">
            Update the details of this product.
          </p>
        </div>

        <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <form
            action={updateProduct.bind(null, product.id)}
            className="space-y-6"
          >

            {/* Product Name */}
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-semibold text-gray-700"
              >
                Product Name
              </label>

              <input
                id="name"
                name="name"
                type="text"
                required
                defaultValue={product.name}
                className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-gray-900"
              />
            </div>

            {/* Category */}
            <div>
              <label
                htmlFor="category"
                className="block text-sm font-semibold text-gray-700"
              >
                Category
              </label>

              <input
                id="category"
                name="category"
                type="text"
                defaultValue={product.category ?? ""}
                placeholder="Example: Grocery"
                className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-gray-900"
              />

              <p className="mt-1 text-xs text-gray-500">
                Optional. Enter the product category.
              </p>
            </div>

            {/* Unit */}
            <div>
              <label
                htmlFor="unit"
                className="block text-sm font-semibold text-gray-700"
              >
                Unit
              </label>

              <input
                id="unit"
                name="unit"
                type="text"
                required
                defaultValue={product.unit}
                placeholder="Example: kg, litre, packet, piece"
                className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-gray-900"
              />
            </div>

            {/* Prices */}
            <div className="grid gap-6 sm:grid-cols-2">

              <div>
                <label
                  htmlFor="costPrice"
                  className="block text-sm font-semibold text-gray-700"
                >
                  Cost Price
                </label>

                <input
                  id="costPrice"
                  name="costPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  defaultValue={product.costPrice.toString()}
                  className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-gray-900"
                />
              </div>

              <div>
                <label
                  htmlFor="sellingPrice"
                  className="block text-sm font-semibold text-gray-700"
                >
                  Selling Price
                </label>

                <input
                  id="sellingPrice"
                  name="sellingPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  defaultValue={product.sellingPrice.toString()}
                  className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-gray-900"
                />
              </div>

            </div>

            {/* Current Stock */}
            <div>
              <label
                htmlFor="currentStock"
                className="block text-sm font-semibold text-gray-700"
              >
                Current Stock
              </label>

              <input
                id="currentStock"
                name="currentStock"
                type="number"
                min="0"
                step="0.01"
                defaultValue={product.currentStock.toString()}
                className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-gray-900"
              />
            </div>

            {/* Minimum Stock */}
            <div>
              <label
                htmlFor="minimumStock"
                className="block text-sm font-semibold text-gray-700"
              >
                Minimum Stock
              </label>

              <input
                id="minimumStock"
                name="minimumStock"
                type="number"
                min="0"
                step="0.01"
                defaultValue={product.minimumStock.toString()}
                className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-gray-900"
              />

              <p className="mt-1 text-xs text-gray-500">
                The stock level at which the product should be considered low.
              </p>
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-6">

              <a
                href="/dashboard/products"
                className="rounded-lg border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Cancel
              </a>

              <button
                type="submit"
                className="rounded-lg bg-gray-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
              >
                Save Changes
              </button>

            </div>

          </form>
        </div>

      </div>
    </main>
  );
}