---
title: "What a Wireshark Packet Capture Lab Teaches Before the Capture Even Works"
description: "A practical packet capture lab note about DNS and ICMP traffic generation, filters, and the capture-permission blocker that must be solved before claiming packet evidence."
category: "HomeLab"
pubDate: "2026-06-18"
updatedDate: "2026-06-18"
draft: false
featured: false
tags: ["Wireshark", "Packet Capture", "Networking", "Troubleshooting"]
source: "Obsidian HomeLab Sprint Project 02"
publicReviewed: true
---
This lab is intentionally written as a lesson, not as a finished project claim. The packet capture work was started, the traffic generation commands were proven, and the most important blocker showed up immediately: capture permissions matter.

That is still useful. In real support work, the blocker is often the lesson.

## What I was trying to prove

The goal was to inspect basic network behavior at the packet level:

- DNS lookups
- ICMP reachability checks
- TCP handshakes
- ARP on a local network
- filtering traffic by host and protocol

A completed version of this lab should include packet numbers, screenshots, and saved capture files. This first pass does not claim that yet.

## What worked

The traffic generation side worked.

For DNS, the lab used a direct lookup against the lab resolver to generate observable DNS traffic. For reachability, it used ICMP echo requests to confirm a device could respond across the network path.

Useful display filters for the next capture pass:

```text
dns
icmp
arp
tcp.flags.syn == 1
tcp.flags.syn == 1 && tcp.flags.ack == 0
udp.port == 53 || tcp.port == 53
```

These filters matter because packet captures are noisy. A good filter turns a wall of packets into a specific question.

## What blocked the capture

The first capture attempt hit a permissions problem. Packet capture requires elevated capture rights on the machine doing the sniffing. Without that permission, the tool can fail even when the network traffic itself is real.

That distinction matters:

- traffic generation can work
- connectivity can work
- the capture tool can still fail because the user lacks capture permission

Those are three different facts. Treating them as one problem leads to bad troubleshooting.

## Why this is still worth documenting

A help desk technician needs to know more than the happy path. This lab documents the actual troubleshooting boundary:

- the target service responded
- DNS and ICMP traffic could be generated
- capture required elevated permission
- the next step is to run the capture from a properly authorized workstation or grant capture rights safely

That is the honest state of the lab.

## What the finished version needs

Before this becomes a completed portfolio proof, it needs:

- a real DNS capture
- a real TCP handshake capture
- an ARP capture on a local segment
- packet numbers or screenshots
- one troubleshooting finding backed by captured evidence

Until then, the value is the setup, the filters, and the permission lesson.

## Final takeaway

Packet capture is not just a button in Wireshark. It is a controlled troubleshooting process: generate the right traffic, capture from the right place, use the right filter, and prove what happened with evidence.
