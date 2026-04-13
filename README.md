# n8n-nodes-paytm

**Repository:** [github.com/paytm/n8n-nodes-paytm](https://github.com/paytm/n8n-nodes-paytm)

Community-maintained n8n nodes for **Paytm Payments** (checksum APIs: orders, payment links, refunds, subscriptions) and **settlement / RTDD** flows via a **merchant-adapter** HTTP wrapper.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

This package is **beta-quality**: there is no automated test suite yet—validate in a test environment before production use.

[Installation](#installation)  
[Operations](#operations)  
[Credentials](#credentials)  
[Development](#development)  
[Compatibility](#compatibility)  
[Resources](#resources)

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

Install this package in your n8n user folder (for example `~/.n8n/nodes`) or add it as a dependency of your n8n deployment, then restart n8n.

## Operations

The **Paytm** node exposes **five** resources (UI order: **Order**, **Payment Link**, **Refund**, **Settlement**, **Subscription**).

### Order

- **Get Many Order Details** — List orders in a date range.

### Payment Link

- **Create** — Create a fixed or generic payment link with customer contact options.
- **Get Many Payment Link Details** — List payment links for the merchant.
- **Get Many Transactions for a Payment Link** — Transactions for a specific payment link.

### Refund

- **Create a Refund** — Apply a refund for a transaction.
- **Get a Refund Status** — Status by order ID and refund reference.
- **Get Many Refund Statuses** — Refunds in a date range (passbook).

### Settlement

Settlement calls go to the **Merchant Adapter Base URL** from credentials (see below), not directly to Paytm’s public payment host.

- **Get a Settlement Summary** — Settlement bills for a settled date range.
- **Get Many Settlement Details** — Settlement transactions for a date range.
- **Get Order Level Settlement Details** — Detail for a business order ID (optional settlement / payment flags).
- **Get Transaction Level Settlement Details** — Search business orders by creation window (and optional filters).

### Subscription

- **Initiate Subscription** — Create a recurring subscription.
- **Fetch Subscription Status** — Look up subscription by subs ID, order ID, or link ID.
- **Pause or Resume Subscription** — Pause (suspended) or resume (active) UPI Autopay.
- **Cancel Subscription** — Cancel an active subscription.

## Credentials

Create a **Paytm API** credential in n8n with:

| Field | Description |
|--------|-------------|
| **Environment** | **Production** for live traffic, or **Test** for staging / validation. |
| **Merchant ID** | Your Paytm merchant ID (MID). |
| **Key Secret** | Merchant key used for AES checksum on Payments / Refund / Subscription requests and for signing RTDD request envelopes to the merchant adapter. |
| **Merchant Adapter Base URL** | Base URL of your **settlement (RTDD) wrapper**. Requests use `{base}/merchant-adapter/internal/{function}?mid=…`. Use the default (for example local development) only if you run that adapter; production deployments should set the URL your infrastructure provides. |

Onboarding and API reference: [Paytm Payments documentation](https://www.paytmpayments.com/docs/getting-started).

## Development

- **Build**: `npm run build`
- **Lint** (required for a clean tree; same rules as `prepublishOnly`): `npm run lint`
- **Format**: `npm run format`

See [CONTRIBUTING.md](./CONTRIBUTING.md) for branching, checks, and release notes.

## Compatibility

- **Node.js**: `>=20.15` (see `package.json` `engines`).
- **n8n**: Use a release that supports community nodes and your installed `n8n-workflow` peer dependency; verify against your target n8n version before production.

## Resources

* [Source code & issues](https://github.com/paytm/n8n-nodes-paytm)
* [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
* [Paytm Payments documentation](https://www.paytmpayments.com/docs/getting-started)

## License

See [LICENSE.md](./LICENSE.md).
