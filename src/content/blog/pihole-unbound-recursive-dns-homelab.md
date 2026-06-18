---
title: "Building a Pi-hole and Unbound Recursive DNS Homelab"
description: "A practical DNS filtering and recursive resolver homelab using Pi-hole, Unbound, Linux services, and measured traffic results."
category: "HomeLab"
pubDate: "2026-06-18"
updatedDate: "2026-06-18"
draft: false
featured: true
tags: ["DNS", "Linux", "Networking", "Pi-hole", "Unbound"]
source: "Obsidian HomeLab Sprint Project 01"
publicReviewed: true
---
I built a small DNS homelab to make DNS filtering, recursive resolution, and network telemetry concrete instead of theoretical. The project combined Pi-hole for filtering with Unbound for recursive DNS resolution.

The goal was simple: stop relying on a third-party upstream DNS provider for every lookup, block unwanted domains before a device tries to connect, and document the build like a support technician would document a production change.

## The problem

DNS is easy to treat as background plumbing, but every browser, app, and operating system depends on it. A normal setup sends lookup requests to an upstream resolver. That resolver can see a broad picture of what services the network asks for.

For this lab, I wanted a setup where:

- local devices send DNS requests to a controlled resolver
- unwanted domains are blocked at lookup time
- recursive resolution happens locally instead of through one upstream provider
- metrics show whether the system is actually doing work

## What I built

The lab uses two pieces:

- Pi-hole as the DNS filtering layer
- Unbound as the recursive resolver

Pi-hole receives the DNS query first. If the requested domain is on a blocklist, the request stops there. If the domain is allowed, Pi-hole forwards it to Unbound. Unbound then walks the DNS hierarchy itself, starting from root servers and following referrals until it reaches the authoritative answer.

That makes the lab useful for more than ad blocking. It demonstrates DNS architecture, Linux service configuration, blocklist management, and troubleshooting from real metrics.

## What the metrics showed

After the system had been running, I captured a 24-hour measurement window.

- Total DNS queries processed: about 142,000
- Queries blocked: about 101,000
- Block rate: 71.56%
- Blocklist domains loaded: about 1,155,000
- Devices protected: 6
- DNS leak test: passed with recursive resolution only

The most useful result was not just the blocked percentage. It was seeing how much background traffic modern systems generate without a person actively browsing.

## What I learned

### Recursive DNS matters

With recursive DNS, the resolver does the work of finding the answer. Unbound contacts the DNS hierarchy directly rather than sending the full request stream to one commercial resolver.

That matters because DNS is behavioral metadata. Reducing dependency on one upstream provider reduces how much of that behavior any single company can observe.

### DNS filtering happens before the connection

A firewall usually stops traffic after a device already knows the destination address and tries to connect. Pi-hole blocks earlier. It prevents the domain from resolving, so the device never gets a useful destination in the first place.

That is cleaner and easier to explain to a non-technical user: if the address book refuses to give out the address, the call never starts.

### Logs and metrics turn a lab into evidence

A lab is stronger when it produces numbers. I did not want to say "I installed Pi-hole." I wanted to know how many queries it handled, how many it blocked, how many devices used it, and whether recursive DNS was actually working.

Those numbers turn the project from a tutorial follow-along into operational proof.

## Troubleshooting decisions

A few issues made the lab more realistic:

- interface selection had to match the active network path
- blocklist sources had to be verified because one candidate feed was unavailable
- DNS forwarding had to use the correct local resolver port
- metrics access had to avoid storing dashboard credentials in notes or scripts

That last point matters. A support project should not create a worse security habit just to make reporting easier.

## Service desk value

This project maps directly to real support work:

- explaining DNS behavior clearly
- checking whether a resolver is reachable
- reading service status and logs
- separating filtering problems from connectivity problems
- documenting a repeatable build and rollback path
- using metrics instead of guesses

It also builds better instincts for common tickets: websites not loading, VPN DNS issues, name resolution failures, slow first lookups, and differences between local network access and remote access.

## Final takeaway

The strongest part of the lab was not the block rate. It was the complete loop: build the service, verify it works, collect metrics, document the decisions, and keep private operational details out of the public writeup.
