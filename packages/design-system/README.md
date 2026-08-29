# @mailmypdf/design-system

Framework-agnostic visual foundations for the MailMyPDF ecosystem.

## API

- `mailMyPdfTokens` — shared typography, color, spacing, radius, shadow, motion and layout tokens.
- `getVerticalTheme()` — controlled vertical identity layer.
- `tokens.css` — CSS custom properties for application implementations.

## Rule

Verticals may implement their own framework components, but those components must consume these shared foundations rather than inventing a second design language.

The target is approximately **80% shared / 20% vertical personality**.
