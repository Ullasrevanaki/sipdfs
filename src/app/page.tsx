"use client";

import { useState } from "react";

const features = [
  {
    title: "Inventory Intelligence",
    description:
      "Understand your stock position and identify products that need attention.",
  },
  {
    title: "Demand Forecasting",
    description:
      "Use historical sales patterns to estimate future product demand.",
  },
  {
    title: "Smart Stock Alerts",
    description:
      "Identify products approaching low-stock and stock-out situations.",
  },
  {
    title: "Purchase Planning",
    description:
      "Plan upcoming purchases based on expected demand and current stock.",
  },
];

export default function Home() {
  const [darkMode, setDarkMode] = useState(false);

  return (
    <main
      className={`min-h-screen transition-colors duration-300 ${
        darkMode
          ? "bg-[#0b1120] text-white"
          : "bg-[#f8fafc] text-[#0f172a]"
      }`}
    >
      {/* NAVIGATION */}
      <header
        className={`border-b ${
          darkMode
            ? "bg-[#0b1120] border-slate-700"
            : "bg-white border-slate-200"
        }`}
      >
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
          {/* Logo */}
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              Inventory Intelligence
            </h1>

            <p
              className={`text-xs tracking-wide ${
                darkMode ? "text-slate-400" : "text-slate-500"
              }`}
            >
              Smart Retail Management
            </p>
          </div>

          {/* Navigation */}
          <nav className="hidden items-center gap-9 md:flex">
            <a
              href="#features"
              className={`text-sm font-medium transition ${
                darkMode
                  ? "text-slate-300 hover:text-white"
                  : "text-slate-600 hover:text-slate-950"
              }`}
            >
              Features
            </a>

            <a
              href="#how-it-works"
              className={`text-sm font-medium transition ${
                darkMode
                  ? "text-slate-300 hover:text-white"
                  : "text-slate-600 hover:text-slate-950"
              }`}
            >
              How It Works
            </a>

            <a
              href="#about"
              className={`text-sm font-medium transition ${
                darkMode
                  ? "text-slate-300 hover:text-white"
                  : "text-slate-600 hover:text-slate-950"
              }`}
            >
              About
            </a>
          </nav>

          {/* Right Controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`flex h-10 w-10 items-center justify-center rounded-full text-lg transition ${
                darkMode
                  ? "bg-slate-800 hover:bg-slate-700"
                  : "bg-slate-100 hover:bg-slate-200"
              }`}
              aria-label="Toggle theme"
            >
              {darkMode ? "☀️" : "🌙"}
            </button>

            <a
              href="/login"
              className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition ${
                darkMode
                  ? "bg-white text-slate-900 hover:bg-slate-200"
                  : "bg-slate-900 text-white hover:bg-slate-800"
              }`}
            >
              Login
            </a>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section>
        <div className="mx-auto max-w-7xl px-6 pb-24 pt-28">
          <div className="mx-auto max-w-4xl text-center">
            <div
              className={`mb-6 inline-flex rounded-full px-4 py-2 text-sm font-medium ${
                darkMode
                  ? "bg-slate-800 text-slate-300"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              Intelligent Inventory Management
            </div>

            <h2 className="text-5xl font-extrabold leading-[1.08] tracking-[-0.04em] sm:text-6xl lg:text-7xl">
              Make smarter decisions
              <span
                className={`block ${
                  darkMode ? "text-slate-300" : "text-slate-600"
                }`}
              >
                about your inventory.
              </span>
            </h2>

            <p
              className={`mx-auto mt-7 max-w-2xl text-lg leading-8 ${
                darkMode ? "text-slate-400" : "text-slate-600"
              }`}
            >
              Monitor your stock, understand product demand, identify
              inventory risks, and plan future purchases using your store&apos;s
              data.
            </p>

            <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
              <a
                href="/login"
                className={`rounded-xl px-7 py-3.5 text-sm font-semibold shadow-sm transition ${
                  darkMode
                    ? "bg-white text-slate-900 hover:bg-slate-200"
                    : "bg-slate-900 text-white hover:bg-slate-800"
                }`}
              >
                Get Started →
              </a>

              <a
                href="#features"
                className={`rounded-xl px-7 py-3.5 text-sm font-semibold transition ${
                  darkMode
                    ? "bg-slate-800 text-white hover:bg-slate-700"
                    : "bg-white text-slate-700 shadow-sm hover:bg-slate-100"
                }`}
              >
                Explore Features
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features">
        <div className="mx-auto max-w-7xl px-6 py-24">
          <div className="max-w-2xl">
            <p
              className={`text-sm font-bold uppercase tracking-[0.18em] ${
                darkMode ? "text-slate-400" : "text-slate-500"
              }`}
            >
              Core Capabilities
            </p>

            <h3 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Everything you need to manage inventory better.
            </h3>

            <p
              className={`mt-5 text-lg leading-8 ${
                darkMode ? "text-slate-400" : "text-slate-600"
              }`}
            >
              Designed around the practical needs of small grocery retailers.
            </p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className={`group rounded-2xl p-7 transition duration-300 hover:-translate-y-1 ${
                  darkMode
                    ? "bg-slate-900 hover:bg-slate-800"
                    : "bg-white shadow-sm hover:shadow-lg"
                }`}
              >
                <div
                  className={`mb-6 flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold ${
                    darkMode
                      ? "bg-slate-800 text-white"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  0{index + 1}
                </div>

                <h4 className="text-lg font-bold">{feature.title}</h4>

                <p
                  className={`mt-3 text-sm leading-7 ${
                    darkMode ? "text-slate-400" : "text-slate-600"
                  }`}
                >
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works">
        <div className="mx-auto max-w-7xl px-6 py-24">
          <div className="text-center">
            <p
              className={`text-sm font-bold uppercase tracking-[0.18em] ${
                darkMode ? "text-slate-400" : "text-slate-500"
              }`}
            >
              Simple Workflow
            </p>

            <h3 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              From store data to better decisions.
            </h3>
          </div>

          <div className="mt-16 grid gap-10 md:grid-cols-4">
            {[
              [
                "01",
                "Add your data",
                "Enter, scan, or upload your store information.",
              ],
              [
                "02",
                "Track inventory",
                "Keep products, purchases, sales, and stock organized.",
              ],
              [
                "03",
                "Analyze demand",
                "Understand historical patterns and future demand.",
              ],
              [
                "04",
                "Take action",
                "Use insights to make better inventory decisions.",
              ],
            ].map(([number, title, description]) => (
              <div key={number}>
                <span
                  className={`text-sm font-bold ${
                    darkMode ? "text-slate-500" : "text-slate-400"
                  }`}
                >
                  {number}
                </span>

                <h4 className="mt-4 text-lg font-bold">{title}</h4>

                <p
                  className={`mt-3 text-sm leading-7 ${
                    darkMode ? "text-slate-400" : "text-slate-600"
                  }`}
                >
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section id="about">
        <div className="mx-auto max-w-4xl px-6 py-24 text-center">
          <p
            className={`text-sm font-bold uppercase tracking-[0.18em] ${
              darkMode ? "text-slate-400" : "text-slate-500"
            }`}
          >
            About
          </p>

          <h3 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Built for practical retail inventory management.
          </h3>

          <p
            className={`mx-auto mt-6 max-w-2xl text-lg leading-8 ${
              darkMode ? "text-slate-400" : "text-slate-600"
            }`}
          >
            Our goal is to make inventory intelligence reliable, efficient,
            and simple enough for everyday grocery-store operations.
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div
          className={`mx-auto max-w-7xl px-6 py-10 text-center text-sm ${
            darkMode ? "text-slate-500" : "text-slate-500"
          }`}
        >
          Inventory Intelligence
        </div>
      </footer>
    </main>
  );
}