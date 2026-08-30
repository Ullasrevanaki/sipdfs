import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

async function createCategory(formData: FormData) {
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

  if (!name) {
    return;
  }

  // Check whether this category already exists
  // among products in the current store.
  const existingProducts = await prisma.product.findMany({
    where: {
      storeId: user.store.id,
      category: {
        not: null,
      },
    },
    select: {
      category: true,
    },
  });

  const exists = existingProducts.some(
    (product) =>
      product.category?.toLowerCase() === name.toLowerCase()
  );

  if (exists) {
    return;
  }

  // Categories are represented by Product.category.
  // There is no separate Category table in the current schema.
  //
  // We create a placeholder product only to preserve the category
  // in the current database design.
  await prisma.product.create({
    data: {
      storeId: user.store.id,
      name: `Category: ${name}`,
      category: name,
      unit: "unit",
      costPrice: 0,
      sellingPrice: 0,
      currentStock: 0,
      minimumStock: 0,
    },
  });

  redirect("/dashboard/categories");
}

async function deleteCategory(formData: FormData) {
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

  const category = String(formData.get("category") || "").trim();

  if (!category) {
    return;
  }

  // Remove the category from products belonging to this store.
  await prisma.product.updateMany({
    where: {
      storeId: user.store.id,
      category: category,
    },
    data: {
      category: null,
    },
  });

  redirect("/dashboard/categories");
}

export default async function CategoriesPage() {
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
      category: {
        not: null,
      },
    },
    select: {
      category: true,
    },
  });

  const categoryMap = new Map<string, number>();

  for (const product of products) {
    if (!product.category) {
      continue;
    }

    const existing = categoryMap.get(product.category) || 0;
    categoryMap.set(product.category, existing + 1);
  }

  const categories = Array.from(categoryMap.entries())
    .map(([name, productCount]) => ({
      name,
      productCount,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <main className="min-h-screen bg-gray-50 p-8 text-gray-900">
      <div className="mx-auto max-w-5xl">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-semibold">
            Categories
          </h1>

          <p className="mt-1 text-sm font-medium text-gray-600">
            {user.store.name}
          </p>

          <p className="mt-2 text-gray-500">
            Organize your products into categories.
          </p>
        </div>

        {/* Add Category */}
        <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">
            Add Category
          </h2>

          <form
            action={createCategory}
            className="mt-4 flex flex-col gap-3 sm:flex-row"
          >
            <input
              type="text"
              name="name"
              required
              placeholder="Example: Grocery"
              className="flex-1 rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-gray-900"
            />

            <button
              type="submit"
              className="rounded-lg bg-gray-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
            >
              Add Category
            </button>
          </form>
        </div>

        {/* Category List */}
        <div className="mt-8 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">

          <div className="border-b border-gray-200 px-6 py-5">
            <h2 className="text-lg font-semibold">
              Category List
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              {categories.length} categor
              {categories.length === 1 ? "y" : "ies"} in your store
            </p>
          </div>

          {categories.length === 0 ? (
            <div className="px-6 py-16 text-center">

              <h3 className="text-lg font-semibold">
                No categories yet
              </h3>

              <p className="mt-2 text-sm text-gray-500">
                Create your first category to organize your products.
              </p>

            </div>
          ) : (
            <div className="divide-y divide-gray-200">

              {categories.map((category) => (
                <div
                  key={category.name}
                  className="flex items-center justify-between px-6 py-5 transition hover:bg-gray-50"
                >

                  <div>
                    <p className="font-semibold">
                      {category.name}
                    </p>

                    <p className="mt-1 text-sm text-gray-500">
                      {category.productCount} product
                      {category.productCount === 1 ? "" : "s"}
                    </p>
                  </div>

                  <form action={deleteCategory}>
                    <input
                      type="hidden"
                      name="category"
                      value={category.name}
                    />

                    <button
                      type="submit"
                      className="rounded-lg px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </form>

                </div>
              ))}

            </div>
          )}

        </div>

      </div>
    </main>
  );
}