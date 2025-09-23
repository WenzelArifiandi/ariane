# Color System Management

This guide explains how to manage colors across the Ariane project using our centralized color system.

## 🎨 Centralized Color System

All colors are managed from a single file: `/site/src/styles/colors.css`

### Current Color Variables

```css
:root {
  /* Primary backgrounds */
  --ariane-bg-main: #FEFBFF;     /* Main background - clean off-white */
  --ariane-bg-accent: #F2ECF4;   /* Accent background - subtle lavender-gray */

  /* Glass navbar colors */
  --ariane-glass-tint: rgba(150,165,255,.22);
  --ariane-glass-tint-scrolled: rgba(150,165,255,.32);

  /* Text colors */
  --ariane-text-ink: #1F2342;    /* Inky navy for main text */
  --ariane-text-ink-dim: #2A2E55; /* Dimmed version */
}
```

## 📝 How to Change Colors

To change any color across the entire project:

1. **Open**: `/site/src/styles/colors.css`
2. **Edit** the desired variable value
3. **Save** - changes apply everywhere automatically!

### Examples

#### Change the accent color (footer, constellation sidebar/header):
```css
--ariane-bg-accent: #E6F3FF;   /* Light blue instead of lavender */
```

#### Change the main background:
```css
--ariane-bg-main: #F0F8FF;     /* Alice blue instead of blush */
```

#### Customize navbar glass tint:
```css
--ariane-glass-tint: rgba(100,200,255,.25);  /* Blue-ish tint */
```

## 🔄 What Uses These Colors

### Main Background (`--ariane-bg-main`)
- Ariane site main content area
- Constellation docs content area
- PeriwinkleStarsea component fallback

### Accent Background (`--ariane-bg-accent`)
- Ariane site footer
- Constellation sidebar
- Constellation header/navbar

### Glass Colors
- Ariane site navigation bar (periwinkle frosted glass effect)
- All related hover states and scroll effects

## 🧪 Testing Changes

After making changes to `/site/src/styles/colors.css`:

1. Check **Ariane site**: http://127.0.0.1:4321/
2. Check **Constellation docs**: http://localhost:4321/
3. Test navbar scroll effects on the Ariane site
4. Verify footer and sidebar colors

## ⚡ Auto-Update Test

**Test Status**: 🟢 AUTO-SYNC WORKING!
**Last updated**: Just now by Claude Code

✅ **If you can see this page in your constellation docs at http://localhost:4321/color-system then the auto-sync is working perfectly!**

The auto-sync system successfully:
- ✅ Created this new documentation file
- ✅ Added it to the sidebar navigation
- ✅ Applied your new color scheme (#FEFBFF and #F2ECF4)
- ✅ Updated all components across both sites

Try editing the colors in `/site/src/styles/colors.css` and watch both sites update in real-time!

## 💡 Tips

- **Small changes first**: Test with subtle color adjustments before making dramatic changes
- **Accessibility**: Ensure sufficient contrast between text and backgrounds
- **Consistency**: The centralized system ensures all components stay coordinated
- **Development**: Both dev servers need to be running to see changes in real-time

---

*This color system was designed to maintain visual harmony across the Ariane project while providing easy customization through a single source of truth.*