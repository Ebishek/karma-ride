---
name: KarmaRide
colors:
  surface: '#fff8f5'
  surface-dim: '#ecd6c8'
  surface-bright: '#fff8f5'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#fff1e9'
  surface-container: '#ffeadd'
  surface-container-high: '#fae4d6'
  surface-container-highest: '#f4ded0'
  on-surface: '#241911'
  on-surface-variant: '#56423d'
  inverse-surface: '#3b2e24'
  inverse-on-surface: '#ffede3'
  outline: '#8a726c'
  outline-variant: '#ddc0ba'
  surface-tint: '#a03f29'
  primary: '#a03f28'
  on-primary: '#ffffff'
  primary-container: '#c0573e'
  on-primary-container: '#120100'
  inverse-primary: '#ffb4a3'
  secondary: '#7b5800'
  on-secondary: '#ffffff'
  secondary-container: '#ffbe30'
  on-secondary-container: '#6f4f00'
  tertiary: '#106571'
  on-tertiary: '#ffffff'
  tertiary-container: '#347e8b'
  on-tertiary-container: '#f7feff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdad2'
  primary-fixed-dim: '#ffb4a3'
  on-primary-fixed: '#3d0700'
  on-primary-fixed-variant: '#812914'
  secondary-fixed: '#ffdea6'
  secondary-fixed-dim: '#fcbc2c'
  on-secondary-fixed: '#271900'
  on-secondary-fixed-variant: '#5d4200'
  tertiary-fixed: '#a7eefc'
  tertiary-fixed-dim: '#8bd2df'
  on-tertiary-fixed: '#001f24'
  on-tertiary-fixed-variant: '#004e59'
  background: '#fff8f5'
  on-background: '#241911'
  surface-variant: '#f4ded0'
typography:
  headline-lg:
    fontFamily: Literata
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Literata
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Literata
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 8px
  sm: 16px
  md: 24px
  lg: 40px
  xl: 64px
  margin-mobile: 16px
  margin-desktop: 32px
  gutter: 16px
---

## Brand & Style
The design system is built on the philosophy of "Gramin Modernism"—bridging the gap between traditional Indian village life and modern mobile utility. It targets a community-driven demographic that values trust, local familiarity, and the shared economy of two-wheeler transport. 

The aesthetic is **Rustic-Minimalist**. It avoids the sterile, high-tech look of urban apps in favor of warmth and human touch. The interface should feel like a well-crafted clay pot: functional, sturdy, and grounded in the earth. Emotional responses should range from the reliability of a neighbor to the vibrancy of a village "mela" (fair).

## Colors
The palette is derived from the natural materials of rural India.
- **Primary (Terracotta):** Used for primary actions and brand presence. It evokes the burnt-clay roofs and sun-baked earth.
- **Secondary (Mustard Yellow):** Used for accents, rewards, and highlighting key information like "Karma Points." It reflects marigold flowers and mustard fields.
- **Tertiary (Deep Teal):** Provides a cooling contrast, used for status indicators, maps, and trust-building elements. It represents the deep shade of banyan trees and traditional painted doors.
- **Neutral (Clay Brown):** Used for typography and iconography to maintain a softer, organic feel compared to pure black.
- **Background (Handmade Paper):** A warm off-white that reduces eye strain and provides a tactile, recycled feel.

## Typography
This design system utilizes a high-contrast type pairing to balance heritage with usability.
- **Headings:** Literata is chosen for its "bookish" and authoritative yet warm character. Its serifs are sturdy, reminiscent of traditional Indian publishing and government signage.
- **Body & Interface:** Plus Jakarta Sans provides a friendly, rounded counterpoint. Its high x-height ensures legibility for users who may be navigating the app in bright, outdoor sunlight. 
- **Language Support:** When using Devanagari script, ensure weights are matched to the visual density of the English counterparts.

## Layout & Spacing
The layout follows a **Fluid Grid** model with generous internal padding to reflect the open spaces of rural life. 
- **Mobile:** A 4-column grid with 16px side margins. Most interaction happens in the lower two-thirds of the screen for easy one-handed "thumb" reach while on the move.
- **Desktop/Tablet:** A 12-column grid. Information is grouped into "Chaupal" cards—modular blocks that represent community gathering points.
- **Spacing Rhythm:** Based on a 4px baseline, but defaults to 16px (sm) and 24px (md) for most component spacing to ensure the UI doesn't feel cramped.

## Elevation & Depth
Depth in the design system is achieved through **Tonal Layers** and **Soft Ambient Shadows** rather than harsh digital borders.
- **Surfaces:** Use subtle grain textures or "paper" overlays on container backgrounds to break the flat digital plane.
- **Shadows:** Use low-opacity brown-tinted shadows (`rgba(75, 61, 51, 0.08)`) instead of grey. Shadows should feel like the soft, diffused light of a late afternoon.
- **Interactive States:** Elements should "press" into the surface (slight scale down and shadow reduction) rather than hovering higher, mimicking the tactile nature of clay and wood.

## Shapes
The shape language is organic and soft. Avoid sharp 90-degree corners. 
- **Standard Radius:** 8px (0.5rem) for cards and input fields.
- **Large Radius:** 16px (1rem) for bottom sheets and featured containers.
- **Pill Shapes:** Used exclusively for "Karma" badges and primary call-to-action buttons to make them feel inviting and safe to touch.
- **Organic Accents:** Use "blob" shapes or slightly imperfect circles for profile pictures and map markers to reinforce the artisanal, hand-made theme.

## Components
- **Buttons:** Primary buttons use the Terracotta fill with white or cream text. They should have a "heavy" base feel. Secondary buttons use a Deep Teal outline.
- **Chips:** Used for ride types (Scooter, Bike, Cargo). Use rounded corners and a soft Mustard Yellow background when selected.
- **Cards:** Surface-container tiers. Use a subtle 1px border in a lighter shade of Clay Brown rather than a heavy shadow to define boundaries.
- **Input Fields:** Bottom-aligned labels. Use a warm cream background color rather than pure white to make them feel like part of the "paper" interface.
- **Icons:** Block-print style. Lines should have slight variations in thickness as if carved from wood. Avoid pixel-perfect symmetry.
- **Karma Rewards:** A unique component—a "Copper Coin" or "Lotus" icon that pulses softly when points are earned, using the Mustard Yellow palette.
- **Lists:** Separated by thin, dashed lines that look like stitched fabric or perforated paper.