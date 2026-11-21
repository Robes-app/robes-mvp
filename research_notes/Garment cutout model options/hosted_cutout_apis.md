# Hosted background-removal / cutout APIs (as of 21 Nov 2026)

> **Verification caveat for the report writer.** This research session could not open any vendor page directly: every direct page fetch (remove.bg, photoroom.com, cloudinary.com, fal.ai, replicate.com, bria.ai, clipdrop.co) failed because those hosts are outside the session's network allowlist. Every figure below therefore comes from **search-engine result summaries of the cited pages, retrieved 21 Nov 2026**, not from a page I read in full. Treat each price as "reported by search on 21 Nov 2026; confirm on the live page before budgeting". Where the search summary itself was uncertain or sources disagreed, that is said on the line.

## 1. Current per-image price and pricing model — commercial vendor APIs

### Takeaway
The published floor for a branded specialist API is about $0.02/image (Photoroom Basic, Bria ~$0.018); remove.bg's self-service API is being shut down on 1 Dec 2026 and replaced by Leonardo.Ai at about $0.105/image. Cloudinary's `e_background_removal` is billed at 75 transformations per asset (charged once per asset), which is the only option that needs no new vendor, but its dollar cost depends on the plan's credit price, which I could not verify.

### Cited Findings

**remove.bg (Kaleido / Canva) — being withdrawn**
- The self-service remove.bg API stops accepting requests on 1 December 2026 (09:00 CET per several sources); background removal moves to Leonardo.Ai; remove.bg credentials do not carry over; unused pay-as-you-go credits expire and subscriptions end that day; enterprise API contracts continue. — [Leonardo.Ai news](https://www.leonardo.ai/news/removebg-api-leonardo); [Leonardo migration guide](https://docs.leonardo.ai/docs/migrate-from-the-removebg-api-to-leonardoai); [Claid migration post](https://claid.ai/blog/article/remove-bg-api-migration); [AlternativeTo news, Sept 2026](https://alternativeto.net/news/2026/9/end-of-an-era-remove-bg-shuts-down-standalone-service-and-moves-to-the-canva-ecosystem/)
- Sources describe the destination differently: Leonardo's own pages say the API moves to Leonardo.Ai; AlternativeTo and others describe the standalone service moving "into the Canva ecosystem" (Leonardo is Canva-owned, so these may both be true; not confirmed on a primary page). — [AlternativeTo](https://alternativeto.net/news/2026/9/end-of-an-era-remove-bg-shuts-down-standalone-service-and-moves-to-the-canva-ecosystem/); [Leonardo.Ai news](https://www.leonardo.ai/news/removebg-api-leonardo)
- remove.bg's pricing page (as indexed) showed monthly credit plans from $0.20/image on the 200-credit plan down to about $0.10/image at 10,000 credits, and 50 free preview-resolution API calls per month. — [remove.bg pricing](https://remove.bg/pricing)
- Third-party trackers give inconsistent remove.bg figures (~$0.105, ~$0.08, plan prices of $8.10 / $35.10 / $80.10); none verified. — [CostBench](https://www.costbench.com/software/ai-media-apis/remove-bg-api/); [DEV Community post](https://dev.to/om_prakash_3311f8a4576605/removebg-charges-0105image-heres-a-0009-alternative-2026-comparison-59hi)

**Leonardo.Ai background removal (remove.bg's successor)**
- Leonardo's docs state background removal costs USD $0.1047 per image, and each response reports the cost of the call; model id `remove-bg`; a sync endpoint (`cloud.leonardo.ai/api/rest/v2/generationssync`, Bearer token) and an async endpoint for batches / large images / webhooks. — [Leonardo docs: background removal](https://docs.leonardo.ai/docs/background-removal); [Leonardo migration guide](https://docs.leonardo.ai/docs/migrate-from-the-removebg-api-to-leonardoai)
- Photoroom (a competitor) claims Leonardo is cheaper than remove.bg at low volume and more expensive at high volume (e.g. about $2,400/month more at 75,000 images). Vendor-authored; unverified. — [Photoroom blog](https://www.photoroom.com/blog/remove-bg-api-cost-leonardo-ai-vs-photoroom)

**Photoroom API**
- Remove Background API (Basic plan): $0.02 per image, monthly subscriptions starting at $20 (i.e. 1,000 images). — [Photoroom API pricing](https://www.photoroom.com/api/pricing); [Photoroom docs: pricing](https://docs.photoroom.com/getting-started/pricing)
- Image Editing API (Plus plan): $0.10 per image, plans from $100/month; one Image Editing call is weighted as 5 Remove Background calls; a Plus subscriber calling the Remove Background endpoint is billed at the $0.02 Basic rate. — [Photoroom docs: how API calls are billed](https://docs.photoroom.com/getting-started/how-are-api-calls-billed)
- Free: first 10 production Remove Background calls free; sandbox includes 1,000 free (watermarked/sandbox) images; calls that error are not billed. — [Photoroom docs: pricing](https://docs.photoroom.com/getting-started/pricing)
- Partner plan: $0.01 per image for qualifying customer-facing apps processing about 100k images/month. — [Photoroom API Partner Plan](https://www.photoroom.com/api/api-partner-plan)

**Cloudinary (already the app's image host)**
- Cloudinary's transformation-counts page lists background removal (`e_background_removal`) at **75 transformations**, and says it is charged once per asset even when the effect appears in several transformation URLs. The page header reportedly shows "Last updated: Sep-21-2026", but the search metadata dated the page older, so currency of the 75 figure is not fully confirmed. — [Cloudinary: How are transformations counted](https://cloudinary.com/documentation/transformation_counts)
- The same special count applies whether the background is removed on the fly or on upload. — [Cloudinary docs: background removal](https://cloudinary.com/documentation/background_removal)
- The older **Cloudinary AI Background Removal add-on** is slated for deprecation "in the near future"; accounts created after 1 February 2026 cannot subscribe to it; Cloudinary recommends switching to billing by transformations, and says the transformation provides the same functionality as the add-on. — [Cloudinary AI Background Removal add-on docs](https://cloudinary.com/documentation/cloudinary_ai_background_removal_addon)
- Third-party pages contradict the official count (claims of 1 transformation, 5 transformation units, or "$99 for 5,000 operations"); these are unverified and conflict with Cloudinary's own page. — [Removedo guide](https://www.removedo.com/blog/cloudinary-remove-background-guide); [jpg.now cost analysis](https://jpg.now/blog/background-removal-at-scale-api); contradicted by [Cloudinary transformation counts](https://cloudinary.com/documentation/transformation_counts)
- Third-party descriptions of Cloudinary plans: free tier of 25 credits/month with 1 credit ≈ 1,000 transformations; paid plans from $89/month (another source says $99/month). Not verified on Cloudinary's pricing page. — [appstackbuilder](https://appstackbuilder.com/tools/cloudinary); [buildmvpfast](https://www.buildmvpfast.com/alternatives/cloudinary)

**Bria AI (hosted RMBG)**
- Third-party listings consistently give $0.018 per image pay-as-you-go for Bria background removal (RMBG 2.0). — [fal: Bria RMBG 2.0](https://fal.ai/models/fal-ai/bria/background/remove); [WaveSpeed](https://wavespeed.ai/models/bria/remove-background)
- Bria's own pricing page (partially legible in search) shows monthly API plans starting at $18 for 1,000 images, falling to about $0.0038/image at a 5-million-image tier; a free trial reportedly includes 100 free API calls. — [Bria pricing](https://bria.ai/pricing)

**Clipdrop (Jasper)**
- A pricing tracker reports that Clipdrop's per-call API pricing was delisted on about 4 June 2026 and the API pricing page now routes to a Jasper contact form ("Clipdrop APIs by Jasper.ai"). Not verified against Clipdrop's own page. — [usagepricing.com tracker entry](https://usagepricing.com/blueprint/activity/clipdrop-2026-06-04-api-pricing-delisted)
- Reseller / older figures are inconsistent: ~$0.12–$0.18/image (2025 article), $0.50 per request via Eden AI and 302.AI. — [Medium comparison](https://medium.com/@ai-engine/5-best-background-removal-apis-pricing-comparison-22ae9e76b67c); [Eden AI](https://www.edenai.co/expert-models/clipdrop-background-removal)

**Pixelcut API**
- API credits are $0.01 each; background removal costs 5 credits = $0.05 per image; new developer accounts get 100 free credits. — [Pixelcut developer docs: pricing](https://pixelcut.ai/docs/developer-guide/getting-started/pricing); [Pixelcut background remover API](https://www.pixelcut.ai/api/background-remover)

**Picsart API**
- Picsart's Remove Background model pricing page lists tiered rates of $0.005 and $0.004 at 10,000- and 20,000-credit tiers; the search summary could not confirm whether that is per credit or per image, nor how many credits one removal costs. 200 free credits on signup. — [Picsart remove background pricing](https://picsart.com/api-platform/models/picsart-sod-v8-2/pricing); [picsart.io pricing](https://picsart.io/pricing)

**Slazzer**
- Only a third-party figure found: no free tier, $11/month for 100 credits, roughly $0.03–$0.11/image (same article gives $0.052/image at 10,000 images). Unverified. — [Medium comparison](https://medium.com/@ai-engine/5-best-background-removal-apis-pricing-comparison-22ae9e76b67c)

**Adobe Firefly Services / Photoshop API**
- Billed in "operations", not a public dollar rate: one Adobe page defines Remove Background as 1 operation per API call, a Firefly Services rate card lists 0.5 operation per output image; the two pages conflict and neither converts operations to dollars. — [Adobe operation definitions](https://helpx.adobe.com/business/enterprise/products-entitlements/manage-entitlements/automation-operation-definition.html); [Firefly Services rate card](https://helpx.adobe.com/business/enterprise/kb/fireflyservices-ratecard-ver-a.html)
- The only dollar figure is an anecdotal forum recollection of about $0.15 per call (2023–2024). — [Creative Cloud Developer forum](https://forums.creativeclouddeveloper.com/t/inquiry-about-bulk-pricing-for-photoshop-api-background-removal/8160)

**AWS Bedrock (Nova Canvas / Titan)**
- Nova Canvas documents a `BACKGROUND_REMOVAL` editing task that replaces the background with transparent pixels. — [AWS Nova docs: image generation](https://docs.aws.amazon.com/nova/latest/userguide/image-generation.html)
- No separate background-removal price found; third-party listings give Nova Canvas at $0.04 (1024², standard) to $0.08 (2048², premium) per image, and one aggregator says the model id `amazon.nova-canvas-v1:0` was retired on 2026-09-30. Both unverified on AWS's pricing page. — [MindStudio](https://www.mindstudio.ai/blog/what-is-amazon-nova-canvas); [developersdigest](https://www.developersdigest.tech/models/image-generation/amazon-bedrock)
- Bedrock also lists a Stability "Stable Image Remove Background" model (`stability.stable-image-remove-background-v1:0`); no price captured. — [Bifrost model library](https://www.getmaxim.ai/bifrost/model-library/compare/bedrock/stability.stable-image-remove-background-v1-0)

**Azure AI Vision**
- Retired. Microsoft's concept page says the Image Analysis Segment (background removal) API was retired on 31 March 2025 and calls fail; Microsoft points to Florence 2 "region to segmentation" and suggests a third-party utility such as BiRefNet for fuller functionality. — [Microsoft Learn: background removal concept](https://learn.microsoft.com/en-us/azure/ai-services/computer-vision/concept-background-removal)

**Other hosted option surfaced**
- Cloudflare Workers AI lists Bria's remove-background model (returns a transparent PNG cutout). No price captured. — [Cloudflare docs](https://developers.cloudflare.com/ai/models/bria/remove-background/)

### Inferences
- Cloudinary cost per cutout is 0.075 credit if 1 credit = 1,000 transformations (75 / 1,000). On a free plan of 25 credits/month that would be at most ~333 removals/month with nothing else consuming credits; the dollar figure depends on the plan's effective credit price, which was not verified (if a paid credit is worth somewhere around $0.40–$1.00, that is roughly $0.03–$0.075 per image — a range built on unverified third-party plan prices).
- At 1k–50k images/month the published list prices order roughly: Photoroom Basic ($0.02) ≈ Bria (~$0.018) < Pixelcut ($0.05) < Leonardo/remove.bg (~$0.10). So 10k images/month ≈ $180–$200 on Photoroom/Bria, ≈ $500 on Pixelcut, ≈ $1,050 on Leonardo.
- Any plan built on remove.bg's self-service API has nine days left; it should be treated as "Leonardo.Ai remove-bg" from 1 Dec 2026.
- Adobe, Clipdrop and AWS do not publish a usable self-serve per-cutout price, which makes them poor fits for a small consumer app compared with the vendors that do.

### Gaps
- **PhotoScissors**: no pricing found at all.
- **Google Cloud / Vertex AI**: no price or current status found for an Imagen product-segmentation / cutout endpoint (`image-segmentation-001`); searches returned only Imagen generation prices. Whether Google offers a specialist cutout endpoint in Nov 2026 is unconfirmed.
- Cloudinary: dollar value of a credit/transformation on current plans, and whether the 75-transformation count is still current, not verified on a live page.
- Picsart: credits per removal and unit of the $0.004–$0.005 figure.
- Slazzer, Clipdrop, Adobe, AWS Titan Image Generator v2: no primary-source per-image price.
- Leonardo.Ai: free tier, volume discounts, and whether the $0.1047 rate has minimums.
- All prices above were not read on a live page (see caveat at top).

## 2. Per-image price on inference marketplaces (fal.ai, Replicate) and cold start

### Takeaway
Open-weight matting models on marketplaces are one to two orders of magnitude cheaper than branded APIs: Replicate community models are reported at about $0.0004–$0.001 per run, while Bria's licensed models on fal are $0.018/image. fal's BiRefNet price could not be pinned down (model page shows "$0 per compute second"; a fal article says $0.0008/compute-second).

### Cited Findings
- **fal — Bria RMBG 2.0** (`fal-ai/bria/background/remove`): $0.018 per image. — [fal model page](https://fal.ai/models/fal-ai/bria/background/remove); [fal docs](https://fal.ai/docs/model-api-reference/image-generation-api/bria-background)
- **fal — Bria RMBG-3.0** (`bria/rmbg-3`): $0.018 per image (100 images = $1.80); described on the fal page as a 4-step distilled model built on "Fibo 2.0", citing a Bria internal November 2026 benchmark. No official Bria announcement was found. — [fal: bria/rmbg-3](https://fal.ai/models/bria/rmbg-3)
- **fal — Bria guided remove background** (prompt-driven variant): $0.03 per image. — [fal: bria/guided-remove-background](https://fal.ai/models/bria/guided-remove-background)
- **fal — BEN2** (`fal-ai/ben/v2/image`): $0.025 per megapixel (so cost scales with input size). — [fal: BEN v2 image](https://fal.ai/models/fal-ai/ben/v2/image/llms.txt)
- **fal — BiRefNet / BiRefNet v2**: model pages and playground display "$0 per compute second"; a fal learn article gives $0.0008 per compute second for BiRefNet v2. Conflicting; fal's general rule is that models without a fixed output price bill per second by GPU machine type. — [fal: birefnet v2](https://fal.ai/models/fal-ai/birefnet/v2/llms.txt); [fal: best background remover APIs 2026](https://fal.ai/learn/tools/best-background-remover-apis-2026); [fal pricing docs](https://fal.ai/docs/documentation/model-apis/pricing)
- **fal — Ideogram remove background**: $0.01 per image (listed for comparison in the same search; nature of the model not checked). — [fal: background remover APIs](https://fal.ai/explore/background-remover-apis)
- **Replicate — 851-labs/background-remover**: about $0.00040 per run (~2,500 runs per dollar), varies with inputs. — [Replicate](https://replicate.com/851-labs/background-remover)
- **Replicate — lucataco/remove-bg**: about $0.00051 per run (~1,960 runs per dollar); runs on Nvidia T4; predictions typically complete within 2 seconds. — [Replicate](https://replicate.com/lucataco/remove-bg)
- **Replicate — bria/remove-background** (official Bria listing): exists with a pricing tab, but the price was not captured. A third-party copy, `alexgenovese/remove-background-bria-2`, is listed at about $0.00098 per run — this is not the official Bria model and its licence position is unclear. — [Replicate: bria/remove-background](https://replicate.com/bria/remove-background); [Replicate: alexgenovese copy](https://replicate.com/alexgenovese/remove-background-bria-2)
- **RMBG-2.0 weights licence**: CC BY-NC 4.0; commercial use requires an agreement with Bria (so unofficial marketplace copies do not confer a commercial licence). — [Hugging Face: briaai/RMBG-2.0](https://huggingface.co/briaai/rmbg-2.0); [Bria: RMBG for commercial use](https://bria.ai/rmbg-for-commercial-use)

### Inferences
- If fal's BiRefNet v2 is really $0.0008/compute-second, a 1–3 second inference would cost about $0.001–$0.0025 per image; this is derived, not a listed per-image price.
- For 10k images/month: Replicate community rembg/BiRefNet-class models ≈ $4–$10; Bria on fal ≈ $180; BEN2 on fal ≈ $250 at 1 MP and proportionally more at phone-photo resolution.
- RMBG-3.0's description ("4-step distilled", "built on Fibo 2.0" — Fibo is Bria's generative image family) suggests it may be a diffusion-derived model rather than a pure matting network. Given the brief's exclusion of generative models, it should be checked before being treated as equivalent to RMBG 2.0.

### Gaps
- Replicate prices for `cjwbw/rembg`, a BiRefNet listing (e.g. `men1scus/birefnet`) and the official `bria/remove-background` were not found.
- **Cold-start times** on Replicate and fal for any of these models: no source found. (Replicate community models commonly scale to zero, but I found no measured cold-start figure to cite.)
- True fal BiRefNet price (the "$0 per compute second" display vs. the $0.0008 article).

## 3. Typical latency per image

### Takeaway
Very little latency data was found, and almost all of it is vendor-reported: Photoroom claims ~450 ms vs ~600 ms for remove.bg in its own benchmark; a Replicate rembg-class model reports ~2 s on a T4. No measured latency was found for Cloudinary, Bria, Leonardo, Pixelcut, Picsart, Adobe, AWS or fal.

### Cited Findings
- Photoroom reports about 450 ms per image for its API vs about 600 ms for remove.bg, "in our benchmark" (Photoroom marketing copy; the search summary did not say which Photoroom page carried it, most likely its remove.bg comparison page). — [Photoroom benchmark post](https://www.photoroom.com/inside-photoroom/background-remover-benchmark); [Photoroom blog: best enterprise image API](https://www.photoroom.com/blog/best-enterprise-image-api)
- `lucataco/remove-bg` on Replicate: predictions typically complete within 2 seconds on a T4. — [Replicate](https://replicate.com/lucataco/remove-bg)
- Bria RMBG 2.0 latency claims conflict: one platform lists a p50 runtime of 20 s, a reseller blog claims "under 500 ms on GPU". Neither is authoritative. — [Pixazo blog](https://www.pixazo.ai/blog/?p=2770110); [Runware model docs](https://runware.ai/docs/models/bria-rmbg-v2-0)
- Leonardo offers both a sync endpoint (single images) and an async endpoint with webhooks for batches and very large images; no timing published in what was found. — [Leonardo docs: background removal](https://docs.leonardo.ai/docs/background-removal)

### Inferences
- Because Cloudinary's background removal is a derived-asset transformation, the first request for a given asset has to compute it and later requests are served from cache; the app would need to handle a not-ready-yet first response (Cloudinary's docs were not readable in this session to confirm the exact behaviour — see Gaps).

### Gaps
- Cloudinary `e_background_removal` first-request latency and its documented in-progress behaviour (commonly described as a 423 response until the derived asset is ready) — could not be read on Cloudinary's docs this session.
- No independent latency measurements for any vendor; no cold-start data for marketplaces.

## 4. Output format, max resolution, crop/box input, and terms (commercial use, storage, training)

### Takeaway
Privacy posture is best documented for Photoroom (API images discarded after each job; several of its pages say API images are not used for training, though its English security page suggests self-serve plans train unless opted out) and partially for Leonardo (sync API "does not store your images"). For Bria the only finding is about training-data provenance, not customer-image handling. Resolution limits and crop/box parameters could mostly not be verified.

### Cited Findings
- **Photoroom — retention/training**: security page says images are discarded after each job; enterprise contracts default to no model training; self-serve plans "include a customer-controlled opt-out"; operational logs deleted after 15 days and API access logs kept one year. — [Photoroom security](https://www.photoroom.com/platform/security)
- **Photoroom — conflicting, more favourable statements**: help centre says for API users images are neither stored nor used for training unless explicitly requested; privacy policy says model improvement does not apply to images processed through the API. — [Photoroom help: does the AI learn from your images](https://help.photoroom.com/en/articles/10067660-does-the-ai-learn-from-your-images); [Photoroom privacy policy](https://www.photoroom.com/legal/privacy-policy)
- **Leonardo.Ai / remove.bg**: Leonardo's announcement states "remove.bg doesn't store your images, and neither does Leonardo's Sync API". This is the only storage statement found; nothing found about the async API or about training. — [Leonardo.Ai news](https://www.leonardo.ai/news/removebg-api-leonardo)
- **Leonardo output**: migration guide's sample request sets `"format": "png"`. — [Leonardo migration guide](https://docs.leonardo.ai/docs/migrate-from-the-removebg-api-to-leonardoai)
- **Bria**: marketed as trained exclusively on licensed data and cleared for commercial use (this is about Bria's training set, not about customer uploads). — [Bria: RMBG for commercial use](https://bria.ai/rmbg-for-commercial-use)
- **Bria RMBG 2.0 output/resolution**: returns a PNG with transparent background; fal lists "up to 1024x1024 (preserves input dimensions)"; a reseller blog claims a 4096×4096 limit. Conflicting. — [Cloudflare docs](https://developers.cloudflare.com/ai/models/bria/remove-background/); [fal docs](https://fal.ai/docs/model-api-reference/image-generation-api/bria-background); [Pixazo blog](https://www.pixazo.ai/blog/?p=2770110)
- **Cloudinary**: background removal is a transformation on an asset already stored in the customer's own Cloudinary account, and can be applied on upload or on the fly. — [Cloudinary docs: background removal](https://cloudinary.com/documentation/background_removal)
- **Open-weight licence constraint**: RMBG-2.0 weights are CC BY-NC 4.0, so commercial use needs Bria's hosted API, an official marketplace listing, or a Bria licence. — [Hugging Face: briaai/RMBG-2.0](https://huggingface.co/briaai/rmbg-2.0)

### Inferences
- Cloudinary adds no new sub-processor: the user photos already live there, so a cutout there does not send bedroom photos to an additional vendor. Every other option does.
- Since Cloudinary's transformation is chainable in a URL, a crop (`c_crop` with x/y/w/h) can be placed before `e_background_removal` in the same transformation chain, giving box-then-cutout without a separate API. This follows from how Cloudinary chained transformations work in general; I could not confirm on the docs page this session that background removal behaves correctly after a crop.
- For the other vendors, the generic route to "cut out one piece" is to crop client- or server-side and send the crop as the whole image; no vendor's box/ROI parameter was verified in this session.
- Photoroom's wording differs between pages; for bedroom photos with the user in frame the safe reading is "opt out explicitly / get it in writing" rather than assuming the default.

### Gaps
- Not verified for any vendor: maximum input/output resolution (megapixels), supported output formats beyond PNG (WebP alpha), and existence of a crop/box/ROI or mask-prompt parameter (remove.bg historically had an `roi` parameter; whether Leonardo's replacement keeps it was not found).
- Cloudinary: megapixel/size limits for `e_background_removal`, `fineedges` behaviour, and Cloudinary's own terms on training with customer assets — docs not readable this session.
- Bria, Pixelcut, Picsart, Slazzer, Clipdrop, Adobe, AWS, fal, Replicate: no terms-of-service findings on retention of inputs/outputs or training on customer images.
- No vendor's commercial-use restrictions (e.g. reselling, attribution) were read on a primary terms page.

## 5. Published or independent comparisons on apparel

### Takeaway
No independent, apparel-specific benchmark (flat lays, hangers, on-body, sheer/lace, dark-on-dark) was found. The comparisons that exist are vendor-published and general-product; the most useful signal is that open models (RMBG-2.0 / BiRefNet class) score within a few points of remove.bg on e-commerce product images.

### Cited Findings
- **Runflow (17 Feb 2026, vendor blog; publishes test images and scoring code)**: composite score 0–100 (IoU 50%, edge quality 30%, transparency 20%): remove.bg 95, an anonymised commercial API 94, RMBG-2.0 93, SAM 2 91; RMBG-2.0 ties remove.bg at 96 on e-commerce product images; apparel is not broken out; sample size not stated in what was retrieved (an earlier search summary said 5,000 product images, a later one could not confirm it). — [Runflow benchmark](https://www.runflow.io/blog/background-removal-benchmark)
- **Photoroom "Background Remover Arena"**: human pairwise voting with Elo ranking, about 9,000 public votes (Dec 2024–Jan 2025); explicitly notes performance varies by category (apparel vs pets vs electronics); Photoroom reports itself first and remove.bg second. Vendor-run. — [Photoroom benchmark post](https://www.photoroom.com/inside-photoroom/background-remover-benchmark); [Photoroom docs: competitors benchmark](https://docs.photoroom.com/resources/remove-background-competitors-benchmark-remove.bg-clipdrop-sam-azure)
- **SnapEdit 2026 API comparison** (SnapEdit is one of the tools compared): rates remove.bg the most expensive option with below-average quality scores. — [SnapEdit blog](https://snapedit.app/blog/?p=3530)
- **DEV Community post**: a 500-real-product-image test of BiRefNet vs rembg vs U2Net; the author recommends BiRefNet for images with people, hair, apparel or glass. Individual author, numbers not captured. — [DEV Community](https://dev.to/om_prakash_3311f8a4576605/birefnet-vs-rembg-vs-u2net-which-background-removal-model-actually-works-in-production-d2f)
- **Cloudflare engineering blog**: evaluated segmentation models for its Images background removal and describes BiRefNet as built for high-resolution segmentation. — [Cloudflare blog](https://blog.cloudflare.com/background-removal/)
- **Reseller claim**: Bria RMBG 2.0 "handles semi-transparent fabrics and fine hair" (Pixazo, a reseller; marketing claim). — [Pixazo blog](https://www.pixazo.ai/blog/?p=2770110)
- **Microsoft** itself points former Azure background-removal users to BiRefNet. — [Microsoft Learn](https://learn.microsoft.com/en-us/azure/ai-services/computer-vision/concept-background-removal)

### Inferences
- All of these benchmarks measure "remove the background from a product shot", which is not the wardrobe app's hard case: isolating one garment from a cluttered bedroom photo, possibly worn by a person. A salient-object model will keep the person, the hanger and anything else salient. None of the sources test that, so vendor rankings here are weak evidence for this use.
- The practical conclusion the sources support is to run an own test set (flat lay, hanger, on-body, sheer/lace, dark-on-dark, white-on-white) through 3–4 candidates; quality differences among the top tier on clean product shots are reported as only a few points.

### Gaps
- No benchmark found covering flat lays vs hangers vs on-body, sheer/lace, or dark-on-dark garments for any of these APIs.
- No published quality evidence for Cloudinary's `e_background_removal` on apparel, nor which underlying model it uses.
- Photoroom Arena Elo tables and Runflow per-category numbers were not retrieved in full.
