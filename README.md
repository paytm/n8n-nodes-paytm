# n8n-nodes-paytm

This is an **n8n community node**. It lets you use **Paytm** services in your n8n workflows.

**Paytm** is a leading payments platform in India that enables businesses to accept payments, process refunds, manage settlements, and build payment-driven workflows.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

---

## Contents

- [Installation](#installation)
- [Operations](#operations)
- [Credentials](#credentials)
- [Compatibility](#compatibility)
- [Usage](#usage)
- [Resources](#resources)
- [Version history](#version-history)
- [License](#license)

---

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

For self-hosted setups, install the package into your n8n user directory (for example under `~/.n8n`), then **restart n8n** so the node loads.

---

## Operations

Paytm n8n nodes support the following resources and operations.

### Order


| Operation    | Description                                        |
| ------------ | -------------------------------------------------- |
| **Get**      | Fetch order details.                               |
| **Get Many** | Fetch all order details for your merchant account. |


### Payment Link


| Operation    | Description                                |
| ------------ | ------------------------------------------ |
| **Create**   | Create and share a payment link.           |
| **Get**      | Fetch all transactions for a payment link. |
| **Get Many** | Fetch all payment links.                   |


### Refund


| Operation    | Description                        |
| ------------ | ---------------------------------- |
| **Create**   | Initiate a full or partial refund. |
| **Get**      | Fetch refund status.               |
| **Get Many** | Fetch all refund requests.         |


### Settlement


| Operation                 | Description                                       |
| ------------------------- | ------------------------------------------------- |
| **Get Many**              | Fetch all settlement details.                     |
| **Get Many Transactions** | Fetch transaction-level details for a settlement. |


### Subscription


| Operation  | Description                            |
| ---------- | -------------------------------------- |
| **Get**    | Fetch subscription details and status. |
| **Update** | Pause or resume a subscription.        |
| **Delete** | Cancel an active subscription.         |


---

## Credentials

To use Paytm nodes, authenticate with your **Paytm merchant API** credentials in n8n.

### Prerequisites

1. If you already have a Paytm merchant account, sign in to the [Paytm Merchant Dashboard](https://dashboard.paytm.com/). If not, create an account from Paytm's business onboarding flow.
2. Sign in with your registered credentials.
3. Go to **Developer Settings** -> **API Keys**.
4. Use **test** API details to validate workflows. Use **production** API details only for live money movement and settlement.

### Setting up Paytm credentials in n8n

1. Sign in to your n8n instance.
2. In the left panel, open **Credentials** -> **Create credential**.
3. In the credential search box, type or select **Paytm** (merchant API credential; the picker label is **Paytm**).
4. Choose the **environment** and enter **Merchant ID** and **Key Secret**.
5. If the values are valid, n8n runs a test request and confirms the connection.

### Authentication method

This node uses Paytm's standard API authentication: **Merchant ID (MID)** and **Key** (key secret), including checksum / signing where required.


| Field           | Description                                                              |
| --------------- | ------------------------------------------------------------------------ |
| **Environment** | **Production** for live traffic, or **Test** for staging and validation. |
| **Merchant ID** | Your Paytm MID from the merchant dashboard.                              |
| **Key Secret**  | Merchant key used for request signing and checksums.                     |


API reference: [Paytm Payments - Getting started](https://www.paytmpayments.com/docs/getting-started).

---

## Compatibility

- **n8n:** Tested locally against **n8n v2.13.2**. Use a release that supports community nodes and a compatible `n8n-workflow` peer dependency; verify before production.
- **Node.js:** `>=20.15` (see `package.json` -> `engines`).

---

## Usage

### Installing or configuring the Paytm community node

#### Method 1: Community Nodes (recommended)

1. Sign in to your n8n instance.
2. Open **Settings** in the left navigation bar.
3. Go to **Community Nodes** -> **Install**.
4. Enter the package name: `@paytm/n8n-nodes-paytm`.
5. **Restart n8n.** The node appears after restart.

#### Method 2: Nodes panel

1. Sign in to your n8n instance.
2. Create a new workflow or open an existing one.
3. Open the nodes panel (**+** on the top right, or press **N**).
4. Search for **Paytm**.
5. Choose **Install** if prompted.

#### Method 3: npm (self-hosted)

If you run a self-hosted n8n instance:

```bash
# From your n8n user directory (typical default)
cd ~/.n8n

# Install the community node
npm install n8n-nodes-paytm

# Restart your n8n instance
```

#### Method 4: Docker

n8n often recommends Docker for self-hosting. Example image layer:

```dockerfile
FROM n8nio/n8n:latest
USER root
RUN npm install -g n8n-nodes-paytm
USER node
```

Adjust paths and install location to match [n8n's Docker installation guide](https://docs.n8n.io/hosting/installation/docker/).

### Using the Paytm node

1. Configure **Paytm** credentials (see [Credentials](#credentials)).
2. Create or open a workflow.
3. Add a node: open the panel (**+** or **N**) and search for **Paytm**.
4. Pick the **resource** and **operation** (Create, Get, Get Many, etc.).
5. Fill required and optional fields, then run the workflow.

---

## Resources

- [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/installation/)
- [Paytm Merchant Dashboard](https://dashboard.paytm.com/)
- [Getting started with Paytm Payments](https://www.paytmpayments.com/docs/getting-started)

---

## Version history

- See [GitHub Releases](https://github.com/paytm/n8n-nodes-paytm/releases) for tagged versions.
- Current package version: **0.1.0** (see `package.json`).

---

## License

See the [MIT license](https://github.com/paytm/n8n-nodes-paytm/blob/HEAD/LICENSE.md).