#!/usr/bin/env python3
"""Print a concise visitor analytics summary without exposing tokens."""
import json
import sqlite3
from pathlib import Path

DB = Path('/home/marco/.hermes/visitor-analytics/visitors.sqlite3')
if not DB.exists():
    print(json.dumps({'total_visits': 0, 'non_owner_visits': 0, 'recent_non_owner': []}, indent=2))
    raise SystemExit(0)

with sqlite3.connect(DB) as conn:
    total = conn.execute('SELECT COUNT(*) FROM visits').fetchone()[0]
    owner = conn.execute('SELECT COUNT(*) FROM visits WHERE owner_mark=1').fetchone()[0]
    non_owner = conn.execute('SELECT COUNT(*) FROM visits WHERE owner_mark=0').fetchone()[0]
    unique = conn.execute('SELECT COUNT(DISTINCT visitor_id) FROM visits WHERE owner_mark=0 AND visitor_id IS NOT NULL').fetchone()[0]
    columns = {row[1] for row in conn.execute('PRAGMA table_info(visits)').fetchall()}
    optional = [
        'raw_ip' if 'raw_ip' in columns else "NULL AS raw_ip",
        'owner_reason' if 'owner_reason' in columns else "NULL AS owner_reason",
        'x_forwarded_for' if 'x_forwarded_for' in columns else "NULL AS x_forwarded_for",
        'host_header' if 'host_header' in columns else "NULL AS host_header",
        'accept_language_header' if 'accept_language_header' in columns else "NULL AS accept_language_header",
    ]
    rows = conn.execute(f'''
        SELECT ts_utc, visitor_id, country, region, city, path, referrer, substr(user_agent, 1, 160), {', '.join(optional)}
        FROM visits
        WHERE owner_mark=0
        ORDER BY id DESC
        LIMIT 20
    ''').fetchall()
print(json.dumps({
    'total_visits': total,
    'owner_marked_visits': owner,
    'non_owner_visits': non_owner,
    'non_owner_unique_browser_ids': unique,
    'recent_non_owner': [
        {
            'ts_utc': r[0],
            'visitor_id': r[1],
            'country': r[2],
            'region': r[3],
            'city': r[4],
            'path': r[5],
            'referrer': r[6],
            'user_agent': r[7],
            'raw_ip': r[8],
            'owner_reason': r[9],
            'x_forwarded_for': r[10],
            'host_header': r[11],
            'accept_language_header': r[12],
        }
        for r in rows
    ],
}, indent=2))
