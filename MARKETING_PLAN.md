# BigCSV.co — Marketing Plan: First 100 Customers

---

## 1. Product Analysis

### What BigCSV.co Is
BigCSV.co is an all-in-one BigCommerce product management platform. It replaces the fragmented workflow of spreadsheets, manual exports, and third-party PDF tools with a single dashboard purpose-built for BigCommerce merchants.

### Core Features & Benefits

| Feature | What It Does | Pain Point It Solves |
|---------|-------------|---------------------|
| **CSV Exporter** | Export product data with 50+ customizable fields, drag-and-drop column ordering, and presets (Facebook Commerce, etc.) | BigCommerce's native export is rigid — merchants waste hours reformatting CSVs for marketplaces, ad platforms, and distributors |
| **Product Library** | Sync catalog + AI-generated product summaries via Claude | Writing/rewriting product descriptions is tedious; merchants with 500+ SKUs can't do it manually |
| **Price Adjuster** | Bulk edit prices with % or $ adjustments, smart rounding, category filtering | Updating prices across hundreds of products is error-prone and slow in BigCommerce admin |
| **Sales Book Builder** | Drag-and-drop PDF catalog builder with cover pages, sections, and print-ready output | Merchants currently use InDesign, Canva, or Word to build sales materials — disconnected from live product data |
| **Time Capsule** | Point-in-time snapshots of your entire catalog | No easy way to see "what did my catalog look like 3 months ago?" for auditing, compliance, or seasonal planning |

### Unique Competitive Advantages

1. **BigCommerce-native** — Not a generic tool adapted for BigCommerce. Built specifically for its API, data model, and merchant workflow.
2. **AI-powered product enrichment** — Claude integration for generating/rewriting product descriptions at scale. No competitor in the BigCommerce ecosystem offers this.
3. **Sales Book PDF generation** — A feature that doesn't exist in any BigCommerce app. Merchants currently cobble this together manually.
4. **All-in-one** — Replaces 3-4 separate tools (CSV formatter, price editor, catalog designer, backup tool).
5. **No per-product pricing** — Unlike competitors that charge per SKU or per export, this is a flat-rate tool.

### Target Customer Profile

**Primary:** BigCommerce store owners and catalog managers with 100-5,000+ SKUs who:
- Sell wholesale or B2B (need sales books/line sheets)
- Manage frequent price changes (seasonal, cost-driven)
- Export product data for marketplaces, ads, or distributors
- Have felt the pain of BigCommerce's limited native export tools

**Secondary:** BigCommerce agencies and freelancers managing multiple client stores.

---

## 2. Website Conversion Audit — What's Missing

The current site is a functional app but **not built to convert visitors into customers**. Here's what needs to change:

### Critical Gaps

| Gap | Impact | Priority |
|-----|--------|----------|
| **No public-facing landing page** — homepage is a login form | Visitors can't understand the product without signing up | P0 |
| **No pricing page** | Visitors can't evaluate cost; creates friction and uncertainty | P0 |
| **No product screenshots or demo** | Visitors have no visual proof the tool works | P0 |
| **No social proof** (testimonials, logos, case studies) | No trust signals for new visitors | P0 |
| **No SEO content** — zero public pages for search engines to index | Invisible to organic search | P1 |
| **No free trial or freemium hook** | High barrier to entry — must commit before trying | P1 |
| **No onboarding email sequence** | New signups get no guidance, leading to drop-off | P1 |
| **No "how it works" section** | Visitors don't understand the workflow | P1 |
| **No comparison to alternatives** | Merchants can't see why this beats spreadsheets/other apps | P2 |
| **No blog or content hub** | No inbound traffic engine | P2 |

---

## 3. Website Changes — Build to Convert

### Phase 1: Foundation (Week 1-2)

#### 3.1 New Public Landing Page (`/`)
Replace the current login-as-homepage with a proper marketing page:

**Structure:**
1. **Hero Section** — Headline, subhead, CTA, hero screenshot
   - Headline: *"The BigCommerce Product Toolkit You've Been Missing"*
   - Subhead: *"Export smarter CSVs, build print-ready sales books, bulk-edit prices, and enrich products with AI — all from one dashboard."*
   - CTA: "Start Free Trial" (primary) + "See How It Works" (secondary)
   - Hero image: Full dashboard screenshot or animated GIF

2. **Logo Bar** — "Trusted by BigCommerce merchants" (add logos as you get them)

3. **Feature Sections** — One section per tool with:
   - Screenshot/GIF of the feature in action
   - 3 bullet points of benefits (not features)
   - Mini-CTA: "Try it free"

4. **How It Works** — 3 steps:
   - Step 1: Connect your BigCommerce store (30 seconds)
   - Step 2: Sync your product catalog
   - Step 3: Export, build, price, and publish

5. **Social Proof** — Testimonial cards (collect from early users)

6. **Pricing Section** — Anchor on the landing page (see 3.2)

7. **FAQ Section** — Address objections:
   - "Is my data secure?" (AES-256 encryption)
   - "Does it work with my BigCommerce plan?"
   - "Can I cancel anytime?"
   - "How is this different from BigCommerce's built-in tools?"

8. **Final CTA** — "Ready to manage your catalog like a pro? Start your free trial."

9. **Footer** — Links, contact email, social links

#### 3.2 Pricing Page / Section
Recommended pricing model:

| Plan | Price | Includes |
|------|-------|----------|
| **Starter** | $29/mo | CSV Exporter, Product Library (up to 500 products), 1 user |
| **Pro** | $59/mo | All tools, unlimited products, AI summaries (100/mo), 3 users |
| **Business** | $99/mo | Everything in Pro, unlimited AI summaries, unlimited users, priority support |

- Annual discount: 2 months free (pay for 10, get 12)
- **14-day free trial** on all plans, no credit card required
- Highlight "Pro" as the recommended plan

#### 3.3 Free Trial Flow
- Sign up with email only (no credit card)
- 14-day full access to Pro plan
- Onboarding wizard: connect BigCommerce → sync products → guided first export
- Day 7 and Day 12 email nudges
- Trial expiry → downgrade to read-only, prompt to subscribe

#### 3.4 Login Page Separation
Move login to `/login` (already exists). The homepage should be the marketing page.

### Phase 2: Trust & Content (Week 3-4)

#### 3.5 Blog / Content Hub (`/blog`)
Create SEO-targeted content (see Channel Strategy below).

#### 3.6 Case Studies Page
After first 5-10 customers, publish short case studies:
- Store name, size, industry
- Problem they had
- How BigCSV solved it
- Quantified result (time saved, revenue impact)

#### 3.7 Live Chat / Support Widget
Add Crisp, Intercom, or similar for real-time support. Early-stage, every conversation is a learning opportunity.

---

## 4. Marketing Channels — First 100 Customers

### Channel Mix Overview

| Channel | Effort | Cost | Expected Customers | Timeline |
|---------|--------|------|-------------------|----------|
| BigCommerce App Marketplace | High | Free | 20-30 | Month 2-4 |
| BigCommerce Community & Forums | Medium | Free | 10-15 | Month 1-3 |
| Content Marketing / SEO | High | Low | 15-25 | Month 2-6 |
| Cold Outreach to BC Merchants | Medium | Low | 10-15 | Month 1-2 |
| BigCommerce Agency Partnerships | Medium | Free | 10-15 | Month 2-4 |
| Social Media (LinkedIn, X) | Low | Free | 5-10 | Month 1-3 |
| Paid Ads (Google, Reddit) | Low | $500-1K/mo | 10-15 | Month 2-4 |

---

### 4.1 BigCommerce App Marketplace (Top Priority)

**Why:** This is where BigCommerce merchants actively search for tools. It's the #1 distribution channel for this product.

**Action Plan:**
1. Apply to the BigCommerce App Marketplace (partner program)
2. Optimize listing with:
   - Screenshots of each feature
   - Clear description with keywords: "CSV export," "sales book," "bulk pricing," "product catalog PDF"
   - Video walkthrough (2-3 minutes)
3. Collect and showcase reviews aggressively — ask every early user
4. Target categories: "Catalog & Order Management," "Data & Reporting"

**Timeline:** Application takes 2-4 weeks. Plan for Month 2 launch.

---

### 4.2 BigCommerce Community & Forums

**Why:** Active community of merchants asking for exactly what BigCSV does.

**Action Plan:**
1. **BigCommerce Community Forum** — Answer questions about CSV exports, product management, catalog organization. Link to BigCSV where relevant (not spammy).
2. **Reddit** — Active in r/bigcommerce, r/ecommerce, r/smallbusiness. Post genuine help + mention the tool when relevant.
3. **Facebook Groups** — "BigCommerce Users," "BigCommerce Entrepreneurs," "E-Commerce Sellers"
4. **Discord/Slack** — BigCommerce partner channels, ecommerce communities

**Key Rule:** Lead with help, not promotion. Answer the question first, then mention the tool.

**Weekly commitment:** 3-5 posts/comments per week across platforms.

---

### 4.3 Content Marketing & SEO

**Why:** BigCommerce merchants Google their problems. Be the answer.

**Target Keywords (long-tail, low competition):**

| Keyword | Search Intent | Content Type |
|---------|--------------|--------------|
| "bigcommerce export products to csv" | How-to | Blog post + tool CTA |
| "bigcommerce bulk price change" | How-to | Blog post + tool CTA |
| "bigcommerce product catalog pdf" | Solution-seeking | Blog post + tool CTA |
| "bigcommerce sales sheet template" | Template-seeking | Free template + tool CTA |
| "bigcommerce product feed facebook" | How-to | Blog post (Facebook preset) |
| "how to create a line sheet bigcommerce" | How-to | Tutorial + Sales Book CTA |
| "bigcommerce product backup" | Solution-seeking | Blog post + Time Capsule CTA |
| "bigcommerce vs shopify product management" | Comparison | Comparison article |
| "AI product descriptions bigcommerce" | Solution-seeking | Blog post + AI summarize CTA |

**Content Calendar (first 8 weeks):**
- Week 1: "How to Export BigCommerce Products to a Custom CSV (The Easy Way)"
- Week 2: "How to Create a Professional Sales Book from Your BigCommerce Catalog"
- Week 3: "Bulk Price Updates in BigCommerce: A Complete Guide"
- Week 4: "How to Generate AI Product Descriptions for Your BigCommerce Store"
- Week 5: "BigCommerce Product Feed for Facebook: Step-by-Step Setup"
- Week 6: "Why Every Wholesale BigCommerce Store Needs a Digital Line Sheet"
- Week 7: "How to Back Up Your BigCommerce Product Data (And Why You Should)"
- Week 8: "BigCommerce Product Management: 5 Tools You Didn't Know You Needed"

**Each post should:**
- Be 1,500-2,500 words
- Include screenshots from BigCSV
- End with a CTA to start a free trial
- Be published on the BigCSV blog AND cross-posted to Medium/Dev.to

---

### 4.4 Cold Outreach to BigCommerce Merchants

**Why:** Direct, fast, and you can cherry-pick ideal customers.

**How to find prospects:**
1. **BuiltWith** — Search for sites using BigCommerce with 100+ products
2. **BigCommerce showcase** — Browse featured stores
3. **Google:** `site:mybigcommerce.com` or `"powered by bigcommerce"` + industry terms
4. **LinkedIn Sales Navigator** — Filter for "BigCommerce" in job titles/descriptions

**Outreach Template (Email):**
```
Subject: Quick question about your [Store Name] product catalog

Hi [Name],

I noticed you're running [Store Name] on BigCommerce with a solid catalog
of [product type]. Quick question — how are you currently handling:

- Exporting product data for marketplaces or distributors?
- Creating sales sheets or line sheets for wholesale buyers?

I built BigCSV.co specifically for BigCommerce merchants who deal with
these tasks. It lets you export custom CSVs, bulk-edit prices, and
generate print-ready PDF sales books — all connected to your live catalog.

Would you be open to a 10-minute walkthrough? Happy to set up a free
account for you either way.

[Your name]
```

**Volume:** 10-15 personalized emails per day. Expect 5-10% reply rate.

---

### 4.5 BigCommerce Agency Partnerships

**Why:** Agencies manage dozens of BigCommerce stores. One agency partner = multiple customers.

**Action Plan:**
1. Identify BigCommerce Certified Partners (listed on BigCommerce partner directory)
2. Reach out with a partner pitch:
   - "We'll give your clients a free extended trial"
   - "You get 20% recurring revenue share on referrals"
   - "We'll co-brand the sales books with your agency logo"
3. Offer a free "Agency" tier for their internal use
4. Create a co-marketing one-pager they can share with clients

**Target:** 10-15 agency conversations in Month 2. Goal: 3-5 active partners.

---

### 4.6 Social Media

**LinkedIn (primary):**
- Post 2-3x/week about BigCommerce product management pain points
- Share blog content with personal commentary
- Engage with BigCommerce's official LinkedIn posts
- Connect with BigCommerce merchants and agency owners

**X/Twitter:**
- Share quick tips, screenshots, product updates
- Engage with #BigCommerce and #ecommerce hashtags
- Reply to merchants complaining about BigCommerce limitations

**YouTube (Month 2+):**
- Feature walkthrough videos (2-3 min each)
- "How to" tutorials tied to blog content
- Customer testimonial videos

---

### 4.7 Paid Ads (Month 2+, after landing page is live)

**Google Ads:**
- Target exact-match keywords: "bigcommerce csv export tool," "bigcommerce product catalog maker"
- Budget: $300-500/mo to start
- Expected CPC: $2-5 (low competition niche)
- Send to feature-specific landing pages

**Reddit Ads:**
- Target r/bigcommerce, r/ecommerce
- Promoted posts that look like helpful content, not ads
- Budget: $200-300/mo

---

## 5. Messaging Strategy

### Core Positioning Statement
*"BigCSV.co is the product management toolkit built exclusively for BigCommerce — giving merchants the CSV exports, sales books, pricing tools, and AI descriptions that BigCommerce should have included from day one."*

### Messaging by Audience

| Audience | Key Message | Hook |
|----------|-------------|------|
| **Wholesale/B2B merchants** | "Create professional sales books from your live catalog in minutes, not days" | Sales Book Builder |
| **Merchants with large catalogs (500+ SKUs)** | "Stop wrestling with spreadsheets. Export, price, and describe your products from one dashboard" | CSV Exporter + AI Summaries |
| **Marketplace sellers** | "Get your BigCommerce products into Facebook, Google, and marketplace formats with one click" | CSV Presets |
| **Agencies** | "Manage client catalogs 10x faster. One tool for exports, pricing, and sales materials" | All-in-one value |

### Key Phrases to Use Everywhere
- "Built for BigCommerce" (not "works with" — emphasize native integration)
- "Your catalog, your way" (customization angle)
- "Minutes, not hours" (time savings)
- "AI-powered product descriptions" (differentiator)
- "Print-ready sales books" (unique feature)

### Objection Handling

| Objection | Response |
|-----------|----------|
| "I can just export from BigCommerce" | "You can — but can you customize fields, reorder columns, filter by category, and format for Facebook in one click?" |
| "I use spreadsheets for pricing" | "So did everyone — until they accidentally broke 200 prices. BigCSV gives you bulk editing with undo, smart rounding, and category filters." |
| "I already have a designer for sales materials" | "What if your sales book updated itself when you changed a product? BigCSV pulls live data — no more outdated PDFs." |
| "Is my BigCommerce data safe?" | "Your credentials are encrypted with AES-256. We never store your products on third-party servers. You own your data." |

---

## 6. Launch Strategy — Week-by-Week Plan

### Pre-Launch (Weeks 1-2)
- [ ] Build new public landing page with hero, features, pricing, FAQ
- [ ] Set up free trial flow (14 days, no credit card)
- [ ] Implement Stripe billing for subscription plans
- [ ] Create 3 screenshots/GIFs for each feature
- [ ] Set up email capture + welcome sequence (Resend, Loops, or ConvertKit)
- [ ] Write first 2 blog posts
- [ ] Set up analytics events for signup, trial start, feature usage

### Soft Launch (Weeks 3-4)
- [ ] Publish landing page and blog posts
- [ ] Begin BigCommerce community engagement (5 posts/week)
- [ ] Start cold outreach (10 emails/day)
- [ ] Post launch announcement on LinkedIn, X, Reddit
- [ ] Submit to BigCommerce App Marketplace
- [ ] Reach out to 5 BigCommerce agencies

### Growth Sprint (Weeks 5-8)
- [ ] Publish 1 blog post per week
- [ ] Continue outreach (increase to 15/day)
- [ ] Launch Google Ads campaign
- [ ] Follow up with agency prospects
- [ ] Collect testimonials from first users
- [ ] Create first case study
- [ ] Add testimonials and logos to landing page
- [ ] Launch referral incentive ("Give a friend 30 days free, get a month free")

### Milestone Targets

| Week | Target Signups | Target Paying | Key Focus |
|------|---------------|---------------|-----------|
| 2 | 10 | 0 | Landing page live, soft launch |
| 4 | 30 | 5 | Community + outreach ramp |
| 6 | 60 | 15 | Content + ads live |
| 8 | 100 | 30 | Agency partners + referrals |
| 12 | 200 | 60 | App marketplace live |
| 16 | 350 | 100 | First 100 paying customers |

---

## 7. Metrics to Track

| Metric | Tool | Goal |
|--------|------|------|
| Website visitors | Google Analytics (already set up) | 2,000/mo by Month 3 |
| Signup conversion rate | GA + Supabase | 5-8% of visitors |
| Trial-to-paid conversion | Stripe + internal | 25-35% |
| Feature adoption (which tools used) | Internal events | 70%+ use 2+ tools |
| Churn rate | Stripe | < 5% monthly |
| NPS score | Email survey | 50+ |
| CAC (Customer Acquisition Cost) | All channels | < $50 |
| LTV (Lifetime Value) | Stripe | > $500 |

---

## 8. Budget Summary

| Item | Monthly Cost | Notes |
|------|-------------|-------|
| Google Ads | $300-500 | Start Month 2 |
| Reddit Ads | $200-300 | Start Month 2 |
| Email tool (Loops/Resend) | $0-30 | Free tier to start |
| Live chat (Crisp) | $0 | Free tier |
| BuiltWith / prospect research | $0-100 | Optional |
| **Total** | **$500-930/mo** | Lean startup budget |

Everything else (content, outreach, community, social) is time investment, not cash.

---

## 9. Summary: The Path to 100 Customers

1. **Fix the website first** — Without a landing page, pricing, and free trial, no marketing channel will convert. This is the prerequisite.
2. **Be where BigCommerce merchants already are** — The App Marketplace and community forums are the two highest-intent channels.
3. **Create content that answers their Google searches** — Long-tail SEO for BigCommerce-specific problems will compound over time.
4. **Do things that don't scale early** — Personal outreach, manual onboarding, live demos. Learn what resonates.
5. **Leverage agencies as multipliers** — One agency partner can bring 10+ stores. Build a partner program early.
6. **Let the product sell itself** — The Sales Book Builder and AI descriptions are "wow" features. Get people into a free trial and let them experience it.

The realistic timeline to 100 paying customers is **3-4 months** with consistent execution across these channels.
