---
title: "I Captured My Own Network Traffic and Found Two Security Gaps"
description: "A completed Wireshark homelab project analyzing real DNS, TCP, TLS, and Tailscale traffic, with two findings remediated: Chrome DNS over HTTPS bypass and WPAD proxy discovery noise."
category: "HomeLab"
pubDate: "2026-06-18"
updatedDate: "2026-06-18"
draft: false
featured: false
tags: ["Wireshark", "Packet Capture", "Networking", "DNS", "Troubleshooting"]
source: "Obsidian HomeLab Sprint Project 02"
publicReviewed: true
---

Most people assume their computer only talks to the internet when they are actively using it. A short Wireshark capture proves otherwise.

I ran a packet capture lab on my own machine across Wi-Fi and Tailscale interfaces. The goal was simple: stop relying on textbook examples and learn what real traffic looks like when DNS, TCP, TLS, and background telemetry are all happening at once.

## What I used

Wireshark is a free network protocol analyzer used by IT support teams, network engineers, and security analysts. It captures packets moving through a network interface and lets you inspect the headers, protocol behavior, ports, flags, and sometimes application-layer data.

For this lab I captured traffic from two places:

- The Wi-Fi interface for normal local network and internet traffic.
- The Tailscale interface for private tailnet traffic between homelab machines.

That distinction mattered immediately. Tailscale encrypts traffic on the Wi-Fi side. If I wanted to inspect tailnet DNS traffic, I had to capture from the Tailscale interface instead of the Wi-Fi interface.

## Filters that made the capture useful

Raw packet capture is noisy. The useful skill is asking a specific question and filtering down to the evidence.

I used filters like:

```text
dns
tcp.flags.syn == 1 && tcp.flags.ack == 0
udp.port == 53 || tcp.port == 53
```

Those filters let me isolate DNS behavior, new TCP connection attempts, and resolver traffic instead of staring at thousands of unrelated packets.

## What the protocol hierarchy showed

The DNS-filtered capture showed DNS behaving the way it should: mostly UDP, with a small amount of TCP fallback.

That matters because DNS uses UDP by default for speed. TCP appears when responses are larger or when the protocol needs reliability. Seeing that in a real capture made the protocol behavior concrete instead of theoretical.

## Finding 1: Chrome was bypassing Pi-hole

While reviewing TCP SYN packets, I noticed traffic headed to Google DNS over port 443. That pointed to DNS over HTTPS.

Chrome's Secure DNS feature can send DNS queries directly to a provider over HTTPS instead of using the system resolver. In my case, that meant Chrome could bypass my Pi-hole DNS filtering and logging.

The fix was direct: disable Secure DNS in Chrome so the browser uses the system DNS path again.

The lesson: a network-wide DNS filter is only network-wide if applications are not bypassing it with their own resolver settings.

## Finding 2: Windows WPAD noise

The DNS capture also showed repeated WPAD proxy-discovery queries.

WPAD stands for Web Proxy Auto-Discovery. Windows can use it to look for a proxy configuration file. I do not run a proxy for this environment, so the repeated queries were just noise and unnecessary exposure of local naming information.

I disabled automatic proxy discovery at the system and user level. After that, the WPAD noise stopped.

The lesson: background operating-system features can create traffic you did not intentionally start. Packet capture makes that visible.

## TLS did its job

I also followed a TCP stream from HTTPS traffic. The result was unreadable ciphertext, which is exactly what should happen.

Wireshark could show that a connection happened, when it happened, which server was contacted, and how much data moved. It could not read the web content inside the encrypted stream.

That was a useful confirmation: TLS protects the payload, but metadata is still visible.

## What I learned

This project turned into more than a Wireshark walkthrough. It became a real support and security exercise:

- Pick the correct capture interface.
- Generate the traffic you want to observe.
- Filter by protocol, port, and TCP flags.
- Separate encrypted payload from visible metadata.
- Identify browser DNS bypass behavior.
- Remove noisy WPAD proxy-discovery traffic.
- Document the fix, not just the finding.

That is the kind of practical troubleshooting I want in my toolkit for help desk, IT support, and security-adjacent work.

## Final takeaway

Wireshark is not just a packet viewer. It is a way to prove what the network is actually doing.

In this lab, it showed me two real problems I did not know I had. I fixed both and left with a clearer understanding of DNS, TCP handshakes, TLS visibility, and interface selection.
