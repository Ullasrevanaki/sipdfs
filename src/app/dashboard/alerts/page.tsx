import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import Link from "next/link";

export default async function AlertsPage() {
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

  const outOfStockProducts = products.filter(
    (product) => Number(product.currentStock) <= 0
  );

  const lowStockProducts = products.filter(
    (product) =>
      Number(product.currentStock) > 0 &&
      Number(product.currentStock) <= Number(product.minimumStock)
  );

  const totalAlerts =
    outOfStockProducts.length + lowStockProducts.length;

  return (
    <AppShell
      storeName={user.store.name}
      userName={user.name || "User"}
      userEmail={user.email || ""}
    >
      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-semibold">
          Alerts
        </h1>

        <p className="mt-1 text-sm font-medium text-gray-600">
          {user.store.name}
        </p>

        <p className="mt-2 text-gray-500">
          Important stock conditions that need your attention.
        </p>
      </div>

      {/* SUMMARY CARDS */}
      <div className="mt-8 grid gap-5 md:grid-cols-3">
        <AlertCard
          title="Total Alerts"
          value={totalAlerts.toString()}
        />

        <AlertCard
          title="Out of Stock"
          value={outOfStockProducts.length.toString()}
        />

        <AlertCard
          title="Low Stock"
          value={lowStockProducts.length.toString()}
        />
      </div>

      {/* ALERT LIST */}
      <div className="mt-8 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-5">
          <h2 className="text-lg font-semibold">
            Stock Alerts
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Products that may require your attention.
          </p>
        </div>

        {totalAlerts === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="text-4xl">
              ✓
            </div>

            <h3 className="mt-4 text-lg font-semibold">
              No stock alerts
            </h3>

            <p className="mt-2 text-sm text-gray-500">
              All your products currently have sufficient stock.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {/* OUT OF STOCK */}
            {outOfStockProducts.map((product) => (
              <AlertRow
                key={product.id}
                type="out"
                productId={product.id}
                productName={product.name}
                unit={product.unit}
                currentStock={Number(product.currentStock)}
                minimumStock={Number(product.minimumStock)}
              />
            ))}

            {/* LOW STOCK */}
            {lowStockProducts.map((product) => (
              <AlertRow
                key={product.id}
                type="low"
                productId={product.id}
                productName={product.name}
                unit={product.unit}
                currentStock={Number(product.currentStock)}
                minimumStock={Number(product.minimumStock)}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function AlertCard({
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

function AlertRow({
  type,
  productId,
  productName,
  unit,
  currentStock,
  minimumStock,
}: {
  type: "out" | "low";
  productId: string;
  productName: string;
  unit: string;
  currentStock: number;
  minimumStock: number;
}) {
  const isOutOfStock = type === "out";

  return (
    <div className="flex flex-col gap-5 px-6 py-5 transition hover:bg-gray-50 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-4">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg ${
            isOutOfStock
              ? "bg-red-100 text-red-700"
              : "bg-yellow-100 text-yellow-700"
          }`}
        >
          {isOutOfStock ? "!" : "!"}
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">
              {productName}
            </h3>

            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                isOutOfStock
                  ? "bg-red-100 text-red-700"
                  : "bg-yellow-100 text-yellow-700"
              }`}
            >
              {isOutOfStock
                ? "Out of Stock"
                : "Low Stock"}
            </span>
          </div>

          <p className="mt-2 text-sm text-gray-500">
            Current stock:{" "}
            <span className="font-medium text-gray-700">
              {currentStock} {unit}
            </span>
          </p>

          <p className="mt-1 text-sm text-gray-500">
            Minimum stock:{" "}
            <span className="font-medium text-gray-700">
              {minimumStock} {unit}
            </span>
          </p>
        </div>
      </div>

      <Link
        href={`/dashboard/products/${productId}/edit`}
        className="rounded-lg border border-gray-300 px-4 py-2 text-center text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
      >
        View Product
      </Link>
    </div>
  );
}