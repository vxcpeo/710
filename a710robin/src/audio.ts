/** Local-only audio preparation. This module never uploads or plays audio aloud. */
export const MAX_AUDIO_INPUT_BYTES = 25 * 1024 * 1024
export const MAX_AUDIO_SECONDS = 35
export const MAX_AUDIO_BYTES = 96 * 1024

export interface PrepareAudioOptions {
  /** Trim to at most this duration; inputs longer than 35 seconds are rejected. */
  seconds?: number
  maxBytes?: number
  /** Requested Opus bits/second. Lower supported rates may be chosen to fit. */
  bitrate?: 12000 | 16000 | 24000
  /** Monotonic fraction from 0 to 1, including real-time encoding progress. */
  onProgress?: (fraction: number) => void
  signal?: AbortSignal
}

export interface PreparedAudio {
  file: File
  /** Duration of the actual decoded output, including any encoder padding. */
  duration: number
  originalSize: number
  encoded: boolean
}

const OUTPUT_RATE = 24000
const OPUS_TYPES = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus']
const RATES = [24000, 16000, 12000] as const
const abortError = () => new DOMException('Audio preparation cancelled.', 'AbortError')
const cancelled = (signal?: AbortSignal) => { if (signal?.aborted) throw abortError() }

function abortable<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  cancelled(signal)
  if (!signal) return promise
  return new Promise((resolve, reject) => {
    const abort = () => { cleanup(); reject(abortError()) }
    const cleanup = () => signal.removeEventListener('abort', abort)
    signal.addEventListener('abort', abort, { once: true })
    promise.then(value => { cleanup(); resolve(value) }, error => { cleanup(); reject(error) })
  })
}

function validateFile(file: File) {
  if (!(file instanceof File) || !file.size) throw new Error('Choose a non-empty audio file.')
  if (file.size > MAX_AUDIO_INPUT_BYTES) throw new Error('Choose an audio file no larger than 25 MB.')
  if (!/\.(mp3|wav|m4a|ogg|webm)$/i.test(file.name)) throw new Error('Choose an MP3, WAV, M4A, OGG or WebM file.')
}

async function decode(file: File, signal?: AbortSignal, checkLimit = true): Promise<AudioBuffer> {
  cancelled(signal)
  const bytes = await abortable(file.arrayBuffer(), signal)
  const Offline = window.OfflineAudioContext || (window as unknown as { webkitOfflineAudioContext?: typeof OfflineAudioContext }).webkitOfflineAudioContext
  if (!Offline) throw new Error('This browser cannot decode audio. Try an up-to-date browser.')
  // Offline decoding needs no speaker playback, microphone, server or activation.
  const context = new Offline(1, 1, OUTPUT_RATE)
  let buffer: AudioBuffer
  try { buffer = await abortable(context.decodeAudioData(bytes), signal) }
  catch (error) {
    if (signal?.aborted || (error instanceof DOMException && error.name === 'AbortError')) throw abortError()
    throw new Error('This audio cannot be decoded by your browser. Try a WAV, MP3 or another supported codec.')
  }
  cancelled(signal)
  if (!Number.isFinite(buffer.duration) || buffer.duration <= 0 || !buffer.numberOfChannels) throw new Error('The audio file has no playable sound.')
  if (checkLimit && buffer.duration > MAX_AUDIO_SECONDS + .001) throw new Error('Choose a sound no longer than 35 seconds. Trim it before uploading.')
  return buffer
}

/** Browser-decode validation; extension and MIME alone are never trusted. */
export async function inspectAudio(file: File): Promise<number> {
  validateFile(file)
  return (await decode(file)).duration
}

function monoSamples(buffer: AudioBuffer, seconds: number): Float32Array {
  const length = Math.min(buffer.length, Math.floor(seconds * buffer.sampleRate))
  if (length < 1) throw new Error('The selected clip is too short.')
  const mono = new Float32Array(length)
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const values = buffer.getChannelData(channel)
    for (let i = 0; i < length; i++) mono[i] += values[i]! / buffer.numberOfChannels
  }
  let peak = 0
  for (const value of mono) peak = Math.max(peak, Math.abs(value))
  const gain = peak > .98 ? .98 / peak : 1
  const edge = Math.min(Math.floor(buffer.sampleRate * .004), Math.floor(length / 4))
  for (let i = 0; i < length; i++) {
    const fade = edge > 0 ? Math.min(1, i / edge, (length - 1 - i) / edge) : 1
    mono[i] = mono[i]! * gain * fade
  }
  return mono
}

async function opus(
  samples: Float32Array, sampleRate: number, mimeType: string, bitrate: number,
  signal: AbortSignal | undefined, progress: (fraction: number) => void,
): Promise<Blob> {
  cancelled(signal)
  const context = new AudioContext({ sampleRate })
  let destination: MediaStreamAudioDestinationNode | undefined
  let source: AudioBufferSourceNode | undefined
  let recorder: MediaRecorder | undefined
  let tick: ReturnType<typeof setInterval> | undefined
  let deadline: ReturnType<typeof setTimeout> | undefined
  let stopDelay: ReturnType<typeof setTimeout> | undefined
  let resumeTimeout: ReturnType<typeof setTimeout> | undefined
  let abortListener: (() => void) | undefined
  try {
    // A user-triggered call normally resumes immediately. A blocked context
    // falls back to offline WAV instead of hanging or requiring autoplay.
    await abortable(Promise.race([
      context.resume(),
      new Promise<never>((_, reject) => { resumeTimeout = setTimeout(() => reject(new Error('Audio encoder could not start.')), 3000) }),
    ]), signal)
    clearTimeout(resumeTimeout)
    cancelled(signal)
    destination = context.createMediaStreamDestination()
    destination.channelCount = 1
    destination.channelCountMode = 'explicit'
    const buffer = context.createBuffer(1, samples.length, sampleRate)
    buffer.copyToChannel(new Float32Array(samples), 0)
    source = context.createBufferSource()
    source.buffer = buffer
    source.connect(destination) // Deliberately never connect to context.destination.
    recorder = new MediaRecorder(destination.stream, { mimeType, audioBitsPerSecond: bitrate })
    const activeRecorder = recorder
    const activeSource = source
    const parts: Blob[] = []
    return await new Promise<Blob>((resolve, reject) => {
      let settled = false
      const fail = (error: Error | DOMException) => { if (!settled) { settled = true; reject(error) } }
      abortListener = () => fail(abortError())
      signal?.addEventListener('abort', abortListener, { once: true })
      activeRecorder.ondataavailable = event => { if (event.data.size) parts.push(event.data) }
      activeRecorder.onerror = () => fail(new Error('The browser audio encoder failed.'))
      activeRecorder.onstop = () => {
        if (!settled) {
          settled = true
          const blob = new Blob(parts, { type: mimeType })
          if (!blob.size) reject(new Error('The audio encoder produced an empty file.'))
          else resolve(blob)
        }
      }
      activeSource.onended = () => {
        // Let the final render quantum reach the recorder before finalizing.
        stopDelay = setTimeout(() => { if (activeRecorder.state !== 'inactive') activeRecorder.stop() }, 40)
      }
      const duration = samples.length / sampleRate
      deadline = setTimeout(() => fail(new Error('Audio encoding timed out. Keep this tab active and try again.')), (duration + 10) * 1000)
      activeRecorder.start()
      const startedAt = context.currentTime
      activeSource.start()
      tick = setInterval(() => progress(Math.min(.99, (context.currentTime - startedAt) / duration)), 100)
      if (signal?.aborted) fail(abortError())
    })
  } finally {
    clearTimeout(resumeTimeout); clearTimeout(deadline); clearTimeout(stopDelay); clearInterval(tick)
    if (abortListener) signal?.removeEventListener('abort', abortListener)
    if (source) { source.onended = null; try { source.stop() } catch { /* Already ended. */ }; source.disconnect() }
    if (recorder) {
      recorder.ondataavailable = null; recorder.onerror = null; recorder.onstop = null
      if (recorder.state !== 'inactive') { try { recorder.stop() } catch { /* Already stopped. */ } }
    }
    destination?.stream.getTracks().forEach(track => track.stop())
    destination?.disconnect()
    if (context.state !== 'closed') await context.close().catch(() => undefined)
  }
}

/** Windowed-sinc downsampling avoids severe aliasing in the compact PCM fallback. */
function resample(samples: Float32Array, inputRate: number, outputRate: number): Float32Array {
  const length = Math.max(1, Math.floor(samples.length * outputRate / inputRate))
  const result = new Float32Array(length)
  const ratio = outputRate / inputRate, cutoff = Math.min(1, ratio) * .92
  const radius = 24
  for (let i = 0; i < length; i++) {
    const at = i / ratio, center = Math.floor(at)
    let sum = 0, weight = 0
    for (let j = center - radius + 1; j <= center + radius; j++) {
      if (j < 0 || j >= samples.length) continue
      const distance = at - j
      const x = Math.PI * distance * cutoff
      const sinc = Math.abs(x) < 1e-10 ? 1 : Math.sin(x) / x
      const window = .5 + .5 * Math.cos(Math.PI * distance / radius)
      const w = sinc * window * cutoff
      sum += samples[j]! * w; weight += w
    }
    result[i] = weight ? sum / weight : 0
  }
  return result
}

function wav(samples: Float32Array, sampleRate: number, maxBytes: number): Blob {
  const duration = samples.length / sampleRate
  // Stay with standard, broadly decoded rates. Chromium rejects unusually low
  // WAV sample rates; silently shortening a creator's sound is not acceptable.
  const allowedRate = Math.floor((maxBytes - 45) / duration)
  const rate = [16000, 12000, 8000].find(value => value <= allowedRate)
  if (!rate) {
    const maximumSeconds = Math.floor((maxBytes - 45) / 8000)
    throw new Error(`This browser could not prepare Opus audio, and this clip is too long for WAV. Try an Opus-compatible browser or a sound shorter than ${maximumSeconds || 'one'} second${maximumSeconds === 1 ? '' : 's'}.`)
  }
  const data = resample(samples, sampleRate, rate)
  const padding = data.length % 2
  const buffer = new ArrayBuffer(44 + data.length + padding)
  const view = new DataView(buffer)
  const ascii = (offset: number, value: string) => { for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i)) }
  ascii(0, 'RIFF'); view.setUint32(4, 36 + data.length + padding, true); ascii(8, 'WAVE')
  ascii(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true)
  view.setUint16(22, 1, true); view.setUint32(24, rate, true); view.setUint32(28, rate, true)
  view.setUint16(32, 1, true); view.setUint16(34, 8, true); ascii(36, 'data'); view.setUint32(40, data.length, true)
  for (let i = 0; i < data.length; i++) view.setUint8(44 + i, Math.round(128 + Math.max(-1, Math.min(1, data[i]!)) * 127))
  return new Blob([buffer], { type: 'audio/wav' })
}

export async function prepareAudio(file: File, options: PrepareAudioOptions = {}): Promise<PreparedAudio> {
  validateFile(file)
  cancelled(options.signal)
  const seconds = options.seconds ?? MAX_AUDIO_SECONDS
  const maxBytes = options.maxBytes ?? MAX_AUDIO_BYTES
  const requestedBitrate = options.bitrate ?? 16000
  if (!Number.isFinite(seconds) || seconds <= 0 || seconds > MAX_AUDIO_SECONDS) throw new Error('Clip duration must be between 0 and 35 seconds.')
  if (!Number.isInteger(maxBytes) || maxBytes < 1024 || maxBytes > MAX_AUDIO_BYTES) throw new Error('Audio storage limit must be between 1 KB and 96 KB.')
  if (!RATES.includes(requestedBitrate)) throw new Error('Choose an Opus bitrate of 12000, 16000 or 24000 bits per second.')
  let previousProgress = 0
  const report = (fraction: number) => {
    previousProgress = Math.max(previousProgress, Math.min(1, fraction))
    try { options.onProgress?.(previousProgress) } catch { /* UI progress callbacks cannot leak audio resources. */ }
  }
  report(0)
  const decoded = await decode(file, options.signal)
  report(.08)
  // Leave 120 ms for MediaRecorder/Opus padding so the actual output also stays
  // within the global duration limit. Tiny clips keep their original length.
  const targetSeconds = Math.min(seconds, MAX_AUDIO_SECONDS - .12)
  const samples = monoSamples(decoded, targetSeconds)
  cancelled(options.signal)
  report(.12)
  const duration = samples.length / decoded.sampleRate
  const baseName = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 60) || 'sonira-sound'
  let result: File | undefined
  let outputDuration = 0
  const mimeType = typeof MediaRecorder !== 'undefined' ? OPUS_TYPES.find(type => MediaRecorder.isTypeSupported(type)) : undefined
  // Include space for the container rather than assuming bitrate equals size.
  const candidates = RATES.filter(rate => rate <= requestedBitrate && duration * rate / 8 + 4096 <= maxBytes)
  if (mimeType && typeof AudioContext !== 'undefined') {
    for (const bitrate of candidates) {
      cancelled(options.signal)
      try {
        const blob = await opus(samples, decoded.sampleRate, mimeType, bitrate, options.signal, value => report(.15 + value * .76))
        cancelled(options.signal)
        if (blob.size > maxBytes) continue
        const extension = mimeType.includes('ogg') ? 'ogg' : 'webm'
        const candidate = new File([blob], `${baseName}.opus.${extension}`, { type: mimeType.split(';')[0] })
        // Verify the actual output rather than trusting recorder/container claims.
        const verified = await decode(candidate, options.signal)
        result = candidate; outputDuration = verified.duration
        break
      } catch (error) {
        cancelled(options.signal)
        if (error instanceof DOMException && error.name === 'AbortError') throw error
        // Encoder availability, codec support and autoplay policies vary. The
        // offline PCM path still gives a valid, bounded output without speakers.
        break
      }
    }
  }
  if (!result) {
    cancelled(options.signal)
    const blob = wav(samples, decoded.sampleRate, maxBytes)
    result = new File([blob], `${baseName}.mono.wav`, { type: 'audio/wav' })
    outputDuration = (await decode(result, options.signal)).duration
  }
  cancelled(options.signal)
  if (!result.size || result.size > maxBytes) throw new Error('The prepared sound exceeds the storage limit. Choose a shorter clip.')
  report(1)
  return { file: result, duration: outputDuration, originalSize: file.size, encoded: true }
}
