# SIPDFS — Smart Inventory Prediction and Demand Forecasting System

SIPDFS is a web application designed to help small retailers, especially Indian kirana and grocery stores, manage inventory and make more informed replenishment decisions. It brings product and stock management, sales and purchase records, CSV data import, inventory alerts, reporting, and demand-forecasting workflows into one application.

> **Project status:** The core web application, dashboard, Google sign-in, and CSV import workflow have been developed. Verify the currently selected forecasting model and its integration against the repository before describing forecasting as production-ready.

## Contents

- [Problem Statement](#problem-statement)
- [Objectives](#objectives)
- [Key Features](#key-features)
- [Workflow](#workflow)
- [Technology Stack](#technology-stack)
- [Forecasting Approach](#forecasting-approach)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Local Setup](#local-setup)
- [Environment Variables](#environment-variables)
- [Database](#database)
- [CSV Import](#csv-import)
- [Authentication and Security](#authentication-and-security)
- [Build and Deployment](#build-and-deployment)
- [Pre-release Checklist](#pre-release-checklist)
- [License](#license)

## Problem Statement

Small retailers often rely on manual stock checks and intuition to decide how much inventory to purchase. This can cause stockouts, overstocking, expiry-related losses, and limited visibility into sales trends. SIPDFS aims to make inventory information and data-driven demand forecasting more accessible to small retailers.

## Objectives

- Centralise product, inventory, sales, and purchase information.
- Import historical business data from CSV files.
- Identify low-stock conditions and surface inventory alerts.
- Forecast product demand from historical sales data.
- Help retailers review reports and make informed replenishment decisions.
- Provide an authenticated dashboard for store operations.

## Key Features

The application is organised around these areas; verify each feature in the current deployment before describing it as production-ready.

- **Dashboard:** Overview of inventory and business activity.
- **Products:** Product catalogue and product information.
- **Sales and Purchases:** Transaction records for inventory analysis.
- **Inventory:** Stock tracking and visibility.
- **Forecast:** Demand-forecasting workflow using historical sales data.
- **Alerts:** Low-stock and other inventory-related alerts.
- **Reports:** Summaries to support business decisions.
- **CSV Import:** Import supported business data files.
- **Store Setup and Settings:** Store configuration and preferences.
- **Google Sign-In:** Authentication through Auth.js.
- **Two-factor authentication (2FA):** A six-digit authenticator-code flow is part of the application's authentication design.

## Workflow

1. Open the public landing page.
2. Sign in with Google.
3. Complete authenticator-code verification if 2FA is enabled.
4. Set up the store if required.
5. Import or enter product and historical transaction data.
6. Review inventory, sales, alerts, forecasts, and reports.

## Technology Stack

| Layer | Technology |
|---|---|
| Framework | Next.js App Router |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Authentication | Auth.js with Google OAuth |
| Additional authentication | Six-digit authenticator-code / 2FA flow |
| ORM | Prisma |
| Database | PostgreSQL |
| Runtime | Node.js |
| Deployment | Vercel |
| Forecasting direction | XGBoost-based retail demand forecasting |

Exact package versions and npm scripts are defined in `package.json` and project configuration files.

## Forecasting Approach

SIPDFS is intended to use historical retail sales data to estimate future product demand. The project has explored an XGBoost-based approach and a retail time-series forecasting implementation.

A reliable integration must ensure that:
- Model inputs match the feature names, data types, and preprocessing used during training.
- Product IDs and categorical values are encoded consistently.
- Forecasts are evaluated on held-out historical data.
- Model files and dependencies are available in the deployment environment.
- Missing, invalid, or insufficient historical data is handled gracefully.

**Model integration note:** Confirm the selected model, its input schema, and how predictions reach the application before claiming that it is deployed and operational. Include experimental metrics in reports only when they are reproducible for the exact model and dataset in use.

## Project Structure

The application uses the Next.js `src/app` structure. This is a high-level guide; the actual repository tree is the source of truth.

```text
sipdfs/
├── prisma/                 # Prisma schema and database-related files
├── public/                 # Static assets
├── scripts/                # Utility scripts, if retained
├── src/
│   ├── app/                # Pages, layouts, and API routes
│   │   ├── api/            # Server-side API endpoints
│   │   └── dashboard/      # Dashboard and application pages
│   └── lib/                # Shared utilities, database and auth helpers
├── package.json            # Dependencies and npm scripts
└── README.md
```

## Prerequisites

- Node.js version compatible with the project configuration.
- npm.
- A PostgreSQL database.
- A Google Cloud OAuth client configured for the actual local and production URLs.
- Required environment-variable values.

## Local Setup

### 1. Clone the repository

```bash
git clone https://github.com/Ullasrevanaki/sipdfs.git
cd sipdfs
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create the local `.env` or `.env.local` file expected by the current configuration. Set the required database and authentication values. Never commit these files or paste real secrets into this README.

### 4. Generate Prisma Client

```bash
npx prisma generate
```

For a database with existing migrations, use the migration workflow appropriate to that environment. Check the Prisma configuration and project documentation before applying migrations to production.

### 5. Run the development server

```bash
npm run dev
```

Open `http://localhost:3000`.

## Environment Variables

The exact variable names depend on the current Prisma and Auth.js configuration. Check the source code and deployment configuration before relying on this checklist.

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string, if referenced by the current Prisma configuration |
| `AUTH_SECRET` | Secret used by Auth.js and authentication-related session logic |
| `AUTH_GOOGLE_ID` | Google OAuth client ID, if this is the name used in the current configuration |
| `AUTH_GOOGLE_SECRET` | Google OAuth client secret, if this is the name used in the current configuration |
| `AUTH_URL` | Optional canonical application URL, depending on the Auth.js configuration |

These are common names, not a guarantee that every variable is required or named exactly this way in the current source. Verify the actual names in the authentication and Prisma configuration files.

For Google OAuth, the authorised origin and callback URI in Google Cloud Console must match the application's actual domain and callback route. Do not change working OAuth settings without checking the current configuration.

**Never commit** database passwords, OAuth client secrets, `AUTH_SECRET`, API keys, access tokens, or production credentials.

## Database

SIPDFS uses Prisma with PostgreSQL. Useful commands include:

```bash
npx prisma generate
npx prisma migrate status
```

If Prisma Studio is configured and appropriate for your environment:

```bash
npx prisma studio
```

Verify the target database before running schema-changing or destructive commands. Do not run destructive commands against production without a recovery plan.

## CSV Import

SIPDFS includes a CSV import workflow. For reliable imports:

- Use the column names and format expected by the current import page and API route.
- Validate dates, numeric values, product identifiers, and required fields.
- Check malformed rows, delimiters, and file encoding.
- Test large files with representative data before production use.
- Review import results and errors; selecting a file does not necessarily mean every row was saved.

The current accepted schema, validation, and limits are defined by the import implementation in the repository.

## Authentication and Security

- Google sign-in is provided through Auth.js.
- A six-digit authenticator-code / 2FA flow is part of the application.
- Protected pages should validate the authenticated session and, when applicable, successful 2FA verification.
- Keep OAuth secrets, database URLs, `AUTH_SECRET`, and credentials in environment variables.
- Use HTTPS for deployed environments.
- If a secret has been committed to a public repository, rotate it. Removing it from the latest commit alone may not remove it from Git history.

## Build and Deployment

Run the configured production build:

```bash
npm run build
```

If the project defines the standard Next.js start script, you can start the built app with:

```bash
npm run start
```

The project is intended for deployment on Vercel:

1. Push the source code to GitHub.
2. Import the repository into the correct Vercel project.
3. Configure the required environment variables in Vercel for the appropriate environment.
4. Ensure the production PostgreSQL database is reachable.
5. Confirm Google OAuth origin and callback settings match the production domain and app configuration.
6. Deploy and test sign-in, 2FA (when enabled), dashboard access, CSV import, and inventory workflows.

## Pre-release Checklist

- [ ] The selected XGBoost model is integrated and its input schema matches application data.
- [ ] Forecast quality is validated on a suitable holdout dataset.
- [ ] CSV import handles expected file sizes, invalid rows, and database errors.
- [ ] Alerts and reports reflect current database data.
- [ ] Google sign-in and 2FA work on the production domain.
- [ ] Required environment variables are configured in Vercel.
- [ ] No credentials, local virtual environments, or private data are tracked by Git.
- [ ] The production build completes successfully.

## License

No license has been specified here. Add a `LICENSE` file and update this section if the project is intended for public reuse. Without an explicit license, do not assume that others have permission to reuse the source code.
