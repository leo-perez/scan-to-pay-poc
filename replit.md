# PayFast - BlinkPay Open Banking Demo

## Overview

PayFast is a scan-to-pay proof of concept application demonstrating BlinkPay Open Banking integration for New Zealand payment processing. The application enables merchants to display QR codes for customers to scan and complete payments through their banking apps. It features a merchant dashboard for monitoring transactions in real-time and a customer checkout flow that redirects to BlinkPay for secure bank-initiated payments.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state with automatic polling for live updates
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens (CSS variables for theming)
- **Build Tool**: Vite with React plugin and path aliases (@/, @shared/, @assets/)

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **API Design**: RESTful endpoints defined in shared/routes.ts with Zod schemas for validation
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **Development**: Hot module replacement via Vite middleware in development mode

### Data Storage
- **Database**: PostgreSQL (configured via DATABASE_URL environment variable)
- **Schema**: Single `payments` table tracking payment transactions with fields for amount, status, BlinkPay reference, and timestamps
- **Migrations**: Drizzle Kit for schema migrations (output to ./migrations)

### Key Pages
1. **Landing (/)**: Entry point with navigation to merchant or customer views
2. **Merchant Dashboard (/merchant)**: QR code display and live transaction table with 5-second polling
3. **Customer Checkout (/checkout)**: Payment form that initiates BlinkPay flow
4. **Confirmation (/confirmation/:id)**: Payment status verification with 2-second polling until completion

### Build Process
- Development: Vite dev server with HMR proxied through Express
- Production: esbuild bundles server code, Vite builds client to dist/public
- Server dependencies are selectively bundled to reduce cold start times

## BlinkPay setup (make real payments work)

1. **Get API credentials**  
   Sign up at [BlinkPay Developers](https://www.blinkpay.co.nz/resources-developers) or [Merchants Resources](https://merchants.blinkpay.co.nz/resources) and obtain **Client ID** and **Client Secret** (sandbox for testing).

2. **Add to `.env`** (copy from `.env.example`):
   ```bash
   BLINKPAY_CLIENT_ID=your_client_id
   BLINKPAY_CLIENT_SECRET=your_client_secret
   BLINKPAY_SANDBOX=true
   ```

3. **Callback URL (where BlinkPay redirects after payment)**  
   For local testing, set a base URL BlinkPay can redirect to. **Avoid `http://localhost:5000`** as the callback: some browsers or security tools block redirects from an external site (BlinkPay) to localhost and show “Access to localhost was denied” (HTTP 403).  
   - **Option A – Same machine, same Wi‑Fi:** Use your computer’s LAN IP, e.g. `APP_BASE_URL=http://192.168.1.5:5000`, set `DEV_LISTEN_ALL=1`, restart the server, and open the app at that URL (not localhost). Whitelist that base in BlinkPay (e.g. `http://192.168.1.5:5000/confirmation`).  
   - **Option B – Any device/network:** Use a tunnel (e.g. `npx ngrok http 5000`) and set `APP_BASE_URL=https://your-subdomain.ngrok.io`. Whitelist that in BlinkPay.

4. **Optional: test without BlinkPay**  
   Set `USE_MOCK_PAYMENT=true` in `.env` to use the in-app mock gateway (no credentials needed).

## External Dependencies

### Payment Processing
- **BlinkPay API**: New Zealand Open Banking payment provider
  - Sandbox: https://sandbox.debit.blinkpay.co.nz
  - Production: https://debit.blinkpay.co.nz
  - Configuration: BLINKPAY_CLIENT_ID, BLINKPAY_CLIENT_SECRET, and BLINKPAY_SANDBOX environment variables
  - Flow: Quick Payment redirect flow with bank selection, redirect URI callback to /confirmation/:id
  - Timeout: 10s axios timeout on HTTP client, 5s Promise.race timeout on status checks in route handlers
  - Status sync: Background worker (setInterval every 15s) syncs unresolved payment statuses sequentially; list endpoint is a pure DB query with no BlinkPay calls
  - Single payment endpoint checks BlinkPay directly for fast confirmation page updates
  - Consent statuses mapped: Authorised/Consumed → completed, Rejected/Revoked → failed, others → pending

### Database
- **PostgreSQL**: Primary data store
  - Connection: DATABASE_URL environment variable
  - Session storage: connect-pg-simple for Express sessions

### Third-Party Libraries
- **react-qr-code**: QR code generation for merchant checkout display
- **date-fns**: Date formatting utilities
- **axios**: HTTP client for BlinkPay API calls
- **zod**: Runtime schema validation for API contracts
- **drizzle-zod**: Integration between Drizzle schemas and Zod validation

### Replit-Specific Integrations
- @replit/vite-plugin-runtime-error-modal: Error overlay in development
- @replit/vite-plugin-cartographer: Development tooling (dev only)
- @replit/vite-plugin-dev-banner: Development banner (dev only)