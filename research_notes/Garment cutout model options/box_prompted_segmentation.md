# Box-prompted segmentation for cutting out individual clothing pieces (as of 21 Nov 2026)

Reading notes for the writer:
- **Access limits in this research session.** `ai.google.dev`, `discuss.ai.google.dev`, `developers.googleblog.com`, `simonwillison.net`, `fal.ai`, `huggingface.co`, `arxiv.org`, `replicate.com` and `roboflow.com` could not be opened directly (outside the session's network allowlist). Facts from those hosts below come from **search-result extracts** and are marked "(search extract)". Facts marked "(read directly)" were read from the file itself on `raw.githubusercontent.com` on 21 Nov 2026.
- Every price is a point-in-time reading on 21 Nov 2026; the host it was read from is in the link.
- Nothing here was benchmarked. No model was run on garment photos.

---

## 1. Meta's SAM family: licence, box prompts, sizes, latency, edge quality

### Takeaway
SAM (2023), SAM 2 / 2.1 and EdgeTAM are Apache-2.0 (code and weights) and take a box prompt natively; SAM 3 (Nov 2025) and SAM 3.1 (27 Mar 2026) are under Meta's custom "SAM License", which grants royalty-free use, modification and distribution with no user cap but with military/nuclear/espionage/ITAR/sanctions restrictions and a clause letting Meta modify the terms. No SAM 4 was found. All of them output binary masks decoded at low resolution, so coarse edges on thin or intricate structures are a documented, family-wide weakness.

### Cited Findings

**Licences**
- SAM (2023) repo LICENSE is Apache License 2.0 (read directly). — [facebookresearch/segment-anything LICENSE](https://raw.githubusercontent.com/facebookresearch/segment-anything/main/LICENSE)
- SAM 2 / SAM 2.1: "SAM 2 model checkpoints, SAM 2 demo code (front-end and back-end), and SAM 2 training code are licensed under Apache 2.0"; the demo's fonts are SIL OFL 1.1 and a GPU connected-components routine is adapted from `cc_torch` under its own licence file (read directly). — [facebookresearch/sam2 README](https://raw.githubusercontent.com/facebookresearch/sam2/main/README.md)
- SAM 3 / SAM 3.1: "This project is licensed under the SAM License" (read directly). — [facebookresearch/sam3 README](https://raw.githubusercontent.com/facebookresearch/sam3/main/README.md)
- SAM License text (titled "SAM License", "Last Updated: November 19, 2025"), read directly:
  - Grant: "a non-exclusive, worldwide, non-transferable and royalty-free limited license" "to use, reproduce, distribute, copy, create derivative works of, and make modifications to the SAM Materials."
  - The text does not use the word "commercial"; it neither restricts use to research nor names commercial use. No user or revenue cap is stated.
  - Prohibited uses: "military or warfare purposes, nuclear industries or applications, espionage", "any activities subject to the International Traffic in Arms Regulations (ITAR)"; the licensee must not be a target of trade controls; no reverse engineering/decompiling.
  - Redistribution: "you shall provide a copy of this Agreement with any such SAM Materials"; research publications must acknowledge use.
  - Change of terms: "Meta may modify this Agreement from time to time; provided that they are similar in spirit to the current version"; continued use is acceptance.
  — [facebookresearch/sam3 LICENSE](https://raw.githubusercontent.com/facebookresearch/sam3/main/LICENSE)
- Roboflow's licence summary reads the SAM License as allowing commercial use, royalty-free, not Apache-2.0 (search extract; a secondary reading, not legal advice). — [Roboflow model licences: SAM 3](https://roboflow.com/model-licenses/segment-anything-3)
- SAM 3 and SAM 3.1 weights are gated on Hugging Face: access must be requested and a token used to download (read directly). — [facebookresearch/sam3 README](https://raw.githubusercontent.com/facebookresearch/sam3/main/README.md)

**Versions and what is newest**
- SAM 2 checkpoints released 29 Jul 2024; SAM 2.1 checkpoints 29/30 Sep 2024 (the README gives both dates) (read directly). — [facebookresearch/sam2 README](https://raw.githubusercontent.com/facebookresearch/sam2/main/README.md)
- SAM 3: 848M parameters, a DETR-based detector plus a SAM 2-style tracker sharing one vision encoder; accepts "text or visual prompts such as points, boxes, and masks" (read directly). — [facebookresearch/sam3 README](https://raw.githubusercontent.com/facebookresearch/sam3/main/README.md)
- SAM 3.1 released 27 Mar 2026. It adds "Object Multiplex" for multi-object **video** tracking (~7x speedup at 128 objects on one H100) and new checkpoints; the release notes describe video gains, not an image-mask quality change (read directly). — [sam3 RELEASE_SAM3p1.md](https://raw.githubusercontent.com/facebookresearch/sam3/main/RELEASE_SAM3p1.md)
- Ultralytics' docs state that in SAM 3.1 "the image detector and the interactive point-prompt head keep the SAM 3 architecture" (read directly). — [Ultralytics SAM 3 docs source](https://raw.githubusercontent.com/ultralytics/ultralytics/main/docs/en/models/sam-3.md)
- A search for "SAM 4" in Nov 2026 returned nothing: no successor beyond SAM 3.1 was found. — [Meta SAM 3 blog](https://ai.meta.com/blog/segment-anything-model-3/), [Gigazine on SAM 3.1](https://gigazine.net/gsc_news/en/20260331-meta-releasing-sam-3-1)

**Box-prompt behaviour (important distinction in SAM 3)**
- SAM 3 has two modes. "Concept segmentation (PCS)": text or *image exemplars* (a box used as an example) returns **all instances matching the concept**. "Visual segmentation (PVS)": points, boxes, masks return a **single object instance (SAM 2 style)**. A box passed to the exemplar path finds "all similar instances", which is not what a per-garment cutout wants; the PVS path "will segment only the specific object at that location, just like SAM 2" (read directly). — [Ultralytics SAM 3 docs source](https://raw.githubusercontent.com/ultralytics/ultralytics/main/docs/en/models/sam-3.md)
- EdgeTAM "has all the capabilities of SAM on static images" via a `SAM2ImagePredictor` with the same interface (read directly). — [facebookresearch/EdgeTAM README](https://raw.githubusercontent.com/facebookresearch/EdgeTAM/main/README.md)

**Sizes and speed**
- SAM 2.1 checkpoints (A100, torch 2.5.1): tiny 38.9M params / 91.2 FPS; small 46M / 84.8 FPS; base_plus 80.8M / 64.1 FPS; large 224.4M / 39.5 FPS. These FPS figures are for video frames (read directly). — [facebookresearch/sam2 README](https://raw.githubusercontent.com/facebookresearch/sam2/main/README.md)
- SAM 3: "30 ms per image with 100+ detected objects" on an H200 GPU (Meta's figure, relayed; read directly from Ultralytics docs). — [Ultralytics SAM 3 docs source](https://raw.githubusercontent.com/ultralytics/ultralytics/main/docs/en/models/sam-3.md)
- SAM 3 requires Python 3.12+, PyTorch 2.7+, and a CUDA 12.6+ GPU (read directly). — [facebookresearch/sam3 README](https://raw.githubusercontent.com/facebookresearch/sam3/main/README.md)
- Original SAM ViT-H image encoder is ~611–632M parameters (MobileSAM's README gives both numbers) (read directly). — [MobileSAM README](https://raw.githubusercontent.com/ChaoningZhang/MobileSAM/master/README.md)

**Edge quality**
- HQ-SAM authors: "SAM's mask prediction quality falls short in many cases, particularly when dealing with objects that have intricate structures" (read directly). — [SysCV/sam-hq README](https://raw.githubusercontent.com/SysCV/sam-hq/main/README.md)
- A SAM 2 refinement paper says the final mask is "directly interpolated from the output prediction of its mask decoder, with a resolution of 256 × 256", and that interpolation "may inevitably damage the details" (search extract). — [Towards Fine-grained Interactive Segmentation in Images and Videos (arXiv 2502.09660)](https://arxiv.org/pdf/2502.09660)
- ZIM authors: SAM "falls short in generating fine-grained precise masks"; SAM's pixel decoder works at stride 4 and is "susceptible to checkerboard artifacts" (README read directly; stride detail is a search extract of the paper). — [naver-ai/ZIM README](https://raw.githubusercontent.com/naver-ai/ZIM/main/README.md), [ZIM paper (arXiv 2411.00626)](https://arxiv.org/html/2411.00626)
- An edge-guided SAM paper: SAM "suffers from coarse mask boundaries, often even neglecting the segmentation of thin object structures" (search extract). — [An Edge-Guided SAM for effective complex object segmentation](https://www.sciencedirect.com/science/article/abs/pii/S0957417425001824)
- For SAM 3 specifically, a 2026 paper says "native SAM3 masks often fail to preserve fine crack structures reliably" (search extract; cracks, not fabric). — [Semantic-Edge Response Decoding of SAM3 (arXiv 2607.12292)](https://arxiv.org/html/2607.12292v1)
- Matting Anything's authors note their module "effectively addresses some of the holes present in the mask predictions generated by SAM" (read directly). — [SHI-Labs/Matting-Anything README](https://raw.githubusercontent.com/SHI-Labs/Matting-Anything/main/README.md)

### Inferences
- For "one existing box in, one garment mask out", the relevant SAM 3 path is the SAM 2-style visual-prompt (PVS) head. SAM 3's headline feature (text/concept prompts) duplicates the detection the app already pays Gemini for; its box-as-exemplar mode would return every similar garment, which is the wrong behaviour.
- Since SAM 3.1's changes are about video tracking throughput, there is no documented reason to expect better still-image garment edges from 3.1 than from 3.
- Licence-wise SAM 2.1 (Apache-2.0, ungated) is the lowest-friction SAM-class model for a commercial consumer app; SAM 3/3.1 is usable for a fashion app on the licence's face, but the terms are Meta-specific and modifiable, and the weights are gated. When SAM 3 is consumed through a hosted API the licence burden sits mostly with the host, but that is an inference, not something a source states.
- All SAM-family outputs are hard binary masks; a soft alpha edge (knit fuzz, fringe, lace, sheer fabric) needs a second refinement step (section 2 and 5).

### Gaps
- No quantitative edge-quality benchmark (boundary IoU or matting error) on **clothing** was found for SAM 2.1 vs SAM 3 vs SAM 3.1.
- Meta's paper-level single-image, single-box latency for SAM 3 on commodity GPUs (T4/L4/A10) was not found; only the H200 figure.
- Whether SAM 3's PVS box head produces better masks than SAM 2.1-large on still images was not confirmed from a primary table (the arXiv paper could not be opened).
- The SAM License's fit for a specific commercial product is a legal question; only the text and one vendor summary were read.

---

## 2. Higher-quality or lighter variants and SAM-based matting

### Takeaway
The permissively licensed options are HQ-SAM / HQ-SAM 2 (Apache-2.0, small measured gains on fine structure), MobileSAM, EfficientSAM, EfficientViT-SAM and EdgeTAM (all Apache-2.0); FastSAM is AGPL-3.0 and ZIM, the most directly relevant "SAM that outputs a matte" model, is CC BY-NC 4.0 (non-commercial). Matting add-ons (Matte Anything, Matting Anything, ViTMatte) are MIT-licensed code and are what actually turn a binary SAM mask into a soft edge.

### Cited Findings

| Model | Licence (where read) | Box prompt | Size / speed | Edge note |
|---|---|---|---|---|
| HQ-SAM (2023) | Apache-2.0 (LICENSE read directly) | Yes, evaluated box-prompted | adds minimal params to SAM; Light HQ-SAM (TinyViT) 40.3 MB params, 41.2 FPS, 3.7 GB | Adds an HQ output token fused with early+final ViT features; trained on 44K fine-grained masks |
| HQ-SAM 2 (17 Nov 2024, "beta") | Apache-2.0 (README read directly) | Yes | 224.7M (vs 224.4M SAM 2.1-L), FPS "on par" | COCO box-prompted AP 50.9 vs 50.0 (SAM 2.1-L); second column 50.4 vs 48.3 |
| MobileSAM | Apache-2.0 (search extract of repo) | Yes (same pipeline as SAM) | 5M-param TinyViT encoder; ~12 ms/image on GPU (8 ms encoder + 4 ms decoder); ~3 s on a Mac i5 CPU | "On par ... (at least visually)" per authors; no edge fix |
| EfficientSAM | Apache-2.0 (LICENSE read directly) | Yes | not captured | no edge fix |
| EfficientViT-SAM | Apache-2.0 (repo LICENSE read directly) | Yes, box-prompted eval documented | L0 34.8M → XL1 203.3M; A100 TensorRT fp16 throughput 762 → 182 images/s | no edge fix |
| FastSAM | AGPL-3.0 (LICENSE read directly) | Yes, but selects among YOLO-seg masks: "A box that overlaps no detected mask selects nothing" | CNN, fast | not a true promptable decoder |
| EdgeTAM | Apache-2.0 code and checkpoints (README read directly) | Yes (SAM-style image predictor) | 16 FPS video on iPhone 15 Pro Max; 40.4 FPS in the SA image task; "22x faster than SAM 2" | 1-click mIoU 55.5 vs 61.9 for SAM 2.1 on SA-23 (lower accuracy) |
| ZIM (Zero-shot Image Matting) | CC BY-NC 4.0 (LICENSE read directly) | Yes (`bbox` prompt), ONNX provided | not captured | Outputs a matte, built for "fine-grained precise masks" |
| Matte Anything | MIT (README badge) | Point/box/text via SAM + GroundingDINO | SAM ViT-H + ViTMatte ViT-B + GroundingDINO-T | SAM mask → auto trimap → ViTMatte alpha |
| Matting Anything (MAM) | MIT (README badge) | Box, point or text | SAM + 2.7M-param Mask-to-Matte module | Alpha matte from SAM features; fills some SAM holes |
| ViTMatte | MIT (LICENSE read directly) | needs a trimap | — | trimap-based matting backbone |

Sources for the table:
- HQ-SAM: design, 44K-mask training set, Light HQ-SAM numbers (AP 45.0 vs MobileSAM 44.3; 41.2 vs 44.8 FPS), ONNX decoder export. — [SysCV/sam-hq README](https://raw.githubusercontent.com/SysCV/sam-hq/main/README.md), [SysCV/sam-hq LICENSE](https://raw.githubusercontent.com/SysCV/sam-hq/main/LICENSE)
- HQ-SAM 2: beta status, numbers, licence sentence "The HQ-SAM 2, SAM 2 model checkpoints ... are licensed under Apache 2.0". — [sam-hq2 README](https://raw.githubusercontent.com/SysCV/sam-hq/main/sam-hq2/README.md)
- MobileSAM figures. — [MobileSAM README](https://raw.githubusercontent.com/ChaoningZhang/MobileSAM/master/README.md); licence — [MobileSAM LICENSE](https://github.com/ChaoningZhang/MobileSAM/blob/master/LICENSE)
- EfficientSAM. — [yformer/EfficientSAM LICENSE](https://raw.githubusercontent.com/yformer/EfficientSAM/main/LICENSE)
- EfficientViT-SAM table (Jetson Orin 8.2–37.2 ms; A100 throughput; COCO mAP 45.7–47.8 with ViTDet boxes). — [efficientvit_sam README](https://raw.githubusercontent.com/mit-han-lab/efficientvit/master/applications/efficientvit_sam/README.md), [efficientvit LICENSE](https://raw.githubusercontent.com/mit-han-lab/efficientvit/master/LICENSE)
- FastSAM AGPL-3.0. — [CASIA-IVA-Lab/FastSAM LICENSE](https://raw.githubusercontent.com/CASIA-IVA-Lab/FastSAM/main/LICENSE); box-prompt behaviour — [Ultralytics FastSAM docs source](https://raw.githubusercontent.com/ultralytics/ultralytics/main/docs/en/models/fast-sam.md)
- EdgeTAM. — [facebookresearch/EdgeTAM README](https://raw.githubusercontent.com/facebookresearch/EdgeTAM/main/README.md)
- ZIM. — [naver-ai/ZIM README](https://raw.githubusercontent.com/naver-ai/ZIM/main/README.md), [naver-ai/ZIM LICENSE](https://raw.githubusercontent.com/naver-ai/ZIM/main/LICENSE)
- Matte Anything. — [hustvl/Matte-Anything README](https://raw.githubusercontent.com/hustvl/Matte-Anything/main/README.md)
- Matting Anything. — [SHI-Labs/Matting-Anything README](https://raw.githubusercontent.com/SHI-Labs/Matting-Anything/main/README.md)
- ViTMatte. — [hustvl/ViTMatte LICENSE](https://raw.githubusercontent.com/hustvl/ViTMatte/main/LICENSE)

Other findings
- A later paper reports HQ-SAM "performs unsatisfactorily in objects with hollow and slender structures, exhibiting numerous false positives" (search extract). — [Promoting SAM towards Highly Accurate Dichotomous Image Segmentation (arXiv 2401.00248)](https://arxiv.org/pdf/2401.00248)
- EdgeSAM (a different project from EdgeTAM) is under the non-standard NTU S-Lab License 1.0 (search extract). — [chongzhou96/EdgeSAM](https://github.com/chongzhou96/EdgeSAM)
- An "EfficientSAM3" community distillation of SAM 3 exists, described as Apache-2.0 (search extract; its relationship to the SAM License on the teacher weights was not checked). — [SimonZeng7108/efficientsam3](https://github.com/SimonZeng7108/efficientsam3)
- BiRefNet (the salient-object cutout model, for comparison) is MIT; standard model runs at 17 FPS at 1024x1024 with 3.45 GB GPU memory on an RTX 4090 in FP16; matting and 2K/HR variants exist; the README links a "Box Guided Segmentation" notebook (read directly). — [ZhengPeng7/BiRefNet README](https://raw.githubusercontent.com/ZhengPeng7/BiRefNet/main/README.md)

### Inferences
- HQ-SAM 2's measured gain over SAM 2.1-large is about one AP point on COCO boxes: a real but modest improvement, and still a binary mask. It does not by itself deliver soft fabric edges.
- The light variants (MobileSAM, EfficientSAM, EfficientViT-SAM, EdgeTAM) trade accuracy for speed and none claims better boundaries; they matter for on-device/browser use (section 6), not for edge quality.
- FastSAM is the wrong fit twice over: AGPL-3.0, and its box "prompt" only picks from masks its own detector already produced.
- ZIM is the closest thing to "box in, alpha matte out" in one model, but its CC BY-NC licence rules it out for a commercial app unless Naver licenses it separately.
- Matte Anything / Matting Anything code is MIT, but each depends on other weights (SAM ViT-H Apache-2.0, GroundingDINO, ViTMatte); the licences of the *trained matting checkpoints* and their training data were not verified.

### Gaps
- No source measured any of these on fine fabric (knitwear fuzz, lace, fringe, sheer). "Fixes edges on fine fabric" is unproven for all of them.
- EfficientSAM size/latency figures were not captured.
- Training-data licence status of ViTMatte / MAM checkpoints (matting datasets often carry non-commercial terms) was not checked.
- Hosted availability and price of HQ-SAM 2 and of SAM+ViTMatte pipelines were not found.

---

## 3. Hosted prices and latency per call; several boxes in one call

### Takeaway
Hosted SAM 3 is priced per request, not per mask, at roughly $0.0025–$0.005 per image across Meta's own API, fal.ai, WaveSpeed and Sogni, and Roboflow's serverless rate works out lower still; fal's schema accepts several boxes per request. Replicate's `meta/sam-2` is an order of magnitude slower and dearer per run. Latency figures for hosted box-prompt calls were not published in anything that could be read.

### Cited Findings
- **fal.ai `fal-ai/sam-3/image`**: "$0.005 per request" (200 per $1); prompt types listed as text, point, box, mask (search extract of fal's page). — [fal.ai sam-3/image](https://fal.ai/models/fal-ai/sam-3/image)
- **fal.ai `fal-ai/sam-3/image/embed`** (embedding-only endpoint): "$0.005 per request" (search extract). — [fal.ai sam-3/image/embed](https://fal.ai/models/fal-ai/sam-3/image/embed)
- **fal.ai SAM 3.1**: `fal-ai/sam-3-1/image` shown at $0.05 per request and `fal-ai/sam-3-1/image-rle` at $0.01 per request (search extract; the 10x gap over SAM 3 looks odd and should be re-read on the live page). — [fal.ai sam-3-1/image](https://fal.ai/models/fal-ai/sam-3-1/image), [fal.ai sam-3-1/image-rle](https://fal.ai/models/fal-ai/sam-3-1/image-rle/llms.txt)
- fal SAM 3 schema, as mirrored by a third party: `box_prompts` take (x_min, y_min, x_max, y_max); "Multiple boxes supported - use object_id to group boxes for the same object or leave empty for separate objects"; `return_multiple_masks` with `max_masks` (default 3, range 1–32) (search extract of a mirror, not fal's own docs). — [sandbase.ai SAM 3 image docs](https://www.sandbase.ai/model/meta/sam-3/image/docs)
- fal bills per request or per compute-second depending on model, and does not charge for requests failing with HTTP 5xx (search extract). — [fal.ai pricing docs](https://fal.ai/docs/documentation/model-apis/pricing)
- **Meta Model API, SAM 3.1**: $2.50 per 1,000 images ($0.0025/image), $0.20 per 1,000 video frames (search extract of Meta's developer page). — [dev.meta.ai SAM 3.1](https://dev.meta.ai/models/sam-3-1)
- **WaveSpeed SAM3 image**: $0.005 per run (search extract). — [wavespeed.ai sam3-image](https://wavespeed.ai/models/wavespeed-ai/sam3-image)
- **Sogni SAM 3**: $0.005 per request "regardless of source image size" (search extract). — [sogni.ai SAM 3](https://www.sogni.ai/models/sam-3)
- **302.AI** older SAM mask endpoint: $0.01 per call (search extract). — [302.ai SAM](https://302.ai/product/detail/302ai-sam)
- **Replicate `meta/sam-2`**: about $0.026 per run (38 runs per $1) with predictions "typically complete within 27 seconds" on one cached page; a mirror shows $0.016 per run and 17 seconds; an aggregator shows $0.015 per run on an A40. Replicate bills by GPU time, so these are averages, and the cached pages may be stale (search extract). — [replicate.com/meta/sam-2](https://replicate.com/meta/sam-2)
- **Roboflow serverless**: SAM 3 billed at 0.0005 credits per image ("2,000 images per credit"), or 0.4 credits per hour (search extract). — [Roboflow serverless pricing docs](https://docs.roboflow.com/deployment/roboflow-cloud/serverless-api/pricing)
- Roboflow credit prices: prepaid packs from $3.90 down to $2.86 per credit on the pricing page; third-party trackers say $4 prepaid and $6 on-demand (search extract; possibly stale). — [roboflow.com/pricing](https://roboflow.com/pricing), [usagepricing.com Roboflow](https://www.usagepricing.com/blueprint/roboflow)
- A Roboflow forum thread exists about SAM 3 credit usage "for each click interaction" (title only; content not read). — [Roboflow forum](https://discuss.roboflow.com/t/sam3-credit-usage-for-each-click-interaction/12131)
- Open-source design that makes multi-box cheap: Ultralytics shows SAM 3 features computed once and reused for several prompts (`predictor2.inference_features(predictor.features, ..., bboxes=[...])`), and a list of boxes passed in one predict call (read directly). — [Ultralytics SAM 3 docs source](https://raw.githubusercontent.com/ultralytics/ultralytics/main/docs/en/models/sam-3.md)

### Inferences
- If fal's `box_prompts` list works as the mirrored schema says, an image with N garment boxes is one request at $0.005, i.e. the cost is per photo, not per piece. This is an inference from "per request" pricing plus the multi-box schema; no source states it outright, and it needs a live test.
- Roboflow arithmetic (inference): 0.0005 credits x $2.86–$6 per credit is about $0.0014–$0.003 per image for SAM 3.
- At these prices the segmentation step is around half a cent per uploaded photo or less; price is unlikely to be the deciding factor between hosts. Latency, cold starts, mask output format (PNG vs RLE) and edge quality will be.
- Replicate's `meta/sam-2` timing (17–27 s) suggests it runs automatic mask generation over the whole image rather than a single box prompt; that would make it the wrong endpoint for this use. Not verified.

### Gaps
- **Latency**: no hosted provider's published latency for a single box-prompted SAM 2/SAM 3 image call was found. Needs measuring.
- `fal-ai/sam2/image` price was not found.
- Whether Replicate's `meta/sam-2` accepts a box prompt at all, and any Replicate SAM 3 model and its price: not found.
- Hugging Face Inference (Providers/Endpoints), Google Vertex AI Model Garden, AWS SageMaker JumpStart and Segmind: no SAM pricing found in this session. For Vertex/SageMaker the cost would be instance-hours of a dedicated endpoint rather than per-call, but that was not confirmed from a source.
- fal's own API page (not the mirror) for `box_prompts` / `object_id` semantics could not be opened.
- Whether fal's SAM 3 box prompt runs the single-instance PVS head or the exemplar path (all similar instances) is not documented in anything read. This matters (section 1).

---

## 4. Gemini's own segmentation masks

### Takeaway
Gemini 2.5 Flash can return, in the same call as `box_2d`, a small base64 PNG probability mask per object, but this is a rough, intermittently malformed output rather than a clean cutout source, and its future is poor: Google's Gemini 3 guide says pixel-level masks are not supported in Gemini 3 Pro/Flash, current docs describe newer models returning a *polygon contour* instead, and secondary reports say Gemini 2.5 Flash is deprecated with a 1 December 2026 shutdown/reroute. The zero-extra-vendor route is therefore not a dependable basis for garment cutouts.

### Cited Findings

**How it works on Gemini 2.5**
- Each item has `box_2d` as `[ymin, xmin, ymax, xmax]` normalised to 0–1000, a `label`, and a `mask` that is "the segmentation mask inside the bounding box, as base64 encoded png" (search extract). — [Gemini API image understanding docs](https://ai.google.dev/gemini-api/docs/image-understanding), [Gemini by Example: image segmentation](https://geminibyexample.com/008-image-segmentation/)
- Decoding: base64-decode the string and load as PNG; it is "a probability map with values between 0 and 255"; resize it to the box size, binarise at 127, then pad into the full image (search extract of a 2025 community write-up). — [Exploring Image Segmentation with Gemini 2.5 models (mikeesto.com)](https://mikeesto.com/posts/image-segmentation-gemini-25/)
- The mask string is expected to start with a `data:image/png;base64` prefix (search extract). — [Simon Willison, Image segmentation using Gemini 2.5 (18 Apr 2025)](https://simonwillison.net/2025/Apr/18/gemini-image-segmentation/)
- Google's guidance for this feature: use `gemini-2.5-flash`, disable thinking (`thinkingBudget=0`), request JSON output (search extract). — [Google Developers Blog: Conversational image segmentation with Gemini 2.5](https://developers.googleblog.com/en/conversational-image-segmentation-gemini-2-5/)

**Reliability problems**
- Typical failures listed in a tutorial: missing `data:image/png;base64` prefix, explanatory text around the JSON, or an empty array; it recommends schema validation of every response (search extract). — [Tencent Cloud developer article](https://cloud.tencent.com/developer/article/2557169)
- A Google AI forum thread ("Image Understanding and Segmentation Mask Support") reports that mask behaviour "is inconsistent across model versions": one model returned unusable mask strings/tokens, a newer one returned a polygon of coordinates, neither matching the documented base64 PNG probability map (search extract). — [Google AI Developers Forum thread 146559](https://discuss.ai.google.dev/t/image-understanding-and-segmentation-mask-support/146559)

**Gemini 3.x and later**
- Gemini 3 developer guide: image segmentation "(returning pixel-level masks for objects) [is] not supported in Gemini 3 Pro or Gemini 3 Flash"; "for workloads requiring built-in image segmentation, we recommend continuing to use Gemini 2.5 Flash with thinking turned off" (search extract). — [Gemini 3 developer guide](https://ai.google.dev/gemini-api/docs/gemini-3)
- A reply in the forum thread repeats this ("Image segmentation is not supported in Gemini 3.x") and names Gemini 2.5 Flash with thinking off, or Gemini Robotics-ER 1.6, as the alternatives (search extract). — [Google AI Developers Forum thread 146559](https://discuss.ai.google.dev/t/image-understanding-and-segmentation-mask-support/146559)
- The current image-understanding docs page (examples use `gemini-3.5-flash` / `gemini-3.8-flash` depending on the cached copy) describes the mask as "a polygon of [x,y] coordinates, normalized to 0-1000", i.e. a contour, not a pixel mask (search extract; model names could not be verified by opening the page). — [Gemini API image understanding docs](https://ai.google.dev/gemini-api/docs/image-understanding), [Interactions API image understanding (md)](https://ai.google.dev/gemini-api/docs/interactions/image-understanding.md.txt)
- **Conflict.** Google's cookbook notebook, read directly on 21 Nov 2026, says the opposite direction for the newest generation: its default model is `gemini-4-hydrogen` "for fast 2D bounding boxes and object detection", and "If you need pixel-level segmentation masks, switch the selector below to a Gemini 3 model such as `gemini-3.8-flash`". Its model selector lists `gemini-4-carbon`, `gemini-4-argon`, `gemini-4-hydrogen`, `gemini-3.1-pro-preview`, `gemini-3.8-flash`, `gemini-3.7-flash`, `gemini-3.6-flash`, `gemini-3.5-flash-lite`, `gemini-2.5-pro` (no `gemini-2.5-flash`). This reads as: Gemini 4 models do not return masks, later Gemini 3.x Flash models do return some mask form (the docs suggest a polygon), contradicting the earlier "not supported in Gemini 3" statement, which was written about Gemini 3 Pro / 3 Flash. — [google-gemini/cookbook Spatial_understanding.ipynb](https://raw.githubusercontent.com/google-gemini/cookbook/main/quickstarts/Spatial_understanding.ipynb)
- The same notebook's system instruction for detection is "Return bounding boxes as a JSON array with labels. Never return masks or code fencing. Limit to 25 objects", and a keyword scan of the notebook found no segmentation-mask code cell remaining, only the sentence above (read directly). — [google-gemini/cookbook Spatial_understanding.ipynb](https://raw.githubusercontent.com/google-gemini/cookbook/main/quickstarts/Spatial_understanding.ipynb)

**Thinking**
- For Gemini 2.5 Flash masks, Google recommends thinking off (see above). — [Google Developers Blog](https://developers.googleblog.com/en/conversational-image-segmentation-gemini-2-5/)
- On Gemini 4 models "thinking cannot be disabled"; the notebook suggests setting thinking to "low", and notes thinking config is "not yet available in the Interactions API" (read directly). — [google-gemini/cookbook Spatial_understanding.ipynb](https://raw.githubusercontent.com/google-gemini/cookbook/main/quickstarts/Spatial_understanding.ipynb)

**Model lifecycle (bears directly on this option)**
- Secondary reports say the Gemini API deprecated Gemini 2.5 Pro and 2.5 Flash on 2 Nov 2026 and will shut them down on 1 Dec 2026, rerouting requests (headline: "reroute to 3.8 Flash and 3.5 Flash-Lite"); Vertex AI is reported to have retired 2.5 Flash on 20 Oct 2026. Google's own deprecations page was not read; dates conflict across sources (16 Oct, 20 Oct, 1 Dec) (search extract, secondary). — [datastudios.org](https://www.datastudios.org/post/gemini-api-reroutes-gemini-2-5-pro-2-5-flash-december-1-3-8-flash-3-5-flash-lite), [neomanex.com](https://neomanex.com/news/gemini-2-5-pro-flash-deprecated-auto-route-dec-1-avoid), [Medium: Gemini 2.5 on Vertex AI retires October 20](https://medium.com/@shtse8/gemini-2-5-on-vertex-ai-retires-october-20-what-to-switch-to-and-what-it-costs-b56dd29479bd)

### Inferences
- The mask is produced as text tokens (a base64 PNG inside JSON), so it is necessarily small and is stretched to the box size. That makes it a rough silhouette at best; stretched over a tall coat in a 12-megapixel phone photo, the edge will be blocky. No source gives the native mask size, so the degree is unquantified here.
- Asking for masks multiplies output tokens per piece and adds a new failure class (malformed base64) to a call the app currently uses for structured JSON; with several garments per photo it also raises the risk of hitting `maxOutputTokens`. The size of that cost is unmeasured here.
- Mask output is not compatible with a strict `responseSchema` enum-style JSON call in any way a source confirms; whether the app's existing structured call could carry masks without loosening its schema is untested.
- If the reported 1 Dec 2026 reroute of `gemini-2.5-flash` is accurate, the one model Google explicitly recommended for pixel masks is days from being replaced by a model whose mask behaviour (polygon? none?) differs. A polygon contour from a 3.x Flash model would be usable as a rough clip path, or as a *prompt* for SAM, but not as a clean cutout.
- Net: Gemini's built-in masks are "rough only" and on an unstable footing; a dedicated box-prompted model fed by Gemini's boxes is the sturdier design. This is a judgement from the evidence above, not something a source measured on garments.
- Side note outside this brief: the same reported shutdown affects the app's existing detection call, which pins `gemini-2.5-flash`.

### Gaps
- Could not open Google's docs, deprecations page, blog or forum directly; everything from those hosts is a search extract. The exact current wording on which model returns which mask format needs a direct read.
- Native resolution of the Gemini 2.5 mask PNG: not found in a source that could be cited.
- Token cost per mask and the added price per image: not found. (Simon Willison's April 2025 post is known to discuss token counts and cost but could not be opened.)
- No evaluation of Gemini masks on clothing, and no measured failure rate for malformed masks, was found.
- Whether Gemini 3.8 Flash's polygon output is reliable, and how many vertices it returns, is unknown.
- Gemini Robotics-ER 1.6's availability, price and mask format were not researched.

---

## 5. Two-stage pipelines for garments: box → SAM → refine, versus crop → BiRefNet

### Takeaway
No engineering write-up from a wardrobe or resale app (Vinted, Depop, Poshmark, Vestiaire) describing its cutout pipeline was found, so the comparison rests on research papers and how the models are built: a salient-object model has no way to be told "only the jacket", while a box-prompted SAM can isolate one garment but is documented to fuse overlapping, similar-coloured garments and to leave ragged boundaries. The combination practitioners describe is a prompted model to pick the piece and a matting/cutout model to finish the edge.

### Cited Findings
- BiRefNet takes "no prompt and nothing to click: it finds the salient foreground on its own"; SAM's mask is binary while BiRefNet returns a soft matte; the page suggests using a prompted model to crop first, then BiRefNet to matte the crop (search extract of a vendor page). — [sogni.ai BiRefNet](https://www.sogni.ai/models/birefnet)
- A 2026 garment-segmentation paper (GarmentSegAgent, web fashion images) reports SAM 2 with box-only prompts scoring about 0.63 on DeepFashion2 versus about 0.80 for SAM 2 paired with a text-grounded detector (search extract; the metric name was not in the extract, and the paper could not be opened). — [GarmentSegAgent (arXiv 2610.36506)](https://arxiv.org/html/2610.36506)
- A robotics paper on garment piles reports SAM 2 failing under "heavy occlusion and color similarity (e.g., several garments fused into one mask, ragged boundaries)"; its fix was a vision-language model that flags bad masks, then re-prompting with points (search extract). — [GarmentPile++ (arXiv 2603.04158)](https://arxiv.org/pdf/2603.04158)
- Box → SAM is an established pattern in textile work: a recycling paper used "bounding boxes generated by Grounding DINO ... as input prompts to the SAM model" (search extract). — [Textile Analysis for Recycling Automation (arXiv 2506.06569)](https://arxiv.org/pdf/2506.06569)
- A human-parsing alternative: a ComfyUI node uses a SegFormer clothes-parsing model that labels each pixel of a person into clothing/body categories with no prompt; it gives category-level labels, not individual garments (search extract). — [ComfyUI ClothesSegment (RMBG) node](https://comfy.icu/node/ClothesSegment)
- Matte Anything's pipeline is exactly box/point → SAM mask → automatic trimap → ViTMatte alpha (read directly). — [hustvl/Matte-Anything README](https://raw.githubusercontent.com/hustvl/Matte-Anything/main/README.md)
- Matting Anything predicts an alpha matte for "any instance" from a box, point or text prompt using SAM features plus a 2.7M-parameter refinement module (read directly). — [SHI-Labs/Matting-Anything README](https://raw.githubusercontent.com/SHI-Labs/Matting-Anything/main/README.md)
- BiRefNet's repository links a "Box Guided Segmentation" notebook, i.e. the authors themselves show crop-to-box use (read directly; the notebook was not opened). — [ZhengPeng7/BiRefNet README](https://raw.githubusercontent.com/ZhengPeng7/BiRefNet/main/README.md)

### Inferences
- **Flat-lay, pieces not touching** (outfit on a bed): crop-to-box → BiRefNet is likely sufficient and gives the better edge, because inside each box the garment is the salient object. The risk is a neighbouring piece or the bedding pattern intruding into the box.
- **Worn garments**: crop-to-box → BiRefNet will keep the person (skin, hair, the shirt under the jacket) because everything in the crop is "foreground". A box-prompted SAM-class model is the only one of the two that can, in principle, return just the jacket. A human-parsing model is a third route but labels by category, which breaks on two tops layered.
- **Overlap (jacket over shirt)**: a box around the shirt contains mostly jacket, so a box alone is an ambiguous prompt; the GarmentPile++ evidence says SAM 2 fuses such layers. Adding a positive point inside the visible shirt and negative points on the jacket (the app would need Gemini to return a point per piece, or derive one) is the standard SAM remedy. The DeepFashion2 gap (0.63 box-only vs 0.80 with text grounding) points the same way: box-only is the weak prompt.
- A hybrid that follows from the above: box (+ point) → SAM-class mask to select the piece → use that mask to gate a matting pass (ViTMatte with an auto-trimap, or BiRefNet's matte multiplied by a dilated SAM mask) for the soft edge. This is assembled from the cited parts; no source evaluated this exact combination on garments.
- A cut-out of a worn or overlapped garment will have missing regions where it was occluded (a shirt under a jacket). Segmentation cannot restore them; only generation can, which is out of scope.

### Gaps
- No public engineering write-up from Vinted, Depop, Poshmark, Vestiaire, or wardrobe apps (Whering, Indyx, Acloset, etc.) on their cutout pipeline was found in this session. Absence of results, not evidence of what they use.
- No head-to-head on garments of (a) box→SAM, (b) box→SAM→matting, (c) crop→BiRefNet was found.
- Virtual try-on literature (which typically uses human parsing plus garment masks) was not surveyed beyond the items above.
- The GarmentSegAgent figures need a direct read of the paper before being quoted as more than indicative.

---

## 6. Running SAM-class models in the browser or on device

### Takeaway
It is feasible but heavy: SAM 2.1-tiny is roughly 130–150 MB as a browser model and needs WebGPU, while a small distilled SAM (SlimSAM-77, ~9–23 MB encoder) can run on CPU/WASM; EdgeTAM ships Meta's own Core ML export under Apache-2.0 and runs at 16 FPS on an iPhone 15 Pro Max. Nothing was found on running SAM 3 in a browser.

### Cited Findings
- Browser, SAM 2.1 via WebGPU: one project lists SAM 2.1 tiny through large at 145 MB to 878 MB, with SlimSAM-77 (a 14 MB INT8 distillation) as a CPU/WASM fallback; the fast SAM 2 models need WebGPU (search extract). — [WebSAM project page](https://xevion.dev/projects/websam)
- Component sizes of published ONNX exports: SlimSAM-77 encoder 23.3 MB (12.2 MB half precision, 8.9 MB 8-bit); SAM 2.1 tiny 134 MB (67 MB half precision) (search extract of a GitHub feasibility spike). — [open-rt-studio issue #121](https://github.com/mliang1604/open-rt-studio/issues/121)
- An ExecuTorch WebGPU build of SAM 2 Hiera Tiny totals 149.3 MB: encoder 131.2 MB, decoder 16.2 MB (search extract). — [executorch-community/SAM2-Hiera-Tiny-ExecuTorch-WebGPU](https://huggingface.co/executorch-community/SAM2-Hiera-Tiny-ExecuTorch-WebGPU)
- A walkthrough of SAM 2 in the browser with ONNX Runtime Web exists (search result; not read in full). — [Image Segmentation in the Browser with SAM 2 (Medium)](https://medium.com/@geronimo7/in-browser-image-segmentation-with-segment-anything-model-2-c72680170d92)
- MobileSAM supports ONNX export, has community in-browser demos, and takes ~3 s per image on a Mac i5 CPU (read directly). — [MobileSAM README](https://raw.githubusercontent.com/ChaoningZhang/MobileSAM/master/README.md)
- HQ-SAM's mask decoder exports to ONNX "so that it can be run in any environment that supports ONNX runtime" (read directly). — [SysCV/sam-hq README](https://raw.githubusercontent.com/SysCV/sam-hq/main/README.md)
- EdgeTAM: Apache-2.0; official Core ML export script producing three models (the image encoder is listed at ~9.6 MB); 16 FPS on iPhone 15 Pro Max without quantisation; SAM 2 / 2.1 base-plus manage 0.7 FPS on the same phone in the video benchmark (read directly). — [facebookresearch/EdgeTAM README](https://raw.githubusercontent.com/facebookresearch/EdgeTAM/main/README.md)
- EfficientViT-SAM L0 runs in 8.2 ms end-to-end on an NVIDIA Jetson AGX Orin with TensorRT fp16 (edge GPU, not a phone) (read directly). — [efficientvit_sam README](https://raw.githubusercontent.com/mit-han-lab/efficientvit/master/applications/efficientvit_sam/README.md)
- SAM 3 is 848M parameters and its reference code requires a CUDA GPU (read directly). — [facebookresearch/sam3 README](https://raw.githubusercontent.com/facebookresearch/sam3/main/README.md)
- Qualcomm AI Hub lists EdgeTAM (Apache-2.0) and SAM 3 as device-targeted models (search extract; details not read). — [Qualcomm AI Hub EdgeTAM](https://aihub.qualcomm.com/models/edgetam), [Qualcomm AI Hub SAM 3](https://aihub.qualcomm.com/automotive/models/sam3)

### Inferences
- SAM's split design suits this: the expensive image encoder runs once per photo, and each box prompt is then a cheap decoder pass, so several garments per photo cost little extra on device. (The sizes above show the decoder at ~16 MB against a ~131 MB encoder.)
- For a web app without a build step, a 130–150 MB WebGPU model download, limited to browsers with WebGPU, is a poor first-use experience on mobile Safari-class devices; the small distilled models download quickly but produce the coarsest masks of anything in this document. On-device is therefore better seen as a native-app option (EdgeTAM / Core ML) than a web one.
- On-device removes the per-call fee and keeps photos local, but the masks are the same binary, coarse-edged SAM masks; edge refinement would still need a second model, on device or on a server.

### Gaps
- Apple's `coreml-sam2` / `coreml-sam2.1` Hugging Face repositories (sizes, licence, measured iPhone latency) could not be opened or found in search results. Their licence and numbers remain unverified here.
- No source on SAM 3 or SAM 3.1 running in a browser (ONNX/WebGPU) or via Core ML.
- No measured browser latency (encoder time on a mid-range phone with WebGPU) was found.
- WebGPU availability across iOS Safari versions in late 2026 was not checked.
