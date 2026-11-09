/** Original cover preparation runs locally; no files are uploaded by this module. */
export const MAX_COVER_INPUT_BYTES = 10 * 1024 * 1024
export const MAX_COVER_BYTES = 16 * 1024
export const MAX_COVER_DIMENSION = 10000
const MAX_COVER_PIXELS = 40_000_000

type Dimensions = { width: number; height: number; orientation?: number }
const invalid = () => new Error('This image is not a valid JPEG, PNG or WebP file.')
const ascii = (data: Uint8Array, offset: number, length: number) => String.fromCharCode(...data.subarray(offset, offset + length))

function exifOrientation(data: Uint8Array): number {
  try {
    const start = ascii(data, 0, 6) === 'Exif\0\0' ? 6 : 0
    const view = new DataView(data.buffer, data.byteOffset + start, data.byteLength - start)
    const little = view.getUint16(0) === 0x4949
    if (!little && view.getUint16(0) !== 0x4d4d) return 1
    if (view.getUint16(2, little) !== 42) return 1
    const directory = view.getUint32(4, little)
    const count = Math.min(view.getUint16(directory, little), 2048)
    for (let i = 0; i < count; i++) {
      const at = directory + 2 + i * 12
      if (view.getUint16(at, little) === 0x112 && view.getUint16(at + 2, little) === 3 && view.getUint32(at + 4, little) === 1) {
        const value = view.getUint16(at + 8, little)
        return value >= 1 && value <= 8 ? value : 1
      }
    }
  } catch { /* Malformed optional EXIF cannot override container dimensions. */ }
  return 1
}

/** Read dimensions before allocating a decoded bitmap; do not trust file.type. */
function imageHeader(data: Uint8Array): Dimensions {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength)
  if (data.length >= 24 && data[0] === 137 && ascii(data, 1, 3) === 'PNG' && ascii(data, 12, 4) === 'IHDR') {
    if (data[4] !== 13 || data[5] !== 10 || data[6] !== 26 || data[7] !== 10 || view.getUint32(8) !== 13) throw invalid()
    const dimensions: Dimensions = { width: view.getUint32(16), height: view.getUint32(20) }
    let offset = 8
    while (offset + 12 <= data.length) {
      const length = view.getUint32(offset)
      if (length > data.length - offset - 12) throw invalid()
      const type = ascii(data, offset + 4, 4)
      if (type === 'acTL' || type === 'fcTL' || type === 'fdAT') throw new Error('Animated covers are not supported. Choose a still JPEG, PNG or WebP image.')
      if (type === 'eXIf') dimensions.orientation = exifOrientation(data.subarray(offset + 8, offset + 8 + length))
      offset += 12 + length
      if (type === 'IEND') break
    }
    return dimensions
  }
  if (data.length >= 12 && ascii(data, 0, 4) === 'RIFF' && ascii(data, 8, 4) === 'WEBP') {
    const declaredEnd = view.getUint32(4, true) + 8
    if (declaredEnd > data.length || declaredEnd < 12) throw invalid()
    let dimensions: Dimensions | undefined
    let orientation = 1
    let offset = 12
    const uint24 = (at: number) => data[at]! | (data[at + 1]! << 8) | (data[at + 2]! << 16)
    while (offset + 8 <= declaredEnd) {
      const type = ascii(data, offset, 4), length = view.getUint32(offset + 4, true), body = offset + 8
      if (length > declaredEnd - body) throw invalid()
      if (type === 'ANIM' || type === 'ANMF') throw new Error('Animated covers are not supported. Choose a still JPEG, PNG or WebP image.')
      if (type === 'EXIF') orientation = exifOrientation(data.subarray(body, body + length))
      if (type === 'VP8X' && length >= 10) {
        if (data[body]! & 2) throw new Error('Animated covers are not supported. Choose a still JPEG, PNG or WebP image.')
        dimensions = { width: uint24(body + 4) + 1, height: uint24(body + 7) + 1 }
      } else if (type === 'VP8L' && length >= 5 && data[body] === 0x2f) {
        const bits = view.getUint32(body + 1, true)
        dimensions ??= { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 }
      } else if (type === 'VP8 ' && length >= 10 && data[body + 3] === 0x9d && data[body + 4] === 1 && data[body + 5] === 0x2a) {
        dimensions ??= { width: view.getUint16(body + 6, true) & 0x3fff, height: view.getUint16(body + 8, true) & 0x3fff }
      }
      offset = body + length + (length % 2)
    }
    if (!dimensions) throw invalid()
    return { ...dimensions, orientation }
  }
  if (data.length >= 4 && data[0] === 0xff && data[1] === 0xd8) {
    let offset = 2
    let dimensions: Dimensions | undefined
    let orientation = 1
    while (offset + 4 <= data.length) {
      if (data[offset] !== 0xff) throw invalid()
      while (data[offset] === 0xff) offset++
      const marker = data[offset++]
      if (marker === undefined || marker === 0xd9 || marker === 0xda) break
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue
      if (offset + 2 > data.length) throw invalid()
      const length = view.getUint16(offset)
      if (length < 2 || length > data.length - offset) throw invalid()
      if (marker === 0xe1) orientation = exifOrientation(data.subarray(offset + 2, offset + length))
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
        if (length < 8) throw invalid()
        dimensions = { width: view.getUint16(offset + 5), height: view.getUint16(offset + 3) }
      }
      offset += length
    }
    if (dimensions) return { ...dimensions, orientation }
  }
  throw invalid()
}

function jpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob(blob => {
    if (!blob || blob.type !== 'image/jpeg') reject(new Error('This browser could not encode a JPEG cover.'))
    else resolve(blob)
  }, 'image/jpeg', quality))
}

/** Center-crop a still image into a metadata-free JPEG of at most 16 KiB. */
export async function prepareCover(file: File): Promise<File> {
  if (!(file instanceof File) || !file.size) throw new Error('Choose a non-empty JPEG, PNG or WebP cover.')
  if (file.size > MAX_COVER_INPUT_BYTES) throw new Error('Choose a cover image no larger than 10 MB.')
  if (!/\.(jpe?g|png|webp)$/i.test(file.name)) throw new Error('Choose a still JPEG, PNG or WebP cover. SVG and GIF are not supported.')
  const bytes = new Uint8Array(await file.arrayBuffer())
  const { width, height, orientation = 1 } = imageHeader(bytes)
  if (!width || !height || width > MAX_COVER_DIMENSION || height > MAX_COVER_DIMENSION || width * height > MAX_COVER_PIXELS) {
    throw new Error('Choose a cover no larger than 10,000 pixels per side and 40 megapixels total.')
  }
  if (typeof createImageBitmap !== 'function') throw new Error('This browser cannot prepare images. Try an up-to-date browser.')
  let bitmap: ImageBitmap
  try {
    // Resize only one edge so the decoder preserves aspect ratio and EXIF
    // orientation. Final square cropping happens on the oriented bitmap.
    const options: ImageBitmapOptions = { imageOrientation: 'from-image', resizeQuality: 'high' }
    const orientedWidth = orientation >= 5 ? height : width
    const orientedHeight = orientation >= 5 ? width : height
    if (orientedWidth >= orientedHeight) options.resizeWidth = Math.min(1024, orientedWidth)
    else options.resizeHeight = Math.min(1024, orientedHeight)
    bitmap = await createImageBitmap(file, options)
  } catch { throw new Error('This cover cannot be decoded by your browser. Try another JPEG, PNG or WebP image.') }
  const canvas = document.createElement('canvas')
  try {
    if (!bitmap.width || !bitmap.height) throw invalid()
    const side = Math.min(bitmap.width, bitmap.height)
    const startX = (bitmap.width - side) / 2, startY = (bitmap.height - side) / 2
    for (const size of [512, 384, 256, 192, 128, 96]) {
      canvas.width = size; canvas.height = size
      const context = canvas.getContext('2d', { alpha: false })
      if (!context) throw new Error('This browser cannot create a cover preview.')
      context.fillStyle = '#f7f7f0'
      context.fillRect(0, 0, size, size)
      context.imageSmoothingEnabled = true; context.imageSmoothingQuality = 'high'
      context.drawImage(bitmap, startX, startY, side, side, 0, 0, size, size)
      for (const quality of [.88, .76, .64, .5, .36]) {
        const blob = await jpeg(canvas, quality)
        if (blob.size <= MAX_COVER_BYTES) {
          const name = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 60) || 'sonira-cover'
          return new File([blob], `${name}.cover.jpg`, { type: 'image/jpeg' })
        }
      }
    }
    throw new Error('This cover could not fit the 16 KiB limit. Choose a simpler image.')
  } finally {
    bitmap.close()
    canvas.width = 0; canvas.height = 0
  }
}
