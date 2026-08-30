"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
  },
  {
    name: "Import Data",
    href: "/dashboard/import",
  },
  {
    name: "Products",
    href: "/dashboard/products",
  },
  {
    name: "Sales",
    href: "/dashboard/sales",
  },
  {
    name: "Purchases",
    href: "/dashboard/purchases",
  },
  {
    name: "Inventory",
    href: "/dashboard/inventory",
  },
  {
    name: "Forecast",
    href: "/dashboard/forecast",
  },
  {
    name: "Alerts",
    href: "/dashboard/alerts",
  },
  {
    name: "Reports",
    href: "/dashboard/reports",
  },
  {
    name: "Settings",
    href: "/dashboard/settings",
  },
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

  const [darkMode, setDarkMode] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        darkMode
          ? "bg-[#0b1120] text-white"
          : "bg-gray-50 text-gray-900"
      }`}
    >
      {/* TOP BAR */}
      <header
        className={`flex h-16 items-center justify-end border-b px-6 ${
          darkMode
            ? "border-gray-800 bg-[#0b1120]"
            : "border-gray-200 bg-white"
        }`}
      >
        <div className="flex items-center gap-4">

          {/* Notifications */}
          <button
            type="button"
            className={`flex h-10 w-10 items-center justify-center rounded-full text-xl transition ${
              darkMode
                ? "hover:bg-gray-800"
                : "hover:bg-gray-100"
            }`}
            aria-label="Notifications"
          >
            🔔
          </button>

          {/* Theme */}
          <button
            type="button"
            onClick={() => setDarkMode(!darkMode)}
            className={`flex h-10 w-10 items-center justify-center rounded-full text-lg transition ${
              darkMode
                ? "bg-gray-800 hover:bg-gray-700"
                : "bg-gray-100 hover:bg-gray-200"
            }`}
            aria-label="Toggle theme"
            title={darkMode ? "Bright mode" : "Dark mode"}
          >
            {darkMode ? "☀️" : "🌙"}
          </button>

          {/* PROFILE */}
          <div className="relative">

            <button
              type="button"
              onClick={() => setProfileOpen(!profileOpen)}
              className={`flex h-10 w-10 items-center justify-center rounded-full transition ${
                darkMode
                  ? "bg-gray-800 hover:bg-gray-700"
                  : "bg-gray-200 hover:bg-gray-300"
              }`}
              aria-label="User profile"
            >
              👤
            </button>

            {/* PROFILE DROPDOWN */}
            {profileOpen && (
              <div
                className={`absolute right-0 top-12 z-50 w-64 rounded-xl border p-4 shadow-xl ${
                  darkMode
                    ? "border-gray-700 bg-[#111827]"
                    : "border-gray-200 bg-white"
                }`}
              >
                <div className="border-b pb-4">

                  <p
                    className={`font-semibold ${
                      darkMode
                        ? "text-white"
                        : "text-gray-900"
                    }`}
                  >
                    {userName || "User"}
                  </p>

                  <p
                    className={`mt-1 break-all text-sm ${
                      darkMode
                        ? "text-gray-400"
                        : "text-gray-500"
                    }`}
                  >
                    {userEmail}
                  </p>

                  <p
                    className={`mt-2 text-sm font-medium ${
                      darkMode
                        ? "text-gray-300"
                        : "text-gray-600"
                    }`}
                  >
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
                    className={`w-full rounded-lg px-4 py-3 text-left text-sm font-semibold transition ${
                      darkMode
                        ? "text-red-400 hover:bg-gray-800"
                        : "text-red-600 hover:bg-red-50"
                    }`}
                  >
                    Sign out
                  </button>
                </form>
              </div>
            )}

          </div>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-4rem)]">

        {/* SIDEBAR */}
        <aside
          className={`w-60 border-r transition-colors ${
            darkMode
              ? "border-gray-800 bg-[#111827]"
              : "border-gray-200 bg-white"
          }`}
        >
          <nav className="p-4">
            <ul className="space-y-1">

              {navigation.map((item) => {
                const isActive =
                  item.href === "/dashboard"
                    ? pathname === "/dashboard"
                    : pathname.startsWith(item.href);

                return (
                  <li key={item.href}>

                    <Link
                      href={item.href}
                      className={`block w-full rounded-lg px-4 py-3 text-left text-sm font-medium transition ${
                        isActive
                          ? darkMode
                            ? "bg-white text-gray-900"
                            : "bg-gray-900 text-white"
                          : darkMode
                          ? "text-gray-300 hover:bg-gray-800 hover:text-white"
                          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                      }`}
                    >
                      {item.name}
                    </Link>

                  </li>
                );
              })}

            </ul>
          </nav>
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1 p-8">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>

      </div>
    </div>
  );
}