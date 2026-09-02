"use client";

import { useState } from "react";
import GroceryMarketMarquee from "@/components/GroceryMarketMarquee";

function Toggle({
  darkMode,
  setDarkMode,
}: {
  darkMode: boolean;
  setDarkMode: (value: boolean) => void;
}) {
  return (
    <button
      onClick={() => setDarkMode(!darkMode)}
      aria-label="Toggle dark and light mode"
      className={`relative flex h-8 w-[58px] items-center rounded-full border p-1 transition-all duration-300 ${
        darkMode
          ? "border-blue-400/30 bg-slate-800"
          : "border-slate-300 bg-slate-200"
      }`}
    >
      <span
        className={`absolute left-2 text-[13px] ${
          darkMode ? "opacity-100" : "opacity-40"
        }`}
      >
        ☾
      </span>

      <span
        className={`absolute right-2 text-[13px] ${
          darkMode ? "opacity-40" : "opacity-100"
        }`}
      >
        ☀
      </span>

      <span
        className={`relative z-10 h-6 w-6 rounded-full bg-white shadow-md transition-transform duration-300 ${
          darkMode ? "translate-x-[26px]" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function DashboardPreview({ darkMode }: { darkMode: boolean }) {
  return (
    <div
      className={`rounded-2xl border p-4 shadow-2xl backdrop-blur-xl ${
        darkMode
          ? "border-white/10 bg-[#111d2e]/95"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="mb-4 flex items-center justify-between">
        <h3
          className={`text-sm font-bold ${
            darkMode ? "text-white" : "text-slate-900"
          }`}
        >
          Dashboard
        </h3>

        <button
          className={`rounded-md px-3 py-1 text-[10px] ${
            darkMode
              ? "bg-white/5 text-slate-400"
              : "bg-slate-100 text-slate-600"
          }`}
        >
          This Month⌄
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {[
          ["Total Products", "1,248", "+12.5%"],
          ["Inventory Value", "₹8,42,230", "+8.1%"],
          ["Today's Sales", "₹46,320", "+15.3%"],
          ["Low Stock Items", "32", "-6"],
        ].map(([label, value, change]) => (
          <div
            key={label}
            className={`rounded-lg border p-3 ${
              darkMode
                ? "border-white/5 bg-[#172337]"
                : "border-slate-100 bg-slate-50"
            }`}
          >
            <p
              className={`text-[9px] ${
                darkMode ? "text-slate-400" : "text-slate-500"
              }`}
            >
              {label}
            </p>

            <p
              className={`mt-2 text-sm font-bold ${
                darkMode ? "text-white" : "text-slate-900"
              }`}
            >
              {value}
            </p>

            <p className="mt-1 text-[8px] text-emerald-500">
              {change}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <div
          className={`rounded-lg border p-3 ${
            darkMode
              ? "border-white/5 bg-[#172337]"
              : "border-slate-100 bg-slate-50"
          }`}
        >
          <p
            className={`text-[10px] font-semibold ${
              darkMode ? "text-white" : "text-slate-800"
            }`}
          >
            Sales Trend
          </p>

          <div className="mt-3 h-28">
            <svg
              viewBox="0 0 300 100"
              className="h-full w-full"
              preserveAspectRatio="none"
            >
              <path
                d="M0 78 L18 66 L34 74 L51 61 L67 68 L84 44 L100 58 L116 51 L132 59 L148 28 L165 51 L182 37 L198 46 L215 35 L232 51 L249 25 L266 42 L284 32 L300 38"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                className="text-blue-500"
              />

              <path
                d="M0 88 L25 80 L50 82 L75 69 L100 73 L125 61 L150 67 L175 57 L200 64 L225 48 L250 55 L275 44 L300 48"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray="5 5"
                className="text-emerald-500"
              />
            </svg>
          </div>

          <div
            className={`mt-1 flex justify-between text-[7px] ${
              darkMode ? "text-slate-500" : "text-slate-400"
            }`}
          >
            <span>May 1</span>
            <span>May 8</span>
            <span>May 15</span>
            <span>May 22</span>
            <span>May 29</span>
          </div>
        </div>

        <div
          className={`rounded-lg border p-3 ${
            darkMode
              ? "border-white/5 bg-[#172337]"
              : "border-slate-100 bg-slate-50"
          }`}
        >
          <p
            className={`text-[10px] font-semibold ${
              darkMode ? "text-white" : "text-slate-800"
            }`}
          >
            Demand Forecast (Next 30 Days)
          </p>

          <div className="mt-3 flex h-28 items-end gap-1">
            {[
              35, 42, 48, 52, 61, 65, 72, 79, 70, 83,
              89, 74, 68, 81, 76, 92, 72, 86, 79, 96,
            ].map((height, index) => (
              <div
                key={index}
                className="flex-1 rounded-t-sm bg-blue-500"
                style={{ height: `${height}%` }}
              />
            ))}
          </div>

          <div
            className={`mt-1 flex justify-between text-[7px] ${
              darkMode ? "text-slate-500" : "text-slate-400"
            }`}
          >
            <span>Jun 1</span>
            <span>Jun 8</span>
            <span>Jun 15</span>
            <span>Jun 22</span>
            <span>Jun 29</span>
          </div>
        </div>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <div
          className={`rounded-lg border p-3 ${
            darkMode
              ? "border-white/5 bg-[#172337]"
              : "border-slate-100 bg-slate-50"
          }`}
        >
          <p
            className={`text-[10px] font-semibold ${
              darkMode ? "text-white" : "text-slate-800"
            }`}
          >
            Inventory Health
          </p>

          <div className="mt-3 flex items-center gap-5">
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full border-[6px] border-emerald-400">
              <div className="text-center">
                <p
                  className={`text-sm font-bold ${
                    darkMode ? "text-white" : "text-slate-900"
                  }`}
                >
                  72%
                </p>

                <p className="text-[7px] text-slate-500">
                  Healthy
                </p>
              </div>
            </div>

            <div className="space-y-2 text-[8px]">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <span
                  className={
                    darkMode
                      ? "text-slate-300"
                      : "text-slate-600"
                  }
                >
                  Healthy
                </span>
                <span className="ml-auto">72%</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                <span
                  className={
                    darkMode
                      ? "text-slate-300"
                      : "text-slate-600"
                  }
                >
                  Low Stock
                </span>
                <span className="ml-auto">20%</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-red-400" />
                <span
                  className={
                    darkMode
                      ? "text-slate-300"
                      : "text-slate-600"
                  }
                >
                  Out of Stock
                </span>
                <span className="ml-auto">8%</span>
              </div>
            </div>
          </div>
        </div>

        <div
          className={`rounded-lg border p-3 ${
            darkMode
              ? "border-white/5 bg-[#172337]"
              : "border-slate-100 bg-slate-50"
          }`}
        >
          <p
            className={`text-[10px] font-semibold ${
              darkMode ? "text-white" : "text-slate-800"
            }`}
          >
            Top Selling Products
          </p>

          <div className="mt-3 space-y-3">
            {[
              ["Basmati Rice 1kg", "1,250", "90%"],
              ["Sunflower Oil 1L", "980", "72%"],
              ["Sugar 1kg", "860", "62%"],
              ["Wheat Flour 1kg", "720", "48%"],
            ].map(([name, value, width]) => (
              <div
                key={name}
                className="flex items-center gap-2 text-[8px]"
              >
                <span
                  className={`w-24 truncate ${
                    darkMode
                      ? "text-slate-300"
                      : "text-slate-600"
                  }`}
                >
                  {name}
                </span>

                <div
                  className={`h-1 flex-1 rounded-full ${
                    darkMode
                      ? "bg-slate-700"
                      : "bg-slate-200"
                  }`}
                >
                  <div
                    className="h-full rounded-full bg-blue-500"
                    style={{ width }}
                  />
                </div>

                <span>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [darkMode, setDarkMode] = useState(true);

  return (
    <main
      className={`min-h-screen transition-colors duration-300 ${
        darkMode
          ? "bg-[#071426] text-white"
          : "bg-slate-50 text-slate-900"
      }`}
    >
      {/* ================================================== */}
      {/* NAVBAR */}
      {/* ================================================== */}

      <header
        className={`border-b ${
          darkMode
            ? "border-white/10 bg-[#071426]"
            : "border-slate-200 bg-white"
        }`}
      >
        <div className="mx-auto flex h-[86px] max-w-[1400px] items-center justify-between px-6 lg:px-12">
          {/* Logo */}
          <a href="/" className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 text-lg font-black text-white">
              SI
            </div>

            <div>
              <h1
                className={`text-base font-bold ${
                  darkMode
                    ? "text-white"
                    : "text-slate-900"
                }`}
              >
                Smart Inventory
              </h1>

              <p
                className={`text-[11px] ${
                  darkMode
                    ? "text-slate-400"
                    : "text-slate-500"
                }`}
              >
                Demand Forecasting System
              </p>
            </div>
          </a>

          {/* Navigation */}
          <nav className="hidden items-center gap-9 lg:flex">
            {[
              ["Home", "#home"],
              ["How It Works", "#how-it-works"],
              ["Market", "#market"],
              ["About", "#about"],
            ].map(([label, href], index) => (
              <a
                key={label}
                href={href}
                className={`relative py-2 text-sm font-medium transition ${
                  index === 0
                    ? "text-blue-500"
                    : darkMode
                      ? "text-slate-300 hover:text-white"
                      : "text-slate-600 hover:text-slate-950"
                }`}
              >
                {label}

                {index === 0 && (
                  <span className="absolute bottom-0 left-0 h-0.5 w-full bg-blue-500" />
                )}
              </a>
            ))}
          </nav>

          {/* Right */}
          <div className="flex items-center gap-4">
            <Toggle
              darkMode={darkMode}
              setDarkMode={setDarkMode}
            />

            <a
              href="/login"
              className="rounded-lg bg-blue-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-600"
            >
              Login
            </a>
          </div>
        </div>
      </header>

      {/* ================================================== */}
      {/* LIVE GROCERY MARKET */}
      {/* DIRECTLY BELOW NAVBAR */}
      {/* ================================================== */}

      <GroceryMarketMarquee darkMode={darkMode} />

      {/* ================================================== */}
      {/* HERO */}
      {/* ================================================== */}

      <section
        id="home"
        className={`relative overflow-hidden ${
          darkMode
            ? "bg-[#071426]"
            : "bg-slate-50"
        }`}
      >
        <div
          className={`pointer-events-none absolute left-[-200px] top-20 h-[500px] w-[700px] rounded-full blur-[120px] ${
            darkMode
              ? "bg-blue-500/10"
              : "bg-blue-400/10"
          }`}
        />

        <div className="mx-auto max-w-[1400px] px-6 py-16 lg:px-12 lg:py-20">
          <div className="grid items-center gap-12 lg:grid-cols-[0.92fr_1.08fr]">
            {/* Hero Left */}
            <div>
              <div
                className={`mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-medium ${
                  darkMode
                    ? "border-blue-400/20 bg-blue-500/10 text-blue-300"
                    : "border-blue-300 bg-blue-50 text-blue-600"
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-emerald-500" />

                AI-Powered Inventory Intelligence
              </div>

              <h2
                className={`max-w-2xl text-5xl font-black leading-[1.05] tracking-[-0.04em] sm:text-6xl lg:text-[60px] ${
                  darkMode
                    ? "text-white"
                    : "text-slate-950"
                }`}
              >
                Predict Demand.
                <br />
                Optimize Inventory.
                <br />

                <span className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 bg-clip-text text-transparent">
                  Grow Smarter.
                </span>
              </h2>

              <p
                className={`mt-7 max-w-xl text-base leading-7 sm:text-lg ${
                  darkMode
                    ? "text-slate-300"
                    : "text-slate-600"
                }`}
              >
                AI-powered inventory demand forecasting using XGBoost.
                <br />
                Make data-driven decisions with confidence.
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <a
                  href="/login"
                  className="rounded-xl bg-blue-500 px-8 py-4 text-center text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition hover:-translate-y-0.5 hover:bg-blue-600"
                >
                  Get Started →
                </a>

                <a
                  href="#market"
                  className={`rounded-xl border px-8 py-4 text-center text-sm font-bold transition ${
                    darkMode
                      ? "border-blue-400/60 text-white hover:bg-blue-500/10"
                      : "border-blue-400 text-blue-600 hover:bg-blue-50"
                  }`}
                >
                  Explore Market
                </a>
              </div>

              {/* Benefits */}
              <div className="mt-10 flex flex-wrap gap-x-7 gap-y-4">
                {[
                  ["◈", "AI Forecasting", "text-blue-500"],
                  ["ϟ", "Real-time Insights", "text-amber-500"],
                  ["♧", "Smart Alerts", "text-yellow-500"],
                  ["⌁", "Better Decisions", "text-emerald-500"],
                ].map(([icon, text, color]) => (
                  <div
                    key={text}
                    className={`flex items-center gap-2 text-xs ${
                      darkMode
                        ? "text-slate-300"
                        : "text-slate-600"
                    }`}
                  >
                    <span className={`text-lg ${color}`}>
                      {icon}
                    </span>

                    {text}
                  </div>
                ))}
              </div>
            </div>

            {/* Dashboard */}
            <div className="relative">
              <div
                className={`absolute -inset-6 rounded-[30px] blur-3xl ${
                  darkMode
                    ? "bg-blue-500/10"
                    : "bg-blue-400/10"
                }`}
              />

              <div className="relative">
                <DashboardPreview darkMode={darkMode} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================== */}
      {/* HOW IT WORKS */}
      {/* ================================================== */}

      <section
        id="how-it-works"
        className={
          darkMode
            ? "bg-[#071426]"
            : "bg-slate-50"
        }
      >
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-500">
              How It Works
            </p>

            <h2
              className={`mt-3 text-4xl font-black ${
                darkMode
                  ? "text-white"
                  : "text-slate-950"
              }`}
            >
              Data → AI Forecast → Inventory Decision
            </h2>

            <p
              className={`mx-auto mt-5 max-w-2xl text-sm leading-7 ${
                darkMode
                  ? "text-slate-400"
                  : "text-slate-600"
              }`}
            >
              Connect your operational data with an intelligent forecasting
              engine and turn predictions into practical inventory actions.
            </p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-4">
            {[
              [
                "01",
                "Data",
                "Collect sales, inventory, product and purchase data.",
              ],
              [
                "02",
                "Analyze",
                "Identify historical patterns and demand signals.",
              ],
              [
                "03",
                "Forecast",
                "XGBoost predicts future product demand.",
              ],
              [
                "04",
                "Decide",
                "Use insights for alerts and purchase planning.",
              ],
            ].map(([number, title, description]) => (
              <div
                key={number}
                className={`rounded-2xl border p-6 ${
                  darkMode
                    ? "border-white/10 bg-white/[0.03]"
                    : "border-slate-200 bg-white"
                }`}
              >
                <span className="text-xs font-bold text-blue-500">
                  {number}
                </span>

                <h3
                  className={`mt-4 text-xl font-bold ${
                    darkMode
                      ? "text-white"
                      : "text-slate-900"
                  }`}
                >
                  {title}
                </h3>

                <p
                  className={`mt-3 text-sm leading-6 ${
                    darkMode
                      ? "text-slate-400"
                      : "text-slate-600"
                  }`}
                >
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================== */}
      {/* ABOUT */}
      {/* ================================================== */}

      <section
        id="about"
        className={
          darkMode
            ? "bg-[#071426]"
            : "bg-slate-50"
        }
      >
        <div className="mx-auto max-w-4xl px-6 py-24 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-500">
            About The System
          </p>

          <h2
            className={`mt-4 text-4xl font-black ${
              darkMode
                ? "text-white"
                : "text-slate-950"
            }`}
          >
            Built for practical retail inventory management.
          </h2>

          <p
            className={`mt-6 text-base leading-8 ${
              darkMode
                ? "text-slate-400"
                : "text-slate-600"
            }`}
          >
            Smart Inventory combines inventory management, demand forecasting,
            analytics, alerts, and purchase planning into one connected system.
            Its goal is simple: help retailers understand what is happening
            today and prepare for what is likely to happen next.
          </p>
        </div>
      </section>

      {/* ================================================== */}
      {/* FOOTER */}
      {/* ================================================== */}

      <footer
        className={`border-t ${
          darkMode
            ? "border-white/10 bg-[#050d19]"
            : "border-slate-200 bg-white"
        }`}
      >
        <div className="mx-auto flex max-w-[1400px] items-center justify-center px-6 py-7 lg:px-12">
          <p
            className={`text-xs ${
              darkMode
                ? "text-slate-500"
                : "text-slate-500"
            }`}
          >
            © {new Date().getFullYear()} Smart Inventory Demand Forecasting
            System
          </p>
        </div>
      </footer>
    </main>
  );
}