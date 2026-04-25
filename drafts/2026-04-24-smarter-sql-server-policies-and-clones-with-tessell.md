---
name: "Smarter SQL Server Policies and Clones with Tessell"
title: "Smarter SQL Server Policies and Clones with Tessell"
slug: smarter-sql-server-policies-and-clones-with-tessell
postSummary: >-
  Configuring disaster recovery policies and cloning SQL Server databases shouldn't require guesswork.
  We've made Tessell's console aware of your subscription, region, and collation context — so the controls
  you see are the controls that actually work for your environment.
description: >-
  How Tessell's latest SQL Server console improvements connect Data Access Policies to PITR availability
  and bring collation-aware cloning — reducing misconfiguration and saving time for SQL Server teams.
publishedDate: "2026-04-24"
draft: true
seoTitle: "SQL Server DAP & Clone Improvements in Tessell"
seoMetaDescription: >-
  Tessell now ties SQL Server Data Access Policies to real PITR availability and pre-fills collation
  in clone workflows — fewer errors, faster setup.
blogCategoryRef: "6595ba6a4fc9a8154a463a7c"
blogTagsRefs:
  - "6595bdabeef1c6ae6d5f2259"
  - "6595bb0f98a5fee6eb7fa12f"
  - "6595bd9c5ff43019af2b1983"
  - "65fb48927065955d0af7c16b"
---

If you've ever configured a disaster recovery policy for a SQL Server database, you've probably had this experience: you carefully set up your Data Access Policy, pick your Point-in-Time Recovery settings, save — and then discover days or weeks later that PITR isn't actually available in your subscription or region. The policy looked valid in the UI. The backend quietly disagreed.

It's the kind of mismatch that erodes trust. Not because the platform can't do what you need — but because the console didn't tell you what it couldn't do.

At Tessell, we've been closing exactly these gaps. Our recent improvements to the SQL Server experience connect Data Access Policies directly to real-world PITR availability, and bring collation awareness into the clone workflow — two areas where SQL Server teams have historically spent more time debugging configuration than they should.

## When Policies Meet Reality

Data Access Policies (DAP) are how Tessell customers manage data availability, disaster recovery, and compliance. A DAP defines where your data lives, how it's replicated, and how quickly you can recover it. For SQL Server, Point-in-Time Recovery is a critical piece of that puzzle — it determines whether you can restore to a specific moment before a failure or data corruption event.

The challenge is that PITR availability isn't universal. It depends on your subscription tier, the Azure or AWS region you're operating in, and how your SQL Server environment is configured. Until now, the Tessell console presented PITR-related toggles regardless of whether they would actually work for your specific setup.

**That's changed.**

The console now checks your subscription and region context before presenting DAP options. If PITR isn't available for your environment, the relevant toggles are either adjusted or disabled — with clear messaging about why. No more saving a policy that looks valid but can't execute when you need it most.

This matters because disaster recovery isn't something you test casually. Teams configure DAP policies during initial setup, then rely on them for months — sometimes years — before a real recovery scenario occurs. Discovering at that moment that your PITR policy was never going to work is the worst possible outcome. By surfacing these constraints at configuration time, we're moving the failure point from "during the incident" to "during the setup" — where it's cheap to fix and easy to adjust.

## Guardrails, Not Roadblocks

It would be easy to solve this problem by simply removing options. But that's not what database teams need. You need flexibility within your environment's real constraints.

That's why we've implemented restriction-based guardrails rather than blanket disabling. When PITR can't support a particular DAP configuration — say, a cross-region backup schedule that requires PITR capabilities your current subscription doesn't include — the console prevents that specific combination. But it still lets you configure everything else. The goal is to make invalid states impossible to save, without limiting the valid configurations you can create.

Think of it as the difference between a GPS that says "road closed, rerouting" versus one that just turns off. We want to keep you moving, on a path that actually works.

## Cloning Without the Collation Guessing Game

Anyone who has managed SQL Server environments at scale knows that collation isn't just a setting — it's a compatibility contract. When two databases use different collations, string comparisons, sorting, and even basic queries can behave differently. In a clone workflow, getting the collation wrong means your clone doesn't faithfully represent your production environment — which defeats the purpose of cloning in the first place.

Previously, the Tessell clone workflow for SQL Server required manual collation entry. It was one more field to fill, one more thing to remember, and one more opportunity for a subtle mismatch that wouldn't surface until a query returned unexpected results.

We've updated the workflow to **automatically pre-fill the collation field** from the source database and **lock it** when the source has a specific collation requirement. This means:

- **Clones match production by default.** You don't need to look up your source collation and type it in — the workflow carries it forward automatically.
- **Standardized environments stay standard.** For teams that enforce collation consistency across development, staging, and production databases, the locked field prevents accidental deviation.
- **Less debugging, faster provisioning.** Removing a manual step that can introduce errors means your clones are ready to use sooner, with fewer "why is this query behaving differently?" investigations.

It's a small change in the UI — one field that now populates itself. But for SQL Server teams managing dozens or hundreds of clones, it eliminates a recurring source of friction.

## What This Means for SQL Server Teams

These improvements share a common philosophy: **the console should understand your environment as well as you do.** When you configure a Data Access Policy, the toggles should reflect what's actually possible for your subscription and region. When you clone a database, the settings should carry forward from the source without manual re-entry.

SQL Server has historically been one of the more nuanced engines to manage in the cloud — not because the database itself is difficult, but because the ecosystem around it (licensing, availability groups, collation rules, subscription tiers) creates a web of dependencies that generic tooling doesn't account for. These updates are part of our ongoing investment in making Tessell's SQL Server experience engine-aware, not just cloud-generic.

We already cover [SQL Server High-Availability](https://www.tessell.com/blog/sql-server-high-availability-how-and-why), [migration with Distributed Availability Groups](https://www.tessell.com/blog/sql-server-migration-using-distributed-availability-groups), and [performance benchmarks](https://www.tessell.com/blog/tessell-for-sql-server-benchmark). These console improvements are the Day 2 complement — making sure the database you've migrated and tuned continues to be easy to manage, protect, and clone as your environment evolves.
