"use client";

import { useState } from "react";

const navigation = [
  "Dashboard",
  "Products",
  "Sales",
  "Purchases",
  "Inventory",
  "Forecast",
  "Alerts",
  "Reports",
  "Settings",
];

export default function AppShell({
  storeName,
  userName,
  userEmail,
}: {
  storeName: string;
  userName: string;
  userEmail: string;
}) {
  const [activePage, setActivePage] = useState("Dashboard");
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

          {/* Dark / Bright Mode */}
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
                {/* User information */}
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

                {/* Logout */}
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
              {navigation.map((item) => (
                <li key={item}>
                  <button
                    type="button"
                    onClick={() => setActivePage(item)}
                    className={`w-full rounded-lg px-4 py-3 text-left text-sm font-medium transition ${
                      activePage === item
                        ? darkMode
                          ? "bg-white text-gray-900"
                          : "bg-gray-900 text-white"
                        : darkMode
                        ? "text-gray-300 hover:bg-gray-800 hover:text-white"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    }`}
                  >
                    {item}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1 p-8">
          <div className="mx-auto max-w-7xl">

            {/* PAGE TITLE */}
            <h1 className="text-3xl font-semibold">
              {activePage}
            </h1>

            {/* STORE NAME */}
            {activePage === "Dashboard" && (
              <p
                className={`mt-1 text-sm font-medium ${
                  darkMode
                    ? "text-gray-300"
                    : "text-gray-600"
                }`}
              >
                {storeName}
              </p>
            )}

            {/* DESCRIPTION */}
            <p
              className={`mt-2 ${
                darkMode
                  ? "text-gray-400"
                  : "text-gray-500"
              }`}
            >
              {activePage === "Dashboard"
                ? "Overview of your store inventory and operations."
                : `${activePage} module`}
            </p>

            {/* DASHBOARD CARDS */}
            {activePage === "Dashboard" && (
              <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-4">

                <DashboardCard
                  title="Total Products"
                  value="—"
                  darkMode={darkMode}
                />

                <DashboardCard
                  title="Current Stock"
                  value="—"
                  darkMode={darkMode}
                />

                <DashboardCard
                  title="Low Stock"
                  value="—"
                  darkMode={darkMode}
                />

                <DashboardCard
                  title="Stock-out Risk"
                  value="—"
                  darkMode={darkMode}
                />

              </div>
            )}

            {/* MODULE PLACEHOLDER */}
            {activePage !== "Dashboard" && (
              <div
                className={`mt-8 rounded-xl border p-8 ${
                  darkMode
                    ? "border-gray-800 bg-[#111827]"
                    : "border-gray-200 bg-white"
                }`}
              >
                <h2 className="text-xl font-semibold">
                  {activePage}
                </h2>

                <p
                  className={`mt-2 ${
                    darkMode
                      ? "text-gray-400"
                      : "text-gray-500"
                  }`}
                >
                  This module will be implemented in the next
                  development layer.
                </p>
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}

function DashboardCard({
  title,
  value,
  darkMode,
}: {
  title: string;
  value: string;
  darkMode: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-5 shadow-sm transition-colors ${
        darkMode
          ? "border-gray-800 bg-[#111827]"
          : "border-gray-200 bg-white"
      }`}
    >
      <p
        className={`text-sm ${
          darkMode
            ? "text-gray-400"
            : "text-gray-500"
        }`}
      >
        {title}
      </p>

      <p className="mt-3 text-2xl font-semibold">
        {value}
      </p>
    </div>
  );
}