---
title: "Troubleshooting VPN connections for remote staff"
description: "A calm order of checks for the most common remote access failures."
category: "Connectivity"
pubDate: 2026-02-03
---

When a remote user cannot connect, work from the outside in: their internet first, then the client, then credentials, then the gateway. Jumping straight to the hard causes wastes time when the simple ones are far more common.

## Step one, confirm basic internet

Can they load a normal website? If not, the VPN is not the problem yet. Fix the connection first.

## Step two, the client

Confirm the VPN client is running and updated, then have them fully quit and reopen it. A surprising share of cases end here.

## Step three, credentials and MFA

A recent password change is a frequent cause. If they reset a password earlier today, the VPN may still expect the old one. Confirm any multi factor prompt is being approved and not timing out.

## Step four, the gateway and conflicts

Check whether the issue is one user or many. If many, the gateway or a service may be down, and that is an escalation, not a per user fix. For a single user, a conflicting second VPN, a restrictive local network, or split tunnel settings can block the connection.

## Document the fix

Record which step resolved it. Over time these notes show you which causes are worth checking first for your environment.
