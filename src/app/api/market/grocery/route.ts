import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

const SOURCE_URL =
  "https://fcainfoweb.nic.in/Reports/DB/DBprices.aspx";

const EXCLUDED = new Set([
  "Potato",
  "Onion",
  "Tomato",
  "Brinjal",
  "Banana",
  "Ginger",
  "Garlic",
]);

function cleanNumber(value: string) {
  const match = value.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function normalizeToKg(price: number, unit: string) {
  const normalized = unit.toLowerCase().replace(/\s+/g, " ").trim();

  if (normalized.includes("1 kg")) {
    return price;
  }

  if (normalized.includes("100 gm")) {
    return price * 10;
  }

  if (normalized.includes("250 gm")) {
    return price * 4;
  }

  if (normalized.includes("50 gm")) {
    return price * 20;
  }

  return null;
}

export async function GET() {
  try {
    const response = await fetch(SOURCE_URL, {
      cache: "no-store",
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Government source returned ${response.status}`
      );
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const commodities: Array<{
      name: string;
      price: number;
      weekAgoPrice: number;
      changePercent: number;
      direction: "up" | "down" | "same";
      unit: "kg";
    }> = [];

    $("table tr").each((_, row) => {
      const cells = $(row)
        .find("td")
        .map((_, cell) => $(cell).text().replace(/\s+/g, " ").trim())
        .get();

      if (cells.length < 4) return;

      const name = cells[0];
      const unit = cells[1];
      const currentRaw = cells[2];
      const weekRaw = cells[3];

      if (!name || !unit) return;

      if (EXCLUDED.has(name)) return;

      const currentPrice = cleanNumber(currentRaw);
      const weekAgoPrice = cleanNumber(weekRaw);

      if (
        currentPrice === null ||
        weekAgoPrice === null ||
        weekAgoPrice === 0
      ) {
        return;
      }

      const pricePerKg = normalizeToKg(currentPrice, unit);
      const weekAgoPerKg = normalizeToKg(weekAgoPrice, unit);

      if (pricePerKg === null || weekAgoPerKg === null) {
        return;
      }

      const changePercent =
        ((pricePerKg - weekAgoPerKg) / weekAgoPerKg) * 100;

      let direction: "up" | "down" | "same" = "same";

      if (changePercent > 0.005) {
        direction = "up";
      } else if (changePercent < -0.005) {
        direction = "down";
      }

      commodities.push({
        name,
        price: Number(pricePerKg.toFixed(2)),
        weekAgoPrice: Number(weekAgoPerKg.toFixed(2)),
        changePercent: Number(changePercent.toFixed(2)),
        direction,
        unit: "kg",
      });
    });

    return NextResponse.json({
      success: true,
      source: "Government of India - Department of Consumer Affairs",
      comparison: "1 Week Back",
      unit: "₹/kg",
      updatedAt: new Date().toISOString(),
      count: commodities.length,
      commodities,
    });
  } catch (error) {
    console.error("Grocery market API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to fetch government grocery prices",
      },
      { status: 500 }
    );
  }
}