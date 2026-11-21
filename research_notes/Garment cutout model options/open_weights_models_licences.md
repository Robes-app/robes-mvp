# Open-weights background-removal / DIS / matting models and their licences (as of 21 Nov 2026)

Research-access note for the report writer: this session could reach github.com and raw.githubusercontent.com directly, but **huggingface.co, arxiv.org, bria.ai, fal.ai, blog.cloudflare.com, runflow.io and dev.to were blocked by the session's network allowlist**. Facts from those hosts come from search-engine summaries of the pages (marked "via search"), not from a direct read, and are less reliable than the GitHub-read facts. Nothing here is legal advice.

## 1. Licence and commercial-use status of each open-weights cutout model (code vs weights vs training data)

### Takeaway
No high-quality open cutout model is clean on all three layers. BiRefNet and BEN2 carry MIT on code and weights and their authors say commercial use is fine, but both were trained on DIS5K, whose terms prohibit commercial use "even after processing", and BiRefNet's author confirmed on 17 Nov 2026 that no commercial permission was obtained and no commercially-clean variant exists. BRIA RMBG-1.4/2.0 is the only family with fully licensed training data, but its weights are non-commercial unless you buy a Bria licence whose price is not published.

### Cited Findings

**Summary table** (every row is backed by a bullet below; "?" = not found)

| Model | Code licence | Weights licence | Commercial use of weights as labelled | Training data constraint | Size / input | Notes |
|---|---|---|---|---|---|---|
| BRIA RMBG-2.0 | n/a (BiRefNet arch) | CC BY-NC 4.0 | No, unless paid Bria agreement | Bria-owned, 15k+ licensed, manually labelled images | ~1.02 GB ONNX, 1024x1024 | Binary-ish mask, not transparency-aware per BiRefNet author |
| BRIA RMBG-1.4 | n/a (IS-Net arch) | "bria-rmbg-1.4" (CC non-commercial) | No, unless paid Bria agreement | Bria licensed data | 44.1M params, ~176 MB | Older, smaller, browser-friendly |
| BiRefNet (general, HR, matting, portrait, lite, lite-2K, dynamic, HR-matting) | MIT | MIT (author statement) | Yes per author | DIS5K (non-commercial terms) plus many research matting sets; no permission obtained | Swin-L; 1024 (general), 2048 (HR / HR-matting), 2560x1440 (lite-2K), 256-2304 (dynamic) | Unsettled data question |
| BiRefNet-V2 (Nov 2026 paper) | "will still be MIT" per author | Academic-benchmark weights only so far | Unclear | DIS5K etc. | ? | Author: "cannot guarantee the effectiveness" of current v2 weights |
| BEN2 Base (PramaLLC) | MIT | MIT (HF card, via search) | Yes as labelled | DIS5K + 22K proprietary set | ? | Better "full" model is paid/API only |
| U2-Net / u2netp | Apache-2.0 | Not separately stated | Unstated | DUTS-TR | 176.3 MB / 4.7 MB | Old; coarse edges |
| u2net_cloth_seg | MIT | No separate terms (Google Drive) | Labelled MIT by third parties | iMaterialist Fashion 2019 (licence not found) | 768 train res | Repo archived 18 May 2026 |
| IS-Net / isnet-general-use | Apache-2.0 (code + metric only) | None stated | Unanswered by authors | DIS5K (non-commercial) | ? | Issue #150 open, no maintainer reply |
| InSPyReNet (transparent-background) | MIT | Not stated | Unstated | "composite dataset" (unspecified) | base 1024, fast 384 | Strong on thin structures in one 2026 benchmark |
| MODNet | Apache-2.0 | Apache-2.0 (covers `pretrained`) | Yes as labelled | ? | "7M" (demo model) | Portrait matting only |
| RVM | GPL-3.0 | GPL-3.0 | Copyleft | ? | MobileNetV3 / ResNet50 | Human video matting only |
| ViTMatte | MIT | MIT (repo) | Yes as labelled | Composition-1k / Distinctions-646 (terms not found) | S and B variants | Needs a trimap |
| Matte Anything | MIT | Depends on SAM + GroundingDINO + ViTMatte | Mixed | - | Heavy (SAM ViT-H) | Handles transparent objects |
| MVANet | MIT | Not separately stated | Unstated | DIS5K | ? | Same DIS5K issue |
| Lucida v7 (BiRefNet_HR fine-tune, 2026) | MIT | MIT | Yes as labelled, authors flag data risk | DIS5K, COD10K, P3M-10k, CAMO (research-only) + AM-2k/BG-20k (MIT) + ToonOut (CC-BY) | 1024x1024 | Best open model on transparency in its own benchmark |
| rembg (library) | MIT | Per-model | Per-model | Per-model | - | Default model is now bria-rmbg (non-commercial) |
| @imgly/background-removal(-node) | AGPL-3.0 | Bundled ISNet ONNX | Copyleft, or contact IMG.LY | DIS5K-derived (ISNet) | isnet / isnet_fp16 / isnet_quint8 | Commercial licence by enquiry |
| MediaPipe selfie multiclass 256x256 | Apache-2.0 | Apache-2.0 | Yes | Not disclosed | 256x256 | Classes include "clothes"; not pixel-perfect |
| SegFormer-B2-clothes (mattmdjaga) | NVIDIA Source Code License | Metadata says MIT, body points to NVIDIA licence | Effectively no (NVIDIA licence is non-commercial) | ATR (licence not found) | - | Card is internally inconsistent |
| segformer-b3-fashion (sayeed99) | NVIDIA licence | "other" → NVIDIA SegFormer licence | No | sayeed99/fashion_segmentation | - | |
| SCHP | MIT | Not stated | Unstated | LIP, ATR, Pascal-Person-Part (terms not found) | - | |
| Sapiens v1 seg (Meta) | - | CC BY-NC 4.0 | No | - | 0.3b-1b | |
| Sapiens2 seg (Meta) | - | Sapiens2 License | Not prohibited by name; has prohibited-use list incl. "biometric processing" | - | up to 5b | Needs legal read |

**BRIA RMBG-2.0 and RMBG-1.4**
- RMBG-2.0 "is released under a CC BY-NC 4.0 license for non-commercial use"; commercial use is "subject to a commercial agreement with BRIA". The README gives no price; it links to a purchase form for a commercial licence or API package. — [Bria-AI/RMBG-2.0 README](https://raw.githubusercontent.com/Bria-AI/RMBG-2.0/dev/README.md)
- RMBG-2.0 is built on the BiRefNet architecture with Bria's proprietary dataset and training scheme, trained on "over 15,000 high-quality, high-resolution, manually labeled" images: objects only 45.11%, people with objects/animals 25.24%, people only 17.35%; photorealistic 87.70%; non-solid background 52.05%. — [Bria-AI/RMBG-2.0 README](https://raw.githubusercontent.com/Bria-AI/RMBG-2.0/dev/README.md)
- The BiRefNet author notes the RMBG-2.0 weights are restricted to non-commercial use and "are not transparency-aware" (binary masks only). — [ZhengPeng7/BiRefNet](https://github.com/ZhengPeng7/BiRefNet)
- rembg's README: RMBG-2.0 is under a BRIA licence that "requires a paid agreement for commercial use"; the ONNX file is about 1.02 GB and runs at 1024x1024. — [danielgatis/rembg](https://github.com/danielgatis/rembg)
- RMBG-1.4 is under the "bria-rmbg-1.4" licence (Creative Commons, non-commercial; commercial use needs a Bria agreement), uses IS-Net, has 44.1M parameters, and one packaged copy is 176,381,952 bytes (via search; huggingface.co blocked). — [briaai/RMBG-1.4](https://huggingface.co/briaai/RMBG-1.4)
- Paid price: no public self-hosted licence price was found; sources point to a contact/purchase form. The hosted Bria RMBG 2.0 endpoint on fal.ai is listed at $0.018 per generation, commercial licence included (via search). — [fal.ai Bria RMBG 2.0](https://fal.ai/models/fal-ai/bria/background/remove); [bria.ai/rmbg-for-commercial-use](https://bria.ai/rmbg-for-commercial-use) (page blocked, price unverified)

**BiRefNet family**
- Repo is MIT. Variants and training data: general (DIS5K-TR, DIS-TEs, DUTS, HRSOD, UHRSD, HRS10K, P3M-10k, humans); general 2048x2048 / HR (adds AIM-500, HIM2K, PPM-100, AM-2k, Distinctions-646, Human-2k); matting (P3M-10k, humans, AM-2k, AIM-500, Human-2k, Distinctions-646, HIM2K, PPM-100); portrait (P3M-10k + humans); BiRefNet_dynamic (trained 256x256 to 2304x2304, 31 Mar 2025); BiRefNet_HR (2048x2048, 1 Feb 2025); BiRefNet_HR-matting (12 Feb 2025); BiRefNet_lite-2K (2560x1440 input, Sep 2024). The repo gives no dataset licence terms. — [ZhengPeng7/BiRefNet](https://github.com/ZhengPeng7/BiRefNet)
- Author, 24 Oct 2026: "you can use all the codes / model weights under the MIT license." Author, 6 Jun 2026: "the DIS5K is under another strictly set license"; he planned to "separate the training settings for academic/commercial use" for v2. 25 Oct 2026: "The commonly used codes/model weights will still be released under the MIT license" and he would "consider training the versions on datasets that clearly claim commercial availability." — [BiRefNet issue #306](https://github.com/ZhengPeng7/BiRefNet/issues/306)
- Issue #331 (opened 16 Nov 2026, still open) asked whether MIT covers commercial use of BiRefNet_lite weights on a commercial site, ONNX conversion, and whether DIS5K commercial permission was obtained or a commercially-clean version exists. Author reply, 17 Nov 2026: "1, 2, 3: From my perspective, yes." and "4, 5: No, and it's almost impossible to do that." — [BiRefNet issue #331](https://github.com/ZhengPeng7/BiRefNet/issues/331)
- DIS5K Terms of Use: the dataset is available for non-commercial use in research or education; without permission from the original authors, commercial use is prohibited, even after processing (via search). — [DIS5K Dataset Terms of Use PDF](https://huggingface.co/datasets/not-lain/DIS5K/resolve/main/DIS5K%20Dataset%20Terms%20of%20Use.pdf?download=true)
- The original BiRefNet paper describes DIS5K as an "open-source dataset ... under MIT license", which conflicts with the DIS5K terms PDF. — [arXiv 2401.03407](https://arxiv.org/html/2401.03407v5); contradicted by [DIS5K Terms of Use](https://huggingface.co/datasets/not-lain/DIS5K/resolve/main/DIS5K%20Dataset%20Terms%20of%20Use.pdf?download=true)

**BiRefNet-V2 (newest release found)**
- "BiRefNet-V2: Rethinking Bilateral Reference for High-Resolution Dichotomous Image Segmentation" (arXiv 2611.11272, Nov 2026) reports beating BiRefNet on every metric across three benchmarks under the same training setup, an HCE about 21% lower on the hardest DIS split, and an F-beta lift from 0.9155 to 0.9285 from the inward-reference redesign; it claims to keep openwork structures intact (via search; arxiv.org blocked). — [arXiv 2611.11272](https://arxiv.org/html/2611.11272)
- Author, 25 Oct 2026: "I officially submitted the v2 paper days ago"; current v2 models are academic-benchmark models and "I cannot guarantee the effectiveness of the model weights in this version." — [BiRefNet issue #306](https://github.com/ZhengPeng7/BiRefNet/issues/306)

**BEN / BEN2 (PramaLLC)**
- GitHub repo is MIT; the page calls the base model open source without naming a weights licence. BEN2 was trained on DIS5K and a 22K proprietary segmentation dataset. A better "full" commercial model (hair matting, 4K, edge refinement) is available only via backgrounderase.com API or sales@backgrounderase.com. The page also alleges "RMBG 2.0 did not preserve the DIS 5k validation dataset." — [PramaLLC/BEN2](https://github.com/PramaLLC/BEN2)
- The Hugging Face card lists the BEN2 licence as MIT; ONNX, safetensors and PyTorch files are published (via search). — [PramaLLC/BEN2 on HF](https://huggingface.co/PramaLLC/BEN2/blob/main/README.md)

**U2-Net, u2net_cloth_seg, IS-Net / DIS**
- U-2-Net repo is Apache-2.0; u2net.pth is 176.3 MB and u2netp.pth 4.7 MB; trained on DUTS-TR; u2net_human_seg trained on the Supervisely Person Dataset and does not reach hair-level accuracy. The page does not say whether the licence covers the weights. — [xuebinqin/U-2-Net](https://github.com/xuebinqin/U-2-Net)
- cloth-segmentation (source of u2net_cloth_seg) is MIT; trained on iMaterialist (Fashion) 2019 at FGVC6, about 45k images, resized to 768x768; outputs upper body, lower body, full body, background; the checkpoint is a Google Drive link with no separate terms; the repo was archived on 18 May 2026. — [levindabhi/cloth-segmentation](https://github.com/levindabhi/cloth-segmentation)
- DIS repo: "Our code and evaluation metric use Apache License 2.0." isnet.pth is provided "for fair academic comparisons"; isnet-general-use.pth is "for general use". DIS5K has a separate terms-of-use PDF. — [xuebinqin/DIS](https://github.com/xuebinqin/DIS)
- DIS issue #150 (open since 20 Aug 2026) contains repeated requests for written commercial permission for isnet-general-use and DIS5K-trained weights; the repository owner has not replied. — [DIS issue #150](https://github.com/xuebinqin/DIS/issues/150)

**InSPyReNet, MODNet, RVM, ViTMatte, Matte Anything, MVANet**
- transparent-background (InSPyReNet): MIT code; no licence stated for checkpoints; default checkpoint "trained with composite dataset"; modes base 1024x1024, fast 384x384; no commercial-use statement. — [plemeri/transparent-background](https://github.com/plemeri/transparent-background)
- MODNet: code, models and demos are "released under the Apache License 2.0"; the online demo model is "only 7M" and is unpublished. — [ZHKKKe/MODNet](https://github.com/ZHKKKe/MODNet)
- RVM: GPL-3.0 ("re-released under GPL-3.0"); "specifically designed for robust human video matting"; 172 FPS at HD on an RTX 3090 FP16. — [PeterL1n/RobustVideoMatting](https://github.com/PeterL1n/RobustVideoMatting)
- ViTMatte: MIT; demo requires an image plus trimap; ViTMatte-S and -B variants. — [hustvl/ViTMatte](https://github.com/hustvl/ViTMatte)
- Matte Anything: MIT; built on Segment Anything (ViT-H), GroundingDINO-T and ViTMatte-B; lists "Ability to Process Transparent Object"; "still in progress". — [hustvl/Matte-Anything](https://github.com/hustvl/Matte-Anything)
- MVANet: MIT; trained on DIS5K. — [qianyu-dlut/MVANet](https://github.com/qianyu-dlut/MVANet)

**Lucida (2026 BiRefNet_HR fine-tune)**
- Code and weights MIT. Its data inventory classifies DIS5K, COD10K, P3M-10k as research-only, CAMO as CC-BY-NC-SA 4.0, AM-2k and BG-20k as MIT via release agreement, ToonOut as CC-BY 4.0. It states that a data licence is not a weight licence, calls the carry-over question legally unsettled, and tells commercial users to make their own assessment. — [egeorcun/lucida](https://github.com/egeorcun/lucida)

**rembg**
- rembg is MIT. Models: u2net, u2netp, u2net_human_seg, u2net_cloth_seg, silueta (43 MB), isnet-general-use, isnet-anime, sam, birefnet-general, birefnet-general-fp16, birefnet-general-lite, birefnet-portrait, birefnet-dis, birefnet-hrsod, birefnet-cod, birefnet-massive, bria-rmbg (now the default), plus cloud backends withoutbg and atlascloud. "Model weights carry their own licenses, independent of rembg's MIT license." — [danielgatis/rembg](https://github.com/danielgatis/rembg)

**@imgly/background-removal**
- AGPL-3.0: "The software is free for use under the AGPL License. Please contact support@img.ly for questions about other licensing options." A separate `@imgly/background-removal-node` package exists. — [imgly/background-removal-js](https://github.com/imgly/background-removal-js)
- Model options are `isnet`, `isnet_fp16` (default), `isnet_quint8`; the changelog records a switch from GPL to AGPL (via search). — [@imgly/background-removal README](https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.7.0/README.md)

**Google / MediaPipe**
- MediaPipe Image Segmenter selfie multiclass 256x256 classifies pixels as background, hair, body, face, clothes, others; the model card is Apache 2.0; it is not intended for "applications that require pixel perfect masks" (via search). — [Model Card Multiclass Segmentation](https://storage.googleapis.com/mediapipe-assets/Model%20Card%20Multiclass%20Segmentation.pdf)
- For the binary selfie segmenter, Google's answer on shipping in a paid app is the standard Apache 2.0 terms (include licence, keep attribution) (via search). — [mediapipe issue #6404](https://github.com/google-ai-edge/mediapipe/issues/6404)

### Inferences
- The practical licence ranking for a commercial consumer app: (a) cleanest: Bria via paid licence or licensed API, MediaPipe (too coarse for cutouts), MODNet (portraits only); (b) permissively labelled weights with an unresolved DIS5K data question: BiRefNet, BEN2, Lucida, MVANet, IS-Net-derived tools including @imgly; (c) not usable commercially as labelled: RMBG-1.4/2.0 without a licence, SegFormer clothes models, Sapiens v1; (d) copyleft: RVM (GPL-3.0), @imgly (AGPL-3.0).
- The DIS5K exposure is industry-wide rather than specific to one model: Cloudflare ships BiRefNet in its Images product (see section 2), which suggests large companies have accepted the risk, but the DIS5K authors have never answered permission requests publicly, so the risk is unquantified rather than cleared.
- rembg's default changed to bria-rmbg, so `rembg` with defaults is now non-commercial; a commercial deployment must pin a model explicitly.
- For server-side use, AGPL on @imgly matters if the Node package is used in the backend of a network service; in the browser, the bundled client code would have to be offered under AGPL terms. Either way a commercial licence from IMG.LY would be the clean path.

### Gaps
- Bria's self-hosted commercial licence price: not published anywhere reachable; bria.ai was blocked. Needs a sales enquiry.
- BiRefNet-V2 weights licence and whether practical-use v2 weights exist: not confirmed.
- BEN2 Base file size, input resolution and timing: not found.
- InSPyReNet checkpoint licence and exact training sets: not stated in the repo.
- MODNet licence history (whether weights were once CC BY-NC-SA): could not confirm.
- Apple: no open-weights Apple cutout model was searched or found; Apple's subject-lifting is an on-device OS API, not open weights (unsourced, from background knowledge).
- transformers.js compatibility (RMBG-1.4, MODNet, BiRefNet ONNX in browser): only a page title was found ([lofttools comparison](https://lofttools.com/blog/browser-background-removal-models/)); not read. Licences of the underlying weights are as in the table regardless of runtime.
- SAM / SAM 2 / SAM 3.1 licences were not verified in this pass.
- Could not directly open any Hugging Face model card; weights-licence labels for BEN2 and RMBG-1.4 rest on search summaries.

## 2. Which models are best on clothing (thin straps, sheer/lace/mesh, dark-on-dark, hangers, mirror selfies) and benchmark evidence

### Takeaway
No independent 2025-2026 benchmark tests garments specifically; the nearest evidence says BiRefNet-class models lead on accuracy, matting variants (BiRefNet-matting / HR-matting, Lucida) are needed for sheer fabric because RMBG-2.0 and plain BiRefNet output near-binary masks, and InSPyReNet is competitive on thin structures. A small in-house garment test set is the only way to settle it.

### Cited Findings
- BiRefNet general-use results on DIS-VD (S-measure / weighted-F / HCE): general 2048x2048 Swin-L 0.927 / 0.894 / 881; general Swin-L 0.911 / 0.875 / 1069; Swin-tiny (lite) 0.882 / 0.830 / 1175. Matting model on TE-P3M-500-NP: S 0.979, wF 0.988. — [ZhengPeng7/BiRefNet](https://github.com/ZhengPeng7/BiRefNet)
- RMBG-2.0 weights "are not transparency-aware" (binary masks only), per the BiRefNet author. — [ZhengPeng7/BiRefNet](https://github.com/ZhengPeng7/BiRefNet)
- Lucida's 203-image benchmark (MAE, lower is better; overall / transparent / camouflage): Lucida-v7 0.0257 / 0.0358 / 0.0270; InSPyReNet 0.0295 / 0.0725 / 0.0582; BiRefNet-HR 0.0346 / 0.0687 / 0.0752; RMBG-2.0 0.0401 / 0.0741 / 0.1405. Lucida's own stated weaknesses: InSPyReNet is better on complex scenes and thin structures, RMBG-2.0 leads on hair. This is the model author's own benchmark. — [egeorcun/lucida](https://github.com/egeorcun/lucida)
- Bria's vendor benchmark claims RMBG 2.0 scores 90% vs BiRefNet's 85% on its test set (via search). — [Bria blog](https://blog.bria.ai/brias-new-state-of-the-art-remove-background-2.0-outperforms-the-competition?hsLang=en)
- A February 2026 Runflow benchmark of 5,000 product images put RMBG-2.0 at 93 against Remove.bg's 95 (via search; page blocked, methodology unread). — [Runflow benchmark](https://www.runflow.io/blog/background-removal-benchmark)
- Cloudflare (28 Aug 2025) evaluated U2-Net, IS-Net, BiRefNet and SAM on IoU, Dice and pixel accuracy and chose BiRefNet for its Images background removal beta; U2-Net and IS-Net were faster on smaller GPUs (via search; numbers not retrieved). — [Cloudflare blog](https://blog.cloudflare.com/background-removal/)
- Hands-on reviews prefer BEN2 overall with BiRefNet-HR better on hair in one test; another describes BEN v2 as the pick for hair via confidence-guided matting (via search). — [Medium, Code Canvas](https://medium.com/code-canvas/background-removal-in-comfyui-just-got-really-really-good-2a12717ff0db); [invideo comparison, Aug 2026](https://invideo.io/blog/ai-background-removal-models/)
- BiRefNet-V2 claims preservation of openwork structures and a ~21% lower HCE on the hardest DIS split (authors' claim, via search). — [arXiv 2611.11272](https://arxiv.org/html/2611.11272)
- U2-Net's human segmentation "does not reach hair-level accuracy". — [xuebinqin/U-2-Net](https://github.com/xuebinqin/U-2-Net)
- IS-Net was trained on DIS V1.0, which has very few animal, human and car samples and may perform poorly on those. — [xuebinqin/DIS](https://github.com/xuebinqin/DIS)
- ViTMatte needs a trimap; Matte Anything automates the trimap with SAM + GroundingDINO and handles transparent objects. — [hustvl/ViTMatte](https://github.com/hustvl/ViTMatte); [hustvl/Matte-Anything](https://github.com/hustvl/Matte-Anything)

### Inferences
- Thin straps and lace/openwork are what HCE and DIS5K measure (fine structures), so the DIS-leading models (BiRefNet HR / 2048, BiRefNet-V2, InSPyReNet) are the right starting set; lite/Swin-tiny variants give up measurable fine-structure accuracy (HCE 1175 vs 881-1069).
- Sheer, mesh and chiffon need a real alpha channel. Candidates: BiRefNet-matting / BiRefNet_HR-matting, Lucida, or a two-stage BiRefNet mask → trimap → ViTMatte. Note the matting variants were trained largely on portrait and animal matting sets (P3M, AM-2k, humans), not fabric, so garment transparency is out of distribution for all of them.
- Black garment on dark background is closest to the "camouflage" category; on Lucida's table RMBG-2.0 is weakest there (0.1405) and Lucida / InSPyReNet strongest. This is one author-run benchmark, so treat it as a hypothesis.
- Mirror selfies and worn garments are not a salient-object problem: a DIS model will keep the whole person. Isolating the garment needs a parsing or promptable-segmentation stage first (section 3), then a DIS/matting model for edge quality.
- Hangers: salient-object models have no notion of "garment vs hanger" and will generally keep whatever is attached to the foreground object. Removing the hanger needs a garment-class mask or a prompt; no source tested this.

### Gaps
- No independent side-by-side on clothing (straps, lace, sheer, dark-on-dark, hangers, mirror selfies) was found for 2025-2026. Every numeric comparison found is vendor- or author-run.
- Cloudflare's and Runflow's actual tables could not be read (hosts blocked).
- BEN2 was not included in the one transparency-category benchmark found.
- Paper-level DIS5K / HRSOD tables for BiRefNet, MVANet, BEN2 were not retrieved (arxiv.org blocked; GitHub READMEs show them only as images).

## 3. Garment-specific open models (cloth segmentation, human parsing) and their licences

### Takeaway
Every garment-specific open model found has a licence problem or an unverified dataset: the popular SegFormer clothes models inherit NVIDIA's non-commercial licence, Sapiens v1 is CC BY-NC, DeepFashion2 has no commercial licence at all, and u2net_cloth_seg is MIT-labelled but trained on iMaterialist with unverified terms and is now archived. MediaPipe's Apache-2.0 multiclass segmenter is the only clearly commercial option and it is low-resolution.

### Cited Findings
- NVIDIA's SegFormer licence, section 3.3: "The Work and any derivative works thereof only may be used or intended for use non-commercially"; only NVIDIA and affiliates may use it commercially. — [NVlabs/SegFormer LICENSE](https://raw.githubusercontent.com/NVlabs/SegFormer/master/LICENSE)
- mattmdjaga/segformer_b2_clothes: metadata lists MIT but the licence section links to the NVIDIA SegFormer licence; fine-tuned on ATR (dataset `mattmdjaga/human_parsing_dataset`) (via search). — [mattmdjaga/segformer_b2_clothes](https://huggingface.co/mattmdjaga/segformer_b2_clothes)
- sayeed99/segformer-b3-fashion: licence "other", linking to the NVlabs SegFormer licence; fine-tuned from nvidia/mit-b3 on `sayeed99/fashion_segmentation` (via search). — [sayeed99/segformer-b3-fashion](https://huggingface.co/sayeed99/segformer-b3-fashion)
- u2net_cloth_seg: MIT repo, iMaterialist Fashion 2019 training data (~45k images), three garment classes (upper, lower, full body), archived 18 May 2026. — [levindabhi/cloth-segmentation](https://github.com/levindabhi/cloth-segmentation)
- SCHP: MIT code; trained on LIP (30,462 train / 10,000 val, 20 labels incl. upper-clothes, dress, coat, pants, skirt, scarf), ATR (17,000+ images, 18 labels), Pascal-Person-Part; no dataset licence terms given. — [GoGoDuck912/Self-Correction-Human-Parsing](https://github.com/GoGoDuck912/Self-Correction-Human-Parsing)
- Sapiens v1 checkpoints are CC BY-NC 4.0 (via search). — [facebook/sapiens on HF](https://huggingface.co/facebook/sapiens/blob/c8c22331b1930f8f4a8677d8ebbe8ee05af6fc96/README.md)
- Sapiens2 License grants a "non-exclusive, worldwide, non-transferable and royalty-free limited license" to use, reproduce, distribute and create derivative works; it does not mention commercial use by name; prohibited uses include surveillance, biometric processing, identifying individuals, deepfakes, military and critical infrastructure. — [facebookresearch/sapiens2 LICENSE](https://github.com/facebookresearch/sapiens2/blob/main/LICENSE.md)
- DeepFashion2: collaborator reply (29 May 2019): "Commercial license is not available for DeepFashon2 dataset."; the access form says non-commercial research only. — [DeepFashion2 issue #3](https://github.com/switchablenorms/DeepFashion2/issues/3)
- DeepFashion (original) is available for non-commercial research purposes only (via search). — [CUHK MMLAB DeepFashion](https://mmlab.ie.cuhk.edu.hk/projects/DeepFashion.html)
- Fashionpedia's paper says images came from Flickr and free-licence stock sites; a dataset licence was not confirmed (via search). — [Fashionpedia paper](https://arxiv.org/html/2004.12276.pdf)
- MediaPipe selfie multiclass (Apache 2.0) has a "clothes" class at 256x256 and disclaims pixel-perfect masks (via search). — [Model Card Multiclass Segmentation](https://storage.googleapis.com/mediapipe-assets/Model%20Card%20Multiclass%20Segmentation.pdf)

### Inferences
- The MIT tag on mattmdjaga/segformer_b2_clothes should not be relied on: the model is a derivative of NVIDIA's mit-b2 weights, which sit under a licence that binds derivative works to non-commercial use.
- Sapiens2 looks usable commercially on a plain reading (royalty-free, no non-commercial clause), but "biometric processing" in the prohibited list is worth a legal look for an app that segments photos of users' bodies; clothing segmentation is arguably not biometric, but that is a judgement call.
- A commercially safer garment-isolation stage is likely a promptable or open-vocabulary segmenter (SAM-family with a "garment" box or text prompt) feeding a DIS/matting model, rather than any of the fashion-dataset-trained parsers. This was not verified in this pass.

### Gaps
- ATR, LIP and iMaterialist licence terms: not found.
- Fashionpedia's dataset licence: not confirmed.
- Whether any 2026 garment segmenter was trained on commercially licensed data: none found.
- Sapiens2 segmentation class list and whether it separates garment types: not checked.

## 4. Realistic per-image cost: serverless GPU and CPU-only ONNX on a small Node/Railway container

### Takeaway
On a serverless GPU a BiRefNet-class cutout costs roughly $0.0001-$0.002 per image in compute, one to two orders of magnitude below Bria's licensed API at $0.018. CPU-only is viable only for the lite model at reduced resolution: the stock BiRefNet_lite ONNX export needs about 6.5 s and 10.5 GB RAM at 1024 on a fast laptop CPU, which rules out a small Railway container for full quality.

### Cited Findings
- BiRefNet (Swin-L, 1024x1024) runtime: A100 86.8 ms FP32 / 69.4 ms FP16; RTX 4090 95.8 ms / 57.7 ms; V100 384 ms / 152 ms. 17 FPS at 1024x1024 with 3.45 GB on an RTX 4090 in FP16. Inference memory 4.8 GB FP32, 3.5 GB FP16. — [ZhengPeng7/BiRefNet](https://github.com/ZhengPeng7/BiRefNet)
- ONNX at 1024x1024 on A100: Swin-L ~165 ms, Swin-T ~93.8 ms (slower than PyTorch). On an RTX 4080S: PyTorch 0.15 s, ONNX 4.43 s, TensorRT 0.11 s. The optional `refine_foreground` step is ~80 ms on a 5090. — [ZhengPeng7/BiRefNet](https://github.com/ZhengPeng7/BiRefNet)
- rembg: birefnet-general-fp16 is roughly 30% faster on CUDA, does not reduce VRAM, and is usually slower on CPU. — [danielgatis/rembg](https://github.com/danielgatis/rembg)
- CPU-only BiRefNet_lite ONNX, Intel Core Ultra 9 185H, onnxruntime 1.30: optimised export 2.4 s at 1024; stock `onnx-community/BiRefNet_lite-ONNX` 6.5 s with 10.5 GB peak memory at 1024; 0.6 s and ~1.3 GB at 512 (self-reported, via search). — [senty-au/BiRefNet_lite-ONNX-dynamic](https://huggingface.co/senty-au/BiRefNet_lite-ONNX-dynamic)
- Another card reports about 20 s for one 1024x1024 BiRefNet-lite run on a loaded desktop CPU (via search). — [ipsilondev/birefnet-lite-onnx](https://huggingface.co/ipsilondev/birefnet-lite-onnx)
- Modal: T4 $0.000164/s ($0.59/hr), L4 $0.000222/s ($0.80/hr), per-second billing (third-party pricing summary, via search). — [Modal pricing explainer](https://www.beam.cloud/blog/modal-pricing-explained)
- Replicate: `men1scus/birefnet` ~$0.0021 per run on an A100 80GB (page is old); `m-kunz/birefnet_portrait` ~$0.00022 per run on a T4 (via search). — [men1scus/birefnet](https://replicate.com/men1scus/birefnet); [m-kunz/birefnet_portrait](https://replicate.com/m-kunz/birefnet_portrait)
- fal.ai BiRefNet v2 is billed per compute second; sources disagree ($0.0008/s on most pages, $0.000575/s on an aggregator, "$0" on fal's own page) (via search). — [fal-ai/birefnet/v2](https://fal.ai/models/fal-ai/birefnet/v2)
- Bria RMBG 2.0 hosted on fal.ai: $0.018 per generation (via search). — [fal.ai Bria RMBG 2.0](https://fal.ai/models/fal-ai/bria/background/remove)

### Inferences
- Self-hosted serverless arithmetic (my calculation, warm container, inference only): at ~0.5 s per image on a Modal T4, 0.5 x $0.000164 ≈ $0.00008; at ~0.3 s on an L4, ≈ $0.00007. Adding decode/encode, upload and idle/scaledown time, a realistic all-in figure is around $0.0002-$0.001 per image at low volume; cold starts (loading a ~1 GB model) add seconds of billed time and latency on the first request. T4/L4 timings for BiRefNet are not sourced; the only measured figures are A100, 4090 and V100.
- At wardrobe-app volumes (e.g. 10,000 images/month) GPU compute is about $1-$20/month self-hosted versus about $180/month on Bria's licensed API, so cost is not the deciding factor; licence position and quality are.
- Full BiRefNet (Swin-L) on CPU is not viable for an interactive upload flow: the lite model alone takes 2.4-20 s at 1024 and the stock export peaks above 10 GB RAM. A small Railway container could plausibly run BiRefNet_lite at 512-768 (sub-second to a few seconds, ~1-3 GB) or a U2-Net/IS-Net-size model (~176 MB), with visibly worse edges on straps and lace.
- ONNX Runtime is not automatically the fast path on GPU (ONNX was slower than PyTorch in the author's numbers, and far slower on the 4080S test); TensorRT or PyTorch FP16 is the better GPU serving choice.

### Gaps
- RunPod serverless and Cloud Run GPU pricing were not retrieved.
- No measured BiRefNet latency on T4 / L4 / A10G, and no measured CPU latency for the full Swin-L model.
- Modal rates come from a third-party summary, not modal.com; fal.ai's per-second rate is inconsistent across sources.
- No measurement on Railway's actual shared vCPUs; the Core Ultra 9 figure is a best case for a container.
- In-browser (WebGPU / WASM) timings for transformers.js models were not retrieved.
