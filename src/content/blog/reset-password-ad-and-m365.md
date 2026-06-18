---
title: "Resetting a user password in Active Directory and Microsoft 365"
description: "The two places a password can live, and how to reset it cleanly in each."
category: "Accounts"
pubDate: 2026-01-15
---

A password reset sounds like one task, but in a hybrid environment it can live in two places: on premises Active Directory and Microsoft 365 in the cloud. Knowing which one the user signs in against keeps you from resetting the wrong one and getting a callback an hour later.

## Decide which password you are resetting

Ask one question: does the user sign in to a domain joined Windows machine on the company network, or do they sign in to Microsoft 365 in a browser? If both, the company likely syncs identities, and the on premises password is usually the source of truth.

## Reset in Active Directory

In Active Directory Users and Computers, find the account, right click, and choose Reset Password. Set a temporary password and tick the box to require a change at next sign in.

For speed, PowerShell does the same thing:

```powershell
Set-ADAccountPassword -Identity jsmith -Reset -NewPassword (Read-Host -AsSecureString)
Set-ADUser -Identity jsmith -ChangePasswordAtLogon $true
```

## Reset in Microsoft 365

If the account is cloud only, reset it from the Microsoft 365 admin center under Users, or with the Microsoft Graph PowerShell module. Confirm whether the tenant forces a change at next sign in so the user is not surprised.

## Close the loop

Tell the user the temporary password through a channel they can actually reach, confirm they can sign in, and note in the ticket which directory you reset. That last note saves the next technician a guess.
