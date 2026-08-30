import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import AppShell from "@/components/layout/AppShell";

export default async function InventoryPage() {
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

  const totalProducts = products.length;

  const totalStock = products.reduce(
    (total, product) => total + Number(product.currentStock),
    0
  );

  const lowStockProducts = products.filter(
    (product) =>
      Number(product.currentStock) <= Number(product.minimumStock)
  );

  const outOfStockProducts = products.filter(
    (product) => Number(product.currentStock) <= 0
  );

  return (
    <AppShell
      storeName={user.store.name}
      userName={user.name || "User"}
      userEmail={user.email || ""}
    >
      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-semibold">
          Inventory
        </h1>

        <p className="mt-1 text-sm font-medium text-gray-600">
          {user.store.name}
        </p>

        <p className="mt-2 text-gray-500">
          Monitor and manage the stock available in your store.
        </p>

        <div className="mt-5">
          <a
            href="/dashboard/inventory/adjust"
            className="inline-block rounded-lg bg-gray-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
          >
            Adjust Stock
          </a>
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        <InventoryCard
          title="Total Products"
          value={totalProducts.toString()}
        />

        <InventoryCard
          title="Total Stock"
          value={totalStock.toString()}
        />

        <InventoryCard
          title="Low Stock"
          value={lowStockProducts.length.toString()}
        />

        <InventoryCard
          title="Out of Stock"
          value={outOfStockProducts.length.toString()}
        />
      </div>

      {/* INVENTORY TABLE */}
      <div className="mt-8 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-5">
          <h2 className="text-lg font-semibold">
            Inventory
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Current stock levels for all products.
          </p>
        </div>

        {products.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <h3 className="text-lg font-semibold">
              No products yet
            </h3>

            <p className="mt-2 text-sm text-gray-500">
              Add products first to start managing inventory.
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
                    Unit
                  </th>

                  <th className="px-6 py-4 font-semibold">
                    Current Stock
                  </th>

                  <th className="px-6 py-4 font-semibold">
                    Minimum Stock
                  </th>

                  <th className="px-6 py-4 font-semibold">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {products.map((product) => {
                  const stock = Number(product.currentStock);
                  const minimumStock = Number(product.minimumStock);

                  let status = "In Stock";

                  if (stock <= 0) {
                    status = "Out of Stock";
                  } else if (stock <= minimumStock) {
                    status = "Low Stock";
                  }

                  return (
                    <tr
                      key={product.id}
                      className="transition hover:bg-gray-50"
                    >
                      <td className="px-6 py-4 font-semibold">
                        {product.name}
                      </td>

                      <td className="px-6 py-4 text-gray-600">
                        {product.unit}
                      </td>

                      <td className="px-6 py-4 font-medium">
                        {stock} {product.unit}
                      </td>

                      <td className="px-6 py-4 text-gray-600">
                        {minimumStock} {product.unit}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                            status === "Out of Stock"
                              ? "bg-red-100 text-red-700"
                              : status === "Low Stock"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-green-100 text-green-700"
                          }`}
                        >
                          {status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function InventoryCard({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-gray-500">
        {title}
      </p>

      <p className="mt-3 text-2xl font-semibold">
        {value}
      </p>
    </div>
  );
}