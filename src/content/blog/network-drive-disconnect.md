---
title: "Mapping a network drive that keeps dropping"
description: "Why mapped drives disconnect, and how to make them stick."
category: "Connectivity"
pubDate: 2026-03-02
---

A mapped drive that shows a red X or asks for credentials again is usually a credential or reconnection issue, not a broken share. Here is how to settle it.

## Confirm the share is reachable

Try opening the full network path directly. If the path opens but the mapped letter fails, the mapping is the issue, not the server.

## Fix stale credentials

A recent password change is the most common cause. The saved credential for the share is now wrong and the drive drops. Clear the stored entry in Credential Manager, then remap with current credentials and tick the reconnect option.

## Make it persistent

Map the drive so it reconnects at sign in, or use a sign in script or Group Policy mapping for consistency across users. A drive mapped by policy survives reboots far better than one mapped by hand.

## Document the cause

Note whether it was credentials, the reconnect setting, or the network. Patterns across tickets often point at one root cause worth fixing centrally.
