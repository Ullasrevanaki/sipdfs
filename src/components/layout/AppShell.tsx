"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: "⌂" },
  { name: "Import Data", href: "/dashboard/import", icon: "↥" },
  { name: "Products", href: "/dashboard/products", icon: "◇" },
  { name: "Sales", href: "/dashboard/sales", icon: "▱" },
  { name: "Purchases", href: "/dashboard/purchases", icon: "▣" },
  { name: "Inventory", href: "/dashboard/inventory", icon: "▤" },
  { name: "Forecast", href: "/dashboard/forecast", icon: "⌁" },
  { name: "Alerts", href: "/dashboard/alerts", icon: "♧" },
  { name: "Reports", href: "/dashboard/reports", icon: "▧" },
  { name: "Settings", href: "/dashboard/settings", icon: "⚙" },
];

export default function AppShell({
  storeName,
  userName,
  userEmail,
  children,
}: {
  storeName: string;
  userName: string;
  userEmail: string;
  children?: React.ReactNode;
}) {
  const pathname = usePathname();
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f8fbfa] text-[#0f172a]">
      <header className="sticky top-0 z-50 h-[88px] border-b border-[#e3ebe8] bg-white">
        <div className="flex h-full items-center justify-between px-6">
          {/* Store Branding */}
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#e8f6f2] text-2xl">
              🛍️
            </div>

            <div>
              <h1 className="text-[19px] font-bold leading-tight text-[#0f172a]">
                {storeName || "Ullas Stores"}
              </h1>

              <p className="mt-1 text-[10px] leading-[12px] text-[#64748b]">
                Smarter Inventory.
                <br />
                Brighter Business.
              </p>
            </div>
          </div>

          {/* Profile */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[#edf0f5] text-lg transition hover:bg-[#e3e7ee]"
              aria-label="User profile"
            >
              👤
            </button>

            {profileOpen && (
              <div className="absolute right-0 top-12 z-50 w-64 rounded-xl border border-[#dfe8e5] bg-white p-4 shadow-xl">
                <div className="border-b border-[#edf1ef] pb-4">
                  <p className="font-semibold text-[#0f172a]">
                    {userName || "User"}
                  </p>

                  <p className="mt-1 break-all text-sm text-[#64748b]">
                    {userEmail}
                  </p>

                  <p className="mt-2 text-sm font-medium text-[#168c70]">
                    {storeName}
                  </p>
                </div>

                <form
                  action="/api/auth/logout"
                  method="POST"
                  className="mt-3"
                >
                  <button
                    type="submit"
                    className="w-full rounded-lg px-4 py-3 text-left text-sm font-semibold text-red-600 transition hover:bg-red-50"
                  >
                    Sign out
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-88px)]">
        {/* Sidebar */}
        <aside className="fixed left-0 top-[88px] z-40 flex h-[calc(100vh-88px)] w-[250px] flex-col border-r border-[#e1ebe8] bg-white">
          <nav className="flex-1 px-3 py-5">
            <ul className="space-y-1.5">
              {navigation.map((item) => {
                const isActive =
                  item.href === "/dashboard"
                    ? pathname === "/dashboard"
                    : pathname.startsWith(item.href);

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`flex items-center gap-4 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                        isActive
                          ? "bg-[#159b7b] text-white shadow-sm"
                          : "text-[#334155] hover:bg-[#eef8f5] hover:text-[#168c70]"
                      }`}
                    >
                      <span
                        className={`flex w-5 justify-center text-base ${
                          isActive
                            ? "text-white"
                            : "text-[#64748b]"
                        }`}
                      >
                        {item.icon}
                      </span>

                      <span>{item.name}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="ml-[250px] min-w-0 flex-1 bg-[#f8fbfa] p-7">
          <div className="mx-auto max-w-[1500px]">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}