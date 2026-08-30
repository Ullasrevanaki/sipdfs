import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import Link from "next/link";

export default async function SalesPage() {
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

  const sales = await prisma.inventoryTransaction.findMany({
    where: {
      type: "SALE",
      product: {
        storeId: user.store.id,
      },
    },
    include: {
      product: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const totalTransactions = sales.length;

  const totalUnitsSold = sales.reduce(
    (total, sale) => total + Number(sale.quantity),
    0
  );

  const uniqueProductsSold = new Set(
    sales.map((sale) => sale.productId)
  ).size;

  return (
    <AppShell
      storeName={user.store.name}
      userName={user.name || "User"}
      userEmail={user.email || ""}
    >
      {/* HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">
            Sales
          </h1>

          <p className="mt-1 text-sm font-medium text-gray-600">
            {user.store.name}
          </p>

          <p className="mt-2 text-gray-500">
            Record and review products sold from your store.
          </p>
        </div>

        <Link
          href="/dashboard/sales/new"
          className="inline-flex w-fit rounded-lg bg-gray-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
        >
          + Add Sale
        </Link>
      </div>

      {/* SUMMARY CARDS */}
      <div className="mt-8 grid gap-5 md:grid-cols-3">
        <SalesCard
          title="Total Transactions"
          value={totalTransactions.toString()}
        />

        <SalesCard
          title="Units Sold"
          value={totalUnitsSold.toString()}
        />

        <SalesCard
          title="Products Sold"
          value={uniqueProductsSold.toString()}
        />
      </div>

      {/* SALES TABLE */}
      <div className="mt-8 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-5">
          <h2 className="text-lg font-semibold">
            Recent Sales
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Products sold and recorded in your inventory.
          </p>
        </div>

        {sales.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <h3 className="text-lg font-semibold">
              No sales recorded
            </h3>

            <p className="mt-2 text-sm text-gray-500">
              Record your first sale to start tracking sales activity.
            </p>

            <Link
              href="/dashboard/sales/new"
              className="mt-6 inline-block rounded-lg bg-gray-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
            >
              + Add Sale
            </Link>
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
                    Quantity
                  </th>

                  <th className="px-6 py-4 font-semibold">
                    Unit
                  </th>

                  <th className="px-6 py-4 font-semibold">
                    Note
                  </th>

                  <th className="px-6 py-4 font-semibold">
                    Date
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {sales.map((sale) => (
                  <tr
                    key={sale.id}
                    className="transition hover:bg-gray-50"
                  >
                    <td className="px-6 py-4 font-semibold">
                      {sale.product.name}
                    </td>

                    <td className="px-6 py-4 font-medium">
                      {sale.quantity.toString()}
                    </td>

                    <td className="px-6 py-4 text-gray-600">
                      {sale.product.unit}
                    </td>

                    <td className="px-6 py-4 text-gray-600">
                      {sale.note || "-"}
                    </td>

                    <td className="px-6 py-4 text-gray-600">
                      {sale.createdAt.toLocaleDateString("en-IN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function SalesCard({
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