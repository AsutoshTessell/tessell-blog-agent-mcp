---
title: "What’s new in the Tessell console: GCP, SQL Server, and platform polish"
name: "What’s new in the Tessell console: GCP, SQL Server, and platform polish"
slug: whats-new-tessell-console-roundup-apr-2026
postSummary: "A practical roundup of recent tessell-ui work: GCP workflows, SQL Server DAP and clones, Genie, Azure, maintenance fixes, and build tooling—all in one place."
description: "Release-notes style summary of notable console changes from recent development versus themes already on the Tessell blog."
seo:
  title: "What’s new in the Tessell console — April 2026"
  metaDescription: "GCP UI updates, SQL Server DAP and PITR, Genie networking, Azure connectivity, DR drill, provisioning fixes, and Rsbuild in Tessell."
publishedDate: "2026-04-20T12:00:00.000Z"
draft: true
archived: false
headerFeatured: false
featured: false
# From get_blog_categories_and_tags — Announcements
blogCategoryRef: "6595bae01ec925b326cf2eb6"
# Google Cloud Platform, Azure, AWS, DBaaS
blogTagsRefs:
  - "67dddfff58184d6cd72bce7c"
  - "6595bbf7652008419797339d"
  - "6595bbf3c0582c0938488bb2"
  - "6595bb0f98a5fee6eb7fa12f"
---

## Why this post

We looked at recent **tessell-ui** commits (about two weeks) and compared them to **published** Tessell blog titles. The blog already has strategy, compliance, and deep dives; this note is a **console-centric** digest.

## GCP on Core

- **Prechecks and feasibility** checks for GCP are adjusted in the UI to match current product behavior.
- **Clone refresh** is constrained on GCP—disabled where it does not apply; **Oracle on GCP** remains the exception where refresh still applies.
- The **Code** entry no longer offers **Terraform** for GCP when it is not applicable.
- **Native backup RPO** UI for **GCP Cloud SQL Server** was removed where unsupported.
- **Access policies** are enabled for **GCP AV machines**.

## SQL Server

- **Data Access Policies** respect **PITR** availability; UI tabs and toggles follow subscription/region context.
- **Clone** flow: **collation** is pre-filled and locked where required.

## Networking and Genie

- **Genie** supports **private and public IPs** where applicable.
- **Azure**: **private connectivity** can be turned **off** when allowed.

## Operations and reliability

- **Provisioning** surfaces **image status**; **instance** counts use correct values.
- **Maintenance window**: fixed a crash when **`maintenanceWindow`** is **null** from the API.
- Removed unsupported client args for **`maintenance_window`** / **`server_patching_config`**.
- **Monitoring** bug fixes; **DR drill** shared feature-flag path across engines.

## Build and tests

- **Rsbuild** / Rspack integration for developer builds.
- More **IAM** and **compute** unit tests; legacy **addUser** path marked for deletion.

## Coverage gap

Published posts don’t bundle this **exact mix** of **recent UI-only** changes in one short article—especially **GCP alignment**, **SQL Server DAP + PITR behavior**, and the **maintenance window** fix.
