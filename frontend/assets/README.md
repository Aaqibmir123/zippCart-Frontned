# Asset strategy

- `branding/` holds the app logo and brand marks.
- `illustrations/` holds onboarding artwork as optimized PNG/WebP assets.
- `decorations/` holds reusable SVG waves and other non-interactive artwork.
- `icons/` holds app-specific icons; platform or common UI icons should use a maintained icon package when one is added.

Keep asset imports in screen or component files as references to these folders. Do not embed large SVG strings in UI files.