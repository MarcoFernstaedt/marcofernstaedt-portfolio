---
title: "No internet on one workstation: Wi-Fi and Ethernet diagnosis"
description: "Isolate whether the problem is the machine, the connection, or the network."
category: "Networking"
pubDate: 2026-05-19
---

When one machine has no internet but others are fine, the network itself is probably healthy. The job is to isolate the one device's path to it.

## Scope it first

If only this workstation is affected, skip the router and focus on the machine. If several are down, that is a network or provider issue and a different escalation.

## Check the local connection

- For Ethernet, confirm the cable is seated at both ends and the port shows a link light
- For Wi-Fi, confirm the right network is selected and the signal is present
- Look for an address that starts with 169.254, which means the machine did not get a valid address

## Renew and test

Release and renew the IP address, then test reaching a known site by name and by address. If the address works but the name does not, it is a DNS problem, not a connection problem.

## Document the split

Recording whether it was the cable, the address, or DNS turns a vague no internet ticket into a pattern you can act on.
