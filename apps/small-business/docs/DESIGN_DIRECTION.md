# MailMyPDF Business — Product Design Direction

## Role in the MailMyPDF family

MailMyPDF Business is the operational correspondence workspace for organizations that repeatedly create, approve, schedule, send, track, and archive physical mail.

Primary journey:

**Create → Schedule → Approve → Send → Track → Prove → Archive**

## Design benchmark

Use Notice Respond for the family-level quality bar, but give Business a more operational workspace feel. It should be the most productivity-oriented product in the family, not another consumer landing page.

## Product personality

Professional, efficient, dependable, organized. The product should feel like a lightweight mail operations desk for a small business.

## Visual language

- MailMyPDF warm paper foundation
- Navy/ink for operational structure
- Postal red as action/proof accent
- Serif for brand/editorial moments
- Sans/monospace for dense operational information
- Tables, queues, calendars, status pills, contact cards, document previews, proof records
- Strong whitespace and restrained borders instead of dashboard decoration

## Homepage hierarchy

1. Business correspondence problem
2. Create → Schedule → Approve → Send → Track → Prove flow
3. Core jobs: reminders, notices, renewals, contracts, compliance, customer correspondence
4. Workspace preview
5. Automation/scheduling
6. Approval controls
7. Tracking and permanent proof archive
8. MailMyPDF relationship
9. Pricing/FAQ

## Application workspace

Primary navigation:

**Queue · Calendar · Contacts · Templates · Automations · Mailings · Proof Archive**

The queue should make upcoming, awaiting approval, scheduled, mailed, and attention-required states immediately legible.

## Automation

Make recurring and scheduled correspondence feel safe and controlled. Every automation should expose its next run, audience, template, approval policy, and cancellation/edit controls.

## Production honesty

The current repository contains real Trigger.dev boundaries and integration contracts, but several production infrastructure pieces remain incomplete. UI must represent these boundaries honestly and never claim a mailing, tracking event, CRM sync, or proof record exists unless the underlying service confirms it.

## Responsive/accessibility

Desktop emphasizes queue/calendar productivity. Mobile prioritizes upcoming mail, approvals, mailing status, and proof records. Tables must become readable cards where necessary. Keyboard navigation and visible focus are required.

## Definition of done

MailMyPDF Business should look like a finished operational product while clearly separating local/prototype behavior from production-connected services.
