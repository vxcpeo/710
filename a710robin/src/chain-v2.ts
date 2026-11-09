import { ref, computed } from 'vue'
import { Contract, JsonRpcProvider, Interface, ZeroAddress, ZeroHash, MaxUint256, getAddress, isAddress, formatUnits, parseUnits, hexlify, randomBytes, keccak256, AbiCoder } from 'ethers'
import { NETWORK, account, transactionSigner } from './wallet'
export { NETWORK, account, signedIn, wrongNetwork, walletBusy, wallets, connectWallet, disconnect, signIn, switchNetwork } from './wallet'
import studioAbi from './abi-v2/SoniraStudio.json'
import factoryAbi from './abi-v2/SoniraLaunchFactory.json'
import tokenAbi from './abi-v2/SoniraToken.json'
import curveAbi from './abi-v2/SoniraBondingCurve.json'
import mediaAbi from './abi-v2/SoniraMediaRegistry.json'
import hookAbi from './abi-v2/SoniraHook.json'
import escrowAbi from './abi-v2/SoniraFeeEscrow.json'
import vaultAbi from './abi-v2/SoniraBuybackVault.json'
import lockerAbi from './abi-v2/SoniraLaunchLocker.json'

const ERC20_ABI = ['function name() view returns(string)','function symbol() view returns(string)','function decimals() view returns(uint8)','function balanceOf(address) view returns(uint256)','function allowance(address,address) view returns(uint256)','function approve(address,uint256) returns(bool)']
const LENS_ABI = ['function quoteBuy(address curve,uint256 grossIn,address recipient,uint256 slippageBps) view returns(uint256 tokensOut,uint256 spent,uint256 baseFee,uint256 creatorTax,uint256 snipeTax,uint256 refund,uint256 minTokensOut)','function quoteSell(address curve,uint256 tokensIn) view returns(uint256 gross,uint256 baseFee,uint256 creatorTax,uint256 net)']
const ROUTER_ABI = ['function quoteExactInput(address token,bool buy,uint256 amountIn) returns(uint256 amountOut)','function swapWithDeadline(address token,bool buy,uint256 amountIn,uint256 minOut,address recipient,uint256 deadline) payable returns(uint256 amountOut)']
const errorInterfaces = [studioAbi, factoryAbi, tokenAbi, curveAbi, mediaAbi, hookAbi, escrowAbi, vaultAbi].map(abi => new Interface(abi))
export const readProvider = new JsonRpcProvider(NETWORK.rpcUrls[0], 46630, { staticNetwork: true })
export type Deployment = { chainId: number; protocolVersion: number; factoryAddress: string; studioAddress: string; mediaRegistryAddress: string; hookAddress: string; escrowAddress: string; vaultAddress: string; lockerAddress: string; lensAddress: string; routerAddress: string; launchConfigId: number; quoteAssets?: string[] }
export const deployment = ref<Deployment | null>(null)
export const factoryAddress = computed(() => deployment.value?.factoryAddress || '')
export const chainReady = computed(() => !!deployment.value)
export const networkError = ref('')
export const totalSoundCount = ref(0)
export type QuoteAsset = { address: string; symbol: string; name: string; decimals: number; target: string; phantom: string }
export const nativeQuote: QuoteAsset = { address: ZeroAddress, symbol: 'ETH', name: 'Test Ether', decimals: 18, target: '4.2', phantom: '1.68' }
export const quoteAssets = ref<QuoteAsset[]>([nativeQuote])
export const launchTerms = ref({ supply: '1000000000', fee: '0.0005', baseFeeBps: 100, creatorShareBps: 7000, maxTaxBps: 1000, buybackShareBps: 5000, snipeStartBps: 9900, snipeSeconds: 15, enabled: true })
const assetCache = new Map<string, QuoteAsset>([[ZeroAddress, nativeQuote]])
const displayedEconomics = new Map<string, string>()
const abiCoder = AbiCoder.defaultAbiCoder()
const displayPrice = (quote: bigint, tokens: bigint, decimals: number) => tokens > 0n ? String(Number(formatUnits(quote,decimals)) / Number(formatUnits(tokens,18))) : '0'
function config() { if (!deployment.value) throw new Error('Publishing opens after the Sonira testnet deployment.'); return deployment.value }
function factory() { return new Contract(config().factoryAddress, factoryAbi, readProvider) }
export function errorText(error: any) {
  if (error?.code === 4001 || error?.code === 'ACTION_REJECTED') return 'Request declined in your wallet. Nothing was submitted.'
  if (error?.code === 'INSUFFICIENT_FUNDS') return 'Your wallet needs enough test ETH for network gas and any native payment.'
  const data = error?.data || error?.info?.error?.data || error?.error?.data
  const messages: Record<string, string> = {
    SlippageExceeded: 'The quote moved outside your limit. Refresh the quote and try again.',
    CurveGraduated: 'This curve has closed. Refresh the market to complete graduation or use its pool.',
    NotReadyToGraduate: 'The market has not reached its graduation allocation. Refresh its status.',
    CreatorTaxTooHigh: 'The creator tax exceeds the allowed ceiling.',
    LaunchEconomicsMismatch: 'Launch terms changed before confirmation. Review the updated terms and retry.',
    LaunchFeeNotPaid: 'The launch fee changed. Refresh the studio before publishing.',
    NotFeeSweepOperator: 'Only the fee recipient or configured operator can distribute these fees.',
    InternalSwapRequiresOperator: 'These fees need an internal conversion or buyback. The configured operator must process them before claiming.',
    DeadlineExpired: 'The swap expired. Refresh the quote and retry.',
    InsufficientOutput: 'The pool output moved below your protected minimum. Refresh and retry.',
    NothingToClaim: 'No fees are ready to claim in this currency.',
    MinimumOutputRequired: 'A protected output quote is required for this operation.',
    WrongGraduationPhase: 'The market changed phase. Refresh its status before continuing.',
    InexactTransfer: 'This asset did not transfer the exact amount. The transaction was reverted.',
  }
  for (const iface of errorInterfaces) {
    try { const result = iface.parseError(typeof data === 'object' ? data.data : data); if (result) return messages[result.name] || `The contract rejected this request (${result.name}). Refresh the market and review the inputs.` } catch { /* Different wallet error formats. */ }
  }
  return String(error?.shortMessage || error?.reason || error?.message || 'The request could not be completed.').slice(0, 300)
}
export function safeExternalUrl(value: string) {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password && /^[\x21-\x7e]+$/.test(value) && value.length <= 256 ? url.href : '' } catch { return '' }
}
export async function assetInfo(address: string): Promise<QuoteAsset> {
  const key = getAddress(address)
  if (assetCache.has(key)) return assetCache.get(key)!
  const token = new Contract(key, ERC20_ABI, readProvider)
  const [name, symbol, decimals] = await Promise.all([token.name(), token.symbol(), token.decimals()])
  if (Number(decimals) < 6 || Number(decimals) > 80) throw new Error('This quote asset has an unsupported decimal precision.')
  const result = { address: key, name: String(name).slice(0, 80), symbol: String(symbol).slice(0, 16), decimals: Number(decimals), target: '0', phantom: '0' }
  assetCache.set(key, result); return result
}
export async function initializeChain() {
  try {
    const response = await fetch('/deployment.json', { cache: 'no-store' })
    if (!response.ok) throw new Error('Deployment configuration could not be loaded.')
    const manifest = await response.json()
    if (!manifest.factoryAddress) return
    if (manifest.chainId !== 46630 || manifest.protocolVersion !== 2) throw new Error('This build requires the Sonira v2 testnet deployment manifest.')
    for (const field of ['factoryAddress','studioAddress','mediaRegistryAddress','hookAddress','escrowAddress','vaultAddress','lockerAddress','lensAddress','routerAddress']) manifest[field] = getAddress(manifest[field])
    const studio = new Contract(manifest.studioAddress, studioAbi, readProvider)
    if (await studio.factory() !== manifest.factoryAddress || await studio.mediaRegistry() !== manifest.mediaRegistryAddress) throw new Error('Studio deployment wiring does not match its manifest.')
    deployment.value = manifest
    const main = factory(), hook = new Contract(manifest.hookAddress, hookAbi, readProvider)
    const [fee, terms, policy, maxTax, start, seconds, enabled] = await Promise.all([main.launchFee(), main.getLaunchConfig(manifest.launchConfigId || 0), hook.currentFeePolicy(), main.maxCreatorTaxBps(), main.snipeTaxStartBps(), main.snipeTaxSeconds(), main.launchEnabled()])
    launchTerms.value = { supply: formatUnits(terms.supply,18), fee: formatUnits(fee, 18), baseFeeBps: Number(terms.curveFeeBps), creatorShareBps: 10000 - Number(policy.protocolFeeShareBps), maxTaxBps: Number(maxTax), buybackShareBps: Number(policy.buybackBurnBps), snipeStartBps: Number(start), snipeSeconds: Number(seconds), enabled: enabled && terms.enabled }
    const enabledAssets: QuoteAsset[] = [{ ...nativeQuote, target: formatUnits(terms.graduationThreshold, 18), phantom: formatUnits(terms.phantomQuote, 18) }]
    for (const address of manifest.quoteAssets || []) {
      if (getAddress(address) === ZeroAddress || !await main.approvedPairTokens(address)) continue
      const asset = await assetInfo(address), economics = await main.pairTokenEconomics(address)
      if (asset.decimals !== Number(economics.decimals)) throw new Error(`The decimals of ${asset.symbol} changed; publishing in this currency is disabled.`)
      enabledAssets.push({ ...asset, target: formatUnits(economics.graduationThreshold, asset.decimals), phantom: formatUnits(economics.phantomQuote, asset.decimals) })
    }
    for (const asset of enabledAssets) displayedEconomics.set(asset.address, await main.previewLaunchEconomics(manifest.launchConfigId || 0, asset.address))
    quoteAssets.value = enabledAssets; networkError.value = ''
  } catch (error) { deployment.value = null; networkError.value = errorText(error) }
}

export type Socials = { twitter: string; telegram: string; discord: string; website: string; farcaster: string }
export type SoundMetadata = { description: string; cover: string; website: string; social: string; socials: Socials; audioHash: string; audioBytes: number; createdAt: number }
const metadataCache = new Map<string, SoundMetadata>()
export async function soundMetadata(address: string): Promise<SoundMetadata> {
  const key = `${config().studioAddress}:${getAddress(address)}`
  if (metadataCache.has(key)) return metadataCache.get(key)!
  const token = new Contract(address, tokenAbi, readProvider), registry = new Contract(config().mediaRegistryAddress, mediaAbi, readProvider)
  const [description, links, media, bytes] = await Promise.all([token.description(), token.socials(), registry.mediaInfo(address), registry.coverBytes(address)])
  let cover = ''
  if (/^0xffd8ff[\da-f]*$/i.test(bytes) && bytes.length <= 32770) cover = `data:image/jpeg;base64,${btoa(String.fromCharCode(...Uint8Array.from(bytes.slice(2).match(/.{2}/g) || [], (hex: string) => parseInt(hex, 16))))}`
  const socials = { twitter: safeExternalUrl(links.twitter), telegram: safeExternalUrl(links.telegram), discord: safeExternalUrl(links.discord), website: safeExternalUrl(links.website), farcaster: safeExternalUrl(links.farcaster) }
  const result = { description: String(description), cover, website: socials.website, social: socials.twitter, socials, audioHash: media.audioHash, audioBytes: Number(media.audioBytes), createdAt: Number(media.createdAt) }
  metadataCache.set(key, result); return result
}
export type ChainSound = { id: string; address: string; name: string; symbol: string; creator: string; genre: string; art: string; supply: string; totalSupply: string; demo: false; audio: string; graduated: boolean; phase: number; progress: number; quoteSymbol: string; price: string }
export async function getSound(address: string): Promise<ChainSound> {
  const verified = getAddress(address), studio = new Contract(config().studioAddress, studioAbi, readProvider)
  if (!await studio.isSound(verified)) throw new Error('This address is not a Sonira sound from the configured studio.')
  const token = new Contract(verified, tokenAbi, readProvider)
  const [name, symbol, launch, metadata] = await Promise.all([token.name(), token.symbol(), factory().getLaunchedToken(verified), soundMetadata(verified)])
  const curve = new Contract(launch.curve, curveAbi, readProvider)
  const [reserves, supply, reserved, sellable, quote] = await Promise.all([curve.getReserves(), curve.launchSupply(), curve.reservedTokens(), curve.sellableTokens(), assetInfo(launch.pairToken)])
  return { id: verified, address: verified, name, symbol, creator: launch.deployer, genre: 'Onchain', art: metadata.cover || `/art/cover-${parseInt(verified.slice(-2),16) % 4 + 1}.svg`, supply: formatUnits(supply - (Number(launch.phase) ? reserved : reserves[1]), 18), totalSupply:formatUnits(supply,18), demo: false, audio: '', graduated: Number(launch.phase) === 2, phase: Number(launch.phase), progress: Number(launch.phase) > 0 ? 100 : Number(supply - reserved - sellable) * 100 / Number(supply - reserved), quoteSymbol: quote.symbol, price: Number(launch.phase) === 0 && reserves[1] > 0n ? displayPrice(reserves[0],reserves[1],quote.decimals) : '' }
}
export async function listSounds(page = 0) {
  if (!chainReady.value) return []
  const studio = new Contract(config().studioAddress, studioAbi, readProvider)
  if (page === 0) totalSoundCount.value = Number(await studio.soundCount())
  const remaining = totalSoundCount.value - page * 24
  if (remaining <= 0) return []
  const addresses: string[] = await studio.getSounds(Math.max(0, remaining - 24), Math.min(24, remaining))
  const ordered = [...addresses].reverse(), result: ChainSound[] = []
  for (let offset = 0; offset < ordered.length; offset += 4) result.push(...await Promise.all(ordered.slice(offset, offset + 4).map(getSound)))
  return result
}
export async function readAudio(address: string) {
  const token = new Contract(address, tokenAbi, readProvider)
  const [hex, mime] = await Promise.all([token.audioBytes(), token.audioMime()])
  const bytes = Uint8Array.from(hex.slice(2).match(/.{2}/g) || [], (value: string) => parseInt(value, 16))
  return URL.createObjectURL(new Blob([bytes], { type: mime }))
}

export type LaunchOptions = { description: string; cover: Uint8Array; socials: Socials; recipient: string; taxBps: number; buybackEnabled: boolean; snipeExemptions: string[] }
export async function createSound(name: string, symbol: string, audio: Uint8Array, mime: string, quoteAsset: string, options: LaunchOptions, pending: (hash: string) => void) {
  const settings = config(), signer = await transactionSigner(), owner = await signer.getAddress()
  if (!isAddress(options.recipient || owner) || !Number.isInteger(options.taxBps) || options.taxBps < 0 || options.taxBps > launchTerms.value.maxTaxBps) throw new Error('Review the creator recipient and tax before publishing.')
  if (options.snipeExemptions.length > 32 || options.snipeExemptions.some(address => !isAddress(address))) throw new Error('Provide at most 32 valid launch-protection exemption addresses.')
  const main = factory(), configId = settings.launchConfigId || 0
  const expectedEconomics = displayedEconomics.get(getAddress(quoteAsset))
  if (!expectedEconomics || expectedEconomics !== await main.previewLaunchEconomics(configId, quoteAsset)) { await initializeChain(); throw new Error('Launch terms changed. Review the refreshed fees and market settings before publishing again.') }
  const fee = parseUnits(launchTerms.value.fee, 18)
  const params = { name, symbol, logo: '', description: options.description, socials: options.socials, creatorFeeRecipient: getAddress(options.recipient || owner), creatorTaxBps: options.taxBps, buybackEnabled: options.buybackEnabled, expectedEconomics, salt: hexlify(randomBytes(32)) }
  if (owner.toLowerCase() !== account.value.toLowerCase()) throw new Error('Your connected account changed. Review the launch again.')
  const tx = await new Contract(settings.studioAddress, studioAbi, signer).launchSound(params, configId, quoteAsset, options.snipeExemptions, hexlify(audio), mime, hexlify(options.cover), { value: fee, chainId: 46630 })
  pending(tx.hash); await tx.wait()
}

export type MarketSnapshot = {
  token: string; curve: string; phase: number; ready: boolean; block: number; quote: QuoteAsset;
  reserve: string; phantom: string; target: string; supply: string; reserved: string; sellable: string;
  price: string; basePrice: string; terminalPrice: string; progress: number; recipient: string;
  baseFeeBps: number; hookFeeBps: number; taxBps: number; protocolShareBps: number; buybackShareBps: number;
  buybackEnabled: boolean; snipeBps: number; snipeUntil: number; snipeStartBps: number; snipeSeconds: number; poolId: string; positionId: string; lockedSurplus: string;
  pendingQuote: string; pendingToken: string; needsOperator: boolean; operator: string;
  balance: string; quoteBalance: string; claimableQuote: string; claimableToken: string;
  vestLocked: string; vestReleased: string; vestReleasable: string; canRelease: boolean;
}
export async function marketSnapshot(address: string): Promise<MarketSnapshot> {
  const settings = config(), main = factory(), launch = await main.getLaunchedToken(address)
  if (!launch.exists) throw new Error('This sound is not registered in the configured factory.')
  const curve = new Contract(launch.curve, curveAbi, readProvider), hook = new Contract(settings.hookAddress, hookAbi, readProvider)
  const vault = new Contract(settings.vaultAddress, vaultAbi, readProvider), escrow = new Contract(settings.escrowAddress, escrowAbi, readProvider)
  const locker = new Contract(settings.lockerAddress, lockerAbi, readProvider), token = new Contract(address, tokenAbi, readProvider)
  const viewer = account.value || ZeroAddress, quote = await assetInfo(launch.pairToken)
  const [reserves, real, phantom, supply, reserved, sellable, baseFee, ready, snipe, launchedAt, seconds, policy, operator, curveFees, curveTax, curveBuyback, positionId, lockedSurplus, locked, released, releasable, vestTerms, block] = await Promise.all([
    curve.getReserves(), curve.realQuoteReserve(), curve.phantomQuote(), curve.launchSupply(), curve.reservedTokens(), curve.sellableTokens(), curve.feeBps(), curve.readyToGraduate(), curve.currentSnipeTaxBps(viewer), curve.launchedAt(), curve.snipeTaxSeconds(), main.getLaunchFeePolicy(address), hook.feeSweepOperator(), curve.quoteFeeBalance(), curve.creatorTaxBalance(), curve.buybackQuoteBalance(), locker.lockedPositions(address), locker.lockedTokenSupply(address), vault.totalLocked(address), vault.totalReleased(address), vault.releasable(address), vault.vestingTerms(address), readProvider.getBlockNumber()
  ])
  const phase = Number(launch.phase), pair = [getAddress(address), getAddress(launch.pairToken)].sort((a,b) => BigInt(a) < BigInt(b) ? -1 : 1)
  const poolId = keccak256(abiCoder.encode(['address','address','uint24','int24','address'], [pair[0],pair[1],launch.poolFee,launch.tickSpacing,settings.hookAddress]))
  const [poolQuoteFees, poolQuoteTax, poolTokenFees, poolTokenTax, poolBuyback] = phase === 2 ? await Promise.all([hook.pendingFees(poolId, quote.address),hook.pendingCreatorTax(poolId, quote.address),hook.pendingFees(poolId,address),hook.pendingCreatorTax(poolId,address),hook.pendingBuyback(poolId,quote.address)]) : [0n,0n,0n,0n,0n]
  const [balance, quoteBalance, claimableQuote, claimableToken] = account.value ? await Promise.all([token.balanceOf(viewer), quote.address === ZeroAddress ? readProvider.getBalance(viewer) : new Contract(quote.address, ERC20_ABI, readProvider).balanceOf(viewer), quote.address === ZeroAddress ? escrow.balanceOf(viewer) : escrow.balanceOfToken(viewer,quote.address), escrow.balanceOfToken(viewer,address)]) : [0n,0n,0n,0n]
  const snipeStartBps = Number(await curve.snipeTaxStartBps())
  return {
    token: address, curve: launch.curve, phase, ready, block, quote, reserve: formatUnits(real,quote.decimals), phantom: formatUnits(phantom,quote.decimals), target: formatUnits(launch.graduationThreshold,quote.decimals), supply: formatUnits(supply,18), reserved: formatUnits(reserved,18), sellable: formatUnits(sellable,18),
    price: phase === 0 && reserves[1] ? displayPrice(reserves[0],reserves[1],quote.decimals) : '', basePrice: displayPrice(phantom,supply,quote.decimals), terminalPrice: displayPrice(phantom + launch.graduationThreshold,reserved,quote.decimals), progress: phase ? 100 : Number(supply - reserved - sellable) * 100 / Number(supply - reserved),
    recipient: launch.creatorFeeRecipient, baseFeeBps: Number(baseFee), hookFeeBps: Number(policy.hookFeeBps), taxBps: Number(launch.creatorTaxBps), protocolShareBps: Number(policy.protocolFeeShareBps), buybackShareBps: Number(policy.buybackBurnBps), buybackEnabled: launch.buybackEnabled, snipeBps: Number(snipe), snipeUntil: Number(launchedAt + seconds), snipeStartBps, snipeSeconds:Number(seconds), poolId, positionId: String(positionId), lockedSurplus: formatUnits(lockedSurplus,18),
    pendingQuote: formatUnits(phase === 2 ? poolQuoteFees + poolQuoteTax : curveFees + curveTax,quote.decimals), pendingToken: formatUnits(poolTokenFees + poolTokenTax,18), needsOperator: phase === 2 ? poolTokenFees + poolTokenTax + poolBuyback > 0n : curveBuyback > 0n, operator,
    balance: formatUnits(balance,18), quoteBalance: formatUnits(quoteBalance,quote.decimals), claimableQuote: formatUnits(claimableQuote,quote.decimals), claimableToken: formatUnits(claimableToken,18), vestLocked: formatUnits(locked,18), vestReleased: formatUnits(released,18), vestReleasable: formatUnits(releasable,18), canRelease: !!account.value && [vestTerms.creatorRecipient,vestTerms.protocolRecipient].some(value => value.toLowerCase() === viewer.toLowerCase())
  }
}
export type TradeQuote = { token: string; curve: string; side: 'buy' | 'sell'; input: bigint; output: bigint; minOut: bigint; phase: number; recipient: string; createdAt: number; spent: bigint; refund: bigint; baseFee: bigint; creatorTax: bigint; snipeTax: bigint; inputAsset: string; outputDecimals: number; feeDecimals: number }
export async function tradeQuote(address: string, side: 'buy' | 'sell', value: string): Promise<TradeQuote> {
  const launch = await factory().getLaunchedToken(address), quote = await assetInfo(launch.pairToken), phase = Number(launch.phase)
  const precision = side === 'buy' ? quote.decimals : 18
  if (!new RegExp(`^\\d+(\\.\\d{1,${precision}})?$`).test(value)) throw new Error(`Enter a positive amount with up to ${precision} decimal places.`)
  const input = parseUnits(value,precision)
  if (input <= 0n) throw new Error('Enter an amount above zero.')
  if (phase !== 0 && phase !== 2) throw new Error('Trading is paused while this market completes graduation.')
  // A nonzero address is necessary for the lens. An unconnected preview assumes a non-exempt wallet.
  const recipient = account.value || '0x0000000000000000000000000000000000000001'
  const result: TradeQuote = { token: getAddress(address), curve: launch.curve, side, input, output: 0n, minOut: 0n, phase, recipient, createdAt: Date.now(), spent: input, refund: 0n, baseFee: 0n, creatorTax: 0n, snipeTax: 0n, inputAsset: side === 'buy' ? quote.address : address, outputDecimals: side === 'buy' ? 18 : quote.decimals, feeDecimals: quote.decimals }
  if (phase === 2) {
    result.output = await new Contract(config().routerAddress, ROUTER_ABI, readProvider).quoteExactInput.staticCall(address,side === 'buy',input)
    result.minOut = result.output * 9900n / 10000n
  } else {
    const lens = new Contract(config().lensAddress,LENS_ABI,readProvider)
    if (side === 'buy') { const q = await lens.quoteBuy(launch.curve,input,recipient,100); Object.assign(result,{ output:q.tokensOut,minOut:q.minTokensOut,spent:q.spent,refund:q.refund,baseFee:q.baseFee,creatorTax:q.creatorTax,snipeTax:q.snipeTax }) }
    else { const q = await lens.quoteSell(launch.curve,input); Object.assign(result,{ output:q.net,minOut:q.net * 9900n / 10000n,baseFee:q.baseFee,creatorTax:q.creatorTax }) }
  }
  if (result.output === 0n || result.minOut === 0n) throw new Error('This amount is too small for a protected quote.')
  return result
}
type Pending = (hash: string) => void
async function confirmed(tx: any, pending: Pending) { pending(tx.hash); const receipt = await tx.wait(); if (!receipt || receipt.status !== 1) throw new Error('The transaction was not confirmed successfully.') }
async function checkedSigner(expected?: string) {
  const signer = await transactionSigner(), current = await signer.getAddress()
  if (current.toLowerCase() !== account.value.toLowerCase() || (expected && current.toLowerCase() !== expected.toLowerCase())) throw new Error('Your account changed. Refresh the quote or action before continuing.')
  return signer
}
export async function executeTrade(q: TradeQuote, pending: Pending) {
  let signer = await checkedSigner(q.recipient)
  if (Date.now() - q.createdAt > 120_000) throw new Error('This quote is more than two minutes old. Refresh it before trading.')
  const spender = q.phase === 2 ? config().routerAddress : q.curve
  if (q.inputAsset !== ZeroAddress) {
    const asset = new Contract(q.inputAsset,ERC20_ABI,signer)
    if (await asset.allowance(q.recipient,spender) < q.input) {
      // Exact approval; some enabled assets require clearing a previous nonzero allowance.
      if (await asset.allowance(q.recipient,spender) !== 0n) await confirmed(await asset.approve(spender,0,{chainId:46630}),pending)
      signer = await checkedSigner(q.recipient)
      await confirmed(await new Contract(q.inputAsset,ERC20_ABI,signer).approve(spender,q.input,{chainId:46630}),pending)
    }
  }
  signer = await checkedSigner(q.recipient)
  if (Date.now() - q.createdAt > 120_000) throw new Error('This quote expired while preparing your allowance. Your approval is saved; refresh the quote before trading.')
  const latest = await factory().getLaunchedToken(q.token)
  if (Number(latest.phase) !== q.phase || latest.curve !== q.curve) throw new Error('The market changed phase. Refresh the quote before trading.')
  const overrides = { value: q.inputAsset === ZeroAddress ? q.input : 0n, chainId:46630 }
  if (q.phase === 2) {
    const block = await readProvider.getBlock('latest')
    await confirmed(await new Contract(spender,ROUTER_ABI,signer).swapWithDeadline(q.token,q.side === 'buy',q.input,q.minOut,q.recipient,(block?.timestamp || Math.floor(Date.now()/1000))+600,overrides),pending)
  } else await confirmed(await new Contract(spender,curveAbi,signer)[q.side](q.input,q.minOut,q.recipient,overrides),pending)
}
export async function graduateSound(address: string, pending: Pending) {
  let signer = await checkedSigner(), main = new Contract(config().factoryAddress,factoryAbi,signer)
  if (Number((await main.getLaunchedToken(address)).phase) === 0) await confirmed(await main.graduate(address,{chainId:46630}),pending)
  signer = await checkedSigner(); main = new Contract(config().factoryAddress,factoryAbi,signer)
  if (Number((await main.getLaunchedToken(address)).phase) === 1) await confirmed(await main.createGraduatedPool(address,{chainId:46630}),pending)
}
export async function claimFees(asset: string, pending: Pending) {
  const signer = await checkedSigner(), escrow = new Contract(config().escrowAddress,escrowAbi,signer)
  await confirmed(asset === ZeroAddress ? await escrow['claim()']({chainId:46630}) : await escrow['claimToken(address)'](asset,{chainId:46630}),pending)
}
export async function distributeFees(address: string, pending: Pending) {
  const state = await marketSnapshot(address)
  if (state.needsOperator) throw new Error('These fees require an operator conversion or buyback. They will become claimable after the configured operator processes them.')
  const signer = await checkedSigner()
  // A maximum floor fails closed if a new internal-swap obligation arrives before inclusion.
  if (state.phase === 2) await confirmed(await new Contract(config().hookAddress,hookAbi,signer).sweepPoolFees(state.poolId,MaxUint256,MaxUint256,{chainId:46630}),pending)
  else await confirmed(await new Contract(state.curve,curveAbi,signer).sweepFees(MaxUint256,{chainId:46630}),pending)
}
export async function releaseVested(address: string, pending: Pending) { await confirmed(await new Contract(config().vaultAddress,vaultAbi,await checkedSigner()).release(address,{chainId:46630}),pending) }
export async function transferRecipient(address: string, recipient: string, pending: Pending) {
  if (!isAddress(recipient) || getAddress(recipient) === ZeroAddress) throw new Error('Enter a valid, nonzero fee recipient address.')
  await confirmed(await new Contract(config().factoryAddress,factoryAbi,await checkedSigner()).transferCreatorFeeRecipient(address,getAddress(recipient),{chainId:46630}),pending)
}
export async function toggleBuyback(address: string, enabled: boolean, pending: Pending) { await confirmed(await new Contract(config().factoryAddress,factoryAbi,await checkedSigner()).setBuybackEnabled(address,enabled,{chainId:46630}),pending) }
export type TradeRecord = { hash: string; index: number; side: 'Buy' | 'Sell'; account: string; amount: string; quote: string; fee: string; tax: string; price: number }
export async function recentTrades(address: string, block: number): Promise<TradeRecord[]> {
  const launch = await factory().getLaunchedToken(address), curve = new Contract(launch.curve,curveAbi,readProvider), asset = await assetInfo(launch.pairToken)
  const [buys,sells] = await Promise.all([curve.queryFilter(curve.filters.CurveBuy(),Math.max(0,block-4999),block),curve.queryFilter(curve.filters.CurveSell(),Math.max(0,block-4999),block)])
  return [...buys,...sells].sort((a,b)=>b.blockNumber-a.blockNumber || b.index-a.index).slice(0,100).map((log:any)=>{
    const buy = log.eventName === 'CurveBuy', a = log.args, amount = formatUnits(buy ? a.tokensOut : a.tokensIn,18), value = formatUnits(buy ? a.quoteIn : a.quoteOut,asset.decimals)
    return { hash:log.transactionHash,index:log.index,side:buy?'Buy':'Sell',account:buy?a.buyer:a.seller,amount,quote:value,fee:formatUnits(a.fee,asset.decimals),tax:formatUnits(a.tax,asset.decimals),price:Number(value)/Number(amount) }
  })
}

export { formatUnits, parseUnits, ZeroAddress, ZeroHash, keccak256, abiCoder }
