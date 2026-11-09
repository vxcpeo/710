# SONIRA — market, product and design research

Research date: **17 September 2026**. Direct website and browser observations were collected between approximately 10:34 and 10:42 UTC. This is a dated snapshot, not a claim that prices, accounts, deployments or product interfaces remain unchanged.

**Evidence update:** The initial interface observations below are historical. A later read-only mainnet snapshot at block **65379259**, 12:49:16 UTC, verified seven reference launches and 66 approved quote assets; see [live reference mechanics](research__parity__v2-reference-mechanics.md). The current SONIRA implementation is v2, described separately at the end of this record. Reference-project state and local SONIRA validation are not public SONIRA deployment evidence.

## What the reference actually offers

The reference is [Groove on X](https://x.com/Grooveonrh), linked to [groove.fun](https://www.groove.fun/). Its publicly visible profile described an audio-token launchpad on Robinhood Chain. The X response showed one post, two followers and a September 2026 join date when retrieved. Those numbers establish that the inspected profile was very early; they do not establish demand for this category.

The website and [launch form](https://www.groove.fun/launch) describe the following mechanics. These are **observed product statements**, unless explicitly identified as independently checked:

| Area | Observed Groove behavior or statement | Evidence boundary |
|---|---|---|
| Sound | Upload MP3, WAV, M4A or OGG, or record; browser encodes Opus; bytes stored onchain in chunks | Launch form and explanation; codec/storage implementation was not audited |
| Audio limit | Around 35 seconds at 16 kbps; selectable 24/16/12/6 kbps options | Text from launch form; duration depends on encoding settings |
| Token | Fixed one-billion supply on a bonding curve | Website statement |
| Quote assets | ETH and tokenized assets; X post says 66 stock tokens | Not verified during the initial UI inspection. Later chain reads verified 66 approved mainnet assets, including USDG and cbBTC; they are not all stocks or testnet listings |
| Entry economics | 0.0005 ETH launch fee plus gas; 1% curve trading fee | Public launch form |
| Creator economics | Creator receives a creator fee share and optional creator tax; claim from token page | Later source/state reads establish 1% base fee, 70/30 creator/protocol split and optional tax/buyback terms; this is not an independent audit |
| Graduation | ETH curve displays 4.2 ETH threshold; claimed migration to a permanently locked Uniswap v4 pool | Later source review establishes two-phase graduation and administrative recovery authority; none of the seven reference launches had graduated at the pinned block |
| Protocol token | $GROOVE contract address “coming soon”; protocol fee buyback/burn stated; “launching on pons” | A plan or product claim, not a verified deployed token mechanism |
| Discovery | Trending/New/Graduating/Graduated filters; sorting; audio player; creator and contract addresses | Rendered browser inspection |
| Visible usage | Rendered board showed 3 launched, 3 on curve, 0 graduated; all three cards showed zero raised | A momentary UI observation, not an independently reconciled chain report |
| Linked factory | `0x8C36645F6f1Ee058FF2aE4f05BCfE5A066b04765` | Link pointed to the mainnet Blockscout explorer; automated explorer retrieval was challenged |

The initial HTML showed zero launches while indexing; the hydrated browser later showed three. This is a useful implementation lesson: never treat placeholder zeros as verified zero activity. Display loading or unavailable states separately from real chain results.

**Interpretation:** the reproducible business idea is an audio-first community-token creation, discovery and trading loop. SONIRA uses its own name, interface, copy and visual assets. Its v2 economic core explicitly adapts the verified **MIT-licensed Groove contracts with attribution**, rather than claiming that core is original. SONIRA adds its own media adapter, studio integration, quote lens and deadline-bounded router. Source reuse and a redesign do not by themselves establish a defensible company; see [source attribution](contracts-v2__NOTICE.md).

## Robinhood Chain: primary-source findings

The [official overview](https://docs.robinhood.com/chain/) describes Robinhood Chain as an EVM-compatible, permissionless Ethereum Layer 2 built with Arbitrum technology, using ETH for gas. It is oriented toward tokenized real-world assets but also supports general Solidity applications. Its ecosystem list includes Uniswap, Morpho and other infrastructure/product providers; it explicitly says listing does not constitute endorsement or partnership.

The [official connection documentation](https://docs.robinhood.com/chain/connecting) lists **both mainnet and testnet** as of retrieval:

| Network | Chain ID | Public RPC | Explorer |
|---|---:|---|---|
| Mainnet | 4663 | `https://rpc.mainnet.chain.robinhood.com` | `https://robinhoodchain.blockscout.com` |
| Testnet | 46630 | `https://rpc.testnet.chain.robinhood.com` | `https://explorer.testnet.chain.robinhood.com` |

The documentation states that public RPC endpoints are rate-limited and not recommended for production. SONIRA's current implementation targets **testnet 46630**, regardless of the existence of mainnet. “Built for Robinhood Chain” must not imply affiliation with Robinhood Markets or exposure to Robinhood brokerage customers.

[Stock Tokens](https://docs.robinhood.com/chain/stock-tokens) are described by Robinhood as tokenized debt securities issued by Robinhood Assets (Jersey) Limited, providing economic exposure rather than ownership rights in the underlying company. Documentation describes jurisdictional restrictions, including the United States and United Kingdom, and primary-market mint/burn access for authorized participants after KYB. The [integration guide](https://docs.robinhood.com/chain/building-with-stock-tokens) describes standard ERC-20 transfers, Chainlink feeds, corporate-action UI multipliers, RFQ and AMM integration options.

**Product consequence:** a commercial stock-quoted launchpad remains a separate regulated-asset integration workstream, requiring eligibility, issuer controls, liquidity, decimals, corporate-action display and jurisdiction-specific review. SONIRA v2's testnet configuration supports native ETH and five verified 18-decimal stock-named test assets: TSLA, AMZN, AMD, PLTR and NFLX. Core precision support also covers approved 6/8-decimal assets; local fixtures test that architecture, not real USDG/cbBTC availability on testnet. The same-asset curve and pool do not require a conversion oracle; future fiat valuation or cross-asset conversion would need its own reliable pricing policy. None of this establishes real stock ownership or universal user eligibility.

## Market interpretation and competitors

| Alternative | Job it serves | SONIRA opportunity | Limitation |
|---|---|---|---|
| Groove | Sound-backed token launch and curve discovery on the same chain | Better creator onboarding, clear rights language, original listening experience, verifiable accounting | Near-direct feature competition; first-mover claims would be weak |
| Pump.fun | Extremely simple coin creation, discovery and trading | Make the sound itself the discovery object rather than an optional attachment | Far greater existing distribution and liquidity; SONIRA cannot assume users will migrate |
| Jupiter | Comprehensive onchain trading and portfolio interface | Use a focused, understandable transaction panel and transparent action states | Not a direct audio launchpad competitor |
| Zora / creator-token platforms | Creator distribution and tokenized communities | Differentiate around short playable audio and chain-native provenance | Adjacent competitor category; no current Zora implementation was audited in this research |
| SoundCloud, social video and messaging groups | Audio sharing, audience building and community identity | Portable audio plus inspectable token mechanics for users who actively want them | For many creators, conventional platforms will remain simpler and more useful |

No reliable audio-token market size was established. Broad DeFi TVL is not SONIRA's addressable market, and Robinhood's user count is not available distribution. Use bottom-up creator and wallet cohorts, interviews and observed retention to size the initial opportunity.

## Why these design references qualify

Four established onchain products were inspected: Aave, Pendle, Jupiter and Pump.fun. Independent [DefiLlama protocol API](https://api.llama.fi/) responses retrieved on the research date contained substantial current locked-asset balances: Jupiter's Solana entry was approximately $1.78 billion, Pump's Solana entry approximately $325.8 million, Pendle's Ethereum entry approximately $706.6 million, and Aave's Ethereum entry approximately $15.0 billion. These are **API-reported chain entries**, not consolidated audited company assets, user counts, profitability or a market-size estimate. No ranking claim is made; TVL is used only as corroboration that these are established ecosystem references.

Exact queried sources: [Aave](https://api.llama.fi/protocol/aave), [Pendle](https://api.llama.fi/protocol/pendle), [Jupiter](https://api.llama.fi/protocol/jupiter), [Pump](https://api.llama.fi/protocol/pump). Aave's own website displayed different deposit metrics; those should not be conflated with DefiLlama TVL.

## Content, layout and visual inspection

| Site | Content hierarchy | Observed layout and style | What SONIRA should adapt conceptually |
|---|---|---|---|
| [Aave](https://aave.com/) | Consumer benefit first; product preview; product variants; evidence; security; FAQs | Light background, enormous centered headline, lavender field, rounded device preview, restrained top navigation | Explain one clear benefit before protocol mechanics; show the real product; provide separate proof and FAQ sections |
| [Pendle](https://www.pendle.finance/) | Short positioning line; product-family choices; protocol metrics; integrations and resources | Black canvas, large animated orbital/wireframe visualization, sparse navigation, vivid blue accent | Use a distinctive, responsive visual tied to the product concept; keep the message readable and motion optional |
| [Jupiter](https://jup.ag/) | Trading actions and connected portfolio; major product navigation; campaigns around the main action | Dark desktop workspace, grouped left sidebar, bright lime primary action, central quote panel, restrained cards | Make the primary transaction and its state unmistakable; separate discovery, creation and personal balances |
| [Pump.fun](https://pump.fun/) | Discovery and live markets; visible creation/sign-in; risk and age gate | Dark, information-dense marketplace, compact token rows/cards, search at top, persistent creation access | Keep creation one action away and enable quick scanning; avoid copying speculative leaderboard pressure |
| [Groove](https://www.groove.fun/) | Live board immediately; launch CTA; side audio player; three-step mechanism | Almost-black background, bright green/cyan accents, small mono metadata, dense two-column market cards | Preserve useful sound preview and contract evidence while giving SONIRA a clearly original art direction |

Browser artifacts are at `output/history/pre-rebrand-playwright/research/aave.png`, `pendle.png`, `jupiter.png`, `pump.png` and `groove.png`. Pump's first-visit welcome dialog remained visible; background content was inspected through its rendered accessibility tree. No account was created, transaction signed or terms acceptance submitted. These screenshots are reference evidence, not assets licensed for SONIRA's site.

## Sonira interface direction ? September 2026 rebrand

The current design is a **light listening workspace**: paper canvas, ultramarine blue and mint accents, compact top navigation, a spacious introduction and numbered playable track rows. The Sonira V note mark and frequency tracks replace the previous identity imagery. Fonts remain local, with system fallbacks.

1. Discover: search stays visible; genres, chain phase and sorting apply to loaded sounds.
2. Listen: dedicated play controls and a persistent audio transport; demos never acquire invented prices or trading metrics.
3. Create: three steps organize sound input, identity and launch review; going back retains entered information.
4. Inspect: market details retain quotes, fees, network checks, claims, buyback controls and transaction feedback.
5. Understand: project status, rights, risks and source documents remain one action away.

Desktop uses the compact top navigation; smaller screens use a responsive menu and touch-friendly rows. Focus indicators, modal Escape behavior and reduced-motion support are part of the interface contract. Validation evidence is recorded in `docs/VALIDATION.md`. The old visual reference screenshots remain historical research, not current brand material.

## Recommended business choices

- Start with original short clips from independent beat makers, sound designers and small online communities that already use recognizable audio signatures.
- Test creator retention before subsidizing speculative volume. Record rights consent before upload; sound ownership is not validated merely by an onchain timestamp.
- Use native ETH and only the five verified stock-named testnet quotes in the initial public configuration. No SONIRA platform token is planned. The v2 per-sound buyback option purchases that same sound token for a five-year linear vest; it is separate from an unverified reference-project platform-token burn promise.
- Define fee-basis volume according to each executable fee path: actual gross curve buy spend, gross curve sell proceeds, and the pool swap's unspecified currency amount. Report phases, asset units, fee accrual, sweeps and claims separately. The protocol's modeled share is 0.3% of fee basis in both phases; creator tax and unrealized vested sound tokens are not company cash revenue.
- Treat immutable storage as durability **subject to network availability and access to chain data**, not a literal promise that sound survives every failure forever.
- Treat in-browser wallet signatures as proof of control for the local session; they are not a backend account, legal identity or server-authenticated login.
- Budget for security review, monitoring, rights complaints and indexing before mainnet. Publication of an MVP does not establish readiness to hold real-value funds.

The detailed operating model and launch experiments are in [`docs/BUSINESS_PLAN.md`](docs__BUSINESS_PLAN.md) and [`docs/GO_TO_MARKET.md`](docs__GO_TO_MARKET.md). Product delivery status must be checked against the repository's current deployment and verification records.

## Current SONIRA v2 delivery status

The v2 core has passed **20 local unit tests and three genuine-v4 local-fork scenarios**; logs are `contracts-v2/test-unit-results.log` and `contracts-v2/test-v4-results.log`. Browser integration completed a native lifecycle with **11 confirmed local transactions**, plus a separate six-decimal fixture flow covering a 35-second clip with cover, fees, buyback vesting claims and creator-recipient transfer. These tests use isolated local state, including forks of genuine Robinhood testnet infrastructure. They are neither public-chain SONIRA transactions nor an independent security audit.

The delivered economic model is 1% base fee across curve and pool, split 70% creator / 30% protocol, optional 0–10% extra creator tax, and optional creator-funded per-sound buyback with five-year linear vesting. Claims use shared escrow and internal fee conversions/buybacks need the designated operator. Graduation is two-phase; recipient overrides and reserve rescue are disclosed administrative powers. The v2 business plan, HTML and searchable PDF are published in the repository and website resources.

Public testnet deployment/source verification, domain/X acquisition and public hosting remain pending; no mainnet product, commercial revenue or Robinhood affiliation is established.
