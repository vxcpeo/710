# Reference parity: verified Robinhood testnet dependencies

**Research date: 17 September 2026. Read-only investigation; no transaction was broadcast and no private key was accessed.**

## Conclusion

Native-ETH and ERC-20 quote markets, followed by **real Uniswap v4 pool graduation on Robinhood Chain testnet 46630**, are technically feasible using infrastructure that is already deployed. The absence of a testnet row in Uniswap's current deployment feed does **not** imply absent testnet contracts. Direct code, getter, source-comparison and existing-position checks establish useful deployed infrastructure at the addresses below.

The five stock-named test ERC-20s are also deployed and readable. Their issuer-controlled pause/blocklist/mint/burn and upgrade mechanics must be handled. The official faucet rendered a page shell but its application JavaScript returned HTTP 429, so this session could not independently confirm the faucet's current token selector or prove its allocation endpoint maps to these five addresses. They should be described as **verified stock-named test tokens**, not newly asserted canonical faucet assets or real securities exposure.

Existing external contracts, source matches and read calls alone do not prove SONIRA integration. **Current v2 evidence:** 20 local unit tests and three genuine-v4 local-fork scenarios passed in `contracts-v2/`; final browser integration records 33 successful local browser transactions plus two local operator sweeps. These are isolated execution results, not a public SONIRA deployment or independent audit. See current validation, [v2 reference/implementation boundary](research__parity__v2-reference-mechanics.md) and [v2 attribution](contracts-v2__NOTICE.md). Earlier `contracts/` tests, gas figures and design decisions in this record are explicitly historical v1 evidence. `key.txt` remains absent and public deployment is pending.

## 1. Pinned network evidence

All contract reads in [`parity/dependency-verification.json`](research__parity__dependency-verification.json) use these explicit block tags rather than moving `latest` state:

| Network | RPC | Chain ID | Block | Block timestamp, UTC |
|---|---|---:|---:|---|
| Robinhood Chain testnet | `https://rpc.testnet.chain.robinhood.com` | 46630 | 120766832 / `0x732c170` | 2026-09-17 11:26:01 |
| Robinhood Chain mainnet, comparison only | `https://rpc.mainnet.chain.robinhood.com` | 4663 | 65329613 / `0x3e4d9cd` | 2026-09-17 11:26:03 |

Testnet block hash: `0x701aaa660529747565683deb66a89d8fb21cc707ea5c5488a93620f391ba3aea`. Mainnet block hash: `0x4a1db59afd612436aac29f358efd9bb872d0c13707eeefd764e289e51343c927`.

The [official connection page](https://docs.robinhood.com/chain/connecting) identifies these RPC URLs and chain IDs. Mainnet reads were used only to compare published reference deployments; they were not substituted for testnet checks.

## 2. Existing v4 infrastructure on testnet

| Contract | Address on chain 46630 | Runtime bytes | Evidence |
|---|---|---:|---|
| PoolManager | `0x8366a39CC670B4001A1121B8F6A443A643e40951` | 24,009 | Testnet code; source shown as verified by Blockscout; byte-for-byte same runtime as the documented mainnet deployment |
| PositionManager | `0x58daec3116aae6D93017bAAea7749052E8a04fA7` | 23,877 | Testnet code and getters; code matches Sourcify-verified mainnet logic after masking only compiler-declared immutable slots |
| Permit2 | `0x000000000022D473030F116dDEE9F6B43aC78BA3` | 9,152 | Listed for testnet in Robinhood protocol docs; testnet code and Blockscout verified source; PositionManager getter agrees |
| StateView | `0xF3334192D15450CdD385c8B70e03f9A6bD9E673b` | 3,531 | Exact same runtime as mainnet; `poolManager()` agrees; real initialized pool reads succeed |
| V4Quoter | `0x8Dc178eFB8111BB0973Dd9d722ebeFF267c98F94` | 6,118 | Exact same runtime as mainnet; `poolManager()` agrees; testnet explorer exposes ABI/source metadata but its verification flag was false |
| UniversalRouter | `0x8876789976decbfcbbbe364623c63652db8c0904` | 24,546 | Testnet code and `poolManager()` agree; full router behavior was not tested in this research |

The [official Uniswap deployment page](https://docs.uniswap.org/contracts/v4/deployments) and [machine-readable feed](https://docs.uniswap.org/deployments.json) list these address strings under **mainnet 4663**. The retrieved feed had **zero records for 46630**. Its `generatedAt` was `2026-07-15T22:25:40.000Z`, source repository `Uniswap/contracts`, commit `37936185dee7decf681360ec799c124e0e034672`. Therefore “officially listed testnet deployment” would overstate the documentation; “deployed and independently checked on testnet” is supported.

Selected runtime hashes from testnet:

```text
PoolManager     0xbd3881180b547f5fe817545743cfb4343e96b1bc6640dcd70c106b0066e95626
PositionManager 0xf3a0edb689229fa4bf135a728f2ec2eb4a2fbee2e41e3e74ffadb7b4c56e8a6d
Permit2         0x0117e0ed818bc3f2a8729ffc336c837e63e965f04b473047b39b35ad86aac259
StateView       0x7d9c591e0956fd89d98feb4ffcfe8bf1f7a62bd485edd979fa21d104b49878a6
V4Quoter        0xd707b1da8cb165e5ea35a3b4450d971eb562ec171e23492aa117036b78a868f6
UniversalRouter 0xfdd90802f39ce5fc8bac4c2f1b3ac7bac530fd17ff46b0630f1e14082f
```

PositionManager identity received a stronger comparison than name/ABI matching. Sourcify reports a mainnet runtime match compiled with Solidity `0.8.26+commit.8a97fa7a`. Across the two 23,877-byte runtimes, **34 bytes differ, all within compiler-declared immutable references; zero bytes differ outside those ranges**. After masking those immutable ranges, both runtimes hash to `0xcfd46cf5610444f7dcc8760cb6281fae59ce9c8d434bb6e816c7e2d410bd88c9`. This establishes matching executable logic without pretending chain-specific immutable values are identical.

### Getter and existing-pool checks

On testnet, PositionManager returned the PoolManager and Permit2 above, and `nextTokenId()` returned **4849**. StateView, V4Quoter and UniversalRouter each returned the same PoolManager.

Position NFT **1** exists. Its owner and token currency are `0x17486A01bb8c3Ac90d94AeD9A16e8fE33b28F300`; its PoolKey is native currency `0x0`, that ERC-20, fee 3000, tick spacing 60, no hooks. Pool ID is `0xb7dd20388f79fb8c3800da596dff299f11f6ae3afa3b33ddea71438fd5915cbd`. StateView returned sqrtPriceX96 `792281625142643375935439503360000`, tick 184216 and liquidity `100000000000000000000`. Position NFTs 4847 and 4848 also exist and refer to a pool with nonzero liquidity. These are external testnet positions, not SONIRA launches.

### Important wrapped-ETH mismatch

The [official Robinhood protocol-contract page](https://docs.robinhood.com/chain/protocol-contracts) lists testnet bridge WETH as `0x7943e237c7F95DA44E0301572D358911207852Fa`. It has 2,202 bytes of code, name/symbol WETH, and 18 decimals at the pinned block.

The existing testnet PositionManager's `WETH9()` instead returns `0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73`, which has **zero code on testnet** at this block. Do **not** use its WRAP/UNWRAP actions. Native v4 pools use `Currency.wrap(address(0))` and can settle native ETH directly; the initialized native pool above corroborates that path. If wrapped routes are later required, deploy/configure a separate correctly wired periphery rather than silently using the empty address.

## 3. Verified stock-named test tokens

| Symbol | Testnet contract | Decimals | Read-back name |
|---|---|---:|---|
| TSLA | `0xC9f9c86933092BbbfFF3CCb4b105A4A94bf3Bd4E` | 18 | Tesla |
| AMZN | `0x5884aD2f920c162CFBbACc88C9C51AA75eC09E02` | 18 | Amazon |
| AMD | `0x71178BAc73cBeb415514eB542a8995b82669778d` | 18 | AMD |
| PLTR | `0x1FBE1a0e43594b3455993B5dE5Fd0A7A266298d0` | 18 | Palantir Technologies |
| NFLX | `0x3b8262A63d25f0477c4DDE23F83cfe22Cb768C93` | 18 | Netflix |

Discovery source: the [official testnet explorer ERC-20 list](https://explorer.testnet.chain.robinhood.com/api/v2/tokens?type=ERC-20), followed by independent `eth_getCode` and `eth_call` to each exact address. All five have 283-byte beacon-proxy runtimes with hash `0x2f367e6a678e7b30ab613d5963e541e6f4d3ca586de76e2f441fbfeb1a27c440`. Each returned 18 decimals, matching name/symbol, total supply `6153100000000000000000000`, `paused() == false` and `uiMultiplier() == 10^18` at the pinned block.

The explorer maps them to Stock implementation `0xBd14156E05c6AF28ad39aA53a2AB8eB9CDf657DA`. Its [verified source](https://explorer.testnet.chain.robinhood.com/api/v2/smart-contracts/0xBd14156E05c6AF28ad39aA53a2AB8eB9CDf657DA) and related access-control sources are archived. Registry/beacon address is `0x1dF3cA0fD30ED5eeb09eB01938f4E9c5196E6Ca5`.

These are **not unrestricted mintable mocks**:

- `transfer` checks token/global pause and blocklist status of sender and recipient.
- `transferFrom` checks pause and blocklist status of sender, recipient and caller; allowance is still required.
- `approve` checks pause and the approving account's blocklist status.
- `mint` requires `MINTER_ROLE`; ordinary users cannot mint directly.
- Administrative burn, metadata/multiplier changes and beacon upgrades exist.
- The UI multiplier affects display views; raw `balanceOf` and transfer units remain normal ERC-20 units. Do not multiply raw curve reserves a second time.

Initial read-only simulation of `approve(spender, 1)`, `transfer(recipient, 0)` and `transferFrom(sender, recipient, 0)` returned true for all five with ordinary nonblocked addresses. These checks alone did not prove funded transfers. Later, holder `0x13aF0afcBf609928440d7285263EC872850faFFb` was verified by public RPC to hold 23,605.018661880961817988 TSLA at block `0x732e1c1`, and a read-only 100-token transfer simulation succeeded. [Holder evidence](research__parity__stock-holder-evidence.json) preserves those calls. The historical v1 contract suite then impersonated that holder **only inside the local fork**, funded a test buyer and completed a nonzero approval, full-curve buy, failed-graduation rollback, actual v4 graduation, both swap directions and creator/protocol withdrawals. No public holder control, faucet allocation or future unrestricted-transfer guarantee is asserted. V2 execution evidence is recorded separately in its own suite and current validation record.

Safe integration requires an explicit per-network address allowlist, exact balance-delta checks, SafeERC20, independent reserves and withdrawal liabilities per quote asset, allowance UI, and clear failure/retry states for pause or blocklist conditions. Stock tokens have no assumed dollar price in this research; a stock-symbol quote is a unit of a test token, not a live equity valuation.

## 4. Existing PositionManager action ABI

The verified mainnet PositionManager source, whose testnet logic matched as described above, uses the following action bytes and encodings. Installed `@uniswap/v4-periphery@1.0.3` matches the relevant interface:

```text
MINT_POSITION = 0x02
  abi.encode(PoolKey, int24 tickLower, int24 tickUpper,
             uint256 liquidity, uint128 amount0Max, uint128 amount1Max,
             address owner, bytes hookData)

SETTLE_PAIR = 0x0d
  abi.encode(Currency currency0, Currency currency1)

SWEEP = 0x14
  abi.encode(Currency currency, address recipient)

modifyLiquidities(bytes unlockData, uint256 deadline) payable
  unlockData = abi.encode(bytes actions, bytes[] params)
```

Deadline check is `block.timestamp > deadline`; equality is accepted. Use a fresh bounded deadline, not an indefinitely valid authorization. ERC-20 settlement through Permit2 requires both the token's approval to Permit2 and Permit2's bounded allowance for PositionManager. Allowance amount/expiration field widths must be checked before narrowing.

Use explicit-liquidity `MINT_POSITION`, not the delta-based mint variant. One supplied source variant marks delta-based liquidity actions deprecated for sandwich exposure. A permissionless unguarded initializer would expose the target pool to pre-graduation price squatting. **Historical v1** used an original anti-squatting hook and a 0.3% core LP fee with inaccessible LP income. **Current v2 supersedes that design:** it adapts Groove's guarded graduation, full-range locked position and zero core LP fee; the custom hook charges a 1% base trading fee plus optional creator tax. The base fee is split 70% creator / 30% protocol and continues after graduation. The modeled 0.3% protocol share of fee basis is not a 0.3% LP fee.

## 5. Groove graduation semantics and onchain configuration

Reference factory on **mainnet 4663**: `0x8C36645F6f1Ee058FF2aE4f05BCfE5A066b04765`. [Sourcify's contract endpoint](https://sourcify.dev/server/v2/contract/4663/0x8C36645F6f1Ee058FF2aE4f05BCfE5A066b04765?fields=all) returned verified source, ABI, compiler input/output and runtime information. The unmodified archive is retained for evidence. SONIRA v2 adapts its MIT-licensed project modules with attribution and recorded provenance; verified upstream source is not an audit of the modified integration.

Observed public mechanics, with the source comments checked against functions rather than treated as guarantees:

1. The curve and graduated pool use the **same quote asset**, so graduation need not exchange ETH for a stock token or call a price oracle. An older executor comment refers to swapping; the current factory design and executable path use the existing quote asset. Do not infer required conversions from that stale comment.
2. The state machine is `NotGraduated → Swept → PoolCreated`, with a distinct `Rescued` terminal path.
3. Permissionless `graduate(token)` requires a known token, the correct phase, curve readiness and feasible seed amounts. It closes/sweeps the curve into factory accounting. The crossing buy may attempt this internal phase.
4. Permissionless `createGraduatedPool(token)` is a separate retryable transaction. It only accepts `Swept`, rechecks feasibility, sorts currencies, initializes the pool price, mints a full-range position **directly to the locker**, registers the position and emits completion.
5. To preserve the terminal curve price, only the appropriate share of remaining tokens enters the real-reserve pool. Excess virtual-reserve tokens are permanently placed in the locker. Token rounding dust is locked; quote dust is routed separately.
6. The locker records the token ID only after `PositionManager.ownerOf(tokenId)` equals the locker. “LP locked” requires the actual locker to have no method permitting principal withdrawal or NFT transfer, not merely a UI badge.
7. A seed guard checks sorted-price bounds, viable nonzero liquidity, valid tick spacing and signed `int128` currency-delta limits. Checking only `uint128` action arguments is insufficient.
8. The reference has an owner-controlled rescue after **604800 seconds (7 days)** if a swept market remains unseedable under its asset rules. That is an explicit trust surface. It is not equivalent to a system with no owner reserve access.

Mainnet factory `getLaunchConfig(0)` returned:

| Field | Onchain value |
|---|---:|
| Supply | 1,000,000,000 × 10^18 |
| Curve fee | 100 basis points |
| Phantom quote | 1.68 ETH |
| Graduation threshold | 4.2 ETH |
| Core v4 pool fee | 0; custom hook implements its fee behavior |
| Tick spacing | 200 |
| Enabled | true |
| Factory launch fee | 0.0005 ETH |

Factory getters identify these mainnet dependencies: locker `0x3C5B08C2bBEcDd423FC70A8278b160145877311f`; hook `0xfEDaB4F95ae0FfcFd02eD4993Ab704a17B422044`; executor `0xC19B3fA246ce9686BFfE732E13505c2AD28e0371`; guard `0x29846E22cF9162f2052bE115f2155926F033AEAe`. These are **reference-project contracts, not SONIRA dependencies or addresses to reuse**.

**Historical v1 design, superseded:** the original linear model released 500 million curve tokens, performed atomic graduation and retained pull-withdrawal liabilities in each sound contract. Those mechanics do not describe v2. **Current v2** uses the adapted virtual-reserve constant-product curve, 1.68 ETH native phantom quote, 4.2 ETH real-reserve target, separate token/curve contracts, shared fee escrow, two-phase graduation and a seven-day owner reserve-rescue path. Seller proceeds/refunds pay directly; fees accrue before sweep and escrow claim. Studio media publication and token launch are atomic, while graduation is not. The business plan and v2 sources govern current economics.

## 6. Historical fork discovery and v1 validation

[`parity/fork-check.mjs`](research__parity__fork-check.mjs) successfully creates a Hardhat 3.16 EDR fork of testnet block 120766832 using the public RPC. It confirms chain ID 46630, PoolManager code hash, PositionManager's PoolManager/Permit2 getters and nextTokenId 4849.

An initial historical `eth_call` failed because Hardhat lacked an activation history for chain 46630. **Mine one block on the local fork immediately after network creation** with `evm_mine`, then execute calls against `latest`. The configured Cancun hardfork then applies to the locally created block. This is a local simulation step, not a remote transaction or a change to Robinhood Chain.

The historical discovery helper changes its process working directory to `contracts/` so Hardhat can find that v1 package, uses `type: 'edr-simulated'`, `chainId: 46630`, `hardfork: 'cancun'`, `forking.blockNumber: 120766832`, and a normal `User-Agent` header. It is not the current v2 test entry point. No signer secret is needed for a local fork; current implementation and scripts live in `contracts-v2/`.

The public RPC later failed to supply historical account state for fresh predicted CREATE2 addresses when a complete deployment used the older pinned block. Selecting a fresh block solved that environment failure. The production contract suite fetches and reports its fork block before creating the isolated EVM. Do not claim archive support for this endpoint, silently fabricate the missing state or label a mock v4 test as a genuine fork.

The **historical v1** passing fork run at block 120779568 minted real PositionManager NFTs 4849, 4850 and 4851 **in the fork only**. Tests checked native/custom ERC-20/actual test TSLA graduation and both swap directions, a terminal-price tolerance of 1e-8, locked NFT ownership and absent approvals, cleared ERC-20/Permit2 allowances, rejected pool squatting, failed-graduation rollback, deadline execution and withdrawal accounting. Its 30 local tests additionally covered immutable metadata, shared media caps and byte reconstruction. Its maximum audio/cover/text publication used 25,204,709 local gas. Historical logs: `../contracts/test-unit-results.log` and `../contracts/test-v4-results.log`. These counts, amounts and guarantees must not be reused as v2 validation. Current logs are `contracts-v2/test-unit-results.log` and `contracts-v2/test-v4-results.log`; current browser and deployment status are in `docs/VALIDATION.md`.

## 7. Fallback deployment and verification requirements

The verified existing infrastructure makes a self-deployment of upstream v4 infrastructure unnecessary for the current native/ERC-20 integration. SONIRA v2 deploys its own instances of the attributed adapted factory, hook, graduation components, escrow, vesting vault and locker, alongside original studio/media/lens/router integrations; it does not reuse Groove's deployed project addresses. Public SONIRA deployment is pending. A reproducible upstream fallback is useful if existing v4 contracts become unsuitable, especially for working wrap/unwrap support:

- Pin upstream `@uniswap/v4-core` and `@uniswap/v4-periphery` versions/commits and preserve their license notices. Review the v4-core BUSL deployment-license terms; source availability is not a blanket commercial license.
- Deploy PoolManager, Permit2 if necessary, correctly configured PositionManager/descriptor and StateView; optionally deploy a router/quoter when the product actually uses them. Pass the correct testnet wrapped token only if wrapping is required.
- Treat these as **SONIRA-managed testnet deployments of upstream code**, not canonical Uniswap infrastructure, and publish the exact bytecode hashes and configuration.
- Test native/ERC-20 initialization, mint, settlement, swaps, permanent custody, dust, paused/blocked quote assets, retries and complete accounting. A substitute generic “AMM mock” is insufficient evidence of v4 integration.
- Archive transaction receipts and explorer verification only after actual funded public deployment. Upstream reviews do not constitute an audit of SONIRA's integration, locker or deployment procedure.

## 8. Evidence archive and reproduction

The full read-only evidence bundle is under `research/parity/`:

- `dependency-verification.json`: pinned network state, code sizes/hashes, getters, stock data, normalized code comparison, existing pools and simulated-call results.
- `verify.mjs`, `enrich.mjs`, `getters.mjs`, `pool-evidence.mjs`, `compare-position-manager.mjs`: reproducible public read calls. They never read `key.txt` or send transactions.
- `fork-check.mjs`: local-only fork proof; mines one local block and closes the connection.
- `stock-holder.mjs` and `stock-holder-evidence.json`: public read-only TSLA balance and transfer simulation for a local-fork fixture.
- `economics.mjs` and `economics-verification.json`: historical v1 deterministic linear-curve/seed calculations, not current v2 economics or deployment receipts.
- `contract-review.md`: historical v1 bounded read-only second-agent review of accounting, custody and integration; neither a v2 review nor an independent security audit.
- `sources/manifest.json`: URLs, retrieval timestamp and content hashes.
- `sources/grooveFactory.json`, `positionManagerMainnet.json`, `stockImplementation.json`, `poolManagerTestnet.json`: full original source/API responses, including upstream license notices. The unmodified Groove archive also supplies the attributed MIT adaptation's source provenance; see `contracts-v2/NOTICE.md` and `reference-provenance.json`.

Research sources: [Robinhood chain configuration](https://docs.robinhood.com/chain/connecting), [Robinhood protocol contracts](https://docs.robinhood.com/chain/protocol-contracts), [official token page](https://docs.robinhood.com/chain/contracts), [official faucet](https://faucet.testnet.chain.robinhood.com/), [testnet explorer](https://explorer.testnet.chain.robinhood.com/), [Uniswap deployments](https://docs.uniswap.org/contracts/v4/deployments), [deployment feed](https://docs.uniswap.org/deployments.json), [v4-core](https://github.com/Uniswap/v4-core), [v4-periphery](https://github.com/Uniswap/v4-periphery), [Groove launch form](https://www.groove.fun/launch), and the Sourcify/explorer endpoints linked above. Accessed 17 September 2026.
