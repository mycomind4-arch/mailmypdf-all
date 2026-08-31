# Appeal & Reply — Master Workflow Directory

Appeal & Reply is the master product for the broader **appeal, reconsideration, and formal reply** search-intent category.

This repository owns the specialized workflows beneath that category. A new appeal situation should normally become a workflow/page/route here rather than a new repository.

## Initial workflow families

- Appeal a government decision
- Appeal denied benefits
- Request reconsideration
- Write an appeal letter
- Appeal a claim/coverage decision
- Respond to an adverse administrative determination

Each workflow should map a distinct user intent to its own document inputs, deadline handling, evidence requirements, response structure, and authoritative-source requirements.

## SEO rule

Create dedicated canonical workflow pages only when the user problem or workflow materially differs. Do not create thin keyword variants of one generic appeal page.

## Architecture rule

Keep shared identity, documents, payments, mailing, tracking, proof, and design-system primitives in the MailMyPDF/platform layer. Keep appeal-specific analysis, evidence reasoning, drafting, and workflow logic here.
