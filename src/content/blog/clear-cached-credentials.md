---
title: "Clearing cached credentials in Windows after a password change"
description: "The hidden cause behind repeat lockouts and prompts after a reset."
category: "Accounts"
pubDate: 2026-05-02
---

After a password change, Windows and apps can keep trying the old password from a saved credential, which triggers repeat prompts and even account lockouts. Clearing the cache stops the loop.

## Why it happens

A saved credential for a share, a mailbox, or an app still holds the old password. Every automatic retry counts as a failed sign in, and enough of them lock the account.

## Clear the saved entries

- Open Credential Manager and review both Windows and web credentials
- Remove entries tied to the affected resource, such as a mapped drive or mailbox
- Sign out and back in so fresh credentials are stored

## Check the usual suspects

Mobile mail, mapped drives, and saved Wi-Fi or VPN profiles are the frequent holdouts. Update or re enter the password in each.

## Confirm

Have the user work normally for a few minutes and confirm no new prompts or lockouts. Then note the cause, since this pattern repeats across users after any reset.
