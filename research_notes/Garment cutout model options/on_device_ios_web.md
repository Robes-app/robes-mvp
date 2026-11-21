# On-device (free) subject cutout: iPhone, Expo/React Native, Android, web (as of 21 Nov 2026)

Research-access note for the report writer: this session could not open wwdcnotes.com, huggingface.co, developers.google.com, npm/jsdelivr/pkgstats, createwithswift.com, photoroom.com or img.ly (blocked by the session network). Apple's own pages (developer.apple.com) and GitHub were reachable. Where a finding rests on a search-result summary of a blocked page rather than on the page itself, it is marked "(search summary)". No on-device test was run; nothing here is a measured result on garment photos.

## 1. Apple APIs: what exists, versions, output, cost

### Takeaway
Apple gives three free, on-device routes: class-agnostic subject lifting (VisionKit iOS 16+, Vision iOS 17+), which returns soft, full-resolution masks per salient instance but takes no prompt; and, new in iOS 27, a promptable Vision request (`GenerateIterativeSegmentationRequest`) that segments the object at a seed point and that Apple itself illustrates with "a piece of clothing". The iOS 27 request is the first Apple API that can target one garment on a worn outfit, but it needs a one-off model download and its box input, speed and device floor are not documented in what I could read.

### Cited Findings
**Subject lifting (VisionKit and Vision)**
- Subject lifting was introduced in iOS 16; VisionKit exposes it through `ImageAnalyzer` + `ImageAnalysisInteraction` (`subjects`, `subject(at:)`, `image(for:)`, each `Subject` has `image` and `bounds`) — [Apple WWDC23 session 10176](https://developer.apple.com/videos/play/wwdc2023/10176/)
- VisionKit runs out of process and caps the image size (no number given); Vision runs in process, is "not as limited" in resolution and is the one meant for pipelines such as Core Image — [Apple WWDC23 session 10176](https://developer.apple.com/videos/play/wwdc2023/10176/)
- `VNGenerateForegroundInstanceMaskRequest` "generates an instance mask of noticeable objects to separate from the background"; available iOS 17, macOS 14, visionOS 1 — [Apple docs](https://developer.apple.com/tutorials/data/documentation/vision/vngenerateforegroundinstancemaskrequest.md)
- It is class-agnostic: any foreground object, not only people or pets — [Apple WWDC23 session 10176](https://developer.apple.com/videos/play/wwdc2023/10176/)
- Output: one observation holding an instance mask (single-channel UInt8, 0 = background, instances numbered from 1, order not guaranteed) and `createScaledMask`, a single-channel float **soft** mask at the **input image resolution**; `croppedToInstancesExtent` gives a tight crop; compositing with `CIBlendWithMask` over an empty image gives a transparent background — [Apple WWDC23 session 10176](https://developer.apple.com/videos/play/wwdc2023/10176/)
- The iOS 18 Swift redesign of Vision carries the same feature as a foreground instance mask request (search summary of the WWDC notes) — [WWDC23 notes, via search](https://wwdcnotes.com/documentation/wwdc23-10176-lift-subjects-from-images-in-your-app/)
- The request does not run on CPU, so it fails in the iOS Simulator ("Could not create inference context"); it must be tested on a device — [Apple Developer Forums 764948](https://developer.apple.com/forums/thread/764948)
- Consumer photo cutouts need iPhone XS / XR or later on iOS 16+ — [Apple Support HT213459](https://support.apple.com/en-gb/HT213459)
- Apple staff recommend `VNGenerateForegroundInstanceMaskRequest` for programmatic, no-UI extraction — [Apple Developer Forums 737076](https://developer.apple.com/forums/thread/737076)

**Person requests**
- `GeneratePersonInstanceMaskRequest` returns a mask per individual person; iOS 18 / macOS 15 for the Swift API — [Apple docs](https://developer.apple.com/documentation/vision/generatepersoninstancemaskrequest.md)
- Person segmentation gives detailed masks for people; person-instance segmentation gives one mask per person. Neither splits garments — [Apple WWDC23 session 10176](https://developer.apple.com/videos/play/wwdc2023/10176/)

**New in iOS 27 (WWDC26, shipped September 2026)**
- Vision adds tap-to-segment: `GenerateIterativeSegmentationRequest(seed: point)`, refined with `addIncludedPoint(_:)`; the result is a mask pixel buffer; coordinates are normalised 0–1 with a lower-left origin — [Apple WWDC26 session 237](https://developer.apple.com/videos/play/wwdc2026/237/)
- The session demonstrates point, bounding box, lasso and scribble inputs plus include/exclude refinement points, but shows code only for the seed point and included point — [Apple WWDC26 session 237](https://developer.apple.com/videos/play/wwdc2026/237/)
- The narrator names "a piece of clothing" as an example object; there is no garment-specific API — [Apple WWDC26 session 237](https://developer.apple.com/videos/play/wwdc2026/237/)
- The model must be downloaded on the device before first use (`downloadAssets`, check `assetStatus`) — [Apple WWDC26 session 237](https://developer.apple.com/videos/play/wwdc2026/237/)
- A third-party SDK reference lists the request under a different name, `GenerateSelectedObjectSegmentationRequest`, taking points, rectangle, mask or scribble, with a limit of 14 points or 12 points plus a box (search summary; the source's availability notes look inconsistent) — [miniswift.run](https://miniswift.run/whats-new/vision/); contradicted on the name by [Apple WWDC26 session 237](https://developer.apple.com/videos/play/wwdc2026/237/)
- An open-source simulator project that mirrors the SDK lists `GenerateIterativeSegmentationRequest` and `DownloadableAssetsRequest` among iOS 26/27 Vision additions, and marks iterative segmentation "not tested yet" — [kolabs-dev/isim PR 890](https://github.com/kolabs-dev/isim/pull/890)
- iOS 27 also adds Core AI, with a `CoreAIImageSegmenter` library (`ImageSegmenter(resourcesAt:)`, `segment(image:prompt:)`) demonstrated with SAM 3 and **text** prompts ("flower"); the SAM 3 `.aimodel` is 623 MB, targets iOS 27 / macOS 27, and the presenter delivers it on demand with Background Assets rather than bundling — [Apple WWDC26 session 326](https://developer.apple.com/videos/play/wwdc2026/326/)
- Core AI is pitched as: data never leaves the device, no server, no per-token cost — [Apple WWDC26 session 326](https://developer.apple.com/videos/play/wwdc2026/326/)
- iOS 27 Foundation Models accepts image input, and Vision now runs on watchOS — [Apple WWDC26 session 237](https://developer.apple.com/videos/play/wwdc2026/237/)

### Inferences
- All of these are OS frameworks with no usage fee or quota; cost is device compute only. No source states a price, and none exists in the API surface, but "free" is my reading, not a quoted statement, except for Core AI's "no per-token cost".
- Offline: subject lifting ships in the OS, so it should work with no network. The iOS 27 request needs a network once, for the model download; after that it is presumably offline. Apple's session does not say so explicitly.
- A12 (iPhone XS/XR) is the documented floor for the consumer cutout feature; the Vision request most likely shares it since it will not run on CPU. Not stated by Apple for the API itself.
- With a server-known bounding box, the iOS 27 request can be seeded with the box centre (or the box itself, if the rectangle initialiser is real) to cut one garment out of a worn outfit — something subject lifting cannot do.
- Text-prompted SAM 3 through Core AI ("jacket", "trousers") would be the most direct garment-level route on iOS 27, at the cost of a 623 MB on-demand download; too heavy as a default, plausible as an opt-in.

### Gaps
- Speed on recent iPhones: no Apple figure for any of these requests. WWDC23 only says the analysis is "resource intensive" and should run off the main thread.
- Maximum number of instances for subject lifting: not stated by Apple in anything I could read.
- Exact initialisers of the iOS 27 request (box, scribble), its point limits, mask resolution, device floor and model size: Apple's documentation page did not render for me; only the WWDC transcript was readable.
- Nothing found on new segmentation APIs in iOS 26 specifically (WWDC25); my search for it returned only WWDC26 material.

## 2. The key limitation: instances are salient subjects, not garments

### Takeaway
Confirmed in principle by Apple: subject lifting separates salient foreground instances and can even merge neighbours (a man and his dog as one subject), so a dressed person comes back as one instance and there is no prompt to split jacket from trousers. An instance can be chosen by a point after the fact (read the label under the pixel), which is how a server bounding box would pick the right instance on a flat lay. I found no published tests on garment photos.

### Cited Findings
- "Subjects are not always single objects": a group such as a man and his dog can come back as one combined subject — [Apple WWDC23 session 10176](https://developer.apple.com/videos/play/wwdc2023/10176/)
- Instance selection by point is supported by design: normalise the point, read the instance-mask label at that pixel, and pass that index (or `allInstances` if it is 0) to generate the mask; VisionKit offers `subject(at:)` for the same purpose — [Apple WWDC23 session 10176](https://developer.apple.com/videos/play/wwdc2023/10176/)
- The request has no prompt input; the only controls are which instance indices to include and whether to crop to their extent — [Apple WWDC23 session 10176](https://developer.apple.com/videos/play/wwdc2023/10176/)
- Android's equivalent documents the same merge behaviour: "if 2 subjects are very close or touching each other, they are considered a single subject" (search summary) — [Google ML Kit docs](https://developers.google.com/ml-kit/vision/subject-segmentation/android?hl=en)
- Apple's consumer description of the feature is isolating "a person or pet" — [Apple Support HT213459](https://support.apple.com/en-gb/HT213459)

### Inferences
- Worn outfit / mirror selfie: one instance = the whole person (plus phone, possibly the mirror frame). Subject lifting alone cannot produce per-garment cutouts here. Options are (a) lift the person, then crop to the server's box (gives a rectangle of person, not a garment), or (b) use a promptable model (iOS 27 request, SAM 2.1, SAM 3).
- Flat lay / bed / floor / hanger: one piece on a contrasting surface is the favourable case and should behave like any product shot. Several pieces that touch or overlap will probably merge, as Apple's own example and Google's documented rule both suggest. Picking the instance with the largest overlap with the server's box, and rejecting it when its extent is much larger than the box, is a cheap guard.
- Black-on-dark, white-on-white and sheer fabric are low-contrast cases for any saliency-driven model; the soft float mask helps with sheer edges but I found no evidence either way.
- A practical on-device rule: accept the lifted instance only if its bounding extent matches the server box (say IoU above a threshold); otherwise fall back to a promptable or server-side model.

### Gaps
- No developer report, forum thread or sample output found for subject lifting on clothes on a bed/floor, hangers, mirror selfies, black-on-dark or sheer fabric. Two targeted searches returned nothing relevant. This needs a hands-on test with 20–30 real wardrobe photos on a device; it is a half-day job and the only way to settle it.
- No statement from Apple on how overlapping or touching objects are split.

## 3. Licence and terms

### Takeaway
I found no restriction on uploading, storing or commercially using Vision output. The only clause surfaced is DPLA §3.2(8), reported second-hand as barring use of Apple-model output to train or improve another AI model — relevant only if cutouts were later used as training data.

### Cited Findings
- A developer quotes DPLA §3.2(8) as prohibiting using "output generated from an Apple model to train, fine-tune, or improve another artificial intelligence model"; the thread has no Apple reply — [Apple Developer Forums 836435](https://developer.apple.com/forums/thread/836435)
- A separate thread asking whether Vision output may be used as training labels has no Apple staff answer; a community member reports doing so without App Review pushback — [Apple Developer Forums 822330](https://developer.apple.com/forums/thread/822330)
- The current agreement text is the October 2025 DPLA — [Apple DPLA 2025-10-08 PDF](https://developer.apple.com/support/downloads/terms/apple-developer-program/Apple-Developer-Program-License-Agreement-20251008-English.pdf)

### Inferences
- Storing a user's own cutout on the server and showing it back to her is ordinary use of a documented API; nothing found suggests otherwise.
- If cutouts produced by Apple's models were ever used to fine-tune a garment segmenter, §3.2(8) should be read first.

### Gaps
- I did not read the DPLA text itself; the §3.2(8) wording is a forum poster's quotation. Whether the clause covers Vision (as opposed to Apple Intelligence generative models) is unconfirmed.

## 4. Expo / React Native access

### Takeaway
Several small MIT libraries wrap the iOS 17 Vision request and ML Kit on Android, but all are thin, lightly used and return a whole-foreground cutout rather than per-instance masks. None works in Expo Go; all need a development build. For per-instance selection by bounding box, and for the iOS 27 request, a small in-house Expo Module (Swift) is the realistic route.

### Cited Findings
- `@westwood-dev/expo-segmentation` v0.1.0: Expo module; iOS uses the Vision request (iOS 17+), Android uses ML Kit Subject Segmentation (API 24+); API is `isAvailable()`, `detectSubjects(imageUri)`, `removeBackground(imageUri, options)` with optional greyscale `maskUri`; MIT; 6 commits, 0 stars; "will not work in Expo Go", needs a development build or EAS Build — [GitHub](https://github.com/westwood-dev/expo-segmentation)
- `react-native-background-remover` (atlj): ML Kit on Android, Vision on iOS, MIT, "iOS 15 and above"; last push 2024-12-17 per an aggregator (search summary) — [ecosyste.ms listing](https://awesome.ecosyste.ms/projects/github.com%2Fatlj%2Freact-native-background-remover)
- `@jacobjmc/react-native-background-remover` v1.0.2: MIT fork of atlj's with "expanded object detection capabilities", more recently published (search summary) — [unpkg README](https://app.unpkg.com/@jacobjmc/react-native-background-remover@1.0.2/files/README.md)
- `@six33/react-native-bg-removal` v1.3.4: iOS 17+ Vision request and ML Kit, optional external-API fallback for iOS 15.1–16, `isNativeBackgroundRemovalSupported` check (search summary) — [pkgstats listing](https://www.pkgstats.com/pkg:@six33/react-native-bg-removal)
- `react-native-subject-lift` v0.2.0: built on VisionKit on iOS, ML Kit on Android (search summary) — [jsDelivr listing](https://www.jsdelivr.com/package/npm/react-native-subject-lift)
- `vision-camera-remove-background` exists as a VisionCamera plugin (name only, from search) — [yarn listing](https://classic.yarnpkg.com/en/package/vision-camera-remove-background)

### Inferences
- atlj's "iOS 15 and above" means it most likely uses person segmentation on iOS 15–16 (people only) and the foreground request on 17+; on older iOS it would not cut out a garment on a hanger. Check before adopting.
- None of the listed APIs exposes the instance mask or instance indices, so "pick the instance overlapping the server's box" is not available off the shelf. A custom Expo Module is ~100–150 lines of Swift: run the request, read the label under the box centre (or the label with most pixels inside the box), `generateMaskedImage` cropped to extent, write PNG, return URI + extent.
- Expo Modules autolink in a dev build with no config plugin for pure-Swift code that needs no Info.plist entries; a config plugin is only needed if entitlements or plist keys change. (General Expo behaviour, not from a fetched source.)
- `expo-image-manipulator` and `@react-native-ml-kit` did not surface in any result as offering subject segmentation.

### Gaps
- Last-commit dates and download counts for most packages: the npm/aggregator pages were unreachable; the `six33` GitHub URL I guessed returned 404.
- No library found that wraps the iOS 27 `GenerateIterativeSegmentationRequest` yet.
- New Architecture (Fabric/TurboModules) support of each library not verified.

## 5. Core ML alternatives on device

### Takeaway
Apple publishes Core ML SAM 2.1 in four sizes, which is promptable and so can use the server's box, but third-party evidence says even the smallest SAM 2 is slow on a phone (~1 FPS on iPhone 15 Pro Max) — fine for a once-per-upload job. On iOS 27 the built-in Vision request and Core AI's SAM 3 largely supersede a hand-rolled SAM 2 integration.

### Cited Findings
- Apple publishes Core ML conversions of SAM 2.1 Tiny, Small, Base+ and Large (float16), meant for the SAM2 Studio demo app (search summary) — [apple/coreml-sam2.1-tiny](https://huggingface.co/apple/coreml-sam2.1-tiny)
- The EdgeTAM paper benchmarked a Core ML SAM 2 on iPhone 15 Pro Max and reports the smallest SAM 2 variant at about 1 FPS (search summary) — [EdgeTAM paper](https://huggingface.co/papers/2501.07256.md)
- SAM 3 via Core AI: 623 MB `.aimodel`, iOS 27+, text prompts, first load "specialises" the model for the device and can take significant time unless compiled ahead of time — [Apple WWDC26 session 326](https://developer.apple.com/videos/play/wwdc2026/326/)
- Apple's Core AI Models repository ships export recipes for SAM 3 — [Apple WWDC26 session 326](https://developer.apple.com/videos/play/wwdc2026/326/)

### Inferences
- About one second per image for SAM 2.1 Tiny is acceptable for a compute-once-at-upload cutout, but it adds app size (or an on-demand download) and a native module to maintain.
- SAM-family masks are binary-ish at low internal resolution (upsampled), so edges on knit, fur and sheer fabric will be rougher than a matting model such as BiRefNet; a cheap edge-refine step may be needed.

### Gaps
- Licence and file sizes of Apple's SAM 2.1 Core ML packages: not confirmed (Hugging Face unreachable). Upstream SAM 2 is Apache-2.0 to my knowledge, unverified here.
- No sourced data on BiRefNet, RMBG, DETR or DeepLab Core ML conversions (sizes, speeds, licences).
- SAM 3's licence was not checked; Apple calls it "open-source" in the session without terms.

## 6. Android: ML Kit Subject Segmentation

### Takeaway
Free, on-device, multi-subject, and still in beta. It behaves like Apple's subject lifting (salient subjects, touching subjects merge), so it has the same garment-level limitation.

### Cited Findings
- Status: beta, "might undergo changes that could affect backward compatibility"; dependency `com.google.android.gms:play-services-mlkit-subject-segmentation:16.0.0-beta1` (search summary of the current docs page) — [Google ML Kit docs](https://developers.google.com/ml-kit/vision/subject-segmentation/android?hl=en)
- Returns a foreground confidence mask and bitmap, plus a mask and bitmap per detected subject; subjects are objects, pets and humans — [Google ML Kit docs](https://developers.google.com/ml-kit/vision/subject-segmentation/android?hl=en)
- Two subjects very close or touching count as one — [Google ML Kit docs](https://developers.google.com/ml-kit/vision/subject-segmentation/android?hl=en)
- Android API 24+, unbundled model delivered through Google Play services, static images only, about 200 ms on a Pixel 7 Pro — [Google ML Kit docs](https://developers.google.com/ml-kit/vision/subject-segmentation/android?hl=en)

### Inferences
- Because the model comes through Play services, it adds little to app size but is unavailable on devices without Google Play services.
- The same "pick the subject overlapping the server's box" logic ports directly, since per-subject masks are returned.

### Gaps
- Whether the API left beta during 2026: the search found no 2026-dated change; the docs page could not be opened directly to confirm today's status.
- No promptable (point/box) segmentation in ML Kit surfaced.

## 7. Web: in-browser options

### Takeaway
The browser has no built-in subject lifting, so the web needs a downloaded model: `@imgly/background-removal` is AGPL (commercial terms by email only), while transformers.js with a permissively licensed model (MODNet Apache-2.0, BEN2 MIT, BiRefNet reported MIT) avoids the licence problem. WebGPU now works in Safari on iOS 26+, but I found no speed numbers for iPhones. MediaPipe adds a point-prompted segmenter and a tiny person model with a "clothes" class.

### Cited Findings
- `@imgly/background-removal`: "free for use under the AGPL License"; other licensing by contacting support@img.ly; licence was changed from GPL to AGPL; no public price found — [README on unpkg](https://unpkg.com/@imgly/background-removal@1.5.8/README.md)
- WebGPU ships in Safari 26 on iOS 26, iPadOS 26 and visionOS 26, making it available in all major browsers — [web.dev](https://web.dev/blog/webgpu-supported-major-browsers)
- A developer confirms WebGPU working in Safari 26 on macOS and iOS — [strahl blog](https://stuckisimon.github.io/strahl/blog/safari-webgpu-support)
- RMBG-2.0 (BRIA) is CC BY-NC 4.0; commercial use needs an agreement with BRIA; it is built on the BiRefNet architecture — [briaai/RMBG-2.0](https://huggingface.co/briaai/rmbg-2.0)
- BEN2: official model card tagged MIT (search summary); a repackaged copy is tagged Apache-2.0, conflicting — [PramaLLC/BEN2](https://huggingface.co/PramaLLC/BEN2/raw/main/README.md)
- A transformers.js-compatible BEN2 ONNX mirror (fp16) exists — [kittypdf/BEN2-transformersjs](https://huggingface.co/kittypdf/BEN2-transformersjs)
- MODNet for transformers.js is tagged Apache-2.0 and described as portrait matting — [Xenova/modnet](https://huggingface.co/Xenova/modnet)
- BiRefNet is listed as MIT by a model library and a mirror; the official repo's licence was not in the results — [vast.ai listing](https://vast.ai/model/birefnet)
- A sample using RMBG-1.4 with transformers.js reports ~176 MB model and ~2–5 s per image on WebGPU (desktop, self-reported) — [backblaze-b2-samples](https://github.com/backblaze-b2-samples/b2-transformerjs-background-removal)
- ORMBG's ONNX export is ~168 MB fp32 / ~84 MB fp16, as a size reference for this model class — [d30social/ormbg-ortweb](https://huggingface.co/d30social/ormbg-ortweb)
- MediaPipe Interactive Segmenter splits an image into a selected object and everything else from a point / region of interest; default model MagicTouch, 512×512×4 float32; has a JS API — [Google MediaPipe guide](https://ai.google.dev/mediapipe/solutions/vision/interactive_segmenter)
- MediaPipe SelfieMulticlass: 256×256 input, classes background, hair, body-skin, face-skin, clothes, others (accessories) — [Google MediaPipe image segmenter guide](https://developers.google.com/edge/mediapipe/solutions/vision/image_segmenter/index)
- The multiclass model is about 16 MB per a third-party wrapper's docs (not Google's) — [pub.dev face_detection_tflite](https://pub.dev/documentation/face_detection_tflite/latest/face_detection_tflite_native/SelfieSegmentation-class.html)

### Inferences
- AGPL in a closed-source web app served to users means either publishing the app's source or buying a licence; treat `@imgly/background-removal` as paid-or-avoid.
- MODNet is trained for portraits, so it is a poor fit for a garment on a hanger; BEN2 or BiRefNet (general foreground) fit better but are 80–200 MB class downloads — heavy for a first upload on mobile data.
- These web models, like subject lifting, give one foreground matte with no instances. For a worn outfit the options in the browser are MediaPipe's point-prompted MagicTouch (seed = centre of the server's box) or the SelfieMulticlass "clothes" class, which marks all clothing as one region at 256×256 — too coarse for a stored cutout and it does not split top from bottom.
- Given "web may lag", the cheapest web path is not to segment in the browser at all: upload the photo and let the server (or the next iOS session) produce the cutout. The legacy vanilla-JS page should not take a 100 MB+ model download.

### Gaps
- No benchmark found for any of these models in Safari on a mid-range iPhone; iOS Safari's per-tab memory ceiling with 100 MB+ models is a known practical risk that I could not source.
- BiRefNet-lite and BEN2 ONNX file sizes not confirmed.
- img.ly's commercial licence price: not published anywhere I could find.
- MagicTouch file size and licence not found.

## 8. What competitors do

### Takeaway
No evidence found on whether Whering, Indyx, Acloset, Cladwell, Alta, Vinted or Depop remove backgrounds on device or on a server. The only concrete signals are that a wardrobe app (OpenWardrobe) is a Photoroom API customer, and that two small apps advertise on-device removal.

### Cited Findings
- Whering and Indyx are described as offering automatic background removal; Indyx calls its own "AI-powered" (competitor-authored marketing page) — [Indyx: Whering vs Indyx](https://myindyx.com/versus/whering-vs-indyx)
- Acloset removes the background automatically after upload, per the same vendor's comparison — [Indyx: Acloset vs Whering](https://myindyx.com/versus/acloset-vs-whering)
- Stylebook uses a manual background-removal tool rather than an automatic one, per the same vendor — [Indyx: Stylebook vs Whering](https://www.myindyx.com/versus/stylebook-vs-whering)
- Photoroom publishes a customer story for the wardrobe app OpenWardrobe (page exists; content not read) — [Photoroom customer story](https://www.photoroom.com/ja/customer-stories/openwardrobe)
- StyleLegacy advertises an "on-device BG Remover" in its App Store listing — [App Store: StyleLegacy](https://apps.apple.com/sg/app/stylelegacy/id6450846417)

### Inferences
- A Photoroom customer story implies at least one wardrobe app uses a paid server API for cutouts; nothing more can be read into it without the page.
- The split in the market between "automatic" and "manual" removal says nothing about where it runs.

### Gaps
- No privacy policy, engineering post or teardown found for any named competitor. Cladwell, Alta, Vinted and Depop did not surface at all.
- Settling this needs either reading each app's privacy policy / sub-processor list, or a network capture while adding an item in airplane mode.
