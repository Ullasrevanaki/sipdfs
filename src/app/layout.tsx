import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SIPDFS",
  description: "Smart Inventory Prediction and Demand Forecasting System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}