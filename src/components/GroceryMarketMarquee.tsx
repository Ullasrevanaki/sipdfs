"use client";

import { useEffect, useState } from "react";

type Commodity = {
  name: string;
  price: number;
  weekAgoPrice: number;
  changePercent: number;
  direction: "up" | "down" | "same";
  unit: "kg";
};

type GroceryMarketMarqueeProps = {
  darkMode: boolean;
};

export default function GroceryMarketMarquee({
  darkMode,
}: GroceryMarketMarqueeProps) {
  const [commodities, setCommodities] = useState<Commodity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPrices() {
      try {
        const response = await fetch("/api/market/grocery", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Failed to fetch grocery prices");
        }

        const data = await response.json();

        if (data.success && Array.isArray(data.commodities)) {
          setCommodities(data.commodities);
        }
      } catch (error) {
        console.error("Failed to load grocery prices:", error);
      } finally {
        setLoading(false);
      }
    }

    loadPrices();
  }, []);

  if (loading) {
    return (
      <section
        className={`w-full border-b py-5 ${
          darkMode
            ? "border-white/10 bg-[#09182b]"
            : "border-slate-200 bg-white"
        }`}
      >
        <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
          <div className="flex items-center gap-3">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-green-500" />

            <span
              className={`text-sm font-semibold ${
                darkMode ? "text-white" : "text-slate-800"
              }`}
            >
              Loading live grocery prices...
            </span>
          </div>
        </div>
      </section>
    );
  }

  if (commodities.length === 0) {
    return null;
  }

  const marqueeItems = [...commodities, ...commodities];

  return (
    <section
      id="market"
      className={`w-full overflow-hidden border-b py-5 ${
        darkMode
          ? "border-white/10 bg-[#09182b]"
          : "border-slate-200 bg-white"
      }`}
    >
      {/* Header */}
      <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-green-500" />

            <h2
              className={`text-sm font-bold uppercase tracking-[0.15em] ${
                darkMode ? "text-white" : "text-slate-900"
              }`}
            >
              Live Grocery Market
            </h2>
          </div>

          <span
            className={`text-xs font-medium ${
              darkMode ? "text-slate-400" : "text-slate-500"
            }`}
          >
            ● Updated Daily
          </span>
        </div>
      </div>

      {/* Moving Marquee */}
      <div className="relative w-full overflow-hidden">
        {/* Left Fade */}
        <div
          className={`pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r ${
            darkMode
              ? "from-[#09182b]"
              : "from-white"
          } to-transparent`}
        />

        {/* Right Fade */}
        <div
          className={`pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l ${
            darkMode
              ? "from-[#09182b]"
              : "from-white"
          } to-transparent`}
        />

        <div
          className="flex w-max gap-4 hover:[animation-play-state:paused]"
          style={{
            animation: "grocery-marquee 80s linear infinite",
          }}
        >
          {marqueeItems.map((item, index) => (
            <div
              key={`${item.name}-${index}`}
              className={`flex min-w-[315px] items-center gap-5 rounded-xl border px-5 py-3 transition-colors ${
                darkMode
                  ? "border-white/10 bg-white/[0.06]"
                  : "border-slate-200 bg-slate-50 shadow-sm"
              }`}
            >
              {/* Commodity */}
              <div className="min-w-0">
                <p
                  className={`truncate text-sm font-bold ${
                    darkMode ? "text-white" : "text-slate-900"
                  }`}
                >
                  {item.name}
                </p>

                <p
                  className={`mt-1 text-base font-bold ${
                    darkMode ? "text-white" : "text-slate-900"
                  }`}
                >
                  ₹{item.price.toFixed(2)}

                  <span
                    className={`ml-1 text-xs font-medium ${
                      darkMode ? "text-slate-400" : "text-slate-500"
                    }`}
                  >
                    /kg
                  </span>
                </p>
              </div>

              {/* Percentage Change */}
              <div className="ml-auto whitespace-nowrap text-right">
                {item.direction === "up" && (
                  <span className="text-sm font-bold text-green-500">
                    ↑ +{item.changePercent.toFixed(2)}%
                  </span>
                )}

                {item.direction === "down" && (
                  <span className="text-sm font-bold text-red-500">
                    ↓ {item.changePercent.toFixed(2)}%
                  </span>
                )}

                {item.direction === "same" && (
                  <span
                    className={`text-sm font-bold ${
                      darkMode
                        ? "text-slate-400"
                        : "text-slate-500"
                    }`}
                  >
                    ─ 0.00%
                  </span>
                )}

                <p
                  className={`mt-1 text-[10px] ${
                    darkMode
                      ? "text-slate-500"
                      : "text-slate-400"
                  }`}
                >
                  vs 1 Week Back
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Marquee Animation */}
      <style jsx>{`
        @keyframes grocery-marquee {
          from {
            transform: translateX(0);
          }

          to {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </section>
  );
}