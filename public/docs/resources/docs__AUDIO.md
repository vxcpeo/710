# Local audio preparation

`website/src/audio.ts` turns an uploaded or recorded sound into a browser-validated, mono audio file that fits the **98,304-byte** onchain storage limit. Processing stays in the browser. The module does not send audio to a server, request a microphone, create an account, or play sound through the speakers.

```ts
import { prepareAudio, inspectAudio } from './audio'

const controller = new AbortController()
const result = await prepareAudio(uploadedFile, {
  seconds: 35,
  maxBytes: 98_304,
  bitrate: 16_000,
  onProgress: fraction => { progress.value = fraction },
  signal: controller.signal,
})

// Use result.file for preview and contract upload.
// result.duration is verified from the encoded output.
// controller.abort() cancels with a DOMException named AbortError.
```

`inspectAudio(file): Promise<number>` independently decodes a file and returns its duration in seconds. It applies the same input validation. `prepareAudio` returns `{ file: File, duration: number, originalSize: number, encoded: boolean }`. `encoded` is currently always `true`: even small files are deliberately decoded, downmixed and re-encoded. Progress is a monotonic number from `0` to `1`.

## Input limits and formats

- Nonempty MP3, WAV, M4A, OGG or WebM files, up to **25 MiB**.
- Actual decoded duration must be no more than **35 seconds**. Longer inputs are rejected; the caller should ask the user to trim them first.
- `seconds` optionally trims an accepted input further and must be greater than zero and at most 35.
- Extensions identify candidate formats; browser decoding validates the actual data. M4A/AAC, OGG codecs and other formats depend on the browser's installed codec support. An extension alone never establishes validity.
- `maxBytes` can lower the output budget from 96 KiB to as little as 1 KiB. It cannot exceed the contract-oriented maximum.

Decoded channels are averaged into mono. A 4 ms edge fade prevents abrupt trim clicks; peaks above 0.98 are attenuated. The source is decoded at 24 kHz to limit working memory. Very short inputs may not be encodable by a browser's Opus implementation and then use the PCM fallback.

## Encoding and cancellation

The preferred available browser encoder is `MediaRecorder` with Opus in WebM, followed by Opus in Ogg. The requested bitrate is **12,000**, **16,000** or **24,000 bits/second**; the default is 16,000. Lower rates are selected when the duration plus an allowance for the container would otherwise exceed the byte budget. The actual resulting file size is checked, and the produced file is decoded again before it is accepted.

This implementation uses the native MediaRecorder route, not WebCodecs. `AudioEncoder` alone does not produce an uploadable Ogg or WebM file; it also needs a compatible container muxer. No such dependency was present or introduced. Native encoding provides a portable, browser-produced container without adding an unverified muxer or a downloaded WASM codec.

MediaRecorder conversion takes approximately the length of the sound. It connects a buffer only to a mono `MediaStreamAudioDestinationNode`, never to the device's speakers. Call it from a user-triggered action and show progress with a cancel control. A blocked AudioContext receives a three-second startup timeout and falls back to offline WAV. Keep the browser tab active during conversion; there is also a bounded encoding timeout. No autoplay permission or microphone permission dialog is required by this module.

Cancellation rejects promptly with `AbortError`. Every live encoding context is closed, recorder listeners are cleared, source nodes are stopped and disconnected, destination tracks are stopped, and timers and abort listeners are removed in `finally`. Offline decode itself is a browser operation that cannot be interrupted internally; cancellation stops waiting for its result and prevents later conversion or upload. No live media tracks are created during offline decoding.

To keep the actual encoded output below 35 seconds despite Opus padding, the input to the encoder is capped at 34.88 seconds. Shorter files preserve their selected content apart from normal encoder framing. The returned duration is measured from the final file, not inferred from the requested trim.

## WAV fallback

If Opus is unavailable, blocked, fails output validation or cannot fit the budget, an offline **unsigned 8-bit mono PCM WAV** is generated. Its sample rate is selected from standard **8, 12 or 16 kHz** rates to fit the byte budget. A windowed-sinc resampler reduces aliasing; the RIFF header and odd-byte chunk padding are written explicitly.

The fallback is useful for compatibility but has lower fidelity. Within 96 KiB, 8-bit PCM at 8 kHz fits about **12 seconds**; a 35-second PCM clip does not fit at a broadly supported sample rate. Browser testing showed that Chromium rejects the approximately 2.8 kHz WAV needed to fit 35 seconds. Such a fallback therefore rejects with an explicit request for a shorter clip or an Opus-compatible browser; it does not return an unreadable file or silently truncate content. The full 35-second path works through Opus. Let users preview the result. This is a codec fallback, not a promise of uniform sound quality across browsers.

## Browser validation

Real Chromium checks were run against the Vite-served module in a separate Playwright browser session. The reproducible checks are in `output/history/pre-rebrand-playwright/audio-preparation-check.js`, `output/history/pre-rebrand-playwright/audio-boundary-check.js` and `output/history/pre-rebrand-playwright/audio-codecs-check.js`. Timestamped browser results are in audio-qa.json. The MP3, AAC/M4A and Ogg fixtures were generated from SONIRA's original studio audio with local FFmpeg; no third-party recordings were used.

Verified behaviors include native Opus encoding of an eight-second stereo WAV into a decoded mono WebM file, reimport and trimming of WebM output, monotonic progress, cancellation during recording, rejection of malformed audio and oversized/overlong input, fallback to a valid PCM WAV when MediaRecorder is unavailable, and rejection of a PCM fallback that cannot fit at a supported sample rate. Exact result sizes vary with browser encoder and timing. The module passes strict standalone TypeScript validation; the full app build is validated separately during integration.

Recording UI remains the caller's responsibility. Stop its microphone tracks when recording ends or the dialog is closed, then pass the resulting `File` through `prepareAudio`. Audio rights confirmation and irreversible onchain publication remain separate explicit user actions.

## Shared publication budget

Audio and an optional cover share a 96 KiB contract cap. The studio passes the remaining budget to audio preparation when a cover is already selected, and rejects publication if a later cover would exceed the combined limit. Description/links have separate text bounds.

## Custom cover preparation

`website/src/cover.ts` exports `prepareCover(file): Promise<File>`. The returned file is a square **JPEG no larger than 16,384 bytes**, suitable for preview and the contract's separate cover payload. It does not upload or publish the image.

Inputs must be still JPEG, PNG or WebP files no larger than **10 MiB**. Container signatures and dimensions are read before bitmap decoding: each side is limited to 10,000 pixels and the full image to 40 megapixels. SVG and GIF are rejected, as are PNG animation chunks and animated WebP flags/chunks. The browser still validates the actual image when decoding; a filename or MIME type is insufficient.

The decoder honors EXIF orientation and resizes the long edge to at most 1024 pixels. EXIF orientation is read from JPEG, PNG or WebP headers to choose the correctly oriented resize edge. The oriented bitmap is center-cropped square, transparency is flattened onto SONIRA warm white, and canvas JPEG encoding tries sizes 512, 384, 256, 192, 128 and 96 pixels with descending quality. The first result within the byte budget is returned. The source bitmap and canvas backing store are released afterward.

Canvas re-encoding does not copy source EXIF or GPS fields. Users should still preview the crop and avoid private information visible in the pixels. This function has no external dependencies and no network calls. File selection races, clearing previews and object-URL cleanup remain the caller's responsibility.

Chromium validation covered all three accepted formats, a colored-stripe center-crop fixture, high-entropy artwork that forced downscaling, a private metadata marker that was absent from the output, rotated EXIF with a bounded intermediate bitmap, and malformed, oversized, unsupported and animated inputs. See cover-qa.json and the reproducible `output/history/pre-rebrand-playwright/cover-check.js`.
