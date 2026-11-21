# Garment cutouts: clothing hard cases, comparisons, and what wardrobe/resale apps do (as of 21 Nov 2026)

> **Read this first — evidence quality.** Direct page fetches were blocked in this session (photoroom.com, runflow.io, news.depop.com, myindyx.com, altadaily.com, retailtechinnovationhub.com all failed DNS at the proxy). Every finding below therefore comes from **search-result summaries of the cited page, not a full read of it**. Numbers and quotes should be re-checked against the page before they go into a decision document. Much of the available material is vendor-published (Photoroom, Indyx, Alta, Runflow, fal); that is flagged per item. Reddit and App Store review text was **not retrievable** — the searches returned no wardrobe-app review threads at all, so user-complaint evidence is thin and is listed under Gaps rather than invented.

## 1. Hard cases for garment cutouts: which approaches succeed or fail on each

### Takeaway
The only hard case with clear, consistent evidence is semi-transparency (sheer/lace/mesh): binary segmentation fails by construction and alpha matting is the right family, though not a guarantee. For low contrast / white-on-white, the evidence says failures are "semantic" (the model picks the wrong foreground) and are shared across the whole BiRefNet-style family, so swapping one matting model for another is unlikely to fix them. For hangers, mirror selfies, single-garment-on-a-person, overlapping flat lays, thin structures, shadows and fur I found **no clothing-specific measured evidence** — these have to be settled by the team's own bake-off.

### Cited Findings

**(1) Sheer, lace, mesh, tulle, organza**
- A sheer-fabric edge is not a solid line — a strand can cover only part of a pixel; lace and mesh "can disappear when the mask is too aggressive"; hair, fur, smoke, lace and glass cannot be classified per-pixel as subject or background (vendor guide) — [Deep-Image](https://deep-image.ai/blog/ai-background-removal-complex-edges-hair-glass/)
- A hard segmentation mask makes soft boundaries look "clipped, jagged, or unnaturally solid"; matting "can better represent partial visibility, but it is not a guarantee that every fine detail will be preserved perfectly" (vendor guide) — [CapCut](https://www.capcut.com/create/ai-background-removal-how-cutouts-work)
- A garment-imaging patent notes that existing alpha-matte techniques "are designed to work with foreground objects that are physically separate from the background" — i.e. a lace garment lying against a mannequin, body or duvet is outside what classic matting assumes — and that opacity information helps when compositing semi-transparent garments near mask boundaries (patent family retrieved via search; exact document among the listed set not confirmed) — [USPTO, "Methods and systems for segmenting images"](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/12217435)
- fal's BiRefNet documentation states BiRefNet-style models can struggle with semi-transparent objects (no measurements given) — [fal.ai BiRefNet API reference](https://fal.ai/docs/model-api-reference/image-generation-api/birefnet)
- An August 2026 model overview groups Bria RMBG, BEN v2 and BiRefNet as the "matting" family that "produces the soft-edged alpha cutout you actually composite with", as opposed to SAM-style segmentation — [invideo](https://invideo.io/blog/ai-background-removal-models/)
- Practical check: test the cutout on a background other than white, because a white canvas hides pale halos and missing transparency — [Deep-Image](https://deep-image.ai/blog/ai-background-removal-complex-edges-hair-glass/)
- Azure's background removal returns an alpha matte and documents itself as working best on people, animals and "personal belongings" (preview) — [Microsoft Learn](https://learn.microsoft.com/azure/ai-services/computer-vision/concept-background-removal)

**(2) Black-on-black / low contrast and (10) pale-on-pale**
- The BiRefNet-V2 paper (arXiv 2611.11272, Nov 2026) reports that its worst DIS5K predictions are a *semantic* failure — deciding what the foreground is, not tracing edges — and that BiRefNet, PDFNet and DiffDIS fail the same way on the same images, "a property of the paradigm, not of the V2 redesign" — [arXiv 2611.11272](https://arxiv.org/pdf/2611.11272)
- A practitioner post lists "glass objects that disappear, products on white backgrounds that partially vanish" as common production failures of BiRefNet/rembg/U2Net (methodology unclear, numbers unsourced — weak) — [DEV Community](https://dev.to/om_prakash_3311f8a4576605/birefnet-vs-rembg-vs-u2net-which-background-removal-model-actually-works-in-production-d2f)
- Salient-object literature consistently names complex background, low foreground/background contrast and transparent objects as the principal failure causes (older, not BiRefNet-specific) — [Bifurcated backbone strategy for RGB-D SOD, arXiv 2007.02713](https://arxiv.org/pdf/2007.02713)
- Photoroom's own tips page says fine details can be mistaken for background, and blurred edges or uneven lighting make it worse (vendor) — [Photoroom](https://www.photoroom.com/blog/background-remover-mistakes)

**(3) Hangers, rails, mannequins; (5) one garment off a dressed person; (6) overlapping flat lays**
- SAM 3 (Meta, arXiv Nov 2025, ICLR 2026) does "Promptable Concept Segmentation": it segments all instances of a concept given a short text phrase and/or image exemplars, and accepts **negative** exemplars to remove unwanted detections — the mechanism that makes "the jacket, not the shirt" or "the dress, not the hanger" addressable at all — [arXiv 2511.16719](https://arxiv.org/html/2511.16719v2); [Ultralytics SAM 3 docs](https://docs.ultralytics.com/models/sam-3)
- Salient-object/matting models (BiRefNet, RMBG, BEN2, Apple subject lift) label foreground vs background — Apple describes its on-device network as labelling each pixel foreground or background — so they have no notion of "this garment only" — [Apple ML Research](https://machinelearning.apple.com/research/salient-object-segmentation)
- Apple's VisionKit/Vision API lets an app lift the primary subject or "the subject at a given point", i.e. instance selection by tap, on device — [Apple WWDC23 session 10176](https://developer.apple.com/la/videos/play/wwdc2023/10176/)
- E-commerce parsing work reports that state-of-the-art fashion parsing models "encounter limitations, particularly when exposed to non-model-worn apparel and close-up shots" — i.e. human-parsing models trained on worn clothing transfer poorly to hanger and flat-lay photos (attributed by the search summary to one of the listed e-commerce papers; verify) — [arXiv 2404.08582](https://arxiv.org/html/2404.08582v1)
- GarmentSegAgent (arXiv, Oct 2026) segments garments in web fashion images with a planner VLM (Qwen2.5-VL) writing prompts, SAM 2.1 as the segmenter, and a second VLM (Qwen3-VL) evaluating and triggering textual self-refinement; evaluated on DeepFashion2, ModaNet and Fashionpedia — [arXiv 2610.36506](https://arxiv.org/pdf/2610.36506)
- A textile-recycling study used Grounding DINO (text-prompted box) → SAM (mask) as a zero-shot garment segmentation pipeline — [arXiv 2506.06569](https://arxiv.org/pdf/2506.06569)

**(7) Thin structures and (9) fur / knit halo / hair**
- A hands-on ComfyUI write-up reports BiRefNet-HR "definitely appears to do much better with hair compared to other models", while its author preferred BEN2 overall (one person's eyeballed comparison, not apparel) — [Medium / Code Canvas](https://medium.com/code-canvas/background-removal-in-comfyui-just-got-really-really-good-2a12717ff0db)
- An Adobe community thread documents AI background removers leaving "fog" inside the holes of a wreath — the enclosed-background failure that also applies to lace holes, chain links, bag handles and the gap inside a hanger (title-level evidence only) — [Adobe Community](https://community.adobe.com/questions-32/why-ai-background-removers-leave-fog-inside-wreaths-and-what-i-do-instead-1638221)

**(8) Shoes, bags, shadows**
- Resale platforms treat the shadow as something to *add back* after removal, not keep from the original: Depop's Photoroom integration ships background removal plus drop shadows and resizing; Vestiaire's does background removal, shadows and relighting — [Depop newsroom](https://news.depop.com/depop-partners-with-photoroom-to-bring-ai-powered-photo-editing-to-millions/); [Retail Tech Innovation Hub](https://retailtechinnovationhub.com/home/2026/10/13/vestiaire-collective-becomes-first-luxury-resale-platform-to-standardise-new-listing-photos-with-ai)

### Inferences
- Two different capabilities are being conflated under "cutout": (a) **edge/alpha quality** (matting family: BiRefNet, RMBG-2.0, BEN2, remove.bg, Photoroom) and (b) **choosing the right object** (promptable: SAM 2/3, Grounding DINO+SAM, Apple tap-to-lift). Cases 1, 7, 9 are (a) problems; cases 3, 4, 5, 6 are (b) problems; cases 2 and 10 are (b)-flavoured per the BiRefNet-V2 failure analysis. A likely strong design is promptable selection → matting refinement inside that region, but I found no source measuring that combination on clothing.
- For a single garment on a hanger against a wall, a salient-object matting model will probably keep the hanger (it is part of the salient object) — inference, untested by any source found.
- Mirror selfies and worn photos cannot be solved by a salient-object model at all: the salient object is the person. They need a garment-level prompt or a decision to not cut out (fall back to the crop).
- Sheer garments have a deeper problem than model choice: the pixels genuinely contain background colour (skin, duvet). Even a perfect alpha leaves the background's colour in the semi-transparent pixels unless foreground colour is re-estimated (see section 5).
- Product-page images on white (case 11) are the easy input for edges but collide with case 10 when the garment is white/cream; expect partial vanishing there.

### Gaps
- No source measured hanger keep/remove behaviour, or stated what wardrobe apps prefer. No source on mirror-selfie cutouts (phone/hand occlusion, reflections).
- No clothing-specific evidence for fringe, chains, laces, belts, sunglasses, feathers, or contact-shadow handling on shoes/bags.
- No quantitative comparison on sheer textiles anywhere in the results.
- BEN2's "confidence-guided matting" refiner behaviour on low-contrast cases: not found.

## 2. Independent 2025–2026 comparisons on apparel; fashion benchmarks and datasets

### Takeaway
There is no independent, clothing-specific cutout benchmark. The best public artefacts are Photoroom's human-vote Elo arena (vendor-run, clothing listed only as a future category) and a raw Hugging Face vote dataset that includes clothing images; general benchmarks say open models are now close to commercial APIs. The standard fashion datasets carry hard instance masks, not alpha mattes, so they test "right garment" but not edge/transparency quality.

### Cited Findings
- Photoroom built an open-source arena modelled on Chatbot Arena: users vote between two cutouts of the same image (win/loss/draw), aggregated with Elo; the original post covered Dec 2024–Jan 2025 with about 9,000 public votes sourced from LinkedIn, X and Reddit. Adding e-commerce cases "including clothing, cars, furniture, and logos" was listed as a goal, not a result — [Photoroom](https://www.photoroom.com/inside-photoroom/background-remover-benchmark)
- A 2026 Photoroom blog says Photoroom "ranks first in the community-voted arena" (self-reported; Elo numbers not retrieved) — [Photoroom](https://www.photoroom.com/blog/best-online-background-removers-for-e-commerce-in-2026)
- A Hugging Face dataset of raw arena votes (May–June 2025 rows seen) contains pairwise votes among BRIA RMBG 2.0, BiRefNet v2, RemoveBG, Photoroom and Clipdrop, including clothing images; raw rows only, no aggregate — [Hugging Face bgsys/votes_datasets_test2](https://huggingface.co/datasets/bgsys/votes_datasets_test2/viewer/default/train?p=141)
- Runflow's February 2026 benchmark on 5,000 product images (not clothing-specific) concluded open source is within 2% of closed-source quality and named RMBG-2.0 the winner, ahead of SAM 2 (vendor blog) — [Runflow](https://www.runflow.io/blog/background-removal-benchmark)
- fal's 2026 ranking lists Bria RMBG 2.0 and Pixelcut among top picks; Bria RMBG 2.0 is priced at $0.018 per image on fal (vendor) — [fal.ai](https://fal.ai/learn/tools/image-background-removers)
- Vestiaire Collective ran a randomized test of its in-house background remover against Photoroom's and chose Photoroom, reporting a 5% liquidity lift with digital authentication unaffected (Oct 2026; results published via the vendor relationship) — [Retail Tech Innovation Hub](https://retailtechinnovationhub.com/home/2026/10/13/vestiaire-collective-becomes-first-luxury-resale-platform-to-standardise-new-listing-photos-with-ai); [Photoroom](https://www.photoroom.com/inside-photoroom/vestiaire-collective-liquidity-photoroom)
- DeepFashion2: 491K images, 13 clothing categories, per-item masks and landmarks, covering detection, pose, segmentation and retrieval, with a commercial–consumer photo split — [arXiv 1901.07973](https://arxiv.org/abs/1901.07973)
- The four main public fashion segmentation datasets are DeepFashion, ModaNet, DeepFashion2 and Fashionpedia — [DETR-based layered clothing segmentation, arXiv 2304.08107](https://ar5iv.labs.arxiv.org/html/2304.08107)
- VTBench (try-on benchmark) uses an OCR-based font-texture similarity metric for texture/logo fidelity and a VLM to judge body-fit plausibility — reusable ideas for scoring garment faithfulness — [arXiv 2505.19571](https://arxiv.org/pdf/2505.19571)
- MatAnyone 2 introduces a learned Matting Quality Evaluator that scores semantic and boundary quality of alpha mattes without ground truth (a trained model, video-matting context) — [arXiv 2512.11782](https://arxiv.org/abs/2512.11782v1)

### Inferences
- Because the fashion datasets have binary masks and are dominated by worn/commercial images, none is a drop-in benchmark for bedroom/hanger/mirror cutouts with alpha. DeepFashion2's consumer split is the closest public proxy for "right garment selected" (IoU), and could supply 50–100 labelled hard images cheaply; edge and transparency quality must be judged by eye.
- The Photoroom arena code is open source per the vendor, so the pairwise/Elo UI itself may be reusable for an internal bake-off rather than building one.
- Published vendor rankings disagree on the winner (Photoroom says Photoroom; Runflow says RMBG-2.0), which is itself evidence that results are distribution-dependent and that an own-photos test is the only decisive one.

### Gaps
- Current Elo standings and per-model scores from the Photoroom arena: not retrieved.
- No head-to-head including **BEN2**, **SAM 3**, or **Apple subject lift** on apparel was found. No independent measurement of Apple's subject lift quality on garments.
- No public garment-matting dataset with alpha ground truth (sheer/lace) was found.
- Latency and per-image prices for remove.bg and Photoroom APIs in Nov 2026: not retrieved (only the fal RMBG price above).

## 3. What wardrobe and resale apps actually do

### Takeaway
Auto background removal on upload is table stakes in wardrobe apps (Indyx, Acloset, Whering all advertise it) and the resale side has standardised on Photoroom as the vendor (Depop June 2025, Vestiaire October 2026), deliberately choosing non-generative removal + shadow over generative clean-up. Alta is the notable wardrobe app going generative ("Prettify"). Vendor identity, on-device vs server, and manual touch-up tooling for the wardrobe apps are mostly undocumented in what I could reach.

### Cited Findings

**Resale**
- **Depop**: announced a Photoroom partnership (June 2025) embedding background removal, drop shadows and resizing in the listing flow; Photoroom states the tools are free for Depop sellers; Depop recommends square 1:1 images, ideally 1280 × 1280 px — [Depop newsroom](https://news.depop.com/depop-partners-with-photoroom-to-bring-ai-powered-photo-editing-to-millions/); [Photoroom customer story](https://www.photoroom.com/customer-stories/depop)
- **Vestiaire Collective**: reported (13 Oct 2026) as the first luxury resale platform to standardise new listing photos with AI. Chief Product Officer Thomas Hezard is reported as saying the company tested several generative AI tools and dropped them because each altered item details; it then A/B-tested its in-house remover against Photoroom and chose Photoroom (background removal, shadows, relighting — no generative edits); 5% liquidity lift; authentication unaffected — [Retail Tech Innovation Hub](https://retailtechinnovationhub.com/home/2026/10/13/vestiaire-collective-becomes-first-luxury-resale-platform-to-standardise-new-listing-photos-with-ai)
- **Vinted**: only a Photoroom landing page for Vinted sellers was found (standalone workflow, not an official integration) — [Photoroom](https://www.photoroom.com/lp/background-remover/vinted). Vinted's catalogue rules are reported as requiring that item photos "have to be taken by you", and research documents AI-generated listings being used for dropshipping scams on Vinted — [Science Feedback](https://science.feedback.org/genai-powered-dropshipping-scams-vinted/)
- **Poshmark**: only third-party/vendor workflows found (remove background, pick a colour, download, upload) — no evidence of an embedded feature — [Photoroom](https://www.photoroom.com/lp/background-remover/poshmark)
- **eBay** (not on the list, but the clearest touch-up-tool evidence): sellers complained loudly when the in-app background tool lost its eraser/paintbrush, leaving no way to correct a bad automatic cutout; a separate thread is titled "Background photo eraser is garbage" — [Value Added Resource](https://www.valueaddedresource.net/ebay-sellers-lose-background-removal-in-app/); [eBay Community](https://community.ebay.com/t5/Selling/Background-photo-eraser-is-garbage/m-p/34683903)

**Wardrobe**
- **Indyx**: store listing says users add their own photos or ones saved from retailer sites and the app "automatically removes the background and optimizes image quality with AI"; also sells a professional cataloguing service — [AppFollow mirror of the App Store listing](https://apps.appfollow.io/ios/indyx-wardrobe-outfit-app/1599179405?country=sb)
- **Acloset**: removes backgrounds automatically on upload and auto-tags category and colour (per Indyx's comparison page — competitor source) — [Indyx: Acloset vs. Whering](https://myindyx.com/versus/acloset-vs-whering)
- **Whering**: Indyx's comparison page says Whering's automatic background removal and tagging "can be frustrating" and often gets things wrong (competitor source; the only cutout-quality complaint about a named wardrobe app I found) — [Indyx: Acloset vs. Whering](https://myindyx.com/versus/acloset-vs-whering)
- Good On You's week-long hands-on test of Whering, Indyx and Acloset found Indyx more manual (no automated category/colour fill, slow loading) while Acloset and Whering automate intake; Acloset is free to 100 items — it did not assess cutout quality — [Good On You](https://goodonyou.eco/wardrobe-organising-apps/)
- **Alta**: "Prettify" is marketed as turning a messy shot into "a brand new image that looks like it came straight from an online store" — i.e. generative re-rendering, not a cutout — [Alta blog](https://www.altadaily.com/blog/prettify). An Alta roundup describes it as upscaling clothing images "to either rendered or original product image" — [Alta blog](https://www.altadaily.com/blog/closet-apps-2026). An App Store reviewer praises pieces being "prettified to look like online shopping"; a Substack writer names the photo-upload experience as a key reason for choosing Alta — [Alta App Store listing](https://apps.apple.com/app/id6481705400); [Technocouture Substack](https://technocouture.substack.com/p/reflections-from-my-clueless-closet)
- **On-device option**: several general background-remover apps state they use Apple's on-device Vision subject lifting, which is available to any iOS app via VisionKit/Vision — [Apple WWDC23 session 10176](https://developer.apple.com/la/videos/play/wwdc2023/10176/)

### Inferences
- The resale pattern (remove background → flat/white backdrop → synthetic drop shadow → square crop at ~1280 px) is the nearest thing to an industry standard for user-shot garment photos, and both documented platforms bought it rather than built it; Vestiaire's own in-house remover lost the A/B.
- Vestiaire's rejection of generative tools is the strongest practitioner signal on faithfulness: a company whose business depends on the photo matching the item tested generative clean-up and walked away.
- The eBay episode suggests a manual erase/restore brush is expected by users whenever auto-cutout is the default; removing it produced more noise than the cutout errors themselves.
- Alta's "rendered or original" wording suggests it keeps the original photo alongside the generated one — a hedge worth copying if any generative step is ever used.

### Gaps
- **No App Store or Reddit review text** (r/femalefashionadvice, r/capsulewardrobe) about bad cutouts could be retrieved for any named app. Absence here reflects search/tool limits, not absence of complaints.
- Nothing found on **Stylebook, Cladwell, OpenWardrobe, Pronti, Fits, The RealReal**.
- Vendor behind Whering, Indyx, Acloset cutouts; on-device vs server for each; whether each offers an eraser/restore tool: not found.
- No independent test of Alta Prettify fidelity (invented details, neckline or colour changes) was found; no user complaints retrieved either way.
- Whether Depop's/Vestiaire's removal is applied automatically or is opt-in per photo: not confirmed.

## 4. Faithfulness risk: generative "extraction" vs segmentation/matting, and downstream contamination

### Takeaway
The research literature treats garment extraction from a worn photo ("virtual try-off") as an open generative-fidelity problem, with authors themselves reporting altered fit, lost textures and lost logos; a major reseller reports rejecting generative tools for exactly this. Segmentation/matting can only delete or keep real pixels. Separately, try-on research documents that leftover clothing/context in a reference image "ghosts" into generated output — direct support for the concern about feeding dirty cutouts to an image generator.

### Cited Findings
- Virtual Try-Off (TryOffDiff, arXiv Nov 2024, BMVC 2025) defines the task as generating a standardised garment image from a photo of a clothed person, and frames it as a test of generative fidelity because it needs precise reconstruction of shape, texture and pattern. The authors note generated garments "can appear tucked, untucked, or altered in fit, introducing plausible yet inconsistent results that obscure true garment fidelity", and that common metrics are unreliable for this (they suggest DISTS) — [arXiv 2411.18350](https://arxiv.org/abs/2411.18350v1)
- VTEdit-Bench compares specialised try-on models with general image editors and reports that universal editors' reliance on attention "can lead to the loss of fine textures or small logos on the clothing"; it scores with a "minimum rule" (failure on any one dimension caps the score) — [alphaXiv 2603.11734](https://www.alphaxiv.org/overview/2603.11734)
- A 2026 paper builds a learned assessor scoring garment consistency on seven separate dimensions because global realism metrics (FID) miss garment-level errors — [arXiv 2608.29804](https://arxiv.org/pdf/2608.29804)
- Seller-facing guides list the typical alterations: button placement, seam alignment, collar shapes and zipper positions shifted or wrong; hallucinated fabric details, patterns and material qualities; explanation offered is that the engine prioritises natural blending and "smooths over high-frequency details" (vendor blogs, not studies) — [Rewarx](https://www.rewarx.com/blogs/why-ai-fashion-models-dont-match-actual-products)
- Photoroom reports from its own benchmark that a product image must get three things right at once and "almost every AI image gets at least one wrong" (vendor; the three criteria were not retrieved) — [Photoroom](https://www.photoroom.com/inside-photoroom/nobody-returns-a-photo)
- Vestiaire Collective tested several generative AI tools and dropped them because each altered item details (Oct 2026) — [Retail Tech Innovation Hub](https://retailtechinnovationhub.com/home/2026/10/13/vestiaire-collective-becomes-first-luxury-resale-platform-to-standardise-new-listing-photos-with-ai)
- **Downstream contamination**: a NeurIPS 2025 try-on paper attributes "ghosting" to imprecise masks that leave residual clothing in the input, which the model then reproduces; its fix is background pre-replacement so the model stops confusing clothing with background — [NeurIPS 2025 slides](https://neurips.cc/media/neurips-2025/Slides/116013.pdf)
- DiffusionTrend reports garment-latent injection degrading background generation, and a sleeve-length mismatch causing the original model's arm/sleeve to be carried into the output — [arXiv 2412.14465](https://arxiv.org/pdf/2412.14465)
- RetriBooru addresses "leakage" of unintended content from reference images in subject-driven generation as a named problem — [arXiv 2312.02521](https://arxiv.org/pdf/2312.02521)

### Inferences
- The asymmetry is structural: a matting failure is *visible and local* (a missing strap, a halo, a bit of duvet) and the remaining pixels are true; a generative failure is *plausible and silent* (a V-neck becomes a crew neck) and the user may not notice until an outfit is styled around the wrong garment. For a wardrobe where the image is the record of what she owns, the first failure type is recoverable by fallback-to-crop, the second is not detectable automatically.
- The ghosting literature is about try-on models with explicit masks, not general multi-reference image generators; the mechanism (reference pixels that aren't the garment get treated as content) plausibly transfers, so leftover torso, second garments, hands or bedding in a cutout should be expected to show up in generated looks. This is inference — no source tested a general image model with dirty garment cutouts.
- A cleaner cutout therefore pays twice: on the wardrobe card and in generation quality. And a *plain crop fallback* is the worst input for generation even though it is the safest card image — the two uses may want different assets.

### Gaps
- No benchmark specifically counts hallucinated garment details in try-off/extraction outputs from general image-editing models; no measured rate for neckline/button/print/colour changes.
- No controlled study of dirty-vs-clean reference cutouts fed to current general image generators.

## 5. Post-processing practice and automatic bad-cutout detection

### Takeaway
Sourced material covers edge colour decontamination well and the resale output convention (square, ~1280 px, synthetic shadow) lightly; trimming, padding, formats, stored resolution and automatic failure detection are essentially undocumented in what I could retrieve and are given below as engineering inference, clearly marked.

### Cited Findings
- Colour decontamination replaces edge-pixel colours with nearby foreground colours, with controls for strength and reach into the soft edge; it removes background-colour fringing in hair and transparent areas — [Adobe After Effects matte effects](https://helpx.adobe.com/after-effects/using/matte-effects.html)
- The underlying method estimates a foreground colour for each border-region pixel from the original pixel colour, neighbouring foreground estimates and the alpha value — [US patent 8379972, Color decontamination for image compositing](https://patents.google.com/patent/US8379972)
- Halos appear when image colour and matte (old background) colour contrast strongly; premultiplied colour channels carry the old background into the edge and must be un-premultiplied/"remove colour matting" to lose the fringe — [Adobe After Effects matte effects](https://helpx.adobe.com/after-effects/using/matte-effects.html)
- Photoshop documents defringe / remove-matte operations for fringe pixels around a selection — [Adobe Photoshop help](https://helpx.adobe.com/photoshop/desktop/make-selections/refine-modify-selections/fringe-pixels-around-a-selection.html)
- White strokes on edges after background removal are a reported artefact in Figma's remover (title-level evidence) — [Figma forum](https://forum.figma.com/report-a-problem-6/remove-background-gives-strange-bad-result-it-leaves-a-small-white-strokes-on-edges-54810)
- Inspect on a non-white background: white hides pale halos and missing transparency — [Deep-Image](https://deep-image.ai/blog/ai-background-removal-complex-edges-hair-glass/)
- Output convention on resale: square 1:1, ideally 1280 × 1280 px, with an added drop shadow — [Photoroom Depop customer story](https://www.photoroom.com/customer-stories/depop)
- Learned no-reference matte scoring exists (MatAnyone 2's Matting Quality Evaluator scores semantic and boundary quality without ground truth) — [arXiv 2512.11782](https://arxiv.org/abs/2512.11782v1)
- VLM-in-the-loop checking of masks is an active pattern: GarmentSegAgent uses a VLM evaluator to accept or re-prompt a SAM 2.1 garment mask — [arXiv 2610.36506](https://arxiv.org/pdf/2610.36506)

### Inferences (engineering judgement, not sourced — treat as a starting checklist to validate in the bake-off)
- **Halo rule of thumb**: cutouts will sit on white cards, so dark-background photos (black duvet) produce dark fringes that white will expose, and white-background product shots produce light fringes that are invisible on white but ugly on any tinted surface. Decontaminate regardless, and review on both white and a mid-grey.
- **Trim and pad**: crop to the bounding box of alpha above a small threshold (not alpha > 0, which keeps matting noise), then pad by a fixed percentage so cards look consistent across garments.
- **Format**: an alpha-capable lossy format (WebP, AVIF) is much smaller than PNG for photographic cutouts; verify straight vs premultiplied alpha handling in whatever encoder/CDN transform is used, since that is where fringes get reintroduced.
- **Candidate automatic failure signals** for falling back to the plain crop: mask area as a fraction of the frame (near 0 = garment dropped; near 1 = nothing removed); mask area vs. its bounding box and vs. a detector's garment box; number and size of connected components (many small islands = background leftovers; garment split in two = a missing middle); mask touching several image borders; share of pixels with mid-range alpha (large soft regions on an opaque garment = model uncertainty, but expected on sheer/fur); skin-tone pixel share inside the mask (body left in); disagreement between two different models' masks (low IoU = at least one is wrong). None of these thresholds is published for clothing; they need calibrating on the test set.
- A second cheap gate is a VLM yes/no check ("is exactly one garment shown, with no person, hanger or background?") — gross failures are where VLM judges are most reliable (section 6).

### Gaps
- No source found for: typical stored resolution in wardrobe apps, trim/pad conventions, WebP vs AVIF vs PNG practice for alpha cutouts, or any published automatic cutout-failure detector with thresholds.
- How Photoroom/remove.bg APIs handle decontamination and whether it is on by default: not retrieved.

## 6. A cheap evaluation method; is a vision-LLM judge reliable?

### Takeaway
The only validated public method for ranking cutout models is blind human pairwise voting aggregated by Elo (Photoroom's arena). No source validates a vision-LLM as a judge of cutout quality; adjacent evidence says VLM–human agreement is decent when differences are obvious and degrades when they are subtle — so use a VLM to triage gross failures and humans to pick the winner.

### Cited Findings
- Photoroom's arena method: two anonymised outputs for the same image, voter picks the better or declares a draw, Elo aggregates; ~9,000 votes in the first public round — [Photoroom](https://www.photoroom.com/inside-photoroom/background-remover-benchmark)
- A raw pairwise-vote dataset from that arena (including clothing images) is public — [Hugging Face bgsys/votes_datasets_test2](https://huggingface.co/datasets/bgsys/votes_datasets_test2/viewer/default/train?p=141)
- Human–VLM agreement on perceptual judgements "increased with perceptual separability" — VLMs are more reliable when the difference between stimuli is clear (2026) — [arXiv 2603.24578](https://arxiv.org/abs/2603.24578)
- In pairwise comparison of generated images over six quality attributes, the relationships between attributes are much weaker for multimodal LLMs than for humans, and humans outperform LLMs on anatomy validity — [arXiv 2509.12750](https://arxiv.org/html/2509.12750v1)
- ImgEdit's VLM judge reaches "almost 70%" agreement with humans within a one-point tolerance on image-editing scores — a different task, and a loose agreement criterion — [arXiv 2505.20275](https://arxiv.org/pdf/2505.20275)
- VTEdit-Bench's "minimum rule" (overall score = worst dimension) is a scoring design suited to cutouts, where one missing sleeve outweighs perfect edges elsewhere — [alphaXiv 2603.11734](https://www.alphaxiv.org/overview/2603.11734)
- TryOffDiff's authors caution that standard full-reference metrics are unreliable for garment images — [arXiv 2411.18350](https://arxiv.org/abs/2411.18350v1)

### Inferences (proposed bake-off design — not sourced)
- **Set size**: no source gives a number. A stratified set built from the eleven hard cases is more informative than a random sample: roughly 6–10 of the team's own photos per case (about 80–100 images), plus 20–30 "easy" ones to check nobody regresses on the common case. With 4–6 candidates this is a few hundred outputs — small enough to view all of them.
- **What to score**, per image per model: (1) blind pairwise preference on the white card at real card size *and* at zoom on mid-grey; (2) categorical failure tags — missing part, leftover background, leftover body/hanger, halo/fringe, lost transparency, wrong object; (3) "usable as-is / usable with fallback / unusable" (the product-relevant metric — the rate of unusable cutouts matters more than mean beauty); (4) latency and cost per image. Apply the minimum rule: any missing-part tag fails the image.
- **Two-stage judging**: let a VLM tag gross failures (cheap, high separability, likely reliable) and reserve the humans' time for pairwise choice between the two or three models that survive. Before trusting the VLM, measure its agreement against human tags on ~50 of the team's own images; nothing published does this for cutouts.
- **Give the VLM the original alongside the cutout composited on a contrasting colour**, and ask specific closed questions (is any part of the garment missing? is anything that is not the garment present?) rather than a 1–10 score; scalar scores are where the cited agreement numbers are weakest.
- Report results per hard case, not as one average: the likely outcome is that no single model wins every row, and the decision is really about routing (e.g. matting model by default, promptable model when a person is detected, crop fallback when the gates fire).

### Gaps
- No published guidance on sample size for a cutout bake-off; no study validating a prompted vision-LLM as a judge of matting/background-removal quality against human pairwise votes.
- No published inter-rater agreement figures for human cutout judgements on clothing.
