# LiquidGlass
Felix's veils drawn as iOS 26 Liquid Glass. It covers the discs and badges that sit on a photo, and the glass sheets and chrome.

Provide `tone`, which is the veil to fall back to: `veil` (the default), `veil-soft`, `veil-mid` or `veil-paper`. Also provide `fallback`: `veil` for a disc, or `solid` for a surface that holds controls. Then give it a shape, for example a 36px circle. Its children sit on the glass.

- Glass is drawn only on iOS 26 builds that have it, and only while Reduce Transparency is off. Everywhere else, the token veil is drawn.
- With `fallback: 'solid'`, a surface that holds controls (the Filter, Add pieces and New look sheets, and **GlassChrome**) is opaque `cream` when there's no glass. The screen behind never reads through its controls.
- Used for: the back, adjust, remove and retake discs, and the image-stack and model badges on look photos.
- Glyphs on glass are `ink`. Never tint the glass and never stack two layers of it.
- `useNativeGlass()` tells a component whether glass is being drawn.
