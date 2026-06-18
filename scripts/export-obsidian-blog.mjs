import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(new URL('..', import.meta.url).pathname);
const vaultRoot = '/home/marco/obsidian-vault';
const outputDir = path.join(repoRoot, 'src/content/blog');

const sources = {
  pihole: path.join(vaultRoot, '03 - HomeLab Sprint/Project 01 - Pi-hole + Unbound.md'),
  wireshark: path.join(vaultRoot, '03 - HomeLab Sprint/Archive/Project 02 - Wireshark Lab.md'),
};

function readSource(sourcePath) {
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Missing Obsidian source: ${sourcePath}`);
  }
  return fs.readFileSync(sourcePath, 'utf8');
}

function matchNumber(raw, label, fallback) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = raw.match(new RegExp(`${escaped}:\\s*([0-9,.]+)`, 'i'));
  return match ? match[1].replace(/,/g, '') : fallback;
}

function matchPercent(raw, label, fallback) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = raw.match(new RegExp(`${escaped}:\\s*([0-9.]+)%?`, 'i'));
  return match ? match[1] : fallback;
}

function frontmatter(fields) {
  const lines = ['---'];
  for (const [key, value] of Object.entries(fields)) {
    if (Array.isArray(value)) {
      lines.push(`${key}: [${value.map((item) => JSON.stringify(item)).join(', ')}]`);
    } else if (typeof value === 'boolean') {
      lines.push(`${key}: ${value}`);
    } else {
      lines.push(`${key}: ${JSON.stringify(value)}`);
    }
  }
  lines.push('---', '');
  return lines.join('\n');
}

function assertPublicSafe(slug, content) {
  const forbidden = [
    [/\/home\/marco|\.hermes|\.env|Vaultwarden/i, 'private path or secret storage reference'],
    [/\b10\.\d{1,3}\.\d{1,3}\.\d{1,3}\b|\b172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}\b|\b192\.168\.\d{1,3}\.\d{1,3}\.\d{1,3}\b|\b100\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/, 'private or Tailscale IP address'],
    [/cron job|job id|ssh pi5|pihole_project_metrics_sync|imperator/i, 'internal automation detail'],
    [/TODO|FIXME|TK_PLACEHOLDER/i, 'placeholder marker'],
  ];
  for (const [re, label] of forbidden) {
    if (re.test(content)) {
      throw new Error(`${slug} contains forbidden public content: ${label}`);
    }
  }
}

function piholePost(raw) {
  const totalQueries = Number(matchNumber(raw, 'Total DNS queries processed in last 24 hours', '141580'));
  const blockedQueries = Number(matchNumber(raw, 'Queries blocked in last 24 hours', '101311'));
  const blockPercent = matchPercent(raw, 'Percentage of queries blocked', '71.56');
  const blockDomains = Number(matchNumber(raw, 'Number of blocklist domains loaded', '1155492'));
  const clients = Number(matchNumber(raw, 'Number of client devices protected', '6'));

  const roundedQueries = Math.round(totalQueries / 1000) * 1000;
  const roundedBlocked = Math.round(blockedQueries / 1000) * 1000;
  const roundedDomains = Math.round(blockDomains / 1000) * 1000;

  return `${frontmatter({
    title: 'Building a Pi-hole and Unbound Recursive DNS Homelab',
    description: 'A practical DNS filtering and recursive resolver homelab using Pi-hole, Unbound, Linux services, and measured traffic results.',
    category: 'HomeLab',
    pubDate: '2026-06-18',
    updatedDate: '2026-06-18',
    draft: false,
    featured: true,
    tags: ['DNS', 'Linux', 'Networking', 'Pi-hole', 'Unbound'],
    source: 'Obsidian HomeLab Sprint Project 01',
    publicReviewed: true,
  })}I built a small DNS homelab to make DNS filtering, recursive resolution, and network telemetry concrete instead of theoretical. The project combined Pi-hole for filtering with Unbound for recursive DNS resolution.

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

- Total DNS queries processed: about ${roundedQueries.toLocaleString()}
- Queries blocked: about ${roundedBlocked.toLocaleString()}
- Block rate: ${blockPercent}%
- Blocklist domains loaded: about ${roundedDomains.toLocaleString()}
- Devices protected: ${clients}
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
`;
}

function wiresharkPost(raw) {
  const hasPermissionBlocker = /Operation not permitted|elevated permissions/i.test(raw);
  if (!hasPermissionBlocker) {
    throw new Error('Wireshark source no longer contains the expected permission blocker. Review before exporting.');
  }

  return `${frontmatter({
    title: 'What a Wireshark Packet Capture Lab Teaches Before the Capture Even Works',
    description: 'A practical packet capture lab note about DNS and ICMP traffic generation, filters, and the capture-permission blocker that must be solved before claiming packet evidence.',
    category: 'HomeLab',
    pubDate: '2026-06-18',
    updatedDate: '2026-06-18',
    draft: false,
    featured: false,
    tags: ['Wireshark', 'Packet Capture', 'Networking', 'Troubleshooting'],
    source: 'Obsidian HomeLab Sprint Project 02',
    publicReviewed: true,
  })}This lab is intentionally written as a lesson, not as a finished project claim. The packet capture work was started, the traffic generation commands were proven, and the most important blocker showed up immediately: capture permissions matter.

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

\`\`\`text
dns
icmp
arp
tcp.flags.syn == 1
tcp.flags.syn == 1 && tcp.flags.ack == 0
udp.port == 53 || tcp.port == 53
\`\`\`

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
`;
}

const piholeRaw = readSource(sources.pihole);
const wiresharkRaw = readSource(sources.wireshark);

const outputs = {
  'pihole-unbound-recursive-dns-homelab.md': piholePost(piholeRaw),
  'wireshark-packet-capture-lab-lessons.md': wiresharkPost(wiresharkRaw),
};

fs.mkdirSync(outputDir, { recursive: true });
for (const [file, content] of Object.entries(outputs)) {
  assertPublicSafe(file, content);
  fs.writeFileSync(path.join(outputDir, file), content, 'utf8');
  console.log(`wrote ${path.join(outputDir, file)}`);
}
