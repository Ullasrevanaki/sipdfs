"use client";

import AppShell from "@/components/layout/AppShell";
import { useRef, useState } from "react";

type ImportType =
  | "barcode"
  | "manual"
  | "csv"
  | "purchase"
  | "sales"
  | "external";

type CsvRow = {
  date: string;
  product_name: string;
  category: string;
  unit: string;
  cost_price: string;
  selling_price: string;
  quantity: string;
  transaction_type: string;
};

const importOptions = [
  {
    id: "barcode" as ImportType,
    title: "Barcode Scan",
    description: "Scan product barcodes for quick inventory entry.",
    icon: "▣",
  },
  {
    id: "manual" as ImportType,
    title: "Manual Entry",
    description: "Enter products, stock and transaction data manually.",
    icon: "✎",
  },
  {
    id: "csv" as ImportType,
    title: "Excel / CSV Import",
    description: "Import large amounts of product or transaction data.",
    icon: "▤",
  },
  {
    id: "purchase" as ImportType,
    title: "Purchase Bills",
    description: "Add inventory from purchase bills and invoices.",
    icon: "▥",
  },
  {
    id: "sales" as ImportType,
    title: "Sales Bills",
    description: "Import sales transactions from bills or invoices.",
    icon: "▧",
  },
  {
    id: "external" as ImportType,
    title: "Other External Data",
    description: "Import compatible external inventory or sales data.",
    icon: "⇩",
  },
];

const REQUIRED_COLUMNS = [
  "date",
  "product_name",
  "category",
  "unit",
  "cost_price",
  "selling_price",
  "quantity",
  "transaction_type",
];

export default function DataImportPage() {
  const [active, setActive] = useState<ImportType>("manual");

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [unit, setUnit] = useState("");
  const [quantity, setQuantity] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");

  const [barcode, setBarcode] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [csvFileName, setCsvFileName] = useState("");
  const [csvRows, setCsvRows] = useState<CsvRow[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvReady, setCsvReady] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleManualSubmit() {
    setMessage("");
    setError("");

    if (
      !name.trim() ||
      !unit.trim() ||
      !costPrice ||
      !sellingPrice
    ) {
      setError(
        "Product name, unit, cost price and selling price are required."
      );
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/import/manual", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          category,
          unit,
          quantity: quantity || 0,
          costPrice,
          sellingPrice,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Failed to import product."
        );
      }

      setMessage(
        `${data.product.name} imported successfully.`
      );

      setName("");
      setCategory("");
      setUnit("");
      setQuantity("");
      setCostPrice("");
      setSellingPrice("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to import product."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleCsvFile(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    setMessage("");
    setError("");
    setCsvReady(false);
    setCsvRows([]);
    setCsvHeaders([]);

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError(
        "For this first version, please select a CSV file."
      );
      return;
    }

    try {
      const text = await file.text();
      const parsed = parseCsv(text);

      if (!parsed.headers.length) {
        throw new Error(
          "The CSV file does not contain a header row."
        );
      }

      const normalizedHeaders = parsed.headers.map((header) =>
        header.trim().toLowerCase().replace(/\s+/g, "_")
      );

      const missingColumns = REQUIRED_COLUMNS.filter(
        (column) => !normalizedHeaders.includes(column)
      );

      if (missingColumns.length > 0) {
        throw new Error(
          `Missing required columns: ${missingColumns.join(", ")}`
        );
      }

      const rows: CsvRow[] = parsed.rows.map((row) => ({
        date:
          row[
            normalizedHeaders.indexOf("date")
          ] ?? "",

        product_name:
          row[
            normalizedHeaders.indexOf("product_name")
          ] ?? "",

        category:
          row[
            normalizedHeaders.indexOf("category")
          ] ?? "",

        unit:
          row[
            normalizedHeaders.indexOf("unit")
          ] ?? "",

        cost_price:
          row[
            normalizedHeaders.indexOf("cost_price")
          ] ?? "",

        selling_price:
          row[
            normalizedHeaders.indexOf("selling_price")
          ] ?? "",

        quantity:
          row[
            normalizedHeaders.indexOf("quantity")
          ] ?? "",

        transaction_type:
          row[
            normalizedHeaders.indexOf("transaction_type")
          ] ?? "",
      }));

      if (!rows.length) {
        throw new Error(
          "The CSV file contains no data rows."
        );
      }

      validateCsvRows(rows);

      setCsvFileName(file.name);
      setCsvHeaders(normalizedHeaders);
      setCsvRows(rows);
      setCsvReady(true);

      setMessage(
        `File loaded successfully. ${rows.length.toLocaleString()} rows detected.`
      );
    } catch (err) {
      setCsvFileName("");
      setCsvRows([]);
      setCsvHeaders([]);
      setCsvReady(false);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to read CSV file."
      );
    }

    event.target.value = "";
  }

  async function confirmCsvImport() {
    if (!csvReady || !csvRows.length) {
      setError(
        "Please select and validate a CSV file first."
      );
      return;
    }

    setMessage("");
    setError("");
    setSaving(true);

    try {
      const response = await fetch("/api/import/csv", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileName: csvFileName,
          rows: csvRows,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "CSV import failed."
        );
      }

      setMessage(
        `Import successful: ${data.importedRows.toLocaleString()} sales records imported and ${data.productsCreated} products created.`
      );

      setCsvFileName("");
      setCsvRows([]);
      setCsvHeaders([]);
      setCsvReady(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "CSV import failed."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell
      storeName="Ullas Stores"
      userName="User"
      userEmail=""
    >
      <div className="w-full max-w-[1400px]">

        {/* HEADER */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900">
              Import Data
            </h1>

            <p className="mt-1 text-sm font-medium text-gray-600">
              Ullas Stores
            </p>

            <p className="mt-2 text-gray-500">
              Add inventory, product and transaction data
              from different sources.
            </p>
          </div>
        </div>

        {/* STATUS MESSAGE */}
        {message && (
          <div className="mt-6 rounded-xl border border-green-200 bg-green-50 px-5 py-4 text-sm font-medium text-green-700">
            {message}
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {/* DATA SOURCES */}
        <div className="mt-8 rounded-xl border border-gray-200 bg-white shadow-sm">

          <div className="border-b border-gray-200 px-6 py-5">
            <h2 className="text-lg font-semibold text-gray-900">
              Data Sources / Input
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Select how you want to add data to your inventory.
            </p>
          </div>

          <div className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-3">
            {importOptions.map((item) => {
              const isActive = active === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActive(item.id);
                    setMessage("");
                    setError("");
                  }}
                  className={`rounded-xl border p-5 text-left transition ${
                    isActive
                      ? "border-[#159b7b] bg-[#f0f9f6] shadow-sm"
                      : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-start gap-4">

                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-lg ${
                        isActive
                          ? "bg-[#159b7b] text-white"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {item.icon}
                    </div>

                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-900">
                        {item.title}
                      </h3>

                      <p className="mt-1 text-sm leading-5 text-gray-500">
                        {item.description}
                      </p>
                    </div>

                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ACTIVE IMPORT AREA */}
        <div className="mt-6 rounded-xl border border-gray-200 bg-white shadow-sm">

          <div className="border-b border-gray-200 px-6 py-5">
            <h2 className="text-lg font-semibold text-gray-900">
              {active === "manual" && "Manual Product Entry"}
              {active === "barcode" && "Barcode Scan"}
              {active === "csv" && "Excel / CSV Import"}
              {active === "purchase" && "Purchase Bills"}
              {active === "sales" && "Sales Bills"}
              {active === "external" && "External Data"}
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              {active === "manual" &&
                "Enter product details manually."}

              {active === "barcode" &&
                "Enter or scan a product barcode."}

              {active === "csv" &&
                "Upload and validate historical inventory or sales data."}

              {active === "purchase" &&
                "Upload purchase invoices or purchase data."}

              {active === "sales" &&
                "Upload sales bills or transaction files."}

              {active === "external" &&
                "Upload compatible external inventory or sales data."}
            </p>
          </div>

          <div className="p-6">

            {/* MANUAL */}
            {active === "manual" && (
              <div className="max-w-[900px] space-y-6">

                <div className="grid gap-5 md:grid-cols-2">

                  <Input
                    label="Product Name"
                    value={name}
                    onChange={setName}
                    placeholder="e.g. Rice 5kg"
                  />

                  <Input
                    label="Category"
                    value={category}
                    onChange={setCategory}
                    placeholder="e.g. Grocery"
                  />

                  <Input
                    label="Unit"
                    value={unit}
                    onChange={setUnit}
                    placeholder="e.g. kg, piece, litre"
                  />

                  <Input
                    label="Quantity"
                    value={quantity}
                    onChange={setQuantity}
                    placeholder="e.g. 100"
                    type="number"
                  />

                  <Input
                    label="Cost Price"
                    value={costPrice}
                    onChange={setCostPrice}
                    placeholder="e.g. 250"
                    type="number"
                  />

                  <Input
                    label="Selling Price"
                    value={sellingPrice}
                    onChange={setSellingPrice}
                    placeholder="e.g. 300"
                    type="number"
                  />

                </div>

                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleManualSubmit}
                    disabled={saving}
                    className="rounded-lg bg-gray-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving
                      ? "Importing..."
                      : "Import Product"}
                  </button>
                </div>

              </div>
            )}

            {/* BARCODE */}
            {active === "barcode" && (
              <div className="max-w-[600px]">

                <Input
                  label="Barcode"
                  value={barcode}
                  onChange={setBarcode}
                  placeholder="Scan or enter barcode"
                />

                <button
                  type="button"
                  className="mt-5 rounded-lg bg-gray-900 px-6 py-3 text-sm font-semibold text-white hover:bg-gray-800"
                  onClick={() => {
                    setMessage(
                      barcode.trim()
                        ? `Barcode ${barcode} received.`
                        : "Please enter a barcode."
                    );
                  }}
                >
                  Process Barcode
                </button>

              </div>
            )}

            {/* CSV */}
            {active === "csv" && (
              <div className="max-w-[1100px]">

                <div
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                  className="cursor-pointer rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-10 text-center transition hover:border-[#159b7b] hover:bg-[#f8fcfb]"
                >
                  <div className="text-4xl">
                    ⇧
                  </div>

                  <h3 className="mt-3 font-semibold text-gray-900">
                    Upload Excel or CSV
                  </h3>

                  <p className="mx-auto mt-2 max-w-xl text-sm text-gray-500">
                    Select a .csv file containing the
                    required inventory/sales columns.
                  </p>

                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="mt-5 rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800"
                  >
                    Choose File
                  </button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleCsvFile}
                  className="hidden"
                />

                {csvFileName && (
                  <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-5">

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {csvFileName}
                        </p>

                        <p className="mt-1 text-sm text-gray-500">
                          {csvRows.length.toLocaleString()} rows
                          {csvHeaders.length > 0
                            ? ` • ${csvHeaders.length} columns`
                            : ""}
                        </p>
                      </div>

                      {csvReady && (
                        <span className="w-fit rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                          Validated
                        </span>
                      )}

                    </div>

                    {csvRows.length > 0 && (
                      <div className="mt-6 overflow-x-auto rounded-lg border border-gray-200 bg-white">

                        <table className="min-w-full text-left text-sm">

                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 font-semibold">
                                Date
                              </th>

                              <th className="px-4 py-3 font-semibold">
                                Product
                              </th>

                              <th className="px-4 py-3 font-semibold">
                                Category
                              </th>

                              <th className="px-4 py-3 font-semibold">
                                Unit
                              </th>

                              <th className="px-4 py-3 font-semibold">
                                Quantity
                              </th>

                              <th className="px-4 py-3 font-semibold">
                                Type
                              </th>
                            </tr>
                          </thead>

                          <tbody className="divide-y divide-gray-200">

                            {csvRows
                              .slice(0, 10)
                              .map((row, index) => (
                                <tr
                                  key={index}
                                  className="hover:bg-gray-50"
                                >

                                  <td className="px-4 py-3 text-gray-600">
                                    {row.date}
                                  </td>

                                  <td className="px-4 py-3 font-medium text-gray-900">
                                    {row.product_name}
                                  </td>

                                  <td className="px-4 py-3 text-gray-600">
                                    {row.category}
                                  </td>

                                  <td className="px-4 py-3 text-gray-600">
                                    {row.unit}
                                  </td>

                                  <td className="px-4 py-3 text-gray-600">
                                    {row.quantity}
                                  </td>

                                  <td className="px-4 py-3 text-gray-600">
                                    {row.transaction_type}
                                  </td>

                                </tr>
                              ))}

                          </tbody>

                        </table>

                      </div>
                    )}

                    <div className="mt-5 flex flex-col gap-3 sm:flex-row">

                      <button
                        type="button"
                        onClick={() => {
                          setCsvReady(false);
                          setCsvRows([]);
                          setCsvHeaders([]);
                          setCsvFileName("");
                          setMessage("");
                        }}
                        disabled={saving}
                        className="rounded-lg border border-gray-300 px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                      >
                        Remove File
                      </button>

                      <button
                        type="button"
                        onClick={confirmCsvImport}
                        disabled={saving || !csvReady}
                        className="rounded-lg bg-gray-900 px-6 py-3 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {saving
                          ? "Importing..."
                          : `Confirm Import (${csvRows.length.toLocaleString()} Rows)`}
                      </button>

                    </div>

                  </div>
                )}

              </div>
            )}

            {/* PURCHASE */}
            {active === "purchase" && (
              <UploadPanel
                title="Upload Purchase Bill"
                description="Purchase bill processing will be connected after CSV import."
                accept=".pdf,.jpg,.jpeg,.png,.csv,.xlsx"
              />
            )}

            {/* SALES */}
            {active === "sales" && (
              <UploadPanel
                title="Upload Sales Bill"
                description="Sales bill processing will be connected after CSV import."
                accept=".pdf,.jpg,.jpeg,.png,.csv,.xlsx"
              />
            )}

            {/* EXTERNAL */}
            {active === "external" && (
              <UploadPanel
                title="Import External Data"
                description="External data mapping will be connected after the main CSV pipeline is complete."
                accept=".csv,.xlsx,.xls,.json"
              />
            )}

          </div>
        </div>

        {/* IMPORT FLOW */}
        <div className="mt-6 rounded-xl border border-gray-200 bg-white shadow-sm">

          <div className="border-b border-gray-200 px-6 py-5">
            <h2 className="text-lg font-semibold text-gray-900">
              Import Flow
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              How imported data moves through the inventory system.
            </p>
          </div>

          <div className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-4">

            <FlowStep
              number="1"
              title="Input"
              description="Provide data from any supported source."
            />

            <FlowStep
              number="2"
              title="Validate"
              description="Check fields, products and quantities."
            />

            <FlowStep
              number="3"
              title="Store"
              description="Save valid data in the inventory system."
            />

            <FlowStep
              number="4"
              title="Forecast"
              description="Use historical sales data for demand prediction."
            />

          </div>
        </div>

      </div>
    </AppShell>
  );
}

/*
 * =========================================================
 * CSV PARSER
 * =========================================================
 */

function parseCsv(text: string): {
  headers: string[];
  rows: string[][];
} {
  const lines: string[][] = [];

  let currentRow: string[] = [];
  let currentValue = "";
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const character = text[i];
    const nextCharacter = text[i + 1];

    if (character === '"') {
      if (
        insideQuotes &&
        nextCharacter === '"'
      ) {
        currentValue += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }

      continue;
    }

    if (
      character === "," &&
      !insideQuotes
    ) {
      currentRow.push(
        currentValue.trim()
      );

      currentValue = "";

      continue;
    }

    if (
      (character === "\n" ||
        character === "\r") &&
      !insideQuotes
    ) {
      if (
        character === "\r" &&
        nextCharacter === "\n"
      ) {
        i++;
      }

      currentRow.push(
        currentValue.trim()
      );

      if (
        currentRow.some(
          (value) => value.length > 0
        )
      ) {
        lines.push(currentRow);
      }

      currentRow = [];
      currentValue = "";

      continue;
    }

    currentValue += character;
  }

  if (
    currentValue.length > 0 ||
    currentRow.length > 0
  ) {
    currentRow.push(
      currentValue.trim()
    );

    if (
      currentRow.some(
        (value) => value.length > 0
      )
    ) {
      lines.push(currentRow);
    }
  }

  if (!lines.length) {
    return {
      headers: [],
      rows: [],
    };
  }

  return {
    headers: lines[0],
    rows: lines.slice(1),
  };
}

/*
 * =========================================================
 * CSV VALIDATION
 * =========================================================
 */

function validateCsvRows(rows: CsvRow[]) {
  const errors: string[] = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 2;

    if (!row.date.trim()) {
      errors.push(
        `Row ${rowNumber}: date is required.`
      );
    }

    if (!row.product_name.trim()) {
      errors.push(
        `Row ${rowNumber}: product_name is required.`
      );
    }

    if (!row.category.trim()) {
      errors.push(
        `Row ${rowNumber}: category is required.`
      );
    }

    if (!row.unit.trim()) {
      errors.push(
        `Row ${rowNumber}: unit is required.`
      );
    }

    const quantity = Number(row.quantity);

    if (
      !Number.isFinite(quantity) ||
      quantity <= 0
    ) {
      errors.push(
        `Row ${rowNumber}: quantity must be greater than 0.`
      );
    }

    const costPrice = Number(row.cost_price);

    if (
      !Number.isFinite(costPrice) ||
      costPrice < 0
    ) {
      errors.push(
        `Row ${rowNumber}: cost_price is invalid.`
      );
    }

    const sellingPrice = Number(row.selling_price);

    if (
      !Number.isFinite(sellingPrice) ||
      sellingPrice < 0
    ) {
      errors.push(
        `Row ${rowNumber}: selling_price is invalid.`
      );
    }

    const transactionType =
      row.transaction_type
        .trim()
        .toUpperCase();

    if (transactionType !== "SALE") {
      errors.push(
        `Row ${rowNumber}: transaction_type must be SALE for this import.`
      );
    }
  });

  if (errors.length > 0) {
    throw new Error(
      errors.slice(0, 10).join(" ") +
        (errors.length > 10
          ? ` ${
              errors.length - 10
            } more validation errors.`
          : "")
    );
  }
}

/*
 * =========================================================
 * INPUT
 * =========================================================
 */

function Input({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-700">
        {label}
      </label>

      <input
        type={type}
        min={
          type === "number"
            ? "0"
            : undefined
        }
        value={value}
        onChange={(e) =>
          onChange(e.target.value)
        }
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-gray-500 focus:ring-1 focus:ring-gray-200"
      />
    </div>
  );
}

/*
 * =========================================================
 * UPLOAD PANEL
 * =========================================================
 */

function UploadPanel({
  title,
  description,
  accept,
}: {
  title: string;
  description: string;
  accept: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="max-w-[900px]">

      <div
        onClick={() =>
          inputRef.current?.click()
        }
        className="cursor-pointer rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-10 text-center transition hover:border-[#159b7b] hover:bg-[#f8fcfb]"
      >
        <div className="text-4xl">
          ⇧
        </div>

        <h3 className="mt-3 font-semibold text-gray-900">
          {title}
        </h3>

        <p className="mx-auto mt-2 max-w-xl text-sm text-gray-500">
          {description}
        </p>

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            inputRef.current?.click();
          }}
          className="mt-5 rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800"
        >
          Choose File
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={() => {}}
        className="hidden"
      />

    </div>
  );
}

/*
 * =========================================================
 * FLOW STEP
 * =========================================================
 */

function FlowStep({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">

      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-900 text-sm font-bold text-white">
        {number}
      </div>

      <h3 className="mt-4 font-semibold text-gray-900">
        {title}
      </h3>

      <p className="mt-2 text-sm leading-5 text-gray-500">
        {description}
      </p>

    </div>
  );
}