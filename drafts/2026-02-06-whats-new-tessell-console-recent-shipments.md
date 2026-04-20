---
title: "What’s new in the Tessell console: GCP polish, SQL Server DAP, and reliability fixes"
name: "What’s new in the Tessell console: GCP polish, SQL Server DAP, and reliability fixes"
slug: whats-new-tessell-console-recent-shipments
postSummary: "Recent UI updates improve GCP workflows, SQL Server Data Access Policies with PITR, Genie networking, maintenance and provisioning, and developer build speed—here’s what landed in the console."
description: "A concise roundup of notable Tessell UI changes from recent releases so you can see what changed without digging through commit history."
seo:
  title: "What’s new in the Tessell console — recent UI updates"
  metaDescription: "GCP console tweaks, SQL Server DAP and PITR-aware behavior, Genie IP options, Azure private connectivity, maintenance fixes, and more in Tessell’s UI."
publishedDate: "2026-02-06T12:00:00.000Z"
draft: true
archived: false
headerFeatured: false
featured: false
---

## Why this roundup

We scanned recent Tessell UI work and compared it to our published blog catalog. Many posts cover strategy, compliance, and deep dives on specific engines; this note focuses on **what changed in the product UI** so teams can adopt new behavior quickly.

## GCP on Core

- **Prechecks and feasibility checks** for GCP are adjusted in the UI so the experience matches current product behavior on Google Cloud.
- **Clone refresh** is **disabled for GCP** engines except where Oracle on GCP still supports it—reducing confusion when refresh is not available.
- The **Code** menu no longer surfaces **Terraform** for GCP where it does not apply.
- **Native backup RPO** policy support is **removed for GCP Cloud SQL Server** in the UI to align with supported capabilities.
- **Access policies** are enabled for **GCP AV machines**, bringing policy controls in line with other environments where applicable.

## SQL Server Data Access Policies (DAP)

- The UI now respects **PITR (point-in-time recovery) availability**: tabs and toggles adapt when PITR is not available for a scenario.
- **Subscription and region** context is handled more consistently when configuring DAP-related options.
- **Clone workflow**: SQL Server **collation** is **pre-filled and locked** where required, avoiding invalid combinations.

## Networking and Genie

- **Genie** can attach **private and public IP addresses** where supported.
- On **Azure**, **private connectivity** can be **turned off** via the toggle when your topology allows it.

## Provisioning, maintenance, and operations

- **Provisioning** surfaces **image status** in the adapter layer so the UI reflects image state more clearly during create flows.
- **Instance counts** use correct values instead of hard-coded placeholders where fixed.
- **Maintenance window**: a crash when the API returns **`maintenanceWindow: null`** is resolved on **DB Service → Settings → Maintenance Window**.
- **Unsupported API arguments** (`maintenance_window`, `server_patching_config`) are cleaned up in client usage to match backend contracts.
- **Monitoring** received several small bug fixes.
- **DR drill**: a **shared feature flag** path supports DR drill flows across supported engines.

## Developer experience

- **Rsbuild** configuration was added for **Rspack**-based builds, improving local dev and build tooling alignment.

## What wasn’t already covered on the blog

Published posts include strong coverage of PCI, Gartner, Oracle on GCP, SQL Server HA, and DAP at a high level. There is **no single** recent article that ties together this **specific set** of console changes—especially **GCP-specific UI alignment**, **SQL Server DAP + PITR-aware UI behavior**, **Genie IP options**, and the **maintenance window null** fix—so this draft fills that gap for release notes–style readers.
