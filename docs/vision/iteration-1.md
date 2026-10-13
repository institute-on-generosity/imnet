# Project Overview, Iteration 1 (2026-09-30)

A LinkedIn for generosity: a community-driven social-giving media platform that connects donors to nonprofits, with Gen AI that cuts the cost of producing high-quality marketing and impact videos.

**Index:** personal observations → literature study → gap → problem statement → product experience

## Personal observations
- I donate to St. Jude Children's Research Hospital. I discovered them through a YouTube marketing video that must have cost a lot to produce. How many organizations stand behind an equally meaningful cause but lack those resources?
- My impact is locked behind a login. There is no easy way to share what my giving created to motivate others to do the same.
- The theme for the AI Fellowship: generosity for generosity, more for more. How do we encourage people to give more?

There is no go-to platform for a beginner donor to:
- learn about the nonprofits out there
- discover causes
- map out their own giving landscape

GuideStar and Charity Navigator feel like databases. Younger donors lose patience with text-heavy, factual content. We connect through communities and visual information. Discovery should not feel like looking up a business license.

## ICPs
**Donor side**
- **Beginners:** browse for free to discover nonprofits, their motivations, and their causes.
- **Ongoing donors:** share the impact they have created with friends and spread generosity within the community.

**Nonprofit side**
- **Individuals raising funds for themselves** (e.g., people with cancer sharing personal stories). *Deferred past Phase I; see decisions/0004.*
- **Nonprofit organizations:** share causes, what donations fund, and impact already created by donors.

## Literature study

### 1. Verification layer
- **Candid (GuideStar):** 1.8M IRS-recognized tax-exempt orgs; data powers 230+ sites and apps. *Sources: guidestar.org, trustradius.com/products/candid-guidestar/reviews, micocf.org/blog/a-guide-to-navigating-guidestar-for-donors*
- **Charity Navigator:** relies on IRS tax returns and self-reported data. *Sources: marcgunther.substack.com/p/two-cheers-for-charity-navigator, pimgconsulting.com (Evaluating Charity Navigator, 2016)*

### 2. Impact communication layer
- **Storyraise:** interactive digital reports and personalized videos, tailored per donor. Targets colleges, universities, independent schools, health foundations. *Source: storyraise.com*
- **ThankView (EverTrue):** personalized video at scale. *Source: evertrue.com/thankview*
- **DonorSee:** raw video updates showing donors their impact; focused on the world's poorest countries. *Source: en.wikipedia.org/wiki/DonorSee*
- **Momentum:** AI-generated per-donor outreach plans, confirmed by the fundraiser. Built for the ask, not the report-back. *Source: givemomentum.com*

### 3. Social giving layer
- **Every.org:** built by ex-Snap and Pinterest engineers. See which nonprofits friends support; comment on gifts. $200M+ for 8,400+ nonprofits; searches 1M+ nonprofits. Feed unit is the transaction. Nonprofit cards redirect to external sites. Unclaimed profiles are never promoted or indexed. *Sources: ssir.org/articles/entry/expediting_digital_giving, every.org/about, every.org/givers*
- **Daffy:** positions itself as the LinkedIn for Giving; shareable charitable profiles. *My audit:* discovery is search-only by name or tax ID; the core experience is a fund dashboard. *Sources: nonprofitpro.com, daffy.org/resources/linkedin-for-giving*
- **Grapevine:** 84,000+ members, 1,100 giving circles, $44M+ to 6,100+ small local nonprofits. *My audit:* text-only cards; value stays inside closed circles. *Source: grapevine.org/about-us/grapevine-giving-foundation*
- **GoFundMe:** #1 crowdfunding platform, 100M+ people. Campaign stories, but no impact follow-through or nonprofit discovery. *Source: goodunited.io/blog/social-fundraising-platforms* *(To verify: GoFundMe owns Classy and may now offer nonprofit pages.)*

## Gap table
| Player | Discovery | Nonprofit profile | Multimedia stories | Public impact | Community |
|---|---|---|---|---|---|
| Candid / Charity Navigator | Lookup only | Data only | None | None | None |
| Storyraise / ThankView | None | None | Private, per donor | None | None |
| Every.org | Medium | Weak, redirects | Weak | None | Weak |
| Daffy | Search only | Weak | None | None | Weak |
| Grapevine | Local groups | None | None | Circle-internal | Strong, closed |
| GoFundMe | Weak, campaign browse | None, individuals only | Strong pre-donation, none after | None | None, one-off donors |
| **imnet** | **Story-first feed** | **Canonical, rich** | **AI engine, source-grounded** | **Public artifacts** | **Open network** |

## The three gaps
1. **Impact is never public.** Impact is delivered privately to one donor and disappears. No platform turns what a gift became into a durable, shareable, public artifact.
2. **Discovery is transactional, not emotional.** Discovery means a name, tax ID, or financial rating. No platform offers story-first, multimedia browsing where beginners fall in love with a mission.
3. **Professional storytelling is priced out of reach.** Most nonprofits and individuals can't afford a video agency. AI video editing can now produce near-agency quality for a fraction of the cost.

## Problem statement
There is no place to go to start or deepen a life of giving as a beginner. Discovery means looking up a tax ID or a rating, not exploring causes through stories. The impact a gift creates is delivered privately, if at all, then disappears, so generosity never inspires the next giver. The storytelling that moves people requires agency budgets most nonprofits will never have.

**Result:** meaningful causes stay invisible, donors stay disconnected, and giving stays occasional instead of a lifelong practice.

## Ideal solution
**Beginners:** browse free; discover through videos and stories, not tax IDs and ratings; map their giving landscape.
**Ongoing donors:** a profile showing what their giving became; public impact stories to share.
**Nonprofits:** a canonical, LinkedIn-grade profile that is the destination, not a redirect; causes, what donations fund, impact to date; an AI engine that turns real outcome data into text, images, and video.
**Individuals (later):** AI-generated video gives personal stories agency-grade quality at a fraction of the cost.
