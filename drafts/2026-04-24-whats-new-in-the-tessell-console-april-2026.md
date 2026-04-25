---
name: "What's New in the Tessell Console — April 2026"
title: "What's New in the Tessell Console — April 2026"
slug: whats-new-in-the-tessell-console-april-2026
postSummary: >-
  A roundup of the quieter — but important — improvements landing in the Tessell console this month:
  smarter GCP guard-rails, expanded DR drill support, flexible IP management, and faster builds
  behind the scenes.
description: >-
  April 2026 platform update covering GCP experience refinements, DR drill expansion,
  networking flexibility, reliability fixes, and engineering velocity improvements in the Tessell console.
publishedDate: "2026-04-24"
draft: true
seoTitle: "Tessell Console Updates — April 2026"
seoMetaDescription: >-
  What's new in the Tessell console: GCP guard-rails, DR drill support, IP flexibility,
  and engineering improvements — April 2026 roundup.
blogCategoryRef: "662befebad639d6ff9eb3f42"
blogTagsRefs:
  - "6595bb89ceddfaaf24dc8358"
  - "6595bb0f98a5fee6eb7fa12f"
  - "67dddfff58184d6cd72bce7c"
  - "6595bdabeef1c6ae6d5f2259"
---

Not every improvement to a database platform makes headlines. Some of the most valuable changes are the ones you don't notice — because they prevent the confusion, the failed operation, or the support ticket that would have happened without them.

This month, we've been focused on making the Tessell console more context-aware across clouds, expanding disaster recovery capabilities, and investing in the engineering foundations that keep the platform moving fast. Here's what landed.

## Smarter Guard-Rails for GCP

As we continue expanding Tessell's GCP support, we've been tightening the console experience so it only presents controls that are actually supported on Google Cloud. Two changes stand out this month.

First, pre-check and feasibility validations — the checks the console runs before provisioning to verify that your configuration will work — are now disabled for GCP workflows where the backend doesn't yet support them. Previously, these controls appeared in the UI regardless of cloud, which could lead to confusing results or failed validations on GCP. Now, the console surfaces these checks only on clouds where they're fully operational.

Second, clone refresh has been disabled for most GCP database engines. Clone refresh allows you to update a clone with the latest data from its source — but on GCP, this capability isn't available for engines like PostgreSQL, MySQL, and SQL Server. Oracle is the exception, where clone refresh remains fully supported on GCP. Rather than letting teams trigger an operation that would fail, the console now hides the refresh option entirely for engines where it doesn't apply. Less confusion, fewer failed operations.

These aren't flashy features — they're guard-rails. And guard-rails are what keep teams confident that the buttons they see in the console will actually do what they expect.

## Disaster Recovery Drill Support Expanding

Disaster recovery planning is only as good as your ability to test it. This month, we've laid the groundwork for DR drill support across more database engines by introducing a common feature flag framework that standardizes how DR drills are enabled and managed.

What this means in practice: as Tessell adds DR drill capabilities to additional engines beyond the ones currently supported, the experience will be consistent. The same controls, the same workflows, the same confidence — regardless of whether you're running Oracle, PostgreSQL, SQL Server, or MySQL. It's the kind of infrastructure work that doesn't have a visible UI change today, but enables meaningful capabilities tomorrow.

## Flexible IP Management for Genie Environments

For teams using Tessell's Genie-managed environments, network configuration just got more flexible. The platform now supports adding both private and public IP addresses, where previously only one type was available.

This matters for organizations that run hybrid network topologies — some services accessed over private connectivity, others requiring public endpoints for external integrations or monitoring tools. Instead of working around a single-IP limitation, teams can now configure their Genie environments to match their actual network architecture.

## Reliability and Accuracy Fixes

A fix this month ensures that instance counts displayed in the console accurately reflect the number of provisioned resources, rather than showing a hardcoded value. It's the kind of detail that matters for teams managing large environments — when your dashboard says you have 12 instances, you need to trust that number. Now you can.

## Under the Hood: Faster Builds with Rspack

On the engineering side, we've integrated Rsbuild with Rspack as part of our frontend build pipeline. This doesn't change anything you see in the console, but it significantly reduces build times for the engineering team — which means faster iteration cycles, quicker bug fixes, and new features reaching you sooner.

We believe that investing in developer velocity is investing in product quality. When engineers spend less time waiting for builds, they spend more time building the features and fixes that matter to you.

## What's Ahead

These improvements are part of our ongoing commitment to making the Tessell console a reliable, context-aware control plane for multi-cloud database management. Every cloud should feel like a first-class citizen. Every control should work as expected. And every operational workflow should give you confidence, not surprises.

We'll continue refining the GCP experience, expanding DR capabilities, and tightening the feedback loop between what the console shows and what the platform can do. If you have feedback on any of these changes, we'd love to hear it.
