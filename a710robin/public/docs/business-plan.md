# SONIRA — Business Plan

**Prepared 17 September 2026 · Version 2.1 · English-language launch plan**

**Brand:** SONIRA, pronounced so-NEE-rah; an original blend of sonar and aura, giving a heard signal room to travel.  
**Selected domain:** `sonira.xyz`  
**Selected X handle:** `@sonira`  
**Positioning:** Turn an original sound into a playable onchain community.

Live checks on 21 October 2026 found no RDAP registration object for `sonira.xyz`, X's public profile page returned not found for `@sonira`, and a registrar search listed the domain at a standard first-year price. These are time-bound observations, not reservations or proof of worldwide historical uniqueness; see [brand verification](../research/brand-verification.md). Neither the domain nor the handle has been acquired.

**Release status:** The v2 protocol has completed local contract and fork validation; historical browser evidence is retained and current rebrand/UI validation is recorded separately in docs/VALIDATION.md. Public testnet deployment is pending. This plan describes the validated local implementation and commercial assumptions; public deployment must still be confirmed with its own receipts and configuration checks. No public SONIRA deployment, commercial traction or audit is claimed.

## 1. Executive thesis

SONIRA aims to become a creation and discovery platform for audio-native communities. A creator publishes a short original sound, listeners play its chain-stored bytes, and eligible participants can interact with a community token under visible market rules. The initial wedge is a recognizable audio signature: a beat, original sound effect, spoken phrase or community jingle.

The creator and company share a 1% base trading fee through both the initial curve and the graduated Uniswap v4 pool. Creators can select an additional 0–10% creator tax and optionally direct half of their base-fee bucket into buying the same sound token for a five-year linear vest. These controls create clear accounting obligations; they do not promise earnings, price support or demand. No separate SONIRA platform token is required.

The long-term ambition is a reusable sound identity and distribution network: useful players, creator profiles, community analytics and integration APIs built around a catalog of original or properly licensed sounds. The first business milestone is repeated voluntary use by a narrow creator segment. Only then should SONIRA expand distribution or introduce paid professional tools.

The supplied product is a **locally validated v2 testnet implementation awaiting public deployment**. It includes a Vue 3 website, EVM wallet flows, English branding/social assets, media preparation and Solidity launch infrastructure for Robinhood Chain. The economic core adapts **MIT-licensed Groove contracts with attribution**; SONIRA's branding, website, media adapter, quote lens and swap router are separate work. Verified upstream source and local testing are not an independent audit of the modified system. No public SONIRA deployment is established by this plan. Deployment is outside this branding and interface release; any local credential remains private and unused.

## 2. The user problem and initial customer

Short sounds already communicate identity in online groups. Yet the clip, attribution, community conversation and financial experiment usually live in separate places. General token launchpads organize discovery around tickers, price changes and pictures. A creator who wants the sound to be the central object must combine audio hosting, a player, wallet interactions and market tools.

This is a focused problem, not a claim that every musician needs a token.

| Segment | Existing behavior | Initial job | Evidence to collect |
|---|---|---|---|
| Independent beat makers and sound designers | Publish short original loops or sound packs | Give a recognizable clip a portable community presence | Unassisted publication, repeat listening, creator return |
| Small gaming, streaming and internet communities | Reuse original jingles, voice clips and sound effects | Create a shared audio identity with inspectable rules | Use after launch day, useful sharing, fee comprehension |
| Onchain experimenters who create media | Already use wallets and test new primitives | Launch a sound-based market with explicit economics | Sustained activity without volume rewards |

The first users are English-speaking adults who understand basic self-custody and can use the relevant network in an eligible jurisdiction. The pilot is not aimed at minors or people seeking investment returns. A sound token does not convey copyright, royalties, company equity or a share of protocol income. Chain provenance records a publication address and content; it does not prove originality or ownership.

Interview creators about an actual recent sound-sharing experience before pitching the product. Prefer a small community with a recurring use over a large audience attracted only by a launch. Listener value must remain visible without a wallet: play first, inspect the creator and market terms, then decide whether to participate.

## 3. Market evidence and competition

[Groove](https://www.groove.fun/) provides the direct same-chain reference: a sound-token launchpad with virtual-reserve curves, selectable quote assets and v4 graduation. A fresh read-only mainnet snapshot at **block 65379259 on 17 September 2026** identified seven factory launches, five native and two cbBTC, with no graduated markets. All seven had zero creator tax and buyback disabled. Consequently the snapshot verifies configuration and some curve-fee accrual; it does not demonstrate executed nonzero creator tax, buybacks or graduated-pool use. See the [live reference mechanics](../research/parity/v2-reference-mechanics.md).

The same snapshot verified 66 currently approved quote assets: 64 with 18 decimals, USDG with 6 and cbBTC with 8. They are not 66 verified stocks, and mainnet addresses do not establish testnet availability. SONIRA enables only five independently checked stock-named test assets alongside native ETH in its initial testnet configuration.

| Competitor or substitute | Structural advantage | SONIRA response |
|---|---|---|
| Groove | Existing same-chain concept and public contracts | Attributed core adaptation, original listening experience, clear creator accounting and distribution tools |
| General token launchpads, including Pump.fun | Existing liquidity and repeat trading habits | Specialize in original sounds and returning communities |
| Creator-token products | Broader creator relationships | Make a short playable sound the primary object |
| Conventional audio/social services | Familiar accounts, large audiences, low friction | Serve creators who find open provenance and token mechanics useful |

The design research also reviewed Jupiter's action clarity, Aave's benefit-led explanation and Pendle's distinctive identity. SONIRA uses a black technical workspace with a red signal accent, a glyph command rail, a searchable ledger of sounds, a sticky release-studio margin and explicit transaction details. The sonar mark is original geometry, not a stock mark. These design references do not establish customer demand.

No defensible top-down market size was established. Build a bottom-up estimate from reachable qualified creators, publishing activation, retained communities and observed fee-bearing activity. Do not assume Robinhood's brokerage users are an available acquisition channel or imply a Robinhood partnership.

## 4. Product, scope and honest parity

The studio publishes media and launches its market in **one atomic transaction**. A separate ERC-20 sound token and bonding curve are created through the launch factory. Initial supply is one billion 18-decimal tokens, minted once to the curve. There is no ongoing mint authority or founder allocation; holders can burn tokens, so “fixed initial supply” is more precise than claiming total supply can never change.

| Capability | V2 architecture and terms | Boundary |
|---|---|---|
| Wallet interaction | EVM connection, network selection and wallet-signed actions | Connection is not identity verification or server authentication |
| Publication | Upload/record, local audio preparation and atomic studio launch with immutable media/metadata | Browser codec support varies; rights checks remain necessary |
| Media budget | Up to 35 seconds; audio plus optional cover ≤98,304 bytes, cover ≤16,384 bytes | Full-length clips need working Opus support; PCM fallback fits about 12 seconds without a cover |
| Launch cost | 0.0005 test ETH plus gas, including ERC-20-quoted launches | Test assets are not commercial revenue; future policy changes must be disclosed |
| Quote assets | Native ETH plus five verified testnet assets named TSLA, AMZN, AMD, PLTR and NFLX | Test tokens do not establish real stock ownership or commercial eligibility |
| Quote precision | Core architecture supports approved quote assets with at least six decimals | USDG6/cbBTC8 support does not mean those mainnet tokens are deployed/enabled on testnet |
| Trading fees | 1% base fee in both curve and pool; 70% creator / 30% protocol; optional 0–10% extra creator tax | Pool fees use the unspecified currency amount; exact transaction quotes govern |
| Buyback option | Half of the creator base-fee bucket buys that sound token; linear five-year vest | Execution has operator, liquidity and slippage conditions; no platform-token burn |
| Fee claims | Shared escrow: accrue, sweep, then claim; vest releases also credit escrow | Accrued, claimable and claimed amounts are distinct |
| Graduation | Curve closure/reserve sweep followed by permissionless pool creation; permanently locked seed LP | Two phases can leave a waiting interval; owner rescue exists after seven days |
| Creator controls | Fee recipient transfer, launch-time tax, buyback toggle | Owner recipient override has a three-day delay and a three-day execution window |

The five testnet stock-named assets are issuer-controlled proxies with pause, blocklist, upgrade and administrative-burn exposure. Their initial targets are configured per asset, not a universal 42-unit threshold: TSLA 26; AMZN approximately 29.330291; AMD 16.665505; PLTR 47.065125; NFLX 130.303046. Exact raw configuration is authoritative. These settings mirror a reference snapshot, not a current price oracle or a commercial recommendation.

Published audio and optional cover live in immutable bytecode chunks. Text metadata and links are creator supplied. A hash establishes what was published, not whether it was licensed or safe. A frontend can delist material but cannot generally erase blockchain copies. Playback depends on the chain, RPC and decoding software. Demo content and local QA must be visibly separate from public market activity.

Graduated trades use a deadline-bounded router with a minimum output. Curve quotes include recipient-dependent launch-window charges and threshold partial fills. The interface must show the actual fee, maximum spend, minimum received, deadline where applicable, and which asset is paid or received. A local signed-message session proves control for that client session only; a future backend needs nonce-based server authentication.

## 5. Exact launch curve and money flow

The native curve starts with **1.68 ETH of phantom quote**, a **4.2 ETH real-reserve graduation target** and **one billion initial tokens**. Phantom quote is a pricing parameter, not funded ETH. Let `P = 1.68`, `R` be actual trading reserve and `S = 1,000,000,000`. In the untouched constant-product model, `K = P × S`, virtual quote reserve is `Q = P + R`, token reserve is `K / Q`, and marginal price is `Q² / K`. Integer accounting, fees, burns, previous trades and buybacks require executable onchain quotes.

For a normal buy, the trader supplies a gross quote budget. Base fee, creator tax and any launch-window charge are deducted from the amount actually spent; the remainder enters the curve. At the threshold, only the necessary budget is spent and excess is returned. A sell returns tokens to the curve, deducts base fee and creator tax from gross quote proceeds, and pays the recipient directly. Seller proceeds and refunds are not escrow fee claims or company revenue.

After the launch window, with zero extra creator tax, an empty native curve receiving a **0.01 ETH gross buy** charges 0.0001 ETH base fee and adds 0.0099 ETH reserve. It returns approximately **5,858,334.812711 tokens**. An immediate full resale with no other activity yields approximately 0.0099 ETH gross and **0.009801 ETH net**, before integer rounding and gas. The round trip loses both fees and gas.

The anti-snipe setting starts at **99% nominal** and decays over **15 seconds**. The effective cap leaves at least 1% for buying after base fee and creator tax; at 1% base fee and zero creator tax the maximum applied penalty is **98%**. The original creator, selected fee recipient and up to 32 additional declared addresses are exempt. These exemptions and the steep initial charge must be visible. This mechanism is not guaranteed bot prevention or equal launch access. Penalty proceeds enter the base-fee bucket, but the company forecast excludes them.

Ignoring rounding and prior buybacks, the pristine native curve starts at **0.00000000168 ETH/token** and reaches approximately **0.00000002058 ETH/token** at the target. At that point approximately **714.285714 million** tokens have left curve inventory and **285.714286 million** remain. Matching the terminal price seeds approximately **4.2 ETH plus 204.081633 million tokens** into the LP, with **81.632653 million** excess tokens locked. These are illustrative baseline amounts; actual onchain reserves and the executed seed determine the final allocation.

Graduation has two stages. A threshold-crossing buy attempts closure and reserve sweep; a failed attempt can be retried. The subsequent permissionless pool-creation call initializes and mints the full-range locked position. Trading can be unavailable between stages. The core LP fee is zero in this configuration; the custom hook continues the **1% base fee and optional creator tax**. Permanently locked liquidity is not a price guarantee. If a swept market remains unseeded, the owner has a **seven-day delayed reserve rescue path**; that authority is a material trust assumption.

Base fees split **30% protocol / 70% creator**. With buyback enabled, half of the creator bucket is earmarked: each 100 units of base fee becomes 30 protocol, 35 immediate creator and 35 for buying the same sound token. The separate creator tax goes entirely to the creator. Curve buybacks can fall back into creator payout when reserve movement or available inventory prevents execution; the graduation sweep skips the buyback and pays that allocation to the creator. Enabling the option does not guarantee a purchase on every sweep.

Bought-back tokens vest **linearly over five years**, not at a five-year cliff. A top-up preserves already vested value and blends the existing unvested amount's remaining duration with a new five-year deposit. Either current beneficiary can release vested tokens; 70% credits the creator and 30% the protocol through escrow, followed by a separate claim. This routes part of creator-funded value to the protocol over time. It is not a burn, immediate cash revenue or guaranteed appreciation.

## 6. Closed-loop business model

The operating loop is **original creator publishes → community listens → some eligible users voluntarily interact → a subset returns → legitimate trades accrue fees → sweeps create claimable balances → creators claim and make more useful sounds → useful sharing brings new listeners**. Graduated communities can continue contributing fees under the hook, keeping retention and monetization connected beyond the launch curve.

| Stage | User value | Measurement | Response if weak |
|---|---|---|---|
| Acquisition | Recognizable sound or trusted creator | Qualified visits by source | Narrow the audience and improve examples |
| Activation | Play immediately; publish successfully | Engaged plays, time to publish, wallet/codec failures | Remove friction before increasing promotion |
| Conversion | Understand rules and choose an action | Quote-to-confirm conversion, fee comprehension | Clarify economics; avoid pressure and return claims |
| Retention | Sound stays part of a living community | D7/D14/D30 creator return, repeat listening | Improve distribution and creator utility |
| Monetization | Transparent creator/protocol claims | Fee basis, accrued/swept/claimed amounts, both phases | Repair accounting or payout delays before scaling |
| Reinvestment | Fund better creation and service | Creator relaunches, support cost, contribution | Spend on demonstrated retention drivers |

The north-star metric is **weekly active original-sound communities**: a creator maintains its community presence during the week, the sound receives at least three engaged listeners and at least two distinct non-creator wallet participants within seven days. An engaged play reaches five seconds or 50% of the clip, whichever comes first. These thresholds are provisional. Wallets are not unique people; obvious linked-wallet or self-trade activity is flagged and excluded from growth decisions where detectable.

Fee operations are part of the product. An operator monitors curve and hook fee balances, checks fresh quotes and issuer status, simulates conversion/buyback sweeps, supplies nonzero minimum outputs, and submits only within configured price-movement limits. It reconciles receipt events against escrow credits and retries recoverable failures with a newly priced transaction. Internal conversion or buyback requires the designated fee-sweep operator; creators can distribute direct fees when no internal swap is needed. A frontend promise of instant autonomous payout would therefore be misleading.

Run a daily sweep/reconciliation queue with alerts for stale fees, failed simulations, missed operator heartbeats and delayed graduations. Initial service targets should be measured before published; for the pilot, investigate any eligible unswept balance older than 24 hours. Never lower slippage protection to force a claim. Pending fees, escrow liabilities, pool/curve reserves and company treasury balances require separate ledgers.

## 7. Revenue model and unit economics

The modeled protocol share is **0.3% of fee-basis volume in both phases**: 1% base fee multiplied by a 30% protocol share. “Fee-basis volume” means the amount on which the base fee is actually assessed, valued under a documented USD policy and counted once per execution. Curve buys use actual gross spend; curve sells use gross quote proceeds. The pool hook uses the swap's unspecified currency, normally the output for exact-input swaps. Thus 0.3% of fee basis is not always exactly 0.3% of input notional. Conversion prices, rounding, timing and issuer restrictions affect realized quote receipts.

| Per $1,000 of fee-basis volume | Buyback off | Buyback on, if executed |
|---|---:|---:|
| Base trading fee | $10.00 | $10.00 |
| Protocol base-fee share | $3.00 | $3.00 |
| Creator immediate base-fee share | $7.00 | $3.50 |
| Creator-funded buyback allocation | $0.00 | $3.50 |
| Modeled variable expense, 10% of protocol revenue | $0.30 | $0.30 |
| Protocol contribution before fixed costs | $2.70 | $2.70 |

An optional 2% creator tax adds $20 per $1,000 of its applicable basis, entirely for the creator and outside the base split. The company forecast excludes creator tax, anti-snipe windfalls, unrealized vested sound tokens, user reserves, inventory valuation and platform-token sales. Launch-fee income is also excluded from the base scenarios. For sensitivity only, 1,000 launches at 0.0005 ETH total 0.5 ETH; a hypothetical $2,000/ETH would equal $1,000. This is not a current ETH price or forecast.

The 10% variable expense is an operating allowance for incremental support, services and attributable distribution above the fixed budget. It is not an onchain deduction. At $1,000 monthly fee-basis volume per active wallet, protocol revenue is $3 and contribution $2.70. Six active months produce $16.20 contribution LTV; a $15 acquisition cost implies **1.08× LTV/CAC and 5.56 active months to pay back**. This does not justify aggressive paid growth. Lower CAC, stronger retention or useful paid tools must be demonstrated.

Account for each asset separately and reconcile fees from accrual through conversion, escrow and treasury claim. Do not add ETH and test-token units into one raw total. Testnet assets carry no recognized operating revenue. In commercial scenarios, valuation and collection assumptions must be replaced with actual lawful receipts; unrealized token holdings are not cash available for payroll.

## 8. Twelve-month operating budget and funding

All amounts are **USD planning assumptions**, not quotations or committed financing. Compensation assumes a lean distributed team and must be adjusted for location, employment costs and actual scope.

| Use of cash over 12 months | Basis | Budget |
|---|---|---:|
| Two engineers | $6,000 each per month | $144,000 |
| Founder/product/design | $4,000 per month | $48,000 |
| Community and creator operations | $3,000 per month | $36,000 |
| External security review and retest | Scope-dependent audit quotations required | $60,000 |
| Legal, accounting and setup | Product/jurisdiction review, terms, IP process, books | $30,000 |
| RPC, indexing, hosting and monitoring | $1,000 monthly average | $12,000 |
| Creator research and acquisition | Staged, capped, never volume-based | $36,000 |
| Brand, domains, tools and administration | Modest acquisition allowance | $8,000 |
| Contingency | Controlled reserve | $26,000 |
| **Total fixed/staged cash budget** | | **$400,000** |

**Proposed pre-seed target: $500,000**, through company financing on negotiated terms, with no token sale assumed. This is a planning recommendation, not an executed raise. The extra $100,000 buffers launch delays and unexpected security/legal work. At zero revenue and average $33,333 monthly burn it provides roughly 15 months of runway; hiring and audit payment timing change the cash trough.

The staged envelope is $85,000 in Q1, $110,000 in Q2, $100,000 in Q3 and $105,000 in Q4. Q2 includes the largest review spend. A mainnet delay postpones acquisition spend and growth hiring, not the security gate. Daily operational ownership of fee sweeps and reconciliation must fit within engineering/operations staffing; costs beyond that envelope require a revised budget.

## 9. Financial scenarios, not a demand forecast

Months 1–3 assume testnet validation and **zero commercial volume**. Months 4–12 depend on legal, security, operational and economic gates. If gates fail, revenue stays zero and the timeline shifts. Scenario volume includes both curves and graduated pools under the fee-basis definition above. It does not count testnet activity, self-generated QA or fake trades.

| Scenario | Monthly fee-basis volume in months 4–12, $ millions | Annual fee basis | Protocol revenue at 0.3% |
|---|---|---:|---:|
| Conservative | 0.05, 0.10, 0.20, 0.25, 0.35, 0.40, 0.50, 0.60, 0.75 | $3.20m | $9,600 |
| Base | 0.25, 0.50, 1.00, 1.50, 2.50, 3.50, 4.00, 5.00, 6.00 | $24.25m | $72,750 |
| Upside | 1, 2, 4, 6, 8, 10, 12, 16, 20 | $79.00m | $237,000 |

| Cash outcome | Conservative | Base | Upside |
|---|---:|---:|---:|
| Protocol revenue | $9,600 | $72,750 | $237,000 |
| Variable expense at 10% | $(960) | $(7,275) | $(23,700) |
| Contribution | $8,640 | $65,475 | $213,300 |
| Fixed/staged budget | $(400,000) | $(400,000) | $(400,000) |
| Year-one operating cash result | **$(391,360)** | **$(334,525)** | **$(186,700)** |
| Closing cash after hypothetical $500,000 financing | $108,640 | $165,475 | $313,300 |

These figures exclude taxes, financing costs and working-capital timing. They assume modeled protocol fees can be converted, claimed and valued without net conversion drift; actual quote receipts may differ. None of the scenarios reaches full-year operating profitability. Optional buybacks do not reduce the modeled 30% protocol base-fee share, but their future protocol token releases are excluded from cash forecasts.

At $33,333 average monthly fixed cost and a **0.27% contribution rate**, break-even requires approximately **$12.35 million monthly fee-basis volume**. Halving the protocol fee rate doubles that requirement. Halving base-case volume reduces annual protocol revenue to $36,375 and contribution to $32,737.50, requiring $367,262.50 of operating cash at unchanged costs. Delayed collection adds working-capital pressure even when accrual appears healthy.

The month-12 base case could mean 6,000 active wallets averaging $1,000 fee-basis volume each. An illustrative acquisition bridge is 120,000 qualified visits × 5% wallet connection × 40% first-trade activation = 2,400 new wallets, plus 3,600 returning participants. None of these rates is established. Reconcile the scenario with observed creator cohorts, listener retention, active markets, curve/pool mix and concentration before using it to hire or raise spending.

## 10. First 90 days and commercial gates

| Period | Product and operations | Evidence target | Decision |
|---|---|---|---|
| Days 1–14 | Acquire brand assets; secure deployment process; verify v2 lifecycle; recruit design partners | 15 creator interviews, 10 usability sessions, no unresolved critical flow failures | Confirm a repeated creator problem |
| Days 15–30 | Small original-audio cohort, consented analytics, codec/wallet fixes | 25 testnet sounds; ≥70% unassisted publication; median under five minutes excluding funding | Improve onboarding before reach |
| Days 31–60 | Repeat cohorts; indexing; fee sweeps, claims and rights operations | 50 creators; ≥30% D14 creator return; functioning reconciliation and payout explanations | Continue only with voluntary repeat use |
| Days 61–90 | Mainnet economic review, independent security work, region policy and treasury controls | ≥25% D30 return across two cohorts; ≥80% fee comprehension; findings triaged | Separate mainnet go/no-go from growth targets |

Targets are hypotheses, not traction. Testnet activity validates usability, not real-money demand. A limited commercial pilot requires independent review and remediation of the **modified** system; adversarial reserve/escrow/vesting tests; reviewed curve and fee economics; verified deployments; operational key controls; reliable sweep monitoring; redundant RPC/indexing; terms and applicable jurisdiction decisions; rights/reporting intake; and complete transaction disclosures. Growth goals cannot waive these requirements.

Integration evidence must cover atomic media launch, recipient-specific anti-snipe, native and approved ERC-20 trades, partial fills/refunds, fee conversions and claims, buyback top-ups/releases, recipient transfer/override timing, two-phase graduation, locked LP, delayed rescue and deadline/slippage swaps. Record local tests, local forks and public receipts separately. Earlier v1 results cannot certify v2.

## 11. Roadmap and practical defensibility

**Phase A: establish the public testnet lifecycle.** Local v2 lifecycle and production-build validation are complete. Execute and verify the reproducible public deployment, then run original creator cohorts. Operate fee sweeps and support manually with monitored runbooks before automating further. Public deployment requires the intended secure key and verified receipts; never substitute reference addresses or local fork writes.

**Phase B: improve media and reliability.** Broaden browser compatibility, progressive playback, indexed search, pagination and mobile coverage based on measured friction. Duplicate detection and rights attestations assist moderation but do not prove ownership. Larger media budgets need gas and retrieval cost evidence.

**Phase C: distribute useful sound identities.** Build embeddable players, creator profiles, opt-in updates, lawful licensing metadata and community analytics. A future paid professional tier should sell useful software, not privileged financial outcomes. Any such revenue is excluded from current forecasts until tested.

**Phase D: harden operations and selectively expand.** Review hook fee conversion, sweep incentives, quote-asset concentration and market quality. Develop audited operating automation and published reconciliation. Real stock-denominated products require issuer documentation, eligibility controls, liquidity and jurisdiction review beyond five named test assets. A future cross-asset price display or conversion needs a defined pricing source; the same-asset curve/pool mechanics do not themselves create an oracle.

Defensibility should come from creator relationships, a lawful original-sound catalog, useful embeds, measured distribution, reliable indexing and clear operations. MIT-licensed contract code and visual design can be replicated. There is no demonstrated moat, guaranteed network effect or automatic Robinhood distribution. The business must earn creator return and listener usefulness.

## 12. Governance, safety and rights operations

The owner has meaningful powers: changing future launch configurations and quote allowlists, rotating the designated sweep operator, managing supported policies, disabling a creator buyback route, initiating recipient recovery and rescuing swept graduation reserves after seven days. Launches snapshot economic terms; later policy changes do not silently rewrite those snapshots. The current fee recipient can transfer its role immediately. An owner-imposed change has a **three-day delay followed by a three-day execution window**. It is not limited by an onchain lost-key proof, and a creator transfer does not cancel a pending owner override. Newly directed fees and unreleased vesting follow the updated recipient; credits already in escrow remain assigned to their credited account.

Disclose administrative fee-rescue paths as well as the reserve rescue. They can bypass a blocked escrow payment route under the implemented conditions; they do not guarantee recovery from an issuer pause, blocklist or burn. The permanent LP lock does not eliminate these other trust assumptions. Nor does a website shutdown stop direct contract interaction. Final published governance must identify the actual deployed owner, operator and treasury addresses and the exact authority each holds.

| Risk | Exposure | Control and residual limitation |
|---|---|---|
| Contract defects | Reserve loss, wrong fee splits, stalled vesting or migration | Independent review, invariants and limited pilot; upstream verification is insufficient |
| Operator failure | Unswept fees, stale conversion quotes or adverse execution | Monitored queue, nonzero minimums, simulation, rotation and reconciliation; liveness still depends on operation |
| Administrative compromise | Recipient redirection, reserve rescue misuse or future policy changes | Production multisig, separate roles, public monitoring, enforced delays where available |
| Quote issuer | Pause, blocklist, upgrade or administrative burn | Narrow allowlist, issuer monitoring, per-asset accounting; no assured recovery |
| Manipulation | Linked wallets, concentrated supply and misleading volume | Avoid rewards for trading; filter analytics; disclose launch exemptions and concentration |
| Content/IP | Stolen audio, impersonation or irreversible harmful material | Rights attestation, report intake, human review, delisting and appeals; chain bytes remain |
| Regulation | Token, marketing, consumer and asset eligibility obligations | Qualified counsel, scope restrictions and enforceable terms before commercial use |
| Infrastructure | RPC failures, stale indexer, chain or codec disruption | Redundant providers, reconciliation and stale-state labeling |
| Economics | Small fee share fails to cover service and acquisition | Contribution gates, retained-cohort evidence, cost discipline and cash stop rules |

Recommended production controls include a multisignature treasury/administration setup, separate least-privilege sweep operations, hardware-backed deployment, two-person treasury spending approval and a named incident commander. These are launch requirements, not claims that a production multisig is already configured. Never put private keys in frontend variables, logs, public artifacts or the repository.

Establish a monitored rights/contact channel and intake form before inviting uploads. Acknowledge reports within one business day, restrict operated surfaces promptly for credible imminent harm, preserve evidence, notify parties where lawful, allow appeals and record decisions. An unconfigured email address is not a working response channel. State the permanence of publication before the creator signs.

## 13. Measurement, accountability and stop rules

The founder owns cohort decisions and monthly cash reporting. Engineering owns security, availability, sweeps, transaction failures and reconciliation. Creator operations owns interviews, support and rights intake. Separate treasury review checks that protocol withdrawals match credits and never treats user reserves as runway.

The dashboard follows qualified visits, engaged plays, publishing completion, new/returning creators, quote-to-confirm conversion, creator relaunches, curve and pool fee basis, fees by asset, sweep age, escrow claims, vest releases, graduation delays, concentration, support hours and company cash. Preserve accrued, claimable, claimed and vested amounts separately. Exclude internal QA and obvious self-trades from growth metrics; disclose incomplete wallet-link detection.

Collect minimal consented analytics with a retention policy. Public wallet addresses still have privacy implications. Do not store private messages or identity documents onchain. Cohort reports include sample size, numerator, denominator and observation cutoff; incomplete windows produce “insufficient evidence,” not a success claim.

Rework the segment if D30 creator retention remains below 15% across two cohorts of at least 20 creators. Pause paid acquisition below 3× contribution LTV/CAC or above six months' payback. Stop expansion for unresolved critical findings, reserve/escrow reconciliation discrepancies or a failed rights-response process. Investigate a missed sweep service target before acquiring more creators. At six months of remaining company cash, reduce scope and pursue financing or an orderly wind-down; user assets never fund operating losses.

## 14. Sources and evidence status

Web sources were accessed on **17 September 2026**. Publisher statements, source code, live chain reads and SONIRA validation are distinct evidence categories.

- [Groove X](https://x.com/Grooveonrh), [board](https://www.groove.fun/) and [launch form](https://www.groove.fun/launch): public reference product. Its advertised future platform token was not verified as deployed; do not conflate it with per-sound buyback vesting.
- [Robinhood Chain overview](https://docs.robinhood.com/chain/) and [connection details](https://docs.robinhood.com/chain/connecting): mainnet 4663 and testnet 46630 are separate networks.
- [Stock Tokens](https://docs.robinhood.com/chain/stock-tokens) and [building guide](https://docs.robinhood.com/chain/building-with-stock-tokens): classifications and issuer/eligibility dependencies.
- [Aave](https://aave.com/), [Pendle](https://www.pendle.finance/), [Jupiter](https://jup.ag/) and [Pump.fun](https://pump.fun/): design/product references, not SONIRA demand evidence.
- [Market/design research](../research/market-and-design.md), [brand checks](../research/brand-verification.md) and [testnet dependencies](../research/parity-dependencies.md): dated findings and limitations.
- [Pinned live mechanics](../research/parity/v2-reference-mechanics.md) and [raw verification](../research/parity/live-policy-verification.json): current reference parameters, seven launches, 66 approved mainnet assets and zero call errors at the recorded block.
- [V2 source attribution](../contracts-v2/NOTICE.md) and [provenance](../contracts-v2/reference-provenance.json): MIT adaptation and dependency licensing. Modified source and final release evidence determine SONIRA behavior.
- [Audio preparation](AUDIO.md) and [operating playbook](GO_TO_MARKET.md): media boundaries and proposed execution.

Every forecast, budget, conversion target and funding amount is a management assumption. This plan establishes no signed customer, acquired domain/X account, active partnership, audited deployment or commercial revenue. The delivery record distinguishes completed local validation from pending public deployment; neither local receipts nor a successful production build establish a public launch.
