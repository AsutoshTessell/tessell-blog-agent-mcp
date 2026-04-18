---
title: "What’s New in Tessell: GCP Console Alignment, SQL Server Policies, and Provisioning Polish"
slug: whats-new-tessell-ui-recent-console-and-gcp-updates
category: Product updates
status: draft
---

## Summary

This draft summarizes **recent tessell-ui work (roughly the last two weeks)** and how it differs from topics already covered on [tessell.com/blog](https://tessell.com/blog). Published posts include PCI DSS, Gartner recognition, SQL Server HA and migration guides, DAP at a high level, and Oracle/GCP stories—but there is **no dedicated article** yet for the **GCP-specific console behavior**, **SQL Server Data Access Policy (DAP) + point-in-time recovery (PITR)** UI rules, or the **operational fixes** below.

---

## Google Cloud: what you see in the console

Recent UI changes align **GCP** with supported capabilities today:

- **Prechecks and feasibility** — For GCP, the flow skips the same precheck path and **hides** feasibility controls where they do not apply.
- **Clone refresh** — On GCP, **clone refresh** is **disabled** for engines that do not support it, with **Oracle** called out as the exception where it remains available.
- **Code → Terraform** — The **Terraform** option is **removed** from the Code entry for **GCP**, matching supported automation for that cloud.
- **Native backup RPO (SQL Server on GCP)** — **Native backup RPO policy** is **not** surfaced for **GCP Cloud SQL Server** where it was incorrect; cloud/engine checks are tightened so options match real support.
- **Access policies on AV machines** — **Access policies** are **enabled** for **GCP** availability **(AV)** machines.

Together, these reduce confusing or unsupported actions when you work on **GCP**.

---

## SQL Server: Data Access Policies and PITR

**Data Access Policies (DAP)** for **SQL Server** now follow **PITR** and **source** context more strictly:

- Without PITR for SQL Server, the **Access Policies** tab is **hidden** where appropriate.
- When PITR applies, the UI can **force PITR on**, **lock** the toggle, and **hide** combinations that are invalid (including certain sanitized-content and manual-sharing paths).
- When you choose **source subscription** and **source region** in the DAP create flow, **PITR** behavior is **subscription- and region-aware**.

This is complementary to the high-level DAP story in existing blogs; it focuses on **in-console governance and recovery alignment**.

---

## Clones, provisioning, and reliability

- **SQL Server clones** — **Collation** is **pre-filled from the source** and **locked** so clones stay consistent with production.
- **Provisioning** — **Image status** is reflected during provisioning; **instance counts** include **all instances across services** rather than a misleading single slice.
- **Maintenance window** — Handles a **null** `maintenanceWindow` from the API without crashing; schedule UI is safer.
- **API alignment** — Stops sending unsupported **`maintenance_window`** / **`server_patching_config`** where not valid.
- **Monitoring** — Addresses several **monitoring** issues in the UI.

---

## Genie and networking

- **Genie** — You can request **private** or **public** **IP addresses** where the workflow allows.
- **Azure** — The **private connectivity** toggle can be **turned off** when your scenario requires it.

---

## Engineering note

The UI codebase is gaining **Rsbuild / Rspack** configuration alongside **Webpack** for faster builds—primarily a **developer experience** improvement, not an end-user feature.

---

## For editors

- Confirm **feature-flag** and **engine availability** wording with the latest release notes before publishing.
- Cross-link to existing posts on **SQL Server**, **GCP**, and **DAP** where helpful.

---

*Draft based on tessell-ui git history (~14 days) compared to published blog titles exported from Sanity (`get_published_blogs` / `BLOG_POSTS_QUERY`).*
