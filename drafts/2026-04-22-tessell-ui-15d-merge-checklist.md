---
name: "15-day tessell-ui merge checklist (April 2026)"
title: "15-day tessell-ui merge checklist (April 2026)"
slug: tessell-ui-15d-merge-checklist-apr-2026
postSummary: >-
  A scannable list of what landed in tessell-ui in the last ~15 days—GCP, SQL Server, stability, and tooling—
  alongside links to our deeper blog library for context.
description: >-
  Commit-driven checklist from git for operators tracking Tessell console changes; not a replacement for product docs.
publishedDate: "2026-04-22"
draft: true
seoTitle: "tessell-ui: 15-day merge checklist (Apr 2026)"
seoMetaDescription: >-
  Recent merges in tessell-ui: GCP UI checks, DAP/PITR, maintenance window fix, Rspack/Rsbuild, monitoring, access policies, and more.
blogCategoryRef: "662befebad639d6ff9eb3f42"
blogTagsRefs:
  - "67dddfff58184d6cd72bce7c"
  - "6595bb0f98a5fee6eb7fa12f"
  - "6595bb89ceddfaaf24dc8358"
---

This **checklist** summarizes **themes in tessell-ui merges from the last ~15 days** (local repo scan). It is meant for teams who want a **fast inventory**; see our other posts for product strategy, benchmarks, and engine-specific guides.

## Merge themes (grouped)

**Google Cloud (GCP)**  
- Disable certain **precheck / feasibility** UI where not useful.  
- **Clone refresh** off for most GCP engines; **exception** for Oracle.  
- **Remove Terraform** from the **Code** action for GCP.  
- **Native backup RPO** policy **removed** for **GCP Cloud SQL Server** in the UI.  
- **Access policies** for **GCP AV** machines.  
- **Instance count** from API instead of hard-coded values.  

**SQL Server**  
- **DAP** + **subscription/region-aware PITR** handling.  
- **Restrictions** when **PITR** cannot support a DAP choice.  
- **Clone:** **pre-fill and lock** **collation** when appropriate.  

**Reliability & ops**  
- **Maintenance window:** no crash when **`maintenanceWindow`** is **null**.  
- **Monitoring** bug fixes.  
- Reject or handle **unsupported** `maintenance_window` / `server_patching_config` argument combos.  
- **Image status** in provisioning **images** adapter.  

**Networking & access**  
- **Genie:** **public and private** IPs.  
- **Azure:** private **connectivity** can be **disabled** when required.  

**DR & feature flags**  
- **DR-drill** **feature flag** shared across supported engine DR-drill flows.  

**Engineering**  
- **Rsbuild** config for **Rspack**.  
- **Tests:** IAM governance; compute pages; **legacy addUser** marked for deletion.  

## Already on the blog

We already cover **DAP/DR strategy**, **Oracle on GCP**, **SQL Server HA/migration**, and more in long-form posts. This note fills the gap: **“what did the console merge in the last two weeks?”** without duplicating those narratives.

---

*For exact behavior in your account, use in-product help and your Tessell support channel.*
