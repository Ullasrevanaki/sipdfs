import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

async function deleteProduct(formData: FormData) {
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

  if (!productId) {
    return;
  }

  // Make sure the product belongs to the logged-in user's store
  const product = await prisma.product.findFirst({
    where: {
      id: productId,
      storeId: user.store.id,
    },
  });

  if (!product) {
    return;
  }

  await prisma.product.delete({
    where: {
      id: product.id,
    },
  });

  redirect("/dashboard/products");
}

export default async function ProductsPage() {
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
      createdAt: "desc",
    },
  });

  return (
    <main className="min-h-screen bg-gray-50 p-8 text-gray-900">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold">
              Products
            </h1>

            <p className="mt-1 text-sm font-medium text-gray-600">
              {user.store.name}
            </p>

            <p className="mt-2 text-gray-500">
              Manage the products available in your store.
            </p>
          </div>

          <a
            href="/dashboard/products/new"
            className="rounded-lg bg-gray-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
          >
            + Add Product
          </a>
        </div>

        {/* Product List */}
        <div className="mt-8 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">

          <div className="border-b border-gray-200 px-6 py-5">
            <h2 className="text-lg font-semibold">
              Product List
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              {products.length} product
              {products.length === 1 ? "" : "s"} in your store
            </p>
          </div>

          {products.length === 0 ? (
            <div className="px-6 py-16 text-center">

              <h3 className="text-lg font-semibold">
                No products yet
              </h3>

              <p className="mt-2 text-sm text-gray-500">
                Add your first product to start managing inventory.
              </p>

              <a
                href="/dashboard/products/new"
                className="mt-6 inline-block rounded-lg bg-gray-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
              >
                + Add Product
              </a>

            </div>
          ) : (
            <div className="overflow-x-auto">

              <table className="w-full text-left text-sm">

                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>

                    <th className="px-6 py-4 font-semibold">
                      Product
                    </th>

                    <th className="px-6 py-4 font-semibold">
                      Category
                    </th>

                    <th className="px-6 py-4 font-semibold">
                      Unit
                    </th>

                    <th className="px-6 py-4 font-semibold">
                      Stock
                    </th>

                    <th className="px-6 py-4 font-semibold">
                      Cost Price
                    </th>

                    <th className="px-6 py-4 font-semibold">
                      Selling Price
                    </th>

                    <th className="px-6 py-4 font-semibold">
                      Actions
                    </th>

                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200">

                  {products.map((product) => (
                    <tr
                      key={product.id}
                      className="transition hover:bg-gray-50"
                    >

                      <td className="px-6 py-4 font-semibold">
                        {product.name}
                      </td>

                      <td className="px-6 py-4 text-gray-600">
                        {product.category || "-"}
                      </td>

                      <td className="px-6 py-4 text-gray-600">
                        {product.unit}
                      </td>

                      <td className="px-6 py-4">
                        {product.currentStock.toString()} {product.unit}
                      </td>

                      <td className="px-6 py-4 font-medium">
                        ₹{product.costPrice.toString()}
                      </td>

                      <td className="px-6 py-4 font-medium">
                        ₹{product.sellingPrice.toString()}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">

                          {/* Edit */}
                          <a
                            href={`/dashboard/products/${product.id}/edit`}
                            className="font-semibold text-gray-700 hover:text-gray-950"
                          >
                            Edit
                          </a>

                          {/* Delete */}
                          <form action={deleteProduct}>
                            <input
                              type="hidden"
                              name="productId"
                              value={product.id}
                            />

                            <button
                              type="submit"
                              className="font-semibold text-red-600 hover:text-red-800"
                            >
                              Delete
                            </button>
                          </form>

                        </div>
                      </td>

                    </tr>
                  ))}

                </tbody>

              </table>

            </div>
          )}

        </div>

      </div>
    </main>
  );
}