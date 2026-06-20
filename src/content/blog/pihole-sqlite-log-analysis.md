---
title: "What My Own DNS Traffic Taught Me About Log Analysis"
description: "A Pi-hole SQLite log analysis lab that found an unblocked HP telemetry domain, fixed it with a denylist entry, and turned DNS history into practical support evidence."
category: "HomeLab"
pubDate: "2026-06-20"
updatedDate: "2026-06-20"
draft: false
featured: true
tags: ["Pi-hole", "SQLite", "DNS", "Log Analysis", "Security"]
source: "Obsidian HomeLab Sprint Project 04"
publicReviewed: true
---

Pi-hole has been running on my network since Project 1 of this sprint, quietly blocking ads and trackers in the background. But running infrastructure and reading what it collects are two different skills, and Project 4 was about building the second one.

Pi-hole does not store its history as a plain text log file. It uses a real SQLite database, sitting at `/etc/pihole/pihole-FTL.db` on my Raspberry Pi 5. Opening it required installing the sqlite3 command line tool first, since Pi-hole's own software uses SQLite internally but does not ship the interactive tool needed to browse it by hand.

Once inside, I found something interesting before I even ran a real query. The table I expected to query, called `queries`, is not actually a table. It is a view, a saved query that joins several smaller lookup tables together and hands back readable text instead of raw numeric IDs. Pi-hole stores domains and clients as numbers internally to save space, then reconstructs the readable version on the fly whenever you ask for it.

That is a real database design pattern, normalization, and seeing it built into software I already use made the concept click in a way reading about it never had.

The first real question I asked was simple: which domains is my network querying the most. The answer surprised me a little. The top spots were not websites I visit, they were background telemetry, three different Microsoft data collection domains alone accounting for over 437,000 queries. All three were already being caught and blocked by the blocklists I configured back in Project 1.

But one domain stood out for a different reason. HP's own telemetry domain, `initium.oc.hp.com`, had over 10,000 queries logged, and when I checked the status code on each one, every single query was allowed through. Not one was blocked. I had actually flagged this exact same HP telemetry behavior back in Project 2, using Wireshark, and left it as a documented but unfixed finding at the time. Today, with the right tool, I went back and actually fixed it, adding the domain to Pi-hole's denylist with a single command, then verifying the block was live using Pi-hole's own query tool.

The last piece was breaking down blocked traffic by device instead of by domain. The result was lopsided: one machine, my HP desktop, accounted for about 89 percent of every blocked query on my network, nearly nine times more than the next closest device.

The technical skill here, group by a column, count the rows, sort, filter first if needed, is the same shape behind almost every log analysis question a SOC analyst or help desk tech will ever ask. The bigger lesson was less technical: a finding you leave open in one project does not have to stay open forever. Sometimes you just need a different angle, and a few more weeks of data, to close it out for real.
