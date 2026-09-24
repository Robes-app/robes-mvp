# Robes platform — cost research (media, AI, platform)

Researched **2026-09-24**. Every price below comes from a vendor page fetched that day unless it is marked
**[unverified]**, meaning it is from a secondary source or my own knowledge and the vendor page did not show the number.
All prices are USD list prices, US regions, before tax and before any negotiated discounts.
The numbers in the models are order-of-magnitude estimates. They are meant for comparing options, not for budgeting to the dollar.

---

## 0. TL;DR

1. **AI is 95%+ of the bill at every scale.** At the stated usage, Gemini costs **about $2.47 per MAU per month today**, or about $1.20 with the levers in §4. Storage and delivery cost cents per MAU if done right. Image generation (`gemini-3.1-flash-image` at $0.067 per 1K image) is the line item to manage.
2. **Model-name corrections.**
   - The 2.5 family (`gemini-2.5-flash`, `-flash-lite`, `-pro`) is now **access-restricted** to existing users.
   - `gemini-2.5-flash-image` **shuts down on 2026-10-02**.
   - The current recommended Flash is `gemini-3.8-flash`. Its promo price doubles on 2027-01-01.
   - `gemini-3.1-flash-image` ("Nano Banana 2") is a stable model ID. There is also a new `gemini-3.1-flash-lite-image` at half the price.
3. **Cloudinary and Supabase image transforms don't scale for this workload.**
   - Cloudinary charges 1 credit (about $0.41) per GB stored. The wardrobe originals alone push it to about $15k/mo at 25k MAU.
   - Supabase charges $5 per 1,000 *distinct origin images transformed per month*, which is about $15k/mo at 25k MAU.
   - Cloudflare Images on R2 has the same problem ($0.50 per 1,000 unique transformations).
4. **Recommendation:**
   - **S3 + CloudFront (flat-rate plan) + renditions pre-generated on upload** (SQS → Lambda + sharp).
   - Private photos served through **CloudFront signed cookies (web) and signed URLs (Expo)**, never S3 presigned GETs.
   - Lifecycle rules: originals move to Glacier IR after 30 days, and raw Gemini PNGs are deleted after 7 days.
   - Cost: about $21/mo at 1k MAU, about $680 at 25k, and about $6.3k at 250k, against about $620 / $15.5k / $155k on Cloudinary list prices.
5. **Background removal:** self-hosted **BiRefNet** on serverless GPU, called from the SQS worker, costs about $0.0002 per image. Use fal-hosted BiRefNet or Photoroom ($0.02) as the fallback or bootstrap. Don't use Gemini image edit for cutouts: it can alter the garment.

---

## 1. Storage + delivery: current list prices

### 1.1 AWS S3 (us-east-1)
Sources: https://aws.amazon.com/s3/pricing/ (fetched 2026-09-24; the page renders its tables client-side, so only some numbers came through) and https://www.cloudzero.com/blog/s3-pricing/ (2026).

| Item | Price | Status |
|---|---|---|
| S3 Standard, first 50 TB | $0.023 / GB-mo | verified (aws page) |
| S3 Standard-IA | $0.0125 / GB-mo, 30-day minimum, 128 KB minimum object size | IA price from secondary source; minimums verified |
| S3 Glacier Instant Retrieval | $0.004 / GB-mo, 90-day minimum, retrieval about $0.03/GB | storage from secondary source; retrieval **[unverified]** |
| S3 Intelligent-Tiering | same as Standard in the frequent tier, IA-like after 30 days, Archive Instant tier after 90 days; monitoring fee $0.0025 per 1,000 objects/mo | **[unverified]** |
| PUT/COPY/POST/LIST | $0.005 per 1,000 | **[unverified]** (long-standing list price) |
| GET | $0.0004 per 1,000 | **[unverified]** |
| Transfer S3 → CloudFront | $0 | long-standing policy |
| Transfer S3 → internet | $0.09/GB after 100 GB free | verified |

**Intelligent-Tiering vs explicit lifecycle rules.** Robes stores many small renditions of about 30–100 KB. Objects under 128 KB are never auto-tiered by Intelligent-Tiering, and the monitoring fee is charged per object. Our access pattern is predictable: hot for about 30 days, then rarely read. So use **explicit lifecycle rules**, not Intelligent-Tiering.

### 1.2 CloudFront
Sources: https://aws.amazon.com/cloudfront/pricing/, https://aws.amazon.com/cloudfront/pricing/pay-as-you-go/, and https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/flat-rate-pricing-plan.html (all fetched 2026-09-24).

**Pay-as-you-go:**

| Item | Price |
|---|---|
| Always-free tier | 1 TB egress, 10M HTTP(S) requests, 2M CloudFront Functions invocations, 2M KeyValueStore reads per month |
| Egress, US/EU | $0.085/GB for the next 9 TB, then lower tiers. The 10–50 TB tier is about $0.080 **[unverified]**. |
| HTTPS requests | $0.010–$0.022 per 10k, depending on region |
| CloudFront Functions | $0.10 per 1M |
| Lambda@Edge | $0.60 per 1M requests plus $0.00005001 per GB-s |
| Origin Shield | $0.0075–$0.016 per 10k |
| KeyValueStore reads | $0.03 per 1M |

**Flat-rate plans** (these have no overage charges):

| Plan | $/mo | Requests | Data transfer | S3 Standard storage credit included |
|---|---|---|---|---|
| Free | 0 | 1M | 100 GB | 5 GB |
| Pro | 15 | 10M | 50 TB | 50 GB |
| Business | 200 | 125M | 50 TB | 1 TB |
| Premium | 1,000 | 500M (configurable up to 6B) | 50 TB (up to 600 TB) | 5 TB |

How the flat-rate plans work:
- Each plan also bundles WAF, DDoS protection, Route 53 for the plan's zone, the TLS certificate, CloudWatch log ingestion and CloudFront Functions.
- Signed URLs and OAC are supported on every tier. Lambda@Edge works but is billed pay-as-you-go.
- Allowances are not hard caps. A first spike up to 3× is tolerated. Sustained overage for 2–3 months or more can lead to "traffic delivery adjustments", meaning fewer or more distant edge locations.
- One distribution and one apex domain per plan.
- Unsupported on flat-rate plans: real-time logs, continuous deployment, multi-tenant distributions, Anycast static IPs, WAF rule groups, and the legacy `ForwardedValues` setting.

For an image-heavy app, **the request count is the binding constraint, not the data transfer.** At our mix, Pro (10M requests) covers roughly 13k MAU and Business covers roughly 170k MAU.

### 1.3 AWS "Dynamic Image Transformation for Amazon CloudFront" (formerly Serverless Image Handler)
Sources:
- https://docs.aws.amazon.com/solutions/latest/dynamic-image-transformation-for-amazon-cloudfront/cost.html
- https://docs.aws.amazon.com/solutions/latest/dynamic-image-transformation-for-amazon-cloudfront/cost-considerations.html
- https://aws.amazon.com/solutions/implementations/dynamic-image-transformation-for-amazon-cloudfront/

(All fetched 2026-09-24.)

How it works:
- The solution has two architectures:
  - **Lambda:** CloudFront → API Gateway → Lambda with sharp → S3.
  - **ECS:** Fargate tasks that run continuously with a minimum task count, plus DynamoDB. This one is newer (v8.x) and adds a Rekognition result cache.
- The docs now recommend attaching a CloudFront **flat-rate plan** to its distribution. The AWS doc's own cost tables did not render in the fetch, so there is no AWS-published total here.

Cost drivers:
1. **Cache misses.** Every miss is one API Gateway request plus one Lambda invocation of about 0.3–1.5 s at 1–2 GB. My estimate is about $0.00003 per transform **[estimate]**.
2. The CloudFront delivery itself.
3. S3 GETs on misses.
4. Optional Rekognition smart-crop or moderation at $0.001 per API call per uncached image.
5. Secrets Manager, only if URL signing is on.
6. With the ECS architecture, idle Fargate tasks that cost money even at zero traffic.

Robes' private, per-user images have low cross-user reuse, so misses stay high. This option only wins if the number of variants is large or unpredictable.

### 1.4 Cloudflare R2 + Cloudflare Images + Workers
Sources: https://developers.cloudflare.com/r2/pricing/, https://developers.cloudflare.com/images/pricing/, https://developers.cloudflare.com/workers/platform/pricing/, and https://blog.cloudflare.com/background-removal/ (all fetched 2026-09-24).

**R2:**

| Item | Price |
|---|---|
| Standard storage | $0.015 / GB-mo |
| Infrequent Access storage | $0.01 / GB-mo, 30-day minimum, plus $0.01/GB retrieval |
| Class A operations (writes) | $4.50 per 1M (IA: $9.00) |
| Class B operations (reads) | $0.36 per 1M (IA: $0.90) |
| Deletes | free |
| **Egress** | **free** |
| Free tier | 10 GB storage, 1M Class A, 10M Class B |

**Cloudflare Images:**
- 5,000 transformations per month free, then **$0.50 per 1,000 unique transformations per month**.
- A "unique transformation" is one image and parameter set, counted once per calendar month. `format=auto` counts once even if both AVIF and WebP are served.
- Images-bucket storage is $5 per 100k images; delivery is $1 per 100k. When the originals live in R2, you pay transformations only.
- `segment=foreground` does background removal with BiRefNet. It was in open beta as of 2025-08-28, and its billing is not stated **[unverified — presumably charged as a transformation]**.

**Workers Paid:** $5/mo, including 10M requests and 30M CPU-ms. After that, $0.30 per 1M requests and $0.02 per 1M CPU-ms.

Private content on R2 has no native equivalent of signed cookies. You need a Worker that checks an HMAC/JWT token, or WAF token authentication, which is a paid-zone feature.

### 1.5 Supabase Storage
Sources: https://supabase.com/pricing, https://supabase.com/docs/guides/storage/serving/image-transformations, and https://supabase.com/docs/guides/platform/manage-your-usage/storage-image-transformations (fetched 2026-09-24).

Pro plan:
- **Storage:** 100 GB included, then $0.0213/GB.
- **Egress:** 250 GB uncached plus 250 GB cached included. Overage is $0.09/GB uncached and $0.03/GB cached.
- **Image transformations:** Pro and above only. 100 origin images included, then **$5 per 1,000 distinct origin images transformed per billing cycle**, billed in whole packages.
  - The count is per distinct image, not per variant.
  - Maximum output size is 2500 px. Output is WebP automatically. AVIF is accepted as input, but whether it is available as auto output is unclear.

Every image a user looks at in a month counts toward the transformation bill. That makes the cost linear in active catalogue size, at about $0.005 per image per month.

### 1.6 Cloudinary
Sources: https://cloudinary.com/pricing and https://cloudinary.com/documentation/transformation_counts (fetched 2026-09-24), plus the Cloudinary AI Background Removal add-on docs page.

**Plans:**

| Plan | $/mo (monthly billing) | $/mo (annual billing) | Credits/mo |
|---|---|---|---|
| Free | 0 | 0 | 25 |
| Plus | 99 | 89 | 225 |
| Advanced | 249 | 224 | 600 |
| Enterprise | custom | custom | custom |

- **1 credit = 1,000 transformations = 1 GB managed storage = 1 GB image bandwidth.** The effective price is about $0.41–0.44 per credit.
- Overage handling on self-serve plans **[unverified]**: secondary sources say Plus and Advanced warn and then restrict rather than bill overage, and that a PAYG option runs about $0.45/credit.
- `f_auto` can create one derived asset per format, and each one counts.
- **`e_background_removal` costs 75 transformations on top of the base count**, which is about 0.075 credits or about $0.03 per image.
- The legacy AI Background Removal add-on is closed to accounts created after 2026-02-01.

**Storage is the killer.** Cloudinary charges about $0.41 per GB-month against $0.023 on S3 Standard and $0.004 on Glacier IR, which is 18–100× more.

### 1.7 Vercel (Image Optimization and bandwidth)
Sources: https://vercel.com/pricing, https://vercel.com/docs/pricing, https://vercel.com/docs/plans/pro-plan, https://vercel.com/docs/pricing/flat-rate-cdn, and https://vercel.com/docs/image-optimization/limits-and-pricing (docs last updated 2026-08/09; fetched 2026-09-24).

**Pro plan:**
- $20/mo platform fee, which includes 1 deploying seat and **$20 of usage credit**. Extra seats are $20 each; viewer seats are free.
- **Flat Rate CDN:**
  - The Pro fee includes 1M CDN requests and 1 TB of transfer.
  - Paid tiers are $20 (10M requests / 50 TB), $100 (50M / 50 TB) and $300 (150M / 50 TB).
  - **Fair-use rules exclude "large-scale delivery of media … where such delivery constitutes a majority of bandwidth."** Serving Robes' images through Vercel would break these rules.
- **On-demand (outside flat-rate):** Fast Data Transfer is about $0.15/GB. Edge Requests are $2 per 1M. Invocations are $0.60 per 1M. Active CPU is $0.128 per hour and Provisioned Memory is $0.0106 per GB-hr (both iad1).

**Image Optimization (`next/image`):**
- Transformations: $0.05–$0.0812 per 1K, billed on every cache MISS or STALE.
- Cache reads: $0.40–$0.64 per 1M 8 KB units.
- Cache writes: $4.00–$6.40 per 1M 8 KB units.
- Fast Data Transfer and Edge Requests on delivery are billed on top.

**Why not to route images through Vercel:**
1. It breaks Flat-Rate CDN fair use for media-majority traffic.
2. Private per-user images make cache hit rates poor, so you pay transformations repeatedly.
3. Every image request also counts as a Vercel CDN request.
4. The Expo app can't use `next/image` anyway.

Use `images.unoptimized: true`, or a custom `loader` that emits CloudFront rendition URLs.

---

## 2. Worked monthly cost model (storage + delivery)

### 2.1 Assumptions (per MAU per month)
- **40 wardrobe photos** uploaded, stored once, 3 MB original each: 120 MB.
  - This is aggressive. Real users likely upload in a burst and then taper off. The number drives storage linearly.
- **30 generated images** at 1.5 MB each (Gemini PNG): 45 MB.
- **Each of the 70 images is viewed about 10 times at about 150 KB**: 700 image requests and about 105 MB delivered.
- **Share pages:** 10 views per MAU per month, each loading 3 images at about 200 KB: 30 requests and 6 MB.
- **Totals per MAU per month:** about 730 image requests and about 111 MB egress.
- **Retention:** the stored footprint equals **6 months of uploads per current MAU**. This is a steady-state proxy that includes churned users' data. Month-1 storage is about 1/6 of the figures below.
- **Cache behaviour:** 50% CDN miss ratio for private images, 120 distinct source images viewed per MAU per month (70 new plus 50 older), and 3 widths per image.
- **Renditions** (options c and e2): 4 files per image — WebP and AVIF at 3 widths plus a master — averaging 0.36 MB per image in total.
- **Lambda sharp:** about 6 GB-s per image on Arm, about $0.00008.
- **Lifecycle** (options c and e2):
  - Wardrobe originals stay in Standard for 30 days, then move to Glacier IR (or R2 IA).
  - A 2048 px master (about 0.6 MB) is kept hot.
  - Gemini PNGs are transcoded to a master of about 250 KB, and the PNG is deleted after 7 days.

| Derived volume | 1k MAU | 25k MAU | 250k MAU |
|---|---|---|---|
| New images per month | 70k | 1.75M | 17.5M |
| CDN image requests per month | 0.73M | 18.3M | 183M |
| Egress | 108 GB | 2.7 TB | 27 TB |
| Stored, naive (full originals, no lifecycle) | 0.97 TB | 24 TB | 242 TB |
| Stored with lifecycle (Standard + Glacier IR) | 0.45 + 0.59 TB | 11 + 14.6 TB | 112 + 146 TB |

### 2.2 Results (USD/month, storage + delivery + transforms only)

| Option | 1k MAU | 25k MAU | 250k MAU | Notes |
|---|---|---|---|---|
| **(a) Cloudinary** (list price, about $0.415/credit) | ~$620 (about 1,500 credits, already over Advanced's 600) | ~$15,500 | ~$155,000 | Storage makes up about 65% of credits. At 25k+ this is an Enterprise negotiation; even a 50% discount stays 20× option (c). |
| **(b1) Supabase Storage + on-the-fly transforms** | ~$620 (of which $600 is transforms) | ~$15,600 | ~$156,000 | $5 per 1k distinct origin images per month dominates. |
| (b2) Supabase Storage, renditions pre-generated elsewhere, no transforms | ~$22 | ~$660 | ~$6,900 | Cheap, but Supabase has no Glacier-class tier, and signed-URL delivery goes through Supabase's CDN at $0.03–0.09/GB. |
| **(c) S3 + CloudFront + pre-generated renditions** ✅ | **~$21** (CloudFront free tier; S3 about $13; PUTs about $3; Lambda about $6) | **~$680** (S3 $317, PUTs $70, Lambda $140, CloudFront PAYG about $152 or Business $200) | **~$6,300** (S3 $3,170, PUTs $700, Lambda $1,400, CloudFront Premium $1,000) | Predictable. No per-view compute. Flat-rate plans remove egress risk. |
| (d) S3 + CloudFront + Dynamic Image Transformation (on-the-fly) | ~$20 | ~$660 | ~$6,100 | Transforms on 50% misses: $10 / $260 / $2,600. Rendition storage and PUTs are saved. Adds 300–800 ms latency on a miss and an API Gateway + Lambda hot path. Its cost is very sensitive to the miss ratio. |
| (e1) R2 + Cloudflare Images transforms | ~$190 | ~$4,800 | ~$48,000 | $0.50 per 1k unique transformations × 3 widths × images viewed. |
| (e2) R2 + pre-generated renditions + Worker token auth | ~$23 | ~$520 | ~$5,300 | Zero egress. R2 IA ($0.01) is dearer than Glacier IR ($0.004) for cold originals. You have to build your own signed-access Worker. |

How to read these numbers:
- Option **(c)** and option **(e2)** are within about 15% of each other at every scale. **(d)** is similar if Origin Shield keeps misses low.
- The 10–25× gap is between **pre-rendered or cheap on-the-fly** options (c, d, e2, b2) and **per-image-transform-priced managed services** (a, b1, e1).
- The storage assumptions make up most of the (c) total. Downscaling originals at ingest is worth more than choosing between S3 and R2.

### 2.3 Recommendation: (c) S3 + CloudFront + pre-generated renditions

**Why (c):**
- The team already runs AWS CDK, SQS and Lambda, so the upload pipeline (S3 event → SQS → Lambda + sharp) and background removal fit the existing worker model.
- Glacier IR is the cheapest place for rarely-read originals ($0.004).
- CloudFront flat-rate plans make delivery a fixed cost with no overages: $0 → $200 → $1,000. They also bundle WAF and DDoS protection, which a consumer app with public share pages needs.
- CloudFront signed cookies and signed URLs are first-class, with no custom auth Worker to maintain.
- Pre-generated renditions have no per-view compute, predictable latency, stable cache keys for `expo-image` disk caching, and don't depend on a third party's pricing model.

**Rendition spec:**
- WebP at 320 / 640 / 1080 px wide. Add AVIF only for the 1080 web hero.
- `expo-image` supports AVIF, but WebP-only halves PUTs and Lambda time. Measure before adding AVIF everywhere.
- Keep one master per image: 2048 px JPEG q85 for wardrobe, or WebP q85 for generated images. Lambda regenerates from it if the spec changes.
- Key layout:
  - `u/{userId}/w/{pieceId}/{w}.webp` for private wardrobe images
  - `u/{userId}/g/{genId}/{i}/{w}.webp` for private generated images
  - `pub/looks/{shareId}/...` for public share renditions, copied on share

**Private access: CloudFront signed cookies/URLs vs S3 presigned GETs**
- **S3 presigned GETs bypass the CDN.** They cost $0.09/GB S3 egress against $0 on CloudFront's flat plan or $0.085 on PAYG. Every URL is unique, so there is no edge caching and the app's disk cache is defeated. They also expose the bucket host. Use them only for **uploads** (presigned PUT/POST) and one-off admin downloads.
- **Web (Next.js):**
  - Set a **CloudFront signed cookie** using a custom policy with the wildcard resource `https://img.byrobes.com/u/{userId}/*`, valid 12–24 h, on login and refresh.
  - One signature covers every image, the URLs stay plain and cacheable, and signing costs nothing per request.
  - Cookies need the image domain to be a subdomain of the app domain (for example `img.byrobes.com`).
- **Expo:**
  - Cookie handling in React Native image loaders is unreliable, so use **signed URLs with a wildcard custom policy per user**.
  - Round the expiry to a fixed window (for example the next 00:00 UTC plus 24 h) so a given image URL is stable all day and `expo-image` caches it.
  - In the cache policy, **exclude query strings from the cache key**. The signature is still validated at the edge, and all signed variants share one cached object.
- Use **OAC** (Origin Access Control) so the bucket is fully private.
- Use a key group with 2 keys for rotation. Keep the private key in Secrets Manager or SSM, and sign in the Next.js API or a Lambda.
- Public share pages use a separate `pub/` behaviour with no signing and a long TTL.

**Lifecycle policies:**

| Prefix | Rule |
|---|---|
| `raw/uploads/` (original camera files) | Standard → **Glacier IR after 30 days**. Optionally expire after 365 days if the 2048 px master is enough for re-analysis. Glacier IR has a 90-day minimum, so only move objects expected to live more than 90 days. |
| `raw/gemini/` (1.5 MB PNG intermediates) | **Expire after 7 days**, once the WebP master and renditions exist. |
| Abandoned or failed generations, rejected alternates, and upload staging `tmp/` | Expire after 1–3 days. |
| All buckets | Abort incomplete multipart uploads after 1 day. |
| Share renditions `pub/` | Expire at the share TTL. The legacy app uses 48 h in-memory. |
| Bucket settings | Disable versioning on media buckets, or add a noncurrent-version expiry, so deleted and overwritten objects don't linger. |

---

## 3. Background removal for wardrobe photos
Volume: 40 photos per MAU per month, which is 40k / 1M / 10M photos per month at the three scales.

| Option | Unit cost | 1k | 25k | 250k | Quality / notes |
|---|---|---|---|---|---|
| Cloudinary `e_background_removal` | 75 transformations, about $0.031 | $1.2k | $31k | $311k | Good quality; very expensive. Source: transformation_counts doc. |
| remove.bg API | $0.27–$1.29 per image PAYG; subscriptions from $9/mo **[unverified, secondary: costbench.com, 2026]** | $11k+ | — | — | Excellent quality; priced for low volume. |
| Photoroom Remove Background API | **$0.02 per image** (Plus/Edit API $0.10; Enterprise needs 200k images/yr minimum). Source: https://www.photoroom.com/api/pricing | $800 | $20k | $200k (volume discount likely) | Excellent on products and apparel; zero ops. |
| Gemini image edit (`gemini-3.1-flash-image`) | about $0.067 per 1K output, or $0.034 on `-lite-image` | $2.7k | $67k | $670k | **Not recommended.** It is generative, so it can redraw or alter the garment (buttons, prints, logos). It is slow (about 10–30 s) and produces no true alpha channel. |
| fal.ai hosted BiRefNet v2 | $0.0008 per compute-second (secondary; the fal page did not render the rate) → about $0.001–0.002 per image | ~$60 | ~$1.5k | ~$15k | Same model as self-hosted; zero ops. Good bootstrap. |
| Cloudflare Images `segment=foreground` (BiRefNet) | probably billed as a transformation, about $0.0005 **[unverified]**; beta | ~$20 | ~$500 | ~$5k | Only makes sense if the stack is on R2 and Cloudflare. |
| **Self-hosted BiRefNet on serverless GPU** (Modal L4 at $0.000222/s; T4 at $0.000164/s, secondary: modal.com/pricing via 2026 guides) | about 0.3–0.6 s per 1024 px image, so **about $0.0001–0.0003**, plus cold-start overhead | ~$10–30 (cold starts dominate) | ~$200–400 | ~$2–3k | Best cost at scale. BiRefNet is MIT-licensed **[verify]**. Batch jobs from SQS. |
| Self-hosted rembg (u2net or isnet) on a Lambda container, CPU | about 1–3 s at 3 GB → **about $0.00005–0.0001** | ~$4 | ~$100 | ~$1k | Cheapest and fully in-account, but visibly worse edges on hair, lace and knitwear, and weaker on cluttered backgrounds. BiRefNet on CPU is about 10–20 s at 10 GB (about $0.002), which is not worth it. |

**Recommendation:**
- Ship with **fal-hosted BiRefNet**, with Photoroom as the quality fallback when the mask is low-confidence, say below 2% of photos.
- At about 10k MAU, move to **self-hosted BiRefNet** on a serverless GPU (Modal or RunPod), or on a SageMaker async or ECS GPU spot endpoint. Drive it from the existing SQS queue, batching 8–16 images per invocation.
- Store the cutout as WebP with alpha next to the renditions. Run it only once per piece. Dedupe by perceptual hash so re-uploads don't re-run it.

---

## 4. AI cost levers

### 4.1 Current Gemini prices
Sources: https://ai.google.dev/gemini-api/docs/pricing, https://ai.google.dev/gemini-api/docs/models, https://ai.google.dev/gemini-api/docs/batch-mode, https://ai.google.dev/gemini-api/docs/flex-inference, https://ai.google.dev/gemini-api/docs/media-resolution, and https://ai.google.dev/gemini-api/docs/image-generation (all fetched 2026-09-24).

**Text and vision models:**

| Model (exact ID) | Status | Input $/1M | Output $/1M (includes thinking) | Batch |
|---|---|---|---|---|
| `gemini-2.5-flash` | stable, **access restricted to prior users** | 0.30 | 2.50 | 50% off |
| `gemini-2.5-flash-lite` | stable, restricted | 0.10 | 0.40 | 50% off |
| `gemini-2.5-pro` (≤200k context) | stable, restricted | 1.25 | 10.00 | 50% off |
| `gemini-3.1-flash-lite` | stable | 0.25 | 1.50 | 50% off |
| `gemini-3.5-flash-lite` | stable | 0.30 | 2.50 | 50% off |
| `gemini-3.8-flash` (latest recommended Flash; also 3.7 and 3.6) | stable | 0.75 until 2026-12-31, **then 1.50** | 3.75, **then 7.50** | 50% off |
| `gemini-3.1-pro-preview` (≤200k context) | preview | 2.00 | 12.00 | 50% off |

**Image generation models:**

| Model (exact ID) | Input $/1M | Image output | Per image | Batch |
|---|---|---|---|---|
| `gemini-3.1-flash-image` ("Nano Banana 2") | 0.50 | $60 per 1M image tokens | **0.5K $0.045 · 1K $0.067 · 2K $0.101 · 4K $0.151**; text/thinking output $3 per 1M | per image halves: $0.022 / $0.034 / $0.050 / $0.076 |
| `gemini-3.1-flash-lite-image` ("Nano Banana 2 Lite") | 0.25 | $30 per 1M image tokens | **1K $0.0336** | $0.0168 |
| `gemini-3-pro-image` ("Nano Banana Pro") | 2.00 | $120 per 1M image tokens | 1K/2K $0.134 · 4K $0.24 | 50% off |
| `gemini-2.5-flash-image` | — | — | $0.039 | $0.0195 · **shuts down 2026-10-02** |

- **Context caching:** cached input costs about 10% of the normal input price (for example $0.03 against $0.30 on 2.5-flash). Explicit caches add storage at $1 per 1M tokens per hour (Flash) or $4.50 (Pro). Implicit caching of a stable prompt prefix is automatic on 2.5+ models.
- **Batch API:** 50% off. Targets a 24 h turnaround, usually much faster. Supports the image models and cached content.
- **Flex tier** (`service_tier: "flex"`): 50% off with a 1–15 min target latency. Requests can be preempted (503/429), so you need retries. The image models are **not listed** as supported.
- **Priority tier:** about 1.75–2× the standard price.
- **Image input tokens** (Gemini 3 `media_resolution`): low 280, medium 560, high and default 1,120, ultra_high 2,240.
- **Image aspect ratios** are free to choose: 1:1, 2:3, 3:2, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, 21:9. Price is set by the resolution tier, not the aspect ratio.

**Action items:**
1. Migrate any `gemini-2.5-flash-image` usage now.
2. Plan the text model before 2027-01-01, when 3.8-flash's price doubles. `gemini-3.1-flash-lite` is the value choice for JSON styling.
3. Keep `gemini-2.5-flash` and `gemini-2.5-pro` only while the account keeps access.

### 4.2 Cost per core action

Per-action assumptions:
- Text calls: 2.5–3k input tokens and about 2.5k output tokens, including about 1k thinking tokens.
- Image calls: about 400 prompt tokens plus 1–2 reference images at 1,120 tokens each.
- Images at 1K.

| Action | Today (2.5-flash text + NB2 1K, standard) | Optimized | How it's optimized |
|---|---|---|---|
| Style a piece (1 text + 3 images) | **$0.210** | $0.152 | 3.1-flash-lite text; 1 image eager, 2 lazy at about 60% viewed. Or $0.11 with Lite-image for the non-hero looks. |
| Daily look (1 text + 1 image) | $0.075 | **$0.011** | Overnight Batch, Lite-image; generated only for users active in the last 3 days (about 60%). |
| Travel edit (1 larger text + 5 images) | $0.350 | $0.209 | Lazy images at about 60% viewed. |
| Moodboard (7 images, 2 references) | $0.485 | $0.247 | Lite-image. Moodboard tiles are small, so Lite quality is acceptable (A/B it). |
| Style analysis (pro, about 10 photos, 14k input / 8k output) | $0.098 (2.5-pro) · $0.124 (3.1-pro-preview) | $0.029 | Batch or async (not interactive), with thinking capped at about 2k. |
| Wardrobe photo tagging (per photo) | $0.0037 | $0.0007 | 3.1-flash-lite, `media_resolution: medium`, thinking off. |

**Per MAU per month.** The mix is 5 style actions, 8 daily looks, 1 moodboard, 0.25 travel edits, 1 style analysis and 40 photos tagged, which is about 31 images:
- **Today: about $2.47 per MAU**, which is $2.5k / $62k / $617k at 1k / 25k / 250k MAU.
- **Optimized: about $1.20 per MAU**, which is $1.2k / $30k / $301k.
- Adding hard free-tier quotas (for example 3 styles and 1 moodboard per month) and Lite-image for all non-hero images brings this to about **$0.50–0.70 per MAU** **[estimate]**.

### 4.3 The levers, in order of impact
1. **Fewer and cheaper images per generation.**
   - Images make up about 90% of AI spend. Each NB2 1K image ($0.067) costs about as much as 25 text calls.
   - Generate 1 hero image eagerly and the others when they are scrolled into view.
   - Use `gemini-3.1-flash-lite-image` ($0.034) for secondary and thumbnail looks. Don't request 2K or 4K. A 0.5K image ($0.045) saves only a third and looks soft on retina screens.
2. **Batch everything non-interactive for 50% off:** daily looks overnight, the style DNA/analysis refresh, wardrobe re-tagging and weekly edits. Submit around 02:00 local and fall back to on-demand generation if the batch hasn't landed by the time the user opens the app.
3. **Lazy vs eager.**
   - Eager pre-generation only pays if the open rate is at least the discount factor. Batch halves the cost, so pre-generate only for users with an open rate of about 50% or more; otherwise generate on open.
   - The same logic applies within a result: render the text first, then images on demand.
4. **Text-first streaming.** Stream the JSON looks (`generateContentStream`) so the UI shows copy in about 2–4 s. This allows a lazy image policy without hurting perceived speed, and users who bounce after reading don't trigger images.
5. **Cap output and thinking.** Thinking tokens are billed as output. Set `thinkingBudget` (2.5) or `thinking_level: low` (3.x) on JSON styling, set `maxOutputTokens`, and use `responseSchema` so the model doesn't write long prose.
6. **Cheapest adequate model per task.**
   - `gemini-3.1-flash-lite` for classification, tagging and JSON.
   - Pro only for the deep style analysis.
   - `media_resolution: low/medium` for tagging (280–560 tokens instead of 1,120).
7. **Dedupe and cache.**
   - Hash (normalized prompt + piece ID + profile version + model) and store the result for 30 days.
   - The same piece restyled with the same inputs should return the stored looks.
   - Share-page views must never regenerate.
   - Cache weather and trend context for daily looks per city per day.
8. **Context caching.** Put the long system prompt and style guide first (at least about 1–4k tokens) to benefit from implicit caching at 90% off input. It is a small win, because output and images dominate.
9. **Guardrails.** Per-user daily quotas (Upstash rate limit), a spend alert on the Gemini project, and per-user cost logging to `prompt_history`.

---

## 5. Other platform costs
Sources (fetched 2026-09-24): https://supabase.com/pricing, https://supabase.com/docs/guides/platform/compute-and-disk, https://vercel.com/docs/plans/pro-plan, https://aws.amazon.com/lambda/pricing/, https://aws.amazon.com/sqs/pricing/, https://upstash.com/pricing/redis, https://resend.com/pricing, https://posthog.com/pricing, and https://sentry.io/pricing/. PostHog per-event tiers come from secondary sources (flexprice.io, 2026).

**Unit prices:**

| Service | Unit prices |
|---|---|
| Supabase Pro | $25/mo with $10 compute credit (covers Micro). Compute: Micro $10, Small $15, Medium $60, Large $110, XL $210. Database 8 GB included, then $0.125/GB. MAU 100k included, then $0.00325. Realtime: 500 connections included, then $10 per 1,000; 5M messages included, then $2.50 per 1M. PITR (7-day) $100/mo. Custom domain $10. Log drain $60. Team plan $599. |
| Vercel Pro | $20 platform fee including $20 credit; extra deploying seats $20 each; Flat Rate CDN tiers $0 / $20 / $100 / $300; Active CPU $0.128/h; memory $0.0106/GB-h; invocations $0.60/M. |
| AWS Lambda | $0.20 per 1M requests; $0.0000166667 per GB-s on x86 (Arm is cheaper); free tier 1M requests + 400k GB-s. |
| AWS SQS | 1M requests free. Each 64 KB chunk counts as a request. $0.40 per 1M for standard queues **[unverified, page didn't render]**. |
| Upstash Redis | Free: 500k commands and 256 MB. PAYG: $0.20 per 100k commands, $0.25/GB storage. Fixed plans: $10 (250 MB), $20 (1 GB), $100 (5 GB). Monthly command allowance on fixed plans **[unverified]**. |
| Resend | Free: 3k/mo (100/day). Pro: $20 (50k) or $35 (100k). Scale: $90 (100k) up to $650 (1M); overage $0.90–$0.46 per 1k. |
| PostHog | Free monthly: 1M events, 5k replays, 1M feature-flag requests, 100k exceptions. Then $0.00005/event (1–2M), stepping down. Identified-person events add about $0.000198 **[secondary]**. |
| Sentry | Developer $0 (5k errors); Team $26; Business $80 (50k errors, 5M spans, 50 replays). Error overage **[unverified]**. |

**Watch-out: Lambda workers that just await Gemini.**
- Gemini image calls take about 10–30 s, and Lambda bills wall-clock time.
- At 256 MB on Arm, a 35 s wait is about $0.00012 per image, or about $0.9k/mo at 250k MAU.
- Fire all N images of a generation with `Promise.all` inside **one** invocation so they share one memory-second bill.
- Vercel Fluid compute bills provisioned memory, not CPU, while awaiting, and packs concurrent requests into one instance. For interactive work it is often cheaper than Lambda.

### 5.1 Total monthly estimate (USD)

**Today's architecture:** Cloudinary for all media, Gemini on-demand at the current mix, Vercel + Supabase. **Recommended:** option (c) media, BiRefNet cutouts, and the optimized AI mix.

| Line item | 1k today | 1k rec. | 25k today | 25k rec. | 250k today | 250k rec. |
|---|---|---|---|---|---|---|
| **Gemini (AI)** | 2,470 | 1,200 | 61,700 | 30,100 | 617,000 | 301,000 |
| Media storage + delivery | 620 (Cloudinary) | 21 | 15,500 | 680 | 155,000 | 6,300 |
| Background removal (if done; today = Cloudinary) | 1,200 | 60 (fal) | 31,000 | 300 (self-hosted) | 311,000 | 2,500 |
| Supabase (Pro + compute + PITR + MAU/realtime overage) | 25 | 25 | 200 (Medium + PITR) | 200 | 1,000 (Large/XL, PITR, 150k extra MAU $490, realtime) | 1,000 |
| Vercel Pro (seats, CDN tier, functions) | 20–40 | 20–40 | 150 | 150 | 1,000 | 900 (images not proxied) |
| AWS Lambda/SQS/CloudWatch (non-media workers) | ~5 | ~10 | ~100 | ~150 | ~1,500 | ~1,500 |
| Upstash Redis | 0 | 0 | 20 | 20 | 100 | 100 |
| Resend | 20 | 20 | 35 | 35 | 650 | 650 |
| PostHog (about 300 events/MAU today, about 100 recommended) | 0 | 0 | ~240 | ~50 | ~2,000 | ~700 |
| Sentry | 26 | 26 | ~50 | ~50 | ~250 | ~250 |
| **Total (with bg removal)** | **~4,400** | **~1,400** | **~109,000** | **~31,700** | **~1,090,000** | **~315,000** |
| Total excluding bg removal | ~3,200 | ~1,350 | ~78,000 | ~31,400 | ~780,000 | ~312,000 |
| **Per MAU** | $3.2–4.4 | $1.35 | $3.1–4.4 | $1.27 | $3.1–4.4 | $1.26 |

- Cloudinary figures are list prices. An Enterprise deal at 25k+ would be materially lower but still far above (c).
- Vercel and Supabase at 250k are rough: they depend on request mix, database load and whether a read replica is needed (+$110–210).
- Everything outside AI and media is under 2% of the total at every scale.

---

## 6. Prioritized cost optimizations

| # | Optimization | Est. monthly saving at 25k MAU (≈ ×10 at 250k) | Effort |
|---|---|---|---|
| 1 | **Lazy images:** 1 hero image eager, the rest on scroll or tap, with text-first streaming | ~$8–12k (about 25–35% of image spend) | M |
| 2 | **Lite-image (`gemini-3.1-flash-lite-image`) for non-hero, moodboard and daily images**, after a quality A/B | ~$8–10k | S |
| 3 | **Batch API for daily looks, style analysis and re-tagging**, generated only for recently active users | ~$4–5k | M |
| 4 | **Move media off Cloudinary to S3 + CloudFront with pre-generated renditions** | ~$14.8k | L |
| 5 | **Don't use Cloudinary or Gemini for cutouts; use BiRefNet** (fal, then self-hosted) | up to ~$30k if cutouts run on Cloudinary today | M |
| 6 | **Per-user quotas and free-tier caps** on generations, with a paid tier for heavy users | Caps the tail. Heavy users are probably 3–5× the mean. | S |
| 7 | **Downscale at ingest** (2048 px master), lifecycle originals to Glacier IR at 30 days, delete Gemini PNGs at 7 days | ~$300 at 25k, ~$3k+ at 250k (about 50% of storage) | S |
| 8 | **Cheaper text models**: 3.1-flash-lite for JSON and tagging, thinking caps, `media_resolution: medium`, `responseSchema` | ~$1–1.5k | S |
| 9 | **Dedupe cache** on (prompt, piece, profile version, model), with share pages served from stored renditions | 5–15% of generations **[depends on usage]** | S |
| 10 | **CloudFront flat-rate plan** once requests exceed about 10M/mo (Business $200 → Premium $1,000) | ~$0 at 25k; ~$1.3k at 250k compared with PAYG | S |
| 11 | **Never use `next/image` for user media** (`unoptimized` or a custom loader) | Avoids $0.05 per 1k transforms plus Vercel CDN fair-use problems | S |
| 12 | **One Lambda invocation per generation** (parallel image awaits); keep interactive generation on Fluid compute | ~$50–100; ~$0.5–1k at 250k | S |
| 13 | **PostHog discipline**: anonymous events where possible, about 100 events/MAU, sampled replays | ~$200; ~$1.3k at 250k | S |
| 14 | Pin model IDs and set up **price-change alerts**: 3.8-flash doubles 2027-01-01; 2.5-flash-image shuts down 2026-10-02 | Avoids surprise increases | S |

---

## 7. Open uncertainties to resolve before committing
- The S3 IA, Glacier IR and request prices, and the CloudFront 10–50 TB egress tier, could not be read from the AWS pages (client-rendered). Verify with the AWS Pricing Calculator.
- The Cloudinary per-credit overage and Enterprise pricing are not public. The remove.bg, fal and Modal rates are from secondary sources.
- The Cloudflare Images `segment=foreground` billing is not published.
- Whether `gemini-3.1-flash-lite-image` quality is good enough for Robes' editorial look needs a blind A/B. Also check whether Flex tier will support image models.
- The **usage assumptions dominate everything**: 40 wardrobe uploads per MAU per month, and 30 images per MAU per month. Instrument actual per-user image generations and uploads (PostHog + `prompt_history`) and re-run §2 and §4 with real distributions. The model scripts are simple enough to rebuild in a spreadsheet.
