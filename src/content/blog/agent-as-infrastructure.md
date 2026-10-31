---
title: "Running an AI agent as infrastructure, not as a chat window"
description: "What changed when I stopped treating an AI agent as a conversation and started treating it as a scheduled, monitored service with proof requirements."
category: Automation
pubDate: 2026-10-31
---

Most people use an AI agent the way they use a search box: type something, get an answer, close the tab. I run mine as infrastructure. It has a scheduler, health checks, an audit trail, and a rule that it may not claim something it did not verify. That last part turned out to be the interesting one.

## The setup

The agent runtime lives on a small always-on Linux server. A separate Windows desktop on the same private network runs the workloads that need local hardware. Both are reachable over an encrypted mesh network, so nothing is exposed to the public internet — which matters, because the agent holds credentials for mail, calendars, and a few internal services.

The parts that do real work:

- **Scheduled jobs.** A morning narrative brief, a daily mailbox steward that files and trashes newsletter noise, a follow-up digest of mail that needs a human reply, and a weekly review that reconciles commitments against what actually moved.
- **API integrations with OAuth.** Mail and calendar access through a consent-based token that can be revoked, not a stored password. Read-only scopes wherever reading is all that is needed.
- **Channel operations.** Creating, renaming, and reordering chat channels through the platform's own bot API rather than clicking through a UI, so the layout is reproducible.
- **Local speech synthesis.** The morning brief is rendered to audio on the server with a local voice model, then delivered as a file. No per-word API billing, no third-party service holding the text.
- **Health checks and recovery.** A watchdog restarts the runtime if it dies, and the scheduled work is monitored end to end: did it fire, did it deliver, did the artifact it produced actually exist.

## The rule that changed everything

Early on, the agent produced a digest that mixed two different emails together and reported a stale warning as if it were current. Nothing crashed. The numbers just looked plausible and were wrong.

That failure produced the standing rule the whole system now runs on: **a claim needs a source, and a number needs a command that printed it.** Every scheduled job that reports anything has to quote the figures characters-for-character from the message or command output it read, say which source it used, and stay silent rather than guess. When I asked it to summarize financial mail, the answer came back corrected against the actual messages, with the two wrong figures called out.

The same principle applies to the work the agent does on code. Statements like "tests pass" or "the fix works" only count if the agent ran the command at the current commit and can show the output. Reviewing is the same discipline: findings get posted where the work lives, and nothing gets merged over an unresolved objection — including the agent's own.

## What I would tell someone starting this

**Treat the schedule as the product.** A clever one-off prompt is worth less than a boring job that runs every morning and is correct every morning.

**Budget for being wrong.** The interesting engineering is not in the happy path; it is in what happens when a source is unavailable, a message never arrives, or a script exits non-zero. Decide in advance what the system should say when it does not know.

**Keep secrets where a human can revoke them.** Consent-based tokens, read-only scopes, and credentials that never appear in logs or chat.

**Write the rules down.** Mine live in versioned instruction files and reusable skill documents, so the standards survive a fresh session and apply to work the agent does months later. That is the difference between a tool and a system.
