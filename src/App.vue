<script setup lang="ts">
import { computed, ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { ArrowUpRight, ArrowRight, Play, Pause, Plus, X, Search, ChevronDown, Headphones, Grid2X2, SlidersHorizontal, ArrowLeft, AudioLines, Wallet, Check, LoaderCircle, ExternalLink, Mic, Square, Upload, Volume2, Disc3, Menu, Copy, Radio, ShieldCheck } from '@lucide/vue'
import { account, signedIn, wrongNetwork, walletBusy, wallets, chainReady, factoryAddress, networkError, totalSoundCount, NETWORK, initializeChain, connectWallet, disconnect, signIn, switchNetwork, errorText, listSounds, readAudio, createSound, getSound, quoteAssets, nativeQuote, safeExternalUrl, launchTerms } from './chain-v2'
import MarketDetail from './components/MarketDetailV2.vue'
import CreatorSettings from './components/CreatorSettings.vue'
import { isAddress, ZeroAddress } from 'ethers'
import { prepareAudio, inspectAudio, MAX_AUDIO_BYTES } from './audio'
import { prepareCover } from './cover'

type Sound = { id: string; address?: string; name: string; symbol: string; creator: string; genre: string; art: string; demo: boolean; audio: string; supply?: string; totalSupply?: string; graduated?: boolean; price?: string; volume?: string; trades?: number; progress?: number; quoteSymbol?: string; phase?: number }
const demos: Sound[] = [
  { id: 'chrome', name: 'Chrome bloom', symbol: 'BLOOM', creator: 'Sonira Studio', genre: 'Electronic', art: '/art/cover-1.svg?v=sonira-2.1', demo: true, audio: '/audio/chrome-bloom.wav' },
  { id: 'soft', name: 'A softer signal', symbol: 'SIGNAL', creator: 'Sonira Studio', genre: 'Ambient', art: '/art/cover-2.svg?v=sonira-2.1', demo: true, audio: '/audio/softer-signal.wav' },
  { id: 'heat', name: 'Heat in motion', symbol: 'HEAT', creator: 'Sonira Studio', genre: 'Electronic', art: '/art/cover-3.svg?v=sonira-2.1', demo: true, audio: '/audio/heat-in-motion.wav' },
  { id: 'blue', name: 'Blue hour theory', symbol: 'BLUE', creator: 'Sonira Studio', genre: 'Experimental', art: '/art/cover-4.svg?v=sonira-2.1', demo: true, audio: '/audio/blue-hour.wav' },
]
const liveSounds = ref<Sound[]>([])
const loadingSounds = ref(false)
const loadedPages = ref(1)
const filter = ref('All sounds')
const query = ref('')
const studioStep = ref(1)
function changeStudioStep(step: number) {
  if (busy.value || recording.value || microphonePending.value || preparing.value) return
  studioStep.value = step; message.value = ''
  nextTick(() => {
    dialog.value?.scrollTo({ top: 0, behavior: 'instant' })
    dialog.value?.querySelector<HTMLElement>('[data-studio-step="' + step + '"] .stage-heading h3')?.focus({ preventScroll: true })
  })
}
const sort = ref('Latest releases')
const filtered = computed(() => {
  const data = [...liveSounds.value, ...demos].filter(s => (filter.value === 'All sounds' || (filter.value === 'Onchain' ? !s.demo : filter.value === 'On curve' ? !s.demo && s.phase === 0 : filter.value === 'Graduated' ? !s.demo && s.graduated : filter.value === 'My sounds' ? !s.demo && !!account.value && s.creator.toLowerCase() === account.value.toLowerCase() : s.genre === filter.value)) && `${s.name} ${s.symbol} ${s.creator}`.toLowerCase().includes(query.value.toLowerCase()))
  if (sort.value === 'A to Z') return data.sort((a,b) => a.name.localeCompare(b.name))
  if (sort.value === 'Closest to graduation') return data.sort((a,b) => (b.graduated ? -1 : b.progress || 0) - (a.graduated ? -1 : a.progress || 0))
  return data
})
const bars = Array.from({ length: 39 }, (_, i) => 10 + Math.abs(Math.sin(i * 1.8) * Math.cos(i * 0.63)) * 34)
const player = new Audio()
const playing = ref('')
const currentSound = ref<Sound | null>(null)
const playbackTime = ref(0)
const duration = ref(0)
const playingBusy = ref(false)
let playbackEpoch = 0
const urls = new Map<string, string>()
player.addEventListener('timeupdate', () => { playbackTime.value = player.currentTime })
player.addEventListener('loadedmetadata', () => { duration.value = player.duration })
player.addEventListener('ended', () => { playing.value = '' })
player.addEventListener('error', () => { playing.value = ''; notify('This audio could not be played. Try another format or sound.') })
const clock = (seconds: number) => `${Math.floor((seconds || 0) / 60)}:${Math.floor((seconds || 0) % 60).toString().padStart(2, '0')}`
async function playSound(sound: Sound) {
  const epoch = ++playbackEpoch
  if (playing.value === sound.id) { player.pause(); playing.value = ''; return }
  playingBusy.value = true
  try {
    if (currentSound.value?.id !== sound.id) {
      player.pause(); playbackTime.value = 0
      let url = sound.audio
      if (!sound.demo && sound.address) {
        if (!urls.has(sound.id)) urls.set(sound.id, await readAudio(sound.address))
        url = urls.get(sound.id)!
      }
      if (epoch !== playbackEpoch) return
      player.src = url; currentSound.value = sound
    }
    await player.play(); if (epoch === playbackEpoch) playing.value = sound.id
  } catch (error) { if (epoch === playbackEpoch) { notify(errorText(error)); playing.value = '' } }
  finally { if (epoch === playbackEpoch) playingBusy.value = false }
}
function closePlayer() { ++playbackEpoch; player.pause(); playing.value = ''; currentSound.value = null; playingBusy.value = false }

const modal = ref('')
const walletReturn = ref('')
const dialog = ref<HTMLDialogElement>()
const mobileMenu = ref(false)
const selected = ref<Sound | null>(null)
const message = ref('')
const busy = ref(false)
const txHash = ref('')
const notice = ref('')
let noticeTimer: ReturnType<typeof setTimeout>
function notify(text: string) { notice.value = text; clearTimeout(noticeTimer); noticeTimer = setTimeout(() => notice.value = '', 6500) }
function openModal(kind: string) { if (kind !== 'create') { ++microphoneEpoch; microphonePending.value = false; preparation?.abort() } if (kind === 'wallet') walletReturn.value = modal.value; modal.value = kind; message.value = ''; txHash.value = ''; mobileMenu.value = false }
function closeModal() { if (!busy.value && !recording.value) { ++microphoneEpoch; microphonePending.value = false; preparation?.abort(); modal.value = ''; selected.value = null; if (location.hash.startsWith('#sound=')) history.replaceState(null, '', `${location.pathname}#explore`) } }
watch(modal, async (value) => { await nextTick(); if (value && !dialog.value?.open) dialog.value?.showModal(); else if (!value) dialog.value?.close() })
async function withFeedback(action: () => Promise<void>) { busy.value = true; message.value = ''; try { await action() } catch (error) { message.value = errorText(error) } finally { busy.value = false } }
async function walletConnect(provider?: any) { await withFeedback(async () => { await connectWallet(provider); message.value = 'Wallet connected. You can optionally sign in to verify this browser session.' }) }
async function loadSounds() { if (!factoryAddress.value) return; loadingSounds.value = true; try { liveSounds.value = await listSounds(); loadedPages.value = 1; networkError.value = '' } catch (error) { networkError.value = errorText(error) } finally { loadingSounds.value = false } }
async function loadMore() {
  if (loadingSounds.value) return
  loadingSounds.value = true
  try { const sounds = await listSounds(loadedPages.value); const existing = new Set(liveSounds.value.map(sound => sound.id)); liveSounds.value.push(...sounds.filter(sound => !existing.has(sound.id))); loadedPages.value++; networkError.value = '' }
  catch (error) { networkError.value = errorText(error) }
  finally { loadingSounds.value = false }
}
async function copyAddress() { try { await navigator.clipboard.writeText(account.value); notify('Wallet address copied.') } catch { notify(account.value) } }
const short = (address: string) => address.length > 16 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address
const txPending = (hash: string) => { txHash.value = hash; message.value = 'Transaction submitted. Waiting for confirmation…' }

const title = ref('')
const ticker = ref('')
const description = ref('')
const websiteLink = ref('')
const socialLink = ref('')
const telegramLink = ref(''), discordLink = ref(''), farcasterLink = ref('')
const creatorRecipient = ref(''), creatorTaxBps = ref(0), buybackEnabled = ref(false), exemptions = ref('')
const exemptionAddresses = computed(() => exemptions.value.split(/[\s,]+/).filter(Boolean))
const creatorError = computed(() => creatorRecipient.value.trim() && (!isAddress(creatorRecipient.value.trim()) || creatorRecipient.value.trim().toLowerCase() === ZeroAddress) ? 'Enter a valid, nonzero fee recipient.' : creatorTaxBps.value < 0 || creatorTaxBps.value > launchTerms.value.maxTaxBps ? 'Review the additional creator tax.' : exemptionAddresses.value.length > 32 || exemptionAddresses.value.some(value => !isAddress(value) || value.toLowerCase() === ZeroAddress) ? 'Use at most 32 valid nonzero exemption addresses.' : '')
const coverFile = ref<File | null>(null)
const coverPreview = ref('')
const coverPreparing = ref(false)
let coverEpoch = 0
const mediaBytes = computed(() => (audioFile.value?.size || 0) + (coverFile.value?.size || 0))
const metadataError = computed(() => {
  if (new TextEncoder().encode(description.value.trim()).length > 512) return 'Keep your description within 512 UTF-8 bytes.'
  if ([websiteLink.value, socialLink.value, telegramLink.value, discordLink.value, farcasterLink.value].map(value => value.trim()).some(link => link && !safeExternalUrl(link))) return 'Links must be HTTPS URLs, at most 256 ASCII characters, without credentials.'
  if (mediaBytes.value > MAX_AUDIO_BYTES) return 'Audio and cover together exceed 96 KiB. Use a more compact audio upload or remove the cover.'
  return ''
})
function clearCover() { ++coverEpoch; coverPreparing.value = false; if (coverPreview.value) URL.revokeObjectURL(coverPreview.value); coverPreview.value = ''; coverFile.value = null }
async function pickCover(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]; input.value = ''
  if (!file || busy.value) return
  const epoch = ++coverEpoch; coverPreparing.value = true; message.value = ''
  try {
    const prepared = await prepareCover(file)
    if (epoch !== coverEpoch) return
    if (coverPreview.value) URL.revokeObjectURL(coverPreview.value)
    coverFile.value = prepared; coverPreview.value = URL.createObjectURL(prepared)
  } catch (error) { if (epoch === coverEpoch) message.value = errorText(error) }
  finally { if (epoch === coverEpoch) coverPreparing.value = false }
}
const quoteChoice = ref(nativeQuote.address)
const audioFile = ref<File | null>(null)
const previewUrl = ref('')
const rights = ref(false)
const recording = ref(false)
const microphonePending = ref(false)
const preparing = ref(false)
const preparationProgress = ref(0)
const audioDuration = ref(0)
const originalBytes = ref(0)
const recordSeconds = ref(0)
const bitrate = ref<12000 | 16000 | 24000>(16000)
let preparation: AbortController | undefined
let recorder: MediaRecorder | undefined
let recordTimeout: ReturnType<typeof setTimeout>
let recordTick: ReturnType<typeof setInterval>
let micStream: MediaStream | undefined
let microphoneEpoch = 0
function setAudio(file: File, seconds: number, bytes: number) {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  audioFile.value = file; audioDuration.value = seconds; originalBytes.value = bytes
  previewUrl.value = URL.createObjectURL(file)
}
async function pickAudio(file?: File) {
  if (!file) return
  if (busy.value || recording.value || microphonePending.value) { message.value = 'Finish the current recording or wallet request before choosing another sound.'; return }
  preparation?.abort()
  const controller = new AbortController(); preparation = controller
  preparing.value = true; preparationProgress.value = 0; message.value = ''
  try {
    const result = await prepareAudio(file, { bitrate: bitrate.value, maxBytes: MAX_AUDIO_BYTES - (coverFile.value?.size || 0), signal: controller.signal, onProgress: value => preparationProgress.value = value })
    if (!controller.signal.aborted) setAudio(result.file, result.duration, result.originalSize)
  } catch (error) {
    if (preparation === controller) {
      if (error instanceof DOMException && error.name === 'AbortError') message.value = 'Audio preparation cancelled.'
      else message.value = errorText(error)
    }
  } finally { if (preparation === controller) preparing.value = false }
}
function fileChange(event: Event) { pickAudio((event.target as HTMLInputElement).files?.[0]) }
async function useSample() {
  const response = await fetch('/audio/launch-sample.wav')
  if (!response.ok) throw new Error('Sample audio could not be loaded.')
  const file = new File([await response.blob()], 'sonira-original.wav', { type: 'audio/wav' })
  setAudio(file, await inspectAudio(file), file.size)
  title.value ||= 'My first sound'; ticker.value ||= 'SOUND'
}
async function recordSound() {
  if (recording.value) { recorder?.stop(); return }
  if (microphonePending.value || preparing.value || busy.value) return
  const epoch = ++microphoneEpoch
  microphonePending.value = true
  try {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') throw new Error('Recording is unavailable in this browser. Upload a sound instead.')
    const type = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : MediaRecorder.isTypeSupported('audio/ogg;codecs=opus') ? 'audio/ogg;codecs=opus' : ''
    if (!type) throw new Error('This browser cannot record supported compressed audio. Upload MP3, WAV, OGG or WebM instead.')
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    if (epoch !== microphoneEpoch || modal.value !== 'create' || studioStep.value !== 1) { stream.getTracks().forEach(track => track.stop()); return }
    micStream = stream
    recorder = new MediaRecorder(micStream, { mimeType: type, audioBitsPerSecond: bitrate.value })
    const chunks: Blob[] = []
    recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data) }
    recorder.onstop = () => {
      clearTimeout(recordTimeout); clearInterval(recordTick); micStream?.getTracks().forEach(track => track.stop()); recording.value = false
      pickAudio(new File(chunks, type.includes('webm') ? 'my-sound.webm' : 'my-sound.ogg', { type }))
    }
    recorder.start(); recording.value = true; recordSeconds.value = 0; message.value = 'Recording your sound. Press Stop when you are ready.'
    const started = performance.now()
    recordTick = setInterval(() => recordSeconds.value = Math.min(35, (performance.now() - started) / 1000), 100)
    recordTimeout = setTimeout(() => { if (recorder?.state === 'recording') recorder.stop() }, 34600)
  } catch (error) { if (epoch === microphoneEpoch) { micStream?.getTracks().forEach(track => track.stop()); recording.value = false; message.value = errorText(error) } }
  finally { if (epoch === microphoneEpoch) microphonePending.value = false }
}
const identityReady = computed(() => title.value.trim().length > 0 && new TextEncoder().encode(title.value.trim()).length <= 64 && /^[A-Z][A-Z0-9]{1,9}$/.test(ticker.value) && !metadataError.value && !coverPreparing.value)
const canPublish = computed(() => !preparing.value && !coverPreparing.value && !metadataError.value && !creatorError.value && launchTerms.value.enabled && !microphonePending.value && title.value.trim().length > 0 && new TextEncoder().encode(title.value.trim()).length <= 64 && /^[A-Z][A-Z0-9]{1,9}$/.test(ticker.value) && !!audioFile.value && rights.value && !!account.value && chainReady.value)
async function publish() {
  if (!canPublish.value || !audioFile.value || busy.value) return
  await withFeedback(async () => {
    const name = title.value.trim(), symbol = ticker.value, audio = audioFile.value!, cover = coverFile.value, asset = quoteChoice.value
    const details = { description: description.value.trim(), socials: { website: websiteLink.value.trim(), twitter: socialLink.value.trim(), telegram: telegramLink.value.trim(), discord: discordLink.value.trim(), farcaster: farcasterLink.value.trim() }, cover: cover ? new Uint8Array(await cover.arrayBuffer()) : new Uint8Array(), recipient: creatorRecipient.value.trim(), taxBps: creatorTaxBps.value, buybackEnabled: buybackEnabled.value, snipeExemptions: exemptionAddresses.value }
    await createSound(name, symbol, new Uint8Array(await audio.arrayBuffer()), audio.type, asset, details, txPending)
    await loadSounds(); message.value = 'Your sound is onchain. Find it in the Onchain collection below.'; filter.value = 'Onchain'; studioStep.value = 1; title.value = ''; ticker.value = ''; rights.value = false; audioFile.value = null
    description.value = ''; websiteLink.value = ''; socialLink.value = ''; telegramLink.value = ''; discordLink.value = ''; farcasterLink.value = ''; creatorRecipient.value = ''; creatorTaxBps.value = 0; buybackEnabled.value = false; exemptions.value = ''; clearCover()
    if (previewUrl.value) URL.revokeObjectURL(previewUrl.value); previewUrl.value = ''
  })
}

async function inspectSound(sound: Sound) {
  selected.value = sound; openModal('sound')
  if (sound.address) history.pushState(null, '', `${location.pathname}#sound=${sound.address}`)
}
async function openSharedSound() {
  const match = location.hash.match(/^#sound=(0x[a-fA-F0-9]{40})$/)
  if (!match) { if (location.hash.startsWith('#sound=')) notify('This sound link is invalid. Check the address and try again.'); return }
  if (busy.value) return
  try { selected.value = await getSound(match[1]!); openModal('sound') }
  catch (error) { notify(errorText(error)) }
}
const faqs = [
  { q: 'What is a sound token?', a: 'An ERC-20 token with an original audio clip stored onchain. The default launch supply is one billion tokens. A transparent price curve lets people buy from and sell back to the contract. Holding tokens does not grant copyright, royalties or commercial rights to the audio.' },
  { q: 'How do creators get paid?', a: 'The default base fee is 1%, split 70% to the creator and 30% to the protocol on the curve and after graduation. Creators can add up to 10% extra tax. Pool hook fees use the swap output as their basis. Optional buybacks use half the creator base-fee allocation; bought tokens vest over five years with a 70/30 creator/protocol release split. Fees become claimable after distribution; conversions require the configured operator. Gas is separate.' },
  { q: 'What happens in the opening seconds?', a: 'By default, a temporary buy tax starts at 99%, capped so base fee plus creator tax plus opening tax leave at least 1% for the purchase, then decays to zero across 15 seconds. The creator, fee recipient and up to 32 declared wallets are exempt. The trade panel includes your current tax in its quote. Waiting until the window ends avoids this opening tax.' },
  { q: 'Why Robinhood Chain?', a: 'Robinhood Chain is an Ethereum-compatible network built with Arbitrum technology. Sonira uses its public testnet to make audio creation and trading easy to try. Sonira is an independent project and is not affiliated with or endorsed by Robinhood.' },
  { q: 'Is Sonira live? Is there a token?', a: 'This is our testnet preview. Featured Studio Sessions are playable demos; published onchain sounds have test-asset markets. Publishing and trading require a deployed testnet factory and a connected wallet. The contracts support ETH and enabled test-token markets, followed by Uniswap v4 graduation. No real stock exposure, platform token or airdrop promise is offered. Check Project status for the current deployment state.' },
  { q: 'What can I upload?', a: 'Original MP3, WAV, M4A, OGG or WebM files up to 25 MB and 35 seconds. Your browser prepares a compact mono sound, usually Opus. Audio and an optional cover share a 96 KiB immutable onchain limit. You can also record directly. Only publish audio you own or have permission to use. Onchain content cannot be erased; avoid private information and unlicensed samples.' },
]
onMounted(async () => { window.addEventListener('hashchange', openSharedSound); await initializeChain(); await loadSounds(); await openSharedSound() })
onBeforeUnmount(() => { clearCover(); ++microphoneEpoch; window.removeEventListener('hashchange', openSharedSound); preparation?.abort(); player.pause(); urls.forEach(url => URL.revokeObjectURL(url)); if (previewUrl.value) URL.revokeObjectURL(previewUrl.value); clearTimeout(noticeTimer); clearTimeout(recordTimeout); clearInterval(recordTick); micStream?.getTracks().forEach(track => track.stop()) })
</script>

<template>
  <a class="ab-skip" href="#main">Skip to content</a>
  <div class="ab-frame">
    <nav class="ab-rail" aria-label="Main navigation" :class="{ 'is-open': mobileMenu }">
      <a href="#main" class="ab-brand" aria-label="Sonira home"><img src="/logo.svg?v=sonira-2.1" alt=""/><span>sonira</span></a>
      <span class="ab-rail-meta ab-hidden">THE SOUND RELEASE SYSTEM</span>
      <div class="ab-glyphs">
        <a href="#explore" class="ab-glyph is-current" aria-label="Sound archive" @click="mobileMenu = false"><Grid2X2 :size="19"/><span>Sound archive</span><i class="ab-glyph-num">01</i></a>
        <button class="ab-glyph" aria-label="Release studio" @click="openModal('create')"><SlidersHorizontal :size="19"/><span>Release studio</span><i class="ab-glyph-num"><Plus :size="14"/></i></button>
        <a href="#how-it-works" class="ab-glyph" aria-label="The process" @click="mobileMenu = false"><AudioLines :size="19"/><span>The process</span><i class="ab-glyph-num">03</i></a>
      </div>
      <div class="ab-rail-tail ab-hidden">
        <button class="ab-rail-state" @click="openModal('status')"><span class="ab-dot"></span>{{ chainReady ? 'Testnet connected' : 'Studio preview' }}<ArrowUpRight :size="13"/></button>
      </div>
    </nav>
    <div class="ab-canvas">
      <header class="ab-bar">
        <div class="ab-bar-loc"><span class="ab-bar-slash">/</span> SOUND, IN MOTION <span class="ab-bar-vol">VOL. 001</span></div>
        <div class="ab-bar-actions">
          <a class="sr-only" href="/" aria-label="Sonira home"></a>
          <a class="sr-only" href="/docs/business-plan.pdf" aria-label="Business plan document"></a>
          <a class="ab-x" href="https://x.com/Sonira_site" target="_blank" rel="noopener" aria-label="Follow Sonira on X at @Sonira_site"><span class="ab-x-mark" aria-hidden="true">X</span><span class="ab-x-name">@Sonira_site</span><ArrowUpRight :size="12"/></a>
          <button class="ab-net" @click="openModal('status')"><i></i>{{ chainReady ? 'TESTNET' : 'PREVIEW' }}</button>
          <button class="ab-btn ab-wallet-btn" :aria-label="account ? 'Connected wallet' : 'Connect wallet'" @click="openModal('wallet')"><Wallet :size="16"/><span>{{ account ? short(account) : 'Connect wallet' }}</span><ArrowUpRight :size="14"/></button>
          <button class="ab-icon-btn ab-burger" aria-label="Toggle navigation" :aria-expanded="mobileMenu" @click="mobileMenu = !mobileMenu"><X v-if="mobileMenu" :size="21"/><Menu v-else :size="21"/></button>
        </div>
      </header>
      <main id="main" class="ab-main">
        <section class="ab-hero">
          <div class="ab-hero-lead">
            <div class="ab-kicker"><span class="ab-dot"></span> AN OPEN FREQUENCY FOR ORIGINAL SOUND</div>
            <h1>SMALL SOUND.<br/><span>BIG AFTERLIFE.</span></h1>
            <div class="ab-hero-note"><span class="ab-hero-plus" aria-hidden="true">+</span><p>Hear it. Set it in motion.<br/>An independent home to release, discover<br class="ab-br-wide"/> and collect original audio onchain.</p></div>
            <div class="ab-hero-cta"><button class="ab-btn ab-btn-hot" @click="openModal('create')">Start a release <Plus :size="19"/></button><a href="#explore" class="ab-text-btn">Explore the archive <ArrowRight :size="16"/></a></div>
          </div>
          <div class="ab-signal">
            <div class="ab-signal-top"><span>SONIRA / SIGNAL 001</span><span class="ab-signal-live"><i></i> ORIGINAL AUDIO</span></div>
            <div class="ab-signal-visual" aria-hidden="true"><div class="ab-signal-grid"></div><div class="ab-signal-rings"><i v-for="n in 12" :key="n" :style="{ '--ring': n }"></i></div><div class="ab-signal-core">V<span>&#8599;</span></div><span class="ab-coord ab-coord-a">35 SEC<br/>LIMITLESS IDEAS</span><span class="ab-coord ab-coord-b">NO LABEL<br/>REQUIRED</span></div>
            <div class="ab-console-deck"><button class="ab-hero-play" :aria-label="playing === demos[0].id ? 'Pause Chrome bloom' : 'Play Chrome bloom'" @click="playSound(demos[0])"><Pause v-if="playing === demos[0].id" :size="21" fill="currentColor"/><Play v-else :size="21" fill="currentColor"/></button><div><span>FEATURED STUDIO DEMO</span><strong>{{ demos[0].name }}</strong></div><div class="ab-wave" :class="{ 'is-spinning': playing === demos[0].id }" aria-hidden="true"><i v-for="(height, index) in bars.slice(0, 20)" :key="index" :style="{ height: `${height * .6}px`, animationDelay: `${index * -.12}s` }"></i></div><span class="ab-duration">00:08</span></div>
          </div>
        </section>
        <div class="ab-hero-strip"><span><Headphones :size="15"/> BEST EXPERIENCED WITH HEADPHONES</span><span>BUILT FOR CREATORS. STORED ONCHAIN.</span><a href="#explore" aria-label="Scroll to sound archive">SCROLL TO DISCOVER <ArrowRight :size="14"/></a></div>
        <div class="ab-stage">
          <div class="ab-stage-main">
            <section class="ab-archive ab-band" id="explore">
              <div class="ab-head-row"><div><div class="ab-kicker">01 / THE SOUND ARCHIVE</div><h2>Press play.<span>Find your frequency.</span></h2></div><div class="ab-count"><strong>{{ String(demos.length + liveSounds.length).padStart(2, '0') }}</strong><span>SOUNDS<br/>TO DISCOVER</span></div></div>
              <div class="ab-tools"><div class="ab-chips" role="group" aria-label="Filter sounds"><button v-for="genre in chainReady ? ['All sounds', 'On curve', 'Graduated', 'My sounds', 'Onchain'] : ['All sounds', 'Electronic', 'Ambient', 'Experimental', 'Onchain']" :key="genre" :class="{ 'is-on': filter === genre }" :aria-pressed="filter === genre" @click="filter = genre">{{ genre }}<span v-if="genre === 'All sounds'">{{ demos.length + liveSounds.length }}</span></button></div><div class="ab-tool-right"><div class="ab-search"><Search :size="16"/><input v-model="query" placeholder="Find a sound..." aria-label="Search sounds, tickers or creators"/><button v-if="query" class="ab-icon-btn" @click="query = ''" aria-label="Clear search"><X :size="16"/></button></div><label class="ab-sort"><span class="sr-only">Sort sounds</span><select v-model="sort"><option>Latest releases</option><option>A to Z</option><option v-if="chainReady">Closest to graduation</option></select><ChevronDown :size="14"/></label></div></div>
              <div class="ab-ledger-head" aria-hidden="true"><span>TRACK / ARTIST</span><span>GENRE</span><span>SIGNAL</span><span>LISTEN / EXPLORE</span></div>
              <ul class="ab-ledger" :aria-busy="loadingSounds">
                <li v-for="(sound, index) in filtered" :key="sound.id" class="ab-sound" :class="{ 'is-live': playing === sound.id }"><span class="ab-sound-num">{{ String(index + 1).padStart(2, '0') }}</span><button class="ab-cover" :aria-label="`Open ${sound.name}`" @click="inspectSound(sound)"><img :src="sound.art" :alt="`Cover artwork for ${sound.name}`" loading="lazy"/></button><div class="ab-sound-id"><h3><button @click="inspectSound(sound)">{{ sound.name }}</button></h3><span class="ab-maker">{{ sound.demo ? sound.creator : short(sound.creator) }}<span v-if="sound.demo" class="ab-verified"><Check :size="10"/></span></span><span class="ab-origin"><i :class="{ 'is-chain': !sound.demo }"></i>{{ sound.demo ? 'Studio demo' : sound.phase === 2 ? 'Uniswap v4' : sound.phase === 1 ? 'Awaiting pool' : sound.phase === 3 ? 'Rescued' : 'On curve' }}</span></div><span class="ab-sound-genre">{{ sound.genre }}</span><div v-if="sound.demo" class="ab-sound-signal ab-wave" :class="{ 'is-spinning': playing === sound.id }" aria-hidden="true"><i v-for="(height, barIndex) in bars.slice(index * 3, index * 3 + 18)" :key="barIndex" :style="{ height: `${height * .6}px`, animationDelay: `${barIndex * -.12}s` }"></i></div><div v-else class="ab-market-strip"><strong>{{ sound.phase === 2 ? 'Pool trading' : sound.phase === 1 ? 'Awaiting pool' : sound.phase === 3 ? 'Rescued' : `${Number(sound.price).toExponential(2)} ${sound.quoteSymbol}` }}</strong><span>{{ Intl.NumberFormat('en',{notation:'compact'}).format(Number(sound.totalSupply)) }} supply</span><progress :value="sound.progress || 0" max="100" :aria-label="`${sound.name} graduation progress`"></progress><span>{{ sound.graduated ? 'Liquidity locked' : `${(sound.progress || 0).toFixed(1)}% to graduation` }}</span></div><div class="ab-sound-actions"><button class="ab-play" :aria-label="`${playing === sound.id ? 'Pause' : 'Play'} ${sound.name}`" @click="playSound(sound)"><Pause v-if="playing === sound.id" :size="18" fill="currentColor"/><Play v-else :size="18" fill="currentColor"/></button><button class="ab-sound-open" :aria-label="`View ${sound.name} ${sound.demo ? 'details' : 'market'}`" @click="inspectSound(sound)"><span>{{ sound.demo ? 'Details' : 'Trade' }}</span><ArrowUpRight :size="19"/></button></div></li>
              </ul>
              <div v-if="loadingSounds && !liveSounds.length" class="ab-loading" role="status"><LoaderCircle :size="18" class="is-spin"/> Reading onchain releases...</div>
              <div v-if="!filtered.length && !loadingSounds" class="ab-empty"><AudioLines :size="36"/><h3>{{ filter === 'Onchain' ? 'Your sound could be first.' : 'No matching frequencies.' }}</h3><p>{{ filter === 'Onchain' ? 'Onchain releases appear here when testnet publishing is available.' : 'Try a different search or clear your filters.' }}</p><button class="ab-btn ab-btn-hot" @click="filter === 'Onchain' ? openModal('create') : (query = '', filter = 'All sounds')">{{ filter === 'Onchain' ? 'Open release studio' : 'Reset filters' }}<ArrowUpRight :size="16"/></button></div>
              <div v-if="liveSounds.length < totalSoundCount" class="ab-more"><button class="ab-btn" :disabled="loadingSounds" @click="loadMore">{{ loadingSounds ? 'Loading sounds...' : 'Load more onchain sounds' }}<ArrowRight :size="16"/></button></div>
              <div class="ab-feed-note"><span><i></i>{{ chainReady ? `${liveSounds.length} of ${totalSoundCount} onchain sounds loaded. Filters apply to loaded sounds.` : 'Studio demos are playable previews. No token, price or trading history.' }}</span><button class="ab-text-btn" :disabled="loadingSounds" @click="chainReady ? loadSounds() : openModal('status')">{{ loadingSounds ? 'Refreshing...' : chainReady ? 'Refresh archive' : 'Preview status' }}<ArrowUpRight :size="14"/></button></div>
              <p v-if="networkError" class="ab-warn" role="status">Network unavailable: {{ networkError }} <button @click="initializeChain().then(loadSounds)">Retry connection</button></p>
            </section>
          </div>
          <div class="ab-margin">
            <nav class="ab-studio-call" id="creators" aria-label="Release studio">
              <div class="ab-kicker">02 / THE RELEASE STUDIO</div>
              <h2>IT DOESN’T NEED<br/>A LABEL.<br/><span>JUST YOU.</span></h2>
              <span class="ab-call-glyph" aria-hidden="true">&#8599;</span>
              <p>A loop from last night. A voice with a story.<br/>Give your original audio a home of its own.</p>
              <button class="ab-btn ab-btn-ghost" @click="openModal('create')">Make your first release <Plus :size="18"/></button>
              <span class="ab-call-note">UPLOAD OR RECORD / UP TO 35 SECONDS</span>
            </nav>
            <div class="ab-promo ab-hidden">
              <div class="ab-promo-icon"><AudioLines :size="28"/></div>
              <span>YOUR NEXT RELEASE</span>
              <p>It starts with<br/>a little noise.</p>
              <button class="ab-btn ab-btn-hot" @click="openModal('create')">Open studio <ArrowUpRight :size="16"/></button>
            </div>
            <div class="ab-margin-foot ab-hidden"><span>INDEPENDENT SOUND.<br/>OPEN POSSIBILITIES.</span><a href="/docs/business-plan.pdf" target="_blank" rel="noopener">Read the vision <ArrowUpRight :size="13"/></a></div>
          </div>
        </div>
        <section class="ab-process ab-band" id="how-it-works">
          <div class="ab-head-row"><div><div class="ab-kicker">03 / FROM IDEA TO ONCHAIN</div><h2>A new kind of<br/><span>release cycle.</span></h2></div><p>Keep the creative part simple.<br/>Understand every step that follows.</p></div>
          <ol class="ab-step-grid">
            <li><span class="ab-step-num">01</span><Upload :size="23"/><h3>Capture the spark.</h3><p>Upload an original clip or record right here. Preview your audio, add a cover and make it yours.</p><span class="ab-step-detail">PREPARED PRIVATELY IN YOUR BROWSER</span></li>
            <li><span class="ab-step-num">02</span><AudioLines :size="23"/><h3>Give it a future.</h3><p>Choose your market currency and creator terms. Review the details, then publish permanently onchain.</p><span class="ab-step-detail">A SOUND. AN IDENTITY. A TESTNET MARKET.</span></li>
            <li><span class="ab-step-num">03</span><ArrowUpRight :size="23"/><h3>Let it find its people.</h3><p>Listeners can discover and trade your sound. The default base trading fee allocates 70% to its creator.</p><span class="ab-step-detail">CLEAR FEES. OPEN CONTRACTS.</span></li>
          </ol>
          <p class="ab-step-note">Test assets only. Audio tokens do not transfer copyright or royalty rights. Publishing requires an active testnet deployment.</p>
        </section>
        <section class="ab-faq ab-band">
          <div><div class="ab-kicker">THE FINE TUNING</div><h2>Before you<br/><span>hit release.</span></h2><p>Good questions deserve clear answers.</p><button class="ab-text-btn" @click="openModal('terms')">Read terms & risks <ArrowUpRight :size="15"/></button></div>
          <div class="ab-faq-list"><details v-for="item in faqs" :key="item.q"><summary>{{ item.q }}<Plus :size="19"/></summary><p>{{ item.a }}</p></details></div>
        </section>
      </main>
      <footer class="ab-foot ab-band">
        <div class="ab-foot-head"><a href="#main" class="ab-foot-mark">sonira<span>&#8599;</span></a><p>Hear it.<br/>Set it in motion.</p></div>
        <div class="ab-foot-base"><span>&copy; {{ new Date().getFullYear() }} Sonira</span><nav class="ab-foot-links" aria-label="Project links"><a href="https://x.com/Sonira_site" target="_blank" rel="noopener" aria-label="Follow Sonira on X at @Sonira_site">X / @Sonira_site <ArrowUpRight :size="12"/></a><button @click="openModal('status')">Project status</button><button @click="openModal('terms')">Terms & risks</button><button @click="openModal('privacy')">Privacy</button><a href="https://docs.robinhood.com/chain/" target="_blank" rel="noopener">Chain docs <ArrowUpRight :size="12"/></a></nav></div>
        <p class="ab-foot-legal">Independent project on Robinhood Chain testnet. No affiliation or endorsement. Test assets have no monetary value.</p>
      </footer>
    </div>
  </div>
  <Transition name="slide"><div v-if="currentSound" class="ab-dock"><img :src="currentSound.art" alt=""/><div><strong>{{ currentSound.name }}</strong><span>{{ currentSound.demo ? 'Sonira Studio · Original demo' : short(currentSound.creator) }}</span></div><button class="ab-icon-btn" :aria-label="playing ? 'Pause playback' : 'Resume playback'" @click="playSound(currentSound)"><LoaderCircle v-if="playingBusy" :size="22" class="is-spin"/><Pause v-else-if="playing" :size="22" fill="currentColor"/><Play v-else :size="22" fill="currentColor"/></button><span class="ab-dock-time">{{ clock(playbackTime) }}</span><input class="ab-dock-range" type="range" min="0" :max="duration || 8" step="0.1" :value="playbackTime" aria-label="Seek audio" @input="player.currentTime = Number(($event.target as HTMLInputElement).value)"/><span class="ab-dock-time">{{ clock(duration) }}</span><Volume2 class="ab-dock-vol" :size="18"/><button class="ab-icon-btn" aria-label="Close player" @click="closePlayer"><X :size="18"/></button></div></Transition>
  <Transition name="slide"><div v-if="notice" class="ab-toast" role="status">{{ notice }}<button class="ab-icon-btn" @click="notice = ''" aria-label="Dismiss notification"><X :size="17"/></button></div></Transition>

  <dialog ref="dialog" class="ab-sheet" :class="{ 'ab-sheet-market': modal === 'sound' && selected && !selected.demo, 'ab-sheet-studio': modal === 'create' }" :aria-label="`${modal} dialog`" @cancel.prevent="closeModal" @click="($event.target === dialog) && closeModal()">
    <div class="ab-sheet-body"><button class="ab-sheet-x ab-icon-btn" aria-label="Close dialog" :disabled="busy || recording" @click="closeModal"><X :size="22"/></button>
      <template v-if="modal === 'wallet'"><div class="ab-sheet-icon"><Wallet :size="26"/></div><div class="ab-kicker">YOUR KEY TO THE SOUND</div><h2>{{ account ? 'You’re connected.' : 'Come on in.' }}</h2><p>Connect your wallet to launch and trade sounds on Robinhood Chain testnet.</p><template v-if="account"><div class="ab-wallet-row"><span>{{ short(account) }}</span><button @click="copyAddress" class="ab-icon-btn" aria-label="Copy wallet address"><Copy :size="17"/></button></div><p class="ab-status-note">{{ signedIn ? 'Ownership verified for this browser session.' : 'Connected · Optional signature verifies wallet ownership locally.' }}</p><button v-if="wrongNetwork" class="ab-btn ab-btn-hot ab-wide" :disabled="busy" @click="withFeedback(switchNetwork)">Switch to Robinhood testnet</button><button v-else class="ab-btn ab-btn-hot ab-wide" :disabled="busy || signedIn" @click="withFeedback(signIn)"><ShieldCheck :size="18"/>{{ signedIn ? 'Session verified' : 'Sign in with wallet' }}</button><button class="ab-text-btn ab-disconnect" @click="disconnect(); message = ''">Disconnect wallet</button></template><template v-else><button v-for="wallet in wallets" :key="wallet.id" class="ab-wallet-choice" :disabled="walletBusy || busy" @click="walletConnect(wallet.provider)"><Wallet :size="21"/>{{ wallet.name }}<ArrowUpRight :size="19"/></button><button v-if="!wallets.length" class="ab-btn ab-btn-ghost ab-wide" :disabled="walletBusy || busy" @click="walletConnect()"><Wallet :size="18"/>{{ walletBusy ? 'Connecting…' : 'Connect browser wallet' }}</button><div class="ab-wallet-help">New here? <a href="https://metamask.io/download/" target="_blank" rel="noopener">Get a wallet <ArrowUpRight :size="12"/></a><a href="https://faucet.testnet.chain.robinhood.com" target="_blank" rel="noopener">Get test ETH <ArrowUpRight :size="12"/></a></div></template><button v-if="walletReturn" class="ab-btn ab-wide ab-return" :disabled="busy" @click="openModal(walletReturn)">Return to {{ walletReturn === 'create' ? 'launch studio' : 'sound' }}<ArrowRight :size="15"/></button><p class="ab-fine">No funds move when you connect or sign in. Sign-in is local to this tab; it does not create a server account.</p></template>

      <template v-else-if="modal === 'create'">
        <div class="ab-studio-head"><div class="ab-kicker">SONIRA / RELEASE STUDIO</div><h2>Your next release.</h2><p>A little sound can go a long way.</p></div>
        <nav class="ab-progress" aria-label="Release progress"><button v-for="(label,index) in ['The audio', 'The identity', 'The release']" :key="label" type="button" :class="{ 'is-on': studioStep === index + 1, 'is-done': studioStep > index + 1 }" :aria-current="studioStep === index + 1 ? 'step' : undefined" :disabled="busy || recording || preparing || microphonePending || (index === 1 && !audioFile) || (index === 2 && (!audioFile || !identityReady))" @click="changeStudioStep(index + 1)"><span><Check v-if="studioStep > index + 1" :size="13"/><template v-else>{{ String(index + 1).padStart(2, '0') }}</template></span>{{ label }}</button></nav>
        <form @submit.prevent="studioStep === 3 ? publish() : undefined">
          <section v-show="studioStep === 1" data-studio-step="1" class="ab-studio-stage" aria-label="Prepare your audio"><div class="ab-stage-head"><h3 tabindex="-1">Start with something original.</h3><p>Upload a file, record a moment, or explore with our sample.</p></div><div class="ab-drop" @dragover.prevent @drop.prevent="pickAudio($event.dataTransfer?.files[0])"><AudioLines :size="34"/><strong>{{ audioFile ? audioFile.name : 'Start with your sound' }}</strong><span>{{ audioFile ? `${audioDuration.toFixed(1)}s · ${(audioFile.size / 1024).toFixed(1)} KB · Ready to preview` : 'Up to 35 seconds · MP3, WAV, M4A, OGG or WebM' }}</span><div class="ab-drop-actions"><label class="ab-btn ab-btn-sm ab-btn-ghost"><Upload :size="15"/>Upload<input class="sr-only" aria-label="Upload audio file" type="file" accept=".mp3,.wav,.m4a,.ogg,.webm" :disabled="preparing || recording || microphonePending || busy" @change="fileChange"/></label><button type="button" class="ab-btn ab-btn-sm" :disabled="preparing || microphonePending || busy" :class="{ recording }" @click="recordSound"><Square v-if="recording" :size="14"/><Mic v-else :size="15"/>{{ recording ? `Stop · ${recordSeconds.toFixed(0)}s` : microphonePending ? 'Allow microphone…' : 'Record sound' }}</button></div><button type="button" :disabled="preparing || recording || microphonePending || busy" class="ab-sample" @click="withFeedback(useSample)">Or try our original sample ↗</button></div><div v-if="preparing" class="ab-encode" role="status"><LoaderCircle :size="17" class="is-spin"/><div><strong>Preparing your sound · {{ Math.round(preparationProgress * 100) }}%</strong><span>Encoding privately in this browser. Keep this tab open.</span><progress :value="preparationProgress" max="1" aria-label="Audio preparation progress"></progress></div><button type="button" @click="preparation?.abort()">Cancel</button></div><div class="ab-upload-config"><label>Next upload quality<select v-model="bitrate" :disabled="preparing || recording"><option :value="24000">24 kbps · richer</option><option :value="16000">16 kbps · balanced</option><option :value="12000">12 kbps · compact</option></select></label><span>{{ audioFile && originalBytes > audioFile.size ? `${Math.round((1 - audioFile.size / originalBytes) * 100)}% smaller · ` : '' }}96 KiB audio + cover limit</span></div><audio v-if="previewUrl" :src="previewUrl" controls class="ab-preview"/><div class="ab-stage-next"><span>{{ audioFile ? 'Audio ready. Give it an identity next.' : 'Add an audio clip to continue.' }}</span><button type="button" class="ab-btn ab-btn-hot" :disabled="!audioFile || preparing || recording || microphonePending || busy" @click="changeStudioStep(2)">Name your sound <ArrowRight :size="16"/></button></div></section>
          <section v-show="studioStep === 2" data-studio-step="2" class="ab-studio-stage" aria-label="Sound identity"><div class="ab-stage-head"><h3 tabindex="-1">Put your name on it.</h3><p>A clear name and ticker help listeners find your release.</p></div><div class="ab-field-row"><label>Sound name<input v-model="title" maxlength="48" placeholder="Give this sound a name"  :required="studioStep === 2"/></label><label class="ab-ticker">Ticker<input v-model="ticker" maxlength="10" placeholder="SOUND" pattern="[A-Z][A-Z0-9]{1,9}" @input="ticker = ticker.toUpperCase().replace(/[^A-Z0-9]/g, '')"  :required="studioStep === 2"/></label></div><details class="ab-fold"><summary>Artwork & story <span>Optional</span><Plus :size="15"/></summary><div class="ab-fold-body"><div class="ab-art-picker"><img v-if="coverPreview" :src="coverPreview" alt="Your sound cover preview"/><div v-else class="ab-art-empty"><Disc3 :size="30"/></div><div><strong>Your cover, onchain.</strong><p>PNG, JPG or WebP. Cropped to a square and compressed in your browser.</p><label class="ab-btn ab-btn-sm"><Upload :size="13"/>{{ coverPreparing ? 'Preparing cover...' : coverFile ? 'Change cover' : 'Choose cover' }}<input class="sr-only" aria-label="Cover artwork" type="file" accept="image/png,image/jpeg,image/webp" :disabled="busy || coverPreparing" @change="pickCover"/></label><button v-if="coverFile" type="button" class="ab-text-btn ab-remove" :disabled="busy" @click="clearCover">Remove</button></div></div><label>Description<textarea v-model="description" maxlength="512" :disabled="busy" rows="3" placeholder="The story behind your sound. What should people hear?"/></label><div class="ab-link-grid"><label>Website<input v-model="websiteLink" type="url" maxlength="256" :disabled="busy" placeholder="https://your-site.xyz"/></label><label>X profile<input v-model="socialLink" type="url" maxlength="256" :disabled="busy" placeholder="https://x.com/yourname"/></label><label>Telegram<input v-model="telegramLink" type="url" maxlength="256" :disabled="busy" placeholder="https://t.me/yourname"/></label><label>Discord<input v-model="discordLink" type="url" maxlength="256" :disabled="busy" placeholder="https://discord.gg/yourserver"/></label><label>Farcaster<input v-model="farcasterLink" type="url" maxlength="256" :disabled="busy" placeholder="https://farcaster.xyz/yourname"/></label></div><p class="ab-micro-note">{{ (mediaBytes / 1024).toFixed(1) }} / 96 KiB for audio + cover. Cover: up to 16 KiB. All published details are permanent.</p></div></details><p v-if="metadataError" class="ab-warn" role="status">{{ metadataError }}</p><p class="ab-hint">Ticker: 2-10 letters or numbers, starting with a letter.</p><div class="ab-stage-next"><button type="button" class="ab-text-btn" :disabled="busy" @click="changeStudioStep(1)"><ArrowLeft :size="16"/>Audio</button><button type="button" class="ab-btn ab-btn-hot" :disabled="!identityReady || busy" @click="changeStudioStep(3)">Review release <ArrowRight :size="16"/></button></div></section>
          <section v-show="studioStep === 3" data-studio-step="3" class="ab-studio-stage" aria-label="Review release"><div class="ab-stage-head"><h3 tabindex="-1">One last sound check.</h3><p>Review your market, fees and rights before publishing.</p></div><div class="ab-review-card"><img v-if="coverPreview" :src="coverPreview" alt="Release artwork"/><AudioLines v-else :size="28"/><div><strong>{{ title }}</strong><span>${{ ticker }} / {{ audioDuration.toFixed(1) }}s / {{ (mediaBytes / 1024).toFixed(1) }} KiB</span></div><button type="button" class="ab-text-btn" :disabled="busy" @click="changeStudioStep(2)">Edit <ArrowUpRight :size="14"/></button></div><label class="ab-currency">Market currency<select v-model="quoteChoice" :disabled="busy || recording"><option v-for="asset in quoteAssets" :key="asset.address" :value="asset.address">{{ asset.address === nativeQuote.address ? 'Test ETH' : `Test ${asset.symbol}` }} · {{ asset.name }}</option></select><span>{{ quoteChoice === nativeQuote.address ? 'Trade this sound with native test ETH.' : 'Test asset only. Issuer transfer restrictions may apply; this is not real stock exposure.' }}</span></label><CreatorSettings v-model:recipient="creatorRecipient" v-model:tax-bps="creatorTaxBps" v-model:buyback-enabled="buybackEnabled" :connected-account="account" :max-tax-bps="launchTerms.maxTaxBps" :creator-share-bps="launchTerms.creatorShareBps" :buyback-share-bps="launchTerms.buybackShareBps" :disabled="busy"/><details class="ab-fold"><summary>Launch protection <span>{{launchTerms.snipeSeconds}}-second opening window</span><Plus :size="15"/></summary><div class="ab-fold-body"><p class="ab-micro-note">Opening buy tax starts at {{launchTerms.snipeStartBps/100}}% before the fee cap and decays to zero across {{launchTerms.snipeSeconds}} seconds. The creator and fee recipient are exempt. You may exempt up to 32 additional wallets.</p><label>Exempt wallets<textarea v-model="exemptions" :disabled="busy" rows="3" placeholder="0x... one address per line"/></label></div></details><p v-if="creatorError" class="ab-warn">{{creatorError}}</p><div class="ab-launch-grid"><span>Supply<strong>{{Number(launchTerms.supply).toLocaleString('en')}}</strong></span><span>Base trading fee<strong>{{launchTerms.baseFeeBps/100}}%</strong></span><span>Launch fee<strong>{{launchTerms.fee}} ETH</strong></span></div><p class="ab-micro-note">{{launchTerms.creatorShareBps/100}}% of base fees are allocated to the creator. Additional creator tax: {{Math.max(0,creatorTaxBps)/100}}%. Market reserve target: {{quoteAssets.find(asset=>asset.address===quoteChoice)?.target}} {{quoteAssets.find(asset=>asset.address===quoteChoice)?.symbol}}.</p><label class="ab-check"><input v-model="rights" type="checkbox"/>I own this audio and artwork or have permission to publish them. I understand that onchain audio is permanent.</label><p v-if="!chainReady" class="ab-status-note">The launch studio is ready to explore. Onchain publishing will open after our testnet contract deployment.</p><button v-if="!account" type="button" class="ab-btn ab-btn-ghost ab-wide" @click="openModal('wallet')">Connect wallet to continue <Wallet :size="17"/></button><button v-else type="submit" class="ab-btn ab-btn-hot ab-wide" :disabled="!canPublish || busy || recording"><LoaderCircle v-if="busy" :size="17" class="is-spin"/>{{ busy ? 'Confirming your launch…' : chainReady ? 'Launch on testnet' : 'Publishing opens soon' }}<ArrowUpRight v-if="!busy" :size="18"/></button><p class="ab-fine">The launch fee and network gas are paid in test ETH. Audio tokens do not transfer copyright. Use test assets only.</p><button type="button" class="ab-text-btn ab-studio-back" :disabled="busy || recording" @click="changeStudioStep(2)"><ArrowLeft :size="16"/>Back to identity</button></section>
        </form>
      </template>

      <template v-else-if="modal === 'sound' && selected">
        <MarketDetail v-if="!selected.demo && selected.address" :key="selected.address" :address="selected.address" :name="selected.name" :symbol="selected.symbol" :creator="selected.creator" :art="selected.art" :playing="playing === selected.id" @play="playSound(selected!)" @connect="openModal('wallet')" @traded="loadSounds" @busy="busy = $event"/>
        <template v-else><div class="ab-demo-head"><img :src="selected.art" :alt="`${selected.name} cover`"/><div><div class="ab-kicker">ORIGINAL STUDIO DEMO</div><h2>{{ selected.name }}</h2><span>{{ selected.creator }}</span><button class="ab-btn ab-btn-sm" @click="playSound(selected)"><Pause v-if="playing === selected.id" :size="14"/><Play v-else :size="14"/>{{ playing === selected.id ? 'Pause sound' : 'Listen to sound' }}</button></div></div><div class="ab-demo-note"><Disc3 :size="30"/><h3>A taste of what's possible.</h3><p>This original studio sound is a playable preview. It has no token, price or trading history. Your sound could be next.</p><button class="ab-btn ab-btn-hot ab-wide" @click="openModal('create')">Open the launch studio <ArrowUpRight :size="18"/></button></div></template>
      </template>

      <template v-else-if="modal === 'status'"><div class="ab-kicker">OPEN NOTES</div><h2>Where we are.</h2><div class="ab-status-list"><p><Check :size="19"/><span>Original brand, playable studio and wallet connection</span></p><p><component :is="chainReady ? Check : Radio" :size="19"/><span>{{ chainReady ? 'Testnet factory deployed; onchain publishing enabled' : 'Testnet contract deployment pending' }}</span></p><p><Radio :size="19"/><span>Creator pilot and independent contract audit planned</span></p></div><p class="ab-status-home">Our home is <a href="https://sonira.site" target="_blank" rel="noopener">sonira.site</a> and <a href="https://x.com/Sonira_site" target="_blank" rel="noopener">@Sonira_site on X</a>.</p><a v-if="factoryAddress" :href="`${NETWORK.blockExplorerUrls[0]}/address/${factoryAddress}`" target="_blank" rel="noopener" class="ab-btn ab-btn-ghost ab-wide">View factory <ExternalLink :size="16"/></a><p class="ab-fine">Native and enabled test-token markets graduate into Uniswap v4. No mainnet release, real stock exposure or platform token is offered.</p></template>

      <template v-else-if="modal === 'terms'"><div class="ab-kicker">TERMS & RISKS / PREVIEW</div><h2>Listen. Understand.</h2><div class="ab-prose"><p>Sonira is experimental software on Robinhood Chain testnet. Test assets have no monetary value. There is no promise of profits, liquidity, royalties or future airdrops.</p><p>You are responsible for wallet security, transaction review and the rights to uploaded content. Publishing audio stores it permanently onchain. Token ownership grants no copyright or commercial license.</p><p>Smart contracts may contain defects and have not received an independent audit. Markets begin on a curve and can graduate into a Uniswap v4 pool with a permanently locked liquidity position. Enabled stock-named assets are test tokens, not real stock exposure. Issuer pause, blocklist, upgrade and administrative-burn controls can affect these assets.</p><p>A default 1% base fee splits 70% creator / 30% protocol, plus any creator-selected tax. The launch-window buy tax can consume most of an opening purchase; review the quoted cost or wait for it to decay. Creator and declared wallets are exempt. Pool hook fees continue after graduation and use swap output as their basis. Optional buybacks use half the creator base-fee allocation, followed by five-year linear vesting and a 70/30 release split. Conversions require a configured operator. Sale proceeds and unused inputs return directly to wallets; distributed fees and vested releases are claimed from escrow. Gas is additional. A default 0.0005 ETH launch fee applies.</p><p>The protocol owner can change settings for future launches, pause launches, rotate the fee operator, redirect creator recipients after a 3-day timelock, and rescue failed swept graduations after 7 days. Existing launch trading-fee terms are frozen; permanently locked liquidity cannot be withdrawn. This preview is not offered as a production financial service. The operator entity, jurisdictional terms, privacy contact and complaint process must be established before a public commercial launch.</p></div></template>

      <template v-else-if="modal === 'privacy'"><div class="ab-kicker">PRIVACY / PREVIEW</div><h2>Your session.<br/>Your choice.</h2><div class="ab-prose"><p>This site does not collect email addresses, use advertising trackers or send wallet signatures to a server. Wallet connection and optional ownership verification are held in this tab’s memory and cleared on refresh or disconnect.</p><p>Your wallet provider and the Robinhood Chain RPC receive requests when you connect, fetch chain data or transact. Blockchain addresses, transactions, sound metadata and published audio are public and persistent.</p><p>Microphone access is requested only when you press Record. Audio remains in your browser until you publish a transaction. The microphone stops after recording, at a maximum of 35 seconds. Uploads are decoded and compressed locally before publication. Do not record private or identifying information.</p><p>Hosting and RPC providers may process IP addresses under their own policies. An accountable operator and privacy contact must be identified before commercial launch.</p></div></template>
      <div v-if="message" class="ab-sheet-msg" role="status">{{ message }}</div><a v-if="txHash" class="ab-tx" :href="`${NETWORK.blockExplorerUrls[0]}/tx/${txHash}`" target="_blank" rel="noopener">View transaction <ExternalLink :size="14"/></a>
    </div>
  </dialog>
</template>
