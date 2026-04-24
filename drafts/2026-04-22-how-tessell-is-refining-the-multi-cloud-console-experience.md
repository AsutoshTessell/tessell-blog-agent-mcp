---
name: "How Tessell Is Refining the Multi-Cloud Console Experience"
title: "How Tessell Is Refining the Multi-Cloud Console Experience"
slug: how-tessell-is-refining-multi-cloud-console-experience
postSummary: >-
  As organizations run databases across AWS, Azure, and Google Cloud, the console they rely on every day needs to
  keep pace. We've been shipping targeted improvements to Tessell's console — smarter GCP workflows, tighter
  SQL Server policy controls, and stability fixes — so operators spend less time second-guessing the UI and more
  time focused on what matters.
description: >-
  A look at recent Tessell console improvements across Google Cloud, SQL Server, and day-two operations — written
  for the teams who live inside the product every day.
publishedDate: "2026-04-22"
draft: true
seoTitle: "Multi-cloud console improvements at Tessell"
seoMetaDescription: >-
  Tessell refines its multi-cloud console: smarter GCP workflows, SQL Server DAP/PITR controls, and stability
  fixes for teams managing databases at scale.
blogCategoryRef: "662befebad639d6ff9eb3f42"
blogTagsRefs:
  - "67dddfff58184d6cd72bce7c"
  - "6595bb0f98a5fee6eb7fa12f"
  - "6595bb89ceddfaaf24dc8358"
  - "678ede30f80842c9a5f4ebf3"
---

If you manage databases across more than one cloud, you know the feeling: a button that makes perfect sense on AWS might be meaningless — or worse, misleading — on Google Cloud. A policy toggle that works for PostgreSQL might behave differently for SQL Server. And a settings page that's fine 99% of the time can crash the one time your API returns an unexpected null.

These aren't dramatic failures. They're the small, cumulative frustrations that slow teams down and erode trust in a platform. At Tessell, we've been investing in exactly these kinds of improvements — not headline features, but the kind of refinements that make a multi-cloud console feel **intentional** rather than bolted together.

Here's what we've been working on.

## Google Cloud Deserves Its Own Experience

When we first brought GCP into the Tessell console, the natural starting point was to mirror the AWS and Azure workflows. That gets you most of the way — but "most of the way" isn't good enough for production teams. Google Cloud has its own infrastructure model, its own networking constructs, and its own set of supported operations. The console should reflect that.

Over the past few weeks, we've made a series of targeted changes to ensure the GCP experience is **clean and honest** — showing operators exactly what they can do, and nothing they can't.

**Validation that respects the platform.** Certain precheck and feasibility steps that are valuable on AWS or Azure don't apply in GCP contexts. Rather than running them anyway and returning confusing results, we've disabled them where they don't add value. The provisioning flow stays focused on what actually matters for your GCP deployment.

**Clone behavior aligned with reality.** Clone refresh is a powerful feature — but it isn't supported for every engine on every cloud. On GCP, we've turned off clone refresh for engines where the platform doesn't support it, while keeping it available for Oracle, which has deeper integration with GCP infrastructure. The result: operators don't click a button only to hit an error five minutes later.

**Automation paths that make sense.** The "Code" button in the Tessell console offers quick access to infrastructure-as-code templates. For GCP, we've removed the Terraform option where it doesn't apply, so teams aren't directed toward an unsupported path. It's a small change, but it prevents wasted time and support tickets.

**Backup policy clarity.** For SQL Server running on GCP, we've removed the native backup RPO policy option from the UI. This aligns the console with what the platform actually supports today, rather than exposing a control that would silently do nothing.

These aren't just UI cleanups — they're about **trust**. When an operator opens the Tessell console and sees an option, they should be confident it will work. That's the bar we're holding ourselves to across every cloud.

## SQL Server: Smarter Policy Controls

Data Access Policies (DAP) are central to how Tessell customers manage disaster recovery, compliance, and data availability. For SQL Server specifically, the relationship between DAP and Point-in-Time Recovery (PITR) can be nuanced — PITR availability depends on your subscription tier, the region you're operating in, and how your environment is configured.

We've updated the console to be **aware of that context**.

**Subscription and region-aware toggles.** When you configure DAP settings for a SQL Server database, the console now checks whether PITR is actually available for your specific subscription and region. If it isn't, the relevant toggles are either disabled or adjusted — rather than presenting options that would fail at execution time. This is the kind of intelligence that saves hours of troubleshooting.

**Guardrails where they matter.** In cases where PITR cannot support a particular DAP configuration, the console now applies explicit restrictions. Instead of letting you save an invalid combination and discovering the problem during a recovery scenario — the worst possible time to find out — the UI prevents it upfront.

**Collation handling in clone workflows.** When cloning a SQL Server database, the collation setting can be critical. We've added the ability to **pre-fill and lock** the collation field during the clone workflow when the source database has a specific collation requirement. This removes a common source of errors in multi-step clone operations, especially for teams managing standardized environments.

## The Stability That Day-Two Operations Demand

Building features gets the headlines. But for teams running databases in production, **stability in the day-two experience** — settings pages, monitoring dashboards, provisioning feedback — is what actually determines whether a platform earns long-term trust.

**Maintenance window resilience.** We fixed a crash that occurred on the **DB Service → Settings → Maintenance Window** page when the API returned a null `maintenanceWindow` value. It's the kind of edge case that rarely happens — until it does, and an operator can't access their settings. That's resolved now, and the page handles empty or unexpected responses gracefully.

**Monitoring reliability.** Several monitoring-related issues were addressed to ensure that dashboards and alert views remain accurate and responsive. When you're troubleshooting a production incident at 2 AM, the last thing you need is a monitoring page that's also misbehaving.

**Provisioning visibility.** During provisioning, the console now surfaces image status information more clearly, so operators can see exactly where their workload is in the preparation pipeline. It's a small addition that reduces "is it working?" anxiety during longer provisioning cycles.

**Access and networking refinements.** For teams managing network topology, we've enabled access policies for GCP availability machines where appropriate, and added the ability to disable private connectivity toggles on Azure when your architecture requires it. These are precise controls for teams with specific networking requirements.

## What This Means for You

None of these changes are going to make a press release. But if you're a DBA or a platform engineer who spends your day inside the Tessell console — managing databases across AWS, Azure, and Google Cloud — you'll notice the difference. Fewer dead ends. Fewer misleading options. Fewer moments of "wait, why isn't this working?"

At Tessell, we believe the best multi-cloud experience isn't just about supporting every cloud. It's about making each cloud feel native, each workflow feel intentional, and each control feel trustworthy. That's what we're building toward — one improvement at a time.
