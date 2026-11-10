# ClassSight Brand & Identity Guidelines

> "Attendance that keeps faculty in control"

This document establishes the official brand rules, asset directory, geometry specifications, and usage standards for **ClassSight**.

---

## 1. Brand Concept & Color Palette

The ClassSight identity embodies precision computer vision paired with responsible human-in-the-loop oversight.
- **The "C" Aperture Ring**: Represents the camera lens and optical capture aperture, styled into the letter "C".
- **The Corner Brackets**: Represent the computer vision bounding box / face detection frame.
- **The Coral Dot**: Represents the verified detected face inside the detection frame.
- **The Spark Dot**: Situated in the aperture gap, symbolizing intelligence and system responsiveness.

### Color Specifications

| Swatch | Color Name | Hex Code | Role & Usage |
|---|---|---|---|
| ![#0A1020](https://placehold.co/15x15/0A1020/0A1020.png) | **Ink** | `#0A1020` | Primary brand background, dark theme surfaces, typography in light theme. |
| ![#2DD4BF](https://placehold.co/15x15/2DD4BF/2DD4BF.png) | **Lagoon-400** | `#2DD4BF` | Dark theme aperture ring, primary dark theme brand accent. |
| ![#0B7F7B](https://placehold.co/15x15/0B7F7B/0B7F7B.png) | **Lagoon-600** | `#0B7F7B` | Light theme aperture ring, primary interactive accent on paper. |
| ![#FF6B4A](https://placehold.co/15x15/FF6B4A/FF6B4A.png) | **Coral** | `#FF6B4A` | Detected face dot on dark backgrounds, active review indicator. |
| ![#C94A2A](https://placehold.co/15x15/C94A2A/C94A2A.png) | **Coral Dark** | `#C94A2A` | Detected face dot on light/paper backgrounds (achieves 4.49:1 WCAG contrast). |
| ![#FBFAF7](https://placehold.co/15x15/FBFAF7/FBFAF7.png) | **Paper** | `#FBFAF7` | Light theme page canvas background. |
| ![#FFFFFF](https://placehold.co/15x15/FFFFFF/FFFFFF.png) | **White** | `#FFFFFF` | Primary text on dark backgrounds, pure surfaces. |

---

## 2. Mark Geometry & Assets

The mark is constructed on a `0 0 100 100` coordinate viewBox:
```xml
<!-- Corner brackets (face-detection frame) -->
<path d="M12 30V18Q12 12 18 12H30M70 12H82Q88 12 88 18V30M12 70V82Q12 88 18 88H30M70 88H82Q88 88 88 82V70"
      fill="none" stroke="RING" stroke-width="4" stroke-linecap="round"/>
<!-- C aperture ring (lens) -->
<path d="M68.4 34.6A24 24 0 1 0 68.4 65.4"
      fill="none" stroke="RING" stroke-width="9" stroke-linecap="round"/>
<!-- Coral dot (detected face) -->
<circle cx="51" cy="50" r="6.5" fill="DOT"/>
<!-- Spark dot in gap -->
<circle cx="74" cy="50" r="3" fill="RING"/>
```

### Pure SVG Asset Inventory (`frontend-next/public/brand/`)

All brand assets are pure SVG with no remote dependencies:
1. `mark-ink.svg`: Lagoon-400 ring and Coral dot on transparent canvas.
2. `mark-light.svg`: Lagoon-600 ring and Coral Dark (`#C94A2A`) dot on transparent canvas.
3. `mark-white.svg`: White ring and Coral dot on transparent canvas.
4. `mark-mono.svg`: `currentColor` ring, frame, and dot for single-color usage.
5. `app-icon-ink.svg`: 100x100 Ink rounded tile (`rx="22"`) with Lagoon-400 mark.
6. `app-icon-lagoon.svg`: 100x100 Lagoon-600 rounded tile (`rx="22"`) with White mark.
7. `lockup-on-dark.svg`: Mark + "Class" (White) + "Sight" (Lagoon-400).
8. `lockup-on-light.svg`: Mark + "Class" (Ink) + "Sight" (Lagoon-600).
9. `favicon.svg`: 32x32 optimized favicon tile.

> [!NOTE]
> The lockup SVG files use `<text>` with the system font stack (`system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`) to ensure fast, font-independent rendering without remote CDN dependencies.

---

## 3. Official Logo Component (`Logo.tsx`)

The web application uses the unified `<Logo />` component (`frontend-next/components/brand/Logo.tsx`).

### Properties
- `variant`:
  - `"mark"`: Standalone aperture and detection mark.
  - `"lockup"`: Mark aligned horizontally with "ClassSight" wordmark.
  - `"icon"`: App tile icon with rounded corners.
- `tone`:
  - `"auto"`: Follows the site theme dynamically via CSS custom properties `--logo-ring` and `--logo-dot` (no flash, no client JS required).
  - `"onDark"`: Explicit dark-theme palette (Lagoon-400 ring + Coral dot).
  - `"onLight"`: Explicit light-theme palette (Lagoon-600 ring + Dark Coral dot).
  - `"mono"`: Uses `currentColor`.
- `size`: Desired height in pixels (default: `32`).
- `decorative`: When `true`, applies `aria-hidden="true"`; when `false`, sets `role="img"` and `aria-label="ClassSight"`.
- `loading`: When `true` (mark variant only), enables the `cs-logo-spin` animation respecting `prefers-reduced-motion`.

---

## 4. Usage & Placement Rules

### Clear Space
- Always maintain clear space around the logo equal to at least **half the height of the mark** ($0.5 \times H$).
- No text, UI controls, or busy imagery should intrude into this zone.

### Minimum Sizes
- **Mark alone**: Minimum width/height is **16 px** (for favicons and dense tables). At 16 px, corner brackets are omitted in favicons for legibility.
- **Full Lockup**: Minimum width is **96 px** (or 24 px height) to preserve legibility of the wordmark letters.

### Background Matrix
- **Ink `#0A1020` or Dark Surfaces**: Use `tone="onDark"` or `tone="auto"`.
- **Paper `#FBFAF7` or Light Surfaces**: Use `tone="onLight"` or `tone="auto"`.
- **Lagoon or Solid Color Backgrounds**: Use `tone="mono"` with white or black.

### What NOT to Do (Brand Violations)
- ❌ Do NOT recolor the ring or dot to unapproved colors (e.g., purple, red, green).
- ❌ Do NOT distort, squish, stretch, or alter the aspect ratio.
- ❌ Do NOT rotate the mark or change the angle of the aperture opening.
- ❌ Do NOT apply drop shadows, 3D extrusions, gradients, or outer glows to the mark.
- ❌ Do NOT substitute web fonts or third-party fonts for the wordmark text.
