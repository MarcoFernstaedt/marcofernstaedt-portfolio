---
title: "Why accounts lock out, and how to unlock them safely"
description: "Find the real cause before you unlock, or you will be unlocking again in ten minutes."
category: "Accounts"
pubDate: 2026-01-22
---

Unlocking an account takes seconds. Finding out why it locked is the part that stops the ticket coming back. A lockout is usually a stale credential somewhere repeating a wrong password until the threshold trips.

## Common causes

- A phone or tablet still trying an old mail password
- A mapped drive or saved network share using outdated credentials
- A scheduled task or service running as the user
- A second device left signed in after a recent password change

## Unlock the account

In Active Directory Users and Computers, open the account, go to the Account tab, and clear the lockout. In PowerShell:

```powershell
Unlock-ADAccount -Identity jsmith
```

## Find the source

Check the security event log on the domain controller for the lockout event and note the source machine. If the same device keeps appearing, that is your culprit. Resolve the stale credential there, not just the symptom.

## Confirm and document

Have the user sign in, then record the cause in the ticket. A lockout closed with the reason written down is one you can spot a pattern in later.
