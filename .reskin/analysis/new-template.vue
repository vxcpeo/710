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
        <div class="ab-foot-base"><span>&copy; {{ new Date().getFullYear() }} Sonira</span><nav class="ab-foot-links" aria-label="Project links"><button @click="openModal('status')">Project status</button><button @click="openModal('terms')">Terms & risks</button><button @click="openModal('privacy')">Privacy</button><a href="https://docs.robinhood.com/chain/" target="_blank" rel="noopener">Chain docs <ArrowUpRight :size="12"/></a></nav></div>
        <p class="ab-foot-legal">Independent project on Robinhood Chain testnet. No affiliation or endorsement. Test assets have no monetary value.</p>
      </footer>
    </div>
  </div>
  <!--AUX-->
</template>
