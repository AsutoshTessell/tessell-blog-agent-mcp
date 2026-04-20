---
title: "What’s new in the Tessell console: GCP, SQL Server DAP, and reliability"
name: "What’s new in the Tessell console: GCP, SQL Server DAP, and reliability"
slug: whats-new-tessell-console-ui-updates-feb-2026
postSummary: "Recent UI work improves GCP workflows, SQL Server Data Access Policies with PITR, Genie networking, and day-to-day stability—here’s a concise rundown for practitioners."
description: "A short release-style summary of notable Tessell console changes from recent development, compared to broader themes already on the blog."
seo:
  title: "What’s new in the Tessell console — recent UI updates"
  metaDescription: "GCP console tweaks, SQL Server DAP and PITR-aware UI, Genie, Azure connectivity, maintenance and provisioning fixes, and build tooling in Tessell."
publishedDate: "2026-02-10T12:00:00.000Z"
draft: true
archived: false
headerFeatured: false
featured: false
---

## Why this post

We reviewed recent **tessell-ui** changes (about the last two weeks) and compared them to **published** posts on the Tessell blog. The site already covers strategy, compliance, and deep dives on engines; this note focuses on **what changed in the product UI** so you can adopt new behavior quickly.

## GCP on Core

- **Prechecks and feasibility checks** for GCP are adjusted in the UI to match current product behavior.
- **Clone refresh** is limited on GCP: disabled for engines where it does not apply, with **Oracle on GCP** as the exception where refresh remains relevant.
- The **Code** menu no longer offers **Terraform** for GCP where it is not applicable.
- **Native backup RPO** policy UI for **GCP Cloud SQL Server** was removed to align with supported capabilities.
- **Access policies** are enabled for **GCP AV machines**, bringing policy controls in line with other environments where supported.

## SQL Server: Data Access Policies and clones

- The UI **respects PITR (point-in-time recovery) availability**: tabs and toggles adapt when PITR is not available for a scenario.
- **Subscription and region** context is handled more consistently when configuring DAP-related options.
- In the **clone** flow, **SQL Server collation** is **pre-filled and locked** where required to avoid invalid combinations.

## Networking and Genie

- **Genie** can attach **private and public IP addresses** where supported.
- On **Azure**, **private connectivity** can be **turned off** via the toggle when your topology allows it.

## Provisioning, maintenance, and operations

- **Provisioning** shows **image status** in the adapter layer so the UI reflects image state more clearly during create flows.
- **Instance counts** use correct values instead of hard-coded placeholders where fixed.
- **Maintenance window**: a crash when the API returns **`maintenanceWindow: null`** is fixed on **DB Service → Settings → Maintenance Window**.
- Client usage drops **unsupported** API arguments (`maintenance_window`, `server_patching_config`) where the backend no longer accepts them.
- **Monitoring** received several small bug fixes.
- **DR drill**: a **shared feature flag** path supports DR drill flows across supported engines.

## Developer experience

- **Rsbuild** configuration was added for **Rspack**-based builds, improving local dev and build tooling alignment.

## Governance and tests

- **IAM governance** and **compute** areas gained **unit tests**; the legacy **addUser** path is marked for removal.

## What wasn’t already covered as a single story

Published posts include **DAP**, **Oracle on GCP**, and **SQL Server** topics at a high level, but **no one article** ties together this **exact set** of **console-level** changes—especially **GCP-specific UI alignment**, **SQL Server DAP + PITR-aware behavior**, **Genie IP options**, and the **maintenance window null** fix. This draft fills that gap.
