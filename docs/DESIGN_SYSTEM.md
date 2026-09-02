# Scribe Design System

## Feeling
Clean & professional + warm & friendly. Serious tool, not playful.

## Colour
- Primary: teal/green scale (primary-50 to primary-900)
- Neutral: warm slate grays (neutral-50 to neutral-900)
- Semantic: success, warning, error, info
- No gradients, no neon, no overly saturated accents

## Typography
- Primary: Geist Sans via `font-sans`
- Monospace: Geist Mono via `font-mono`
- Scale: Tailwind defaults with tight tracking for headings

## Spacing
- Based on Tailwind spacing scale
- Generous whitespace, especially between major sections
- Compact within cards and forms

## Components

### Button
- Variants: primary, secondary, ghost, danger
- Sizes: sm, md, lg
- Always rounded-full, medium font weight

### Card
- Rounded-2xl, subtle border, soft shadow
- Used for grouping related content

### Input
- Rounded-xl, neutral border, primary focus ring
- Includes label, hint, and error states

### Badge
- Rounded-full, small, medium weight
- Variants for status and category

### EmptyState
- Dashed border container, centered content
- Optional icon, title, description, and CTA

### Alert
- Left border accent, tinted background
- Variants: info, success, warning, error

## Don'ts
- No emojis in UI copy
- No AI-generic gradients
- No playful illustrations
- No heavy decorative copy
