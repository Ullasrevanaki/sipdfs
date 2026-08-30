import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import Link from "next/link";

export default async function PurchasesPage() {
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

  const purchases = await prisma.inventoryTransaction.findMany({
    where: {
      type: "PURCHASE",
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

  const totalPurchases = purchases.length;

  const totalQuantity = purchases.reduce(
    (total, purchase) => total + Number(purchase.quantity),
    0
  );

  return (
    <AppShell
      storeName={user.store.name}
      userName={user.name || "User"}
      userEmail={user.email || ""}
    >
      {/* HEADER */}
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-3xl font-semibold">
            Purchases
          </h1>

          <p className="mt-1 text-sm font-medium text-gray-600">
            {user.store.name}
          </p>

          <p className="mt-2 text-gray-500">
            Record purchases and track stock coming into your store.
          </p>
        </div>

        <Link
          href="/dashboard/purchases/new"
          className="inline-block rounded-lg bg-gray-900 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-gray-800"
        >
          + Add Purchase
        </Link>
      </div>

      {/* SUMMARY */}
      <div className="mt-8 grid gap-5 md:grid-cols-2">
        <PurchaseCard
          title="Total Purchases"
          value={totalPurchases.toString()}
        />

        <PurchaseCard
          title="Total Quantity Purchased"
          value={totalQuantity.toString()}
        />
      </div>

      {/* PURCHASE HISTORY */}
      <div className="mt-8 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-5">
          <h2 className="text-lg font-semibold">
            Purchase History
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Recent purchases recorded for your store.
          </p>
        </div>

        {purchases.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <h3 className="text-lg font-semibold">
              No purchases yet
            </h3>

            <p className="mt-2 text-sm text-gray-500">
              Record your first purchase to increase inventory.
            </p>

            <Link
              href="/dashboard/purchases/new"
              className="mt-6 inline-block rounded-lg bg-gray-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
            >
              + Add Purchase
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
                    Note
                  </th>

                  <th className="px-6 py-4 font-semibold">
                    Date
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {purchases.map((purchase) => (
                  <tr
                    key={purchase.id}
                    className="transition hover:bg-gray-50"
                  >
                    <td className="px-6 py-4 font-semibold">
                      {purchase.product.name}
                    </td>

                    <td className="px-6 py-4 font-medium">
                      {purchase.quantity.toString()}{" "}
                      {purchase.product.unit}
                    </td>

                    <td className="px-6 py-4 text-gray-600">
                      {purchase.note || "-"}
                    </td>

                    <td className="px-6 py-4 text-gray-600">
                      {purchase.createdAt.toLocaleDateString("en-IN")}
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

function PurchaseCard({
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