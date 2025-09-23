# Blue Dream — background assets

Small decorative background inspired by the attached mood-board (crystals, violets, sky, stars). Files included:

- `blue-dream.svg` — decorative SVG with layered gradients, faceted crystal shapes, and a subtle star pattern.
- `styles.css` — CSS variables and the `.bg-blue-dream` utility to apply the background.
- `index.html` — tiny demo page showing usage.

Usage

1. Copy `blue-dream.svg` and `styles.css` into your site assets folder (for example, `site/public/designs/blue-dream/`).
2. Import the stylesheet in your site layout or root component:

```
<link rel="stylesheet" href="/designs/blue-dream/styles.css">
```

3. Apply the background to a container:

```
<div class="bg-blue-dream">
  <!-- page content -->
</div>
```

Notes & tips

- The SVG is designed to be visually pleasing when used with `background-size: cover`.
- Tweak CSS variables in `styles.css` to match site themes.
- If hosting under a different path, update the `url()` references in the CSS.
