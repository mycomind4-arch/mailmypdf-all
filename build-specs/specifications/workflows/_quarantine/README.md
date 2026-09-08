# Quarantined notice specs

Moved here 2026-09-03 after verification against the IRS notice catalog.
Nothing is deleted; restore with `git mv` or a plain move if any of this
turns out to be wrong.

## Fabricated — no such IRS notice number
cp505, cp502, cp512, cp513, cp517, cp2504, cp2504b, cp2505b, cp2505c,
cp2506c, cp2087, cp2088, cp2089, cp55-b, cp2000-c

Verified absent from irs.gov. These were produced during the bulk spec
generation phase and never checked against the real catalog.

## Out of scope
cp2100 — real, but issued to *payers* about backup withholding and TIN
mismatches, not to individual taxpayers. Belongs in a business vertical if
anywhere, not notice-respond.

## Real notice, wrong description — needs re-authoring
cp88 — spec says "Notice of Offset". CP88 is a refund hold for an unfiled
       return. The actual refund-offset notice is CP49.
cp89 — spec says "Notice of Wage Levy". CP89 is the Annual Installment
       Agreement Statement, an informational annual summary.
