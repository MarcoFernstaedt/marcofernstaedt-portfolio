---
title: "My monitoring dashboard failed silently and taught me a Docker networking lesson"
description: "A self-hosted Uptime Kuma lab that turned a silent notification failure into a practical lesson on Docker network isolation, internal service routing, and least privilege."
category: "HomeLab"
pubDate: "2026-06-18"
updatedDate: "2026-06-18"
draft: false
featured: true
tags: ["Uptime Kuma", "Docker", "Monitoring", "Networking", "ntfy"]
source: "Obsidian HomeLab Sprint Project 03"
publicReviewed: true
---

Setting up a self-hosted status page sounds simple. Install it, add a few monitors, hook up notifications, done.

It mostly was simple, until the notification step failed with no useful error message in the interface. The actual cause turned out to be a Docker networking concept worth understanding deeply.

## What I was building

I deployed Uptime Kuma, an open source self-hosted monitoring dashboard, inside a Docker container on my VPS.

The goal was to get real visibility into whether my DNS server, Pi-hole dashboard, and automation platform were actually responding, with push notifications if something went down.

This was not just a dashboard project. It was a service desk exercise: define what should be monitored, choose the right type of check, prove the alert path works, and document the failure modes.

## A flawed plan I caught before building it

My first instinct was to also add a monitor checking whether the VPS itself was online. I stopped before doing that.

The flaw was simple: Uptime Kuma was running on that same VPS. If the VPS went down, the monitoring tool watching for that exact failure would go down at the same moment. It would never get the chance to alert me.

That is a single point of failure in monitoring architecture. The correct solution is to monitor that host from somewhere independent, such as a separate physical device or separate network path.

## Setting up notifications and hitting a wall

For alerting, I used ntfy, a self-hosted push notification service already running in my lab.

Rather than reuse an admin account, I created a new user scoped to exactly one notification topic. That is least privilege in practice. If those credentials were ever exposed, the damage would be limited to one notification channel instead of full administrative access.

Direct command line tests worked. Same server, same credentials, same notification path. But clicking Test inside Uptime Kuma did nothing.

No notification. No useful visible error. Just silence.

## Finding the real error

When the interface gave me nothing, I went to the container logs.

The real error was a connection timeout trying to reach the notification service. It was not a password problem. It was not a bad token. It was a pure networking failure happening only from inside that one container.

That changed the troubleshooting path immediately. The notification service worked. The credentials worked. The failure was between the monitoring container and the service it needed to reach.

## The actual root cause

Docker containers do not automatically inherit every network path available to the host machine.

The host could reach the service address without a problem, but the container was running inside its own isolated virtual network. From inside that network namespace, the route that worked on the host did not exist.

That is the important lesson: host connectivity does not prove container connectivity. They are different vantage points.

## Two possible fixes and why I picked the safer one

The fastest fix would have been host networking mode. That would give the container access to the host network interfaces.

I rejected that path because it would also reduce Docker's network isolation and risk exposing the dashboard more broadly than intended.

The better fix was to connect Uptime Kuma to the existing private Docker network used by the related services. That allowed container-to-container communication by service name, entirely inside Docker's internal networking, without making the service more public.

It was slightly more work, but it was the cleaner operational decision.

## Proof the lesson stuck

After solving notifications, I noticed another monitor showing poor uptime for the automation platform.

This time the pattern was obvious: the monitor URL worked from one vantage point but not from inside the container. Instead of re-debugging from scratch, I corrected the monitor to use the internal Docker service route.

That is the value of the lab. The first failure taught the concept. The second failure proved I could recognize and apply it.

## Service desk value

This project maps directly to support work:

- choosing the right monitor type for the service being checked
- separating host reachability from application health
- reading logs when a web interface hides the real error
- recognizing single points of failure in alerting design
- using least privilege for service integrations
- documenting the fix in a way the next technician can follow

## Final takeaway

The silent failure was frustrating, but it forced a deeper understanding of how Docker networking actually works.

A surface-level fix would have made the alert green. The better outcome was understanding why it failed, choosing a safer network path, and recognizing the same failure pattern again without guessing.
