# ModelStack
The "Choose your model" badge at the top-left of the home photo. It is a tilted card with the camera behind a small portrait of the current model, and it opens **ModelPicker**.

Provide `model` (`{src, bs, bp}`, the same shape as ModelPicker's models) and `onClick`.

- 40 × 38, placed 16px from the photo's top-left corner, with a soft drop shadow (0 2px 6px at 30%).
- The back card is 24 × 31 in `cream-200`, rotated 9°, with a 15px camera in `ink-soft`. The front card is 24 × 31 with a 1.5px `white` border and `rad-xs` corners, showing the model's face crop.
- Hide it once she has uploaded her own likeness. In the reference the badge only shows for the stock models.
