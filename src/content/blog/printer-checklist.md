---
title: "A practical checklist for printer problems"
description: "The boring checks that solve most printer tickets before you touch a driver."
category: "Hardware"
pubDate: 2026-02-20
---

Printers generate a steady share of help desk tickets, and most are solved by basic checks rather than driver surgery. Run these in order.

## Physical and power

- Confirm the printer is on, not in an error or sleep state, and has paper and toner
- Clear any jam fully, including the small scraps people miss

## The queue

A stuck job blocks everything behind it. Clear the print queue on the user's machine, and if needed restart the Print Spooler service. This alone resolves a large share of cases.

## Connection

- For network printers, confirm the printer and the user are reachable on the same network and the IP has not changed
- For USB, reseat the cable and try another port

## Driver, last

Only after the above, reinstall or update the driver. If one user can print and another cannot to the same device, the problem is local to the second machine, which narrows it quickly.
