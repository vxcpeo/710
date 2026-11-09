# Groove reference mechanics: live policy snapshot

**Read-only research, 17 September 2026.** All state below is pinned to Robinhood Chain **mainnet 4663**, block **65379259** (`0x3e59bbb`), timestamp **12:49:16 UTC**, hash `0x5b0308bb17382a130816a653729c81f576c80b6cbf721074a87c20408ba6d358`. No private key was accessed and no transaction was signed or broadcast. These are reference-project addresses, never SONIRA deployment addresses.

Machine-readable proof, including raw return data, runtime hashes and every individual market/quote-asset read: [`live-policy-verification.json`](research__parity__live-policy-verification.json). Reproduce with `node research/parity/live-policy.mjs`, followed by `node research/parity/live-policy-assets.mjs`. The first command selects a fresh block; the second reuses that exact block. Source semantics come from the archived verified factory compilation in [`sources/grooveFactory.json`](research__parity__sources__grooveFactory.json), not copied application code.

## Actual current values, not assumed constructor defaults

| Setting | Live value | Meaning |
|---|---:|---|
| Public launches | `true` | `launchEnabled()` |
| Launch fee | 500000000000000 wei | 0.0005 native ETH, separate from gas |
| Launch configs | 1 | Config 0 is enabled |
| Supply | 1000000000 × 10^18 | One billion sound tokens |
| Native phantom quote | 1680000000000000000 wei | 1.68 ETH virtual reserve |
| Native graduation target | 4200000000000000000 wei | 4.2 ETH real reserve |
| Base curve fee | 100 bps | 1% of the relevant quote consideration |
| Core v4 LP fee | 0 | Fees are charged by the custom hook |
| Tick spacing | 200 | Graduated pool configuration |
| Base hook fee | 100 bps | 1% of the swap's unspecified currency amount |
| Protocol share of base fees | 3000 bps | 30% of base fees, ordinarily equivalent to 0.3% of fee basis |
| Creator share before optional buyback | 7000 bps | Remaining 70% of base fees |
| Optional buyback share | 5000 bps | 50% of the creator's base-fee bucket, not 50% of all fees |
| Maximum internal price movement setting | 300 bps | 3%; source-specific swap/curve guard, not an unconditional return guarantee |
| Maximum selectable creator tax | 1000 bps | Up to 10%, additional to the base fee |
| Anti-snipe starting parameter | 9900 bps | 99% nominal starting penalty; actual buy path applies a tighter combined cap |
| Anti-snipe window | 15 seconds | Decays to zero; launch snapshots it |
| Creator-recipient owner override delay | 259200 seconds | 3 days |
| Override execution window | 259200 seconds | A further 3 days after maturity |
| Failed-graduation rescue delay | 604800 seconds | 7 days after the swept phase |
| Buyback vesting duration | 157680000 seconds | 5 × 365 days |

The freshly read hook policy matches its archived constructor defaults. It is now supported by direct chain state, not merely those defaults. Each of the seven discovered launches has a fee-policy snapshot matching these live values.

## Fee flow and creator controls

The factory accepts a creator-selected fee recipient, an additional creator tax and initial buyback flag. A zero recipient defaults to the original deployer. The source caps base plus creator tax at **2000 bps** and creator tax itself at **1000 bps**. Tax is paid entirely to the creator and never enters the protocol/buyback split. The creator tax is a launch-time term, not a later mutable creator setter.

Curve buys specify a quote budget: the base fee and creator tax are deducted from the amount actually spent, then the remainder enters the virtual-reserve curve. Curve sells deduct those fees from gross quote proceeds and pay the recipient directly. This convention differs from an exact-token buy that adds a fee to its base quote. Rounding and threshold partial fills must be matched at the executable path, not inferred from marketing percentages.

After graduation, the hook charges base fee plus creator tax on the **unspecified** currency: for exact-input swaps this is normally the output asset. Fees landing in sound tokens remain pending until conversion to quote currency. A later sweep distributes quote fees through the shared escrow. The fee remains enforceable at the pool hook, including swaps through other routers; charging only a SONIRA router would not reproduce this behavior.

At the current policy, with buyback **off**, each 100 units of base fees splits 30 protocol / 70 creator, plus the separate creator tax. With buyback **on**, it splits 30 protocol / 35 immediately payable creator / 35 allocated to buying and locking the same sound token. Bought-back tokens vest over five years and release 30% to protocol / 70% to creator under the recorded policy. This adds a future token-value component; it is not immediate quote-asset cash revenue and must not be double-counted in the business plan.

The current creator recipient can transfer its recipient role immediately. An owner-imposed recipient change requires the three-day delay and must execute within the next three days. The creator can enable or disable its buyback route; the protocol owner may disable it but cannot force it on. Already accrued buyback amounts are earmarked at trade time, so toggling does not reassign prior accruals.

Sweeps that execute an internal conversion/buyback require the trusted fee-sweep operator; the creator may distribute direct fees where no internal swap is needed. Internal swaps require nonzero minimum outputs and price bounds. Paused or blocked quote assets can still prevent transfers; source rescue paths do not establish guaranteed recovery.

## Anti-snipe and graduation semantics

Nonexempt buys during the initial window calculate `startBps >> floor(elapsedSeconds × 14 / windowSeconds)`. At or after 15 seconds the value is zero. The actual buy path caps the penalty at `10000 − baseFeeBps − creatorTaxBps − 100`, leaving at least 1% for buying before price impact. With current 1% base fee and zero creator tax, the maximum applied penalty is therefore **98%**, despite the nominal 99% setting.

The original creator and selected fee recipient are exempt; the source permits up to 32 additional launch-declared exempt addresses. Penalty proceeds join the base-fee bucket and use its protocol/creator/buyback split. The penalty is a launch-window **buy** charge, not a permanent ERC-20 transfer tax.

The source curve uses virtual-reserve constant-product pricing with the real reserve and phantom quote separated. A threshold-crossing buy attempts the first graduation phase; failure emits a retry signal without reverting the underlying successful buy. Graduation is two-phase: `NotGraduated → Swept → PoolCreated`. The first phase closes/sweeps the curve; a permissionless second call initializes/mints a full-range locked position. An owner rescue exists after seven days if the swept market cannot be seeded. SONIRA v2 retains and discloses this authority as a material trust and availability tradeoff.

## Current deployed usage: seven launches, no graduations

A full-history `TokenLaunched` log query returned **seven** launches: five native ETH and two cbBTC quote markets. All seven currently have:

- `creatorTaxBps = 0`, `buybackEnabled = false`, phase `0` and `graduated = false`.
- Creator recipient equal to original deployer; no pending owner recipient override.
- Vault total locked/released/releasable amounts equal to zero.
- The policy snapshot shown above.

One native curve (`0xe5f8615953b2072BDC9fb259207E88f7C9A4CbED`) has base-fee balance **80000000000000 wei**; the other six read zero. Creator-tax and buyback balances are zero for all seven. Escrow `totalOwedNative()` is zero. These observations establish configuration and some curve fee accrual, not executed creator-tax, buyback or post-graduation trading usage. The older three-card UI observation was a separate earlier rendering and should not override this complete factory-log result.

## Quote assets: 66 approved assets, not 66 verified stocks

Full-history `PairTokenApprovalUpdated` logs contain **66 unique assets**. All 66 are currently approved; each has nonempty bytecode and readable name, symbol, decimals and per-asset phantom/target configuration. **64 use 18 decimals, USDG uses 6, and cbBTC uses 8.** Calling all 66 stocks would be inaccurate. This is mainnet evidence, not proof these addresses exist on testnet.

| Asset | Mainnet address | Decimals | Phantom quote, whole units | Graduation target, whole units |
|---|---|---:|---:|---:|
| TSLA | `0x322F0929c4625eD5bAd873c95208D54E1c003b2d` | 18 | 10.4 | 26 |
| USDG | `0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168` | 6 | 3236 | 8090 |
| cbBTC | `0xCEC185eB182c47d1bA1EFc84e6959e18cd620Be4` | 8 | 0.052739 | 0.13184752 |

All other exact raw amounts/addresses are in the JSON. The source supports quote decimals of at least six, with stored expected decimals rechecked at approval. Existing launches snapshot their configuration; owner changes apply to later launches. Native ETH is a special branch: zero-address ERC-20 approval/economics getters return false/zero, but native config 0 remains enabled.

## Dependency wiring and authority

| Role | Mainnet address |
|---|---|
| Factory | `0x8C36645F6f1Ee058FF2aE4f05BCfE5A066b04765` |
| Hook / fee policy | `0xfEDaB4F95ae0FfcFd02eD4993Ab704a17B422044` |
| Shared fee escrow | `0xFEE5C0DEA81E1eB07ccE09F65ff7F2D26C1f391c` |
| Buyback vesting vault | `0xe8B5afCc92694c444632562Ef6f7ff99aE8C0Db3` |
| Permanent LP locker | `0x3C5B08C2bBEcDd423FC70A8278b160145877311f` |
| Factory/hook/vault owner and fee-sweep operator | `0x67BF37f73b69447fdAB3e98585Cc9C49Fac161c9` |
| Protocol fee recipient | `0x7B971e8C4BF63667cAB46C61671B6aCfE9E9FF59` |

Factory points to the hook, escrow and vault; hook points back to factory and shares that escrow/vault; vault points back to factory/hook and shares the escrow. All have deployed runtime code. Factory/hook/vault `pendingOwner()` are zero; factory `launchForwarder()` is zero. Other PoolManager/PositionManager/Permit2/executor/guard getters are preserved in the JSON. Matching getters/code presence alone are not an independent audit of those dependencies.

## What remains planned rather than proven

The saved public board says **“$GROOVE — contract address coming soon”** and claims protocol-fee buyback/burn of that platform token. That is separate from the deployed **per-sound buyback-and-five-year-lock** mechanism above. This research did not discover a verified platform-token address or executed platform-token burn; do not conflate the two or issue an unnecessary new token merely to imitate an unverified promise.

## Current SONIRA v2 implementation and evidence boundary

SONIRA v2 now adapts the MIT-licensed Groove economic core with [attribution and provenance](contracts-v2__NOTICE.md), plus its own media/studio integration, quote lens, router, website and branding. The delivered policy uses a 1% base fee in both phases, split 70% creator / 30% protocol, optional 0–10% creator tax and optional per-sound buyback funding from half the creator base-fee bucket. Bought-back tokens vest linearly over five years, with weighted remaining-duration top-ups that preserve already vested value; releases credit 70% creator / 30% protocol through escrow. The prior v1 50/50 curve-only split and inaccessible LP-fee design are historical and have been superseded.

The v2 business plan, operating playbook, HTML and searchable PDF have been updated. They distinguish protocol quote receipts, creator tax, operator-dependent conversions/claims and unrealized vested sound tokens. Public configuration enables native ETH and only the five verified stock-named testnet assets. Six/eight-decimal core support and the 66 verified **mainnet reference assets** do not imply those assets are available on testnet.

V2 validation has passed **20 local unit tests and three genuine-v4 local-fork scenarios** (`contracts-v2/test-unit-results.log`, `contracts-v2/test-v4-results.log`). Historical browser validation under the previous identity completed the native lifecycle with **11 confirmed local transactions** and a separate six-decimal fixture covering a 35-second audio-plus-cover publication, fee flow, buyback vesting claims and creator-recipient transfer. These are SONIRA local/fork results, distinct from the seven reference-project launches observed at the pinned mainnet block. They establish neither a public SONIRA deployment nor an independent audit.

Public SONIRA testnet deployment and source verification remain pending; this branding release did not read a credential or send a public transaction. No domain/X acquisition, mainnet release, commercial revenue, real stock exposure or deployed SONIRA platform token is claimed.
