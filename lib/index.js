/**
 * Host half of the dsh-web-background plugin.
 *
 * Registers the durable `web-background` settings namespace so the browser
 * half can persist the user's background and theme choices through the Host
 * settings document (`$DSH_HOME/settings.yaml`). The schema defaults double
 * as the "reset to defaults" target: the client resets by unsetting fields,
 * which re-inherits these defaults.
 *
 * Also serves the local video backgrounds: the browser half discovers the
 * available files through `GET /web-video-background/list` and streams the
 * selected one through `GET /web-video-background/video/<name>`.
 */
import { createReadStream } from 'node:fs'
import { readdir, stat, mkdir, writeFile, unlink } from 'node:fs/promises'
import { extname, basename, resolve, join } from 'node:path'
import z from '@deepseek-ai/schemastery'

/** Settings namespace owned by this plugin. */
export const BACKGROUND_NAMESPACE = 'web-background'

/** Accepted background kinds. */
export const BACKGROUND_MODES = ['color', 'gradient', 'image', 'video']

/** Accepted image fit modes. */
export const IMAGE_FITS = ['cover', 'contain', 'tile']

/** Root folder for user videos (auto-created on first list request). */
const HOME = process.env.DSH_HOME || 'C:/Users/admin/.dsh'
const VIDEO_DIR = join(HOME, 'background-videos')

/** Allowed video extensions (whitelist for both list and serve). */
const ALLOWED = new Set(['.mp4', '.webm', '.ogg', '.mov', '.m4v'])

/** Content-Type per extension. mp4/mov use the most broadly supported types. */
const MIME = {
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.ogg': 'video/ogg',
  '.mov': 'video/quicktime',
  '.m4v': 'video/mp4',
}

/** URL prefix for the video list/stream routes. */
const VIDEO_PREFIX = '/web-video-background'

/** Cap on uploaded video size (300 MB) to guard host memory. */
const MAX_UPLOAD_BYTES = 300 * 1024 * 1024

/**
 * Collect a raw request body up to `maxBytes`, rejecting (and destroying the
 * socket) if the cap is exceeded. Used by the upload route so a huge file
 * never buffers entirely in memory.
 */
function readBody(req, maxBytes) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > maxBytes) {
        reject(new Error('too_large'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

/** Resolve and validate a user-supplied file name (blocks path traversal). */
function safePath(name) {
  const safe = basename(name)
  const ext = extname(safe).toLowerCase()
  if (!ALLOWED.has(ext)) return null
  const full = resolve(VIDEO_DIR, safe)
  const base = resolve(VIDEO_DIR)
  const sep = process.platform === 'win32' ? '\\' : '/'
  if (full !== base && !full.startsWith(base + sep)) return null
  return full
}

/** Handle a request matched by the video prefix route. */
async function videoHandler(req, res) {
  try {
    const url = new URL(req.url || '/', 'http://localhost')
    const p = url.pathname

    // Directory listing of available videos.
    if (p === VIDEO_PREFIX + '/list') {
      let files = []
      try {
        await mkdir(VIDEO_DIR, { recursive: true })
        const ents = await readdir(VIDEO_DIR)
        files = ents.filter((f) => ALLOWED.has(extname(f).toLowerCase()))
      } catch {
        files = []
      }
      res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify(files))
      return
    }

    // Receive an uploaded video and persist it into the videos folder.
    if (p === VIDEO_PREFIX + '/upload') {
      if (req.method !== 'POST') {
        res.writeHead(405, { 'content-type': 'application/json; charset=utf-8' })
        res.end(JSON.stringify({ ok: false, error: 'method_not_allowed' }))
        return
      }
      const name = new URL(req.url || '/', 'http://localhost').searchParams.get('name') || ''
      const safe = basename(name)
      const ext = extname(safe).toLowerCase()
      if (safe === '' || !ALLOWED.has(ext)) {
        res.writeHead(400, { 'content-type': 'application/json; charset=utf-8' })
        res.end(JSON.stringify({ ok: false, error: 'bad_type' }))
        return
      }
      try {
        await mkdir(VIDEO_DIR, { recursive: true })
      } catch {
        // directory may already exist; resolve() below still validates the target
      }
      let buf
      try {
        buf = await readBody(req, MAX_UPLOAD_BYTES)
      } catch {
        res.writeHead(413, { 'content-type': 'application/json; charset=utf-8' })
        res.end(JSON.stringify({ ok: false, error: 'too_large' }))
        return
      }
      const full = resolve(VIDEO_DIR, safe)
      const base = resolve(VIDEO_DIR)
      const sep = process.platform === 'win32' ? '\\' : '/'
      if (full !== base && !full.startsWith(base + sep)) {
        res.writeHead(403, { 'content-type': 'application/json; charset=utf-8' })
        res.end(JSON.stringify({ ok: false, error: 'forbidden' }))
        return
      }
      await writeFile(full, buf)
      res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify({ ok: true, name: safe }))
      return
    }

    // Remove an uploaded video from the videos folder.
    if (p === VIDEO_PREFIX + '/delete') {
      if (req.method !== 'DELETE') {
        res.writeHead(405, { 'content-type': 'application/json; charset=utf-8' })
        res.end(JSON.stringify({ ok: false, error: 'method_not_allowed' }))
        return
      }
      const name = new URL(req.url || '/', 'http://localhost').searchParams.get('name') || ''
      const safe = basename(name)
      const ext = extname(safe).toLowerCase()
      if (safe === '' || !ALLOWED.has(ext)) {
        res.writeHead(400, { 'content-type': 'application/json; charset=utf-8' })
        res.end(JSON.stringify({ ok: false, error: 'bad_type' }))
        return
      }
      const full = resolve(VIDEO_DIR, safe)
      const base = resolve(VIDEO_DIR)
      const sep = process.platform === 'win32' ? '\\' : '/'
      if (full !== base && !full.startsWith(base + sep)) {
        res.writeHead(403, { 'content-type': 'application/json; charset=utf-8' })
        res.end(JSON.stringify({ ok: false, error: 'forbidden' }))
        return
      }
      try {
        await unlink(full)
      } catch {
        // Missing is treated as success so the client can still reconcile its list.
      }
      res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify({ ok: true, name: safe }))
      return
    }

    // Stream a single video file.
    if (p.startsWith(VIDEO_PREFIX + '/video/')) {
      const name = decodeURIComponent(p.slice((VIDEO_PREFIX + '/video/').length))
      const full = safePath(name)
      if (full === null) {
        res.writeHead(403)
        res.end('forbidden')
        return
      }
      try {
        const st = await stat(full)
        if (!st.isFile()) {
          res.writeHead(404)
          res.end('not found')
          return
        }
        res.writeHead(200, {
          'content-type': MIME[extname(full).toLowerCase()] || 'application/octet-stream',
          'content-length': st.size,
          'cache-control': 'no-cache',
          'accept-ranges': 'bytes',
        })
        createReadStream(full).pipe(res)
      } catch {
        res.writeHead(404)
        res.end('not found')
      }
      return
    }

    res.writeHead(404)
    res.end('not found')
  } catch {
    if (!res.headersSent) res.writeHead(500)
    res.end('error')
  }
}

/**
 * Durable background + theme section schema. Every field carries a default
 * so an empty user section still resolves to a complete, valid value on both
 * the Host (resolution) and the browser (wire validation) side. Theme color
 * fields default to '' meaning "leave the theme default" (not overridden).
 */
export const BackgroundSettingsSchema = z.object({
  /** Master switch. Off = the stock theme surface stays untouched. */
  enabled: z.boolean().default(false),
  /** Background kind selected in the settings page. */
  mode: z.union(BACKGROUND_MODES).default('color'),
  /** Solid color for the light palette. */
  colorLight: z.string().default('#f5f6f8'),
  /** Solid color for the dark palette. */
  colorDark: z.string().default('#0e1116'),
  /** Deprecated free-text gradient field — kept so stored sections keep validating; unused by the UI. */
  gradientLight: z.string().default('linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'),
  /** Deprecated free-text gradient field (see gradientLight). */
  gradientDark: z.string().default('linear-gradient(135deg, #0f2027 0%, #2c5364 100%)'),
  /** Gradient direction in degrees (0 = up, 90 = right). */
  gradientAngle: z.number().min(0).max(360).default(135),
  /** Gradient start color for the light palette. */
  gradientLightStart: z.string().default('#f5f7fa'),
  /** Gradient end color for the light palette. */
  gradientLightEnd: z.string().default('#c3cfe2'),
  /** Gradient start color for the dark palette. */
  gradientDarkStart: z.string().default('#0f2027'),
  /** Gradient end color for the dark palette. */
  gradientDarkEnd: z.string().default('#2c5364'),
  /** http(s) URL or data URL of the background image. */
  imageUrl: z.string().default(''),
  /** How the image fills the surface. */
  imageFit: z.union(IMAGE_FITS).default('cover'),
  /** Translucent black overlay over the image (percent, 0-80) for readability. */
  imageOverlay: z.number().min(0).max(80).default(0),
  /** Apply the background to the sidebar fill token as well. */
  applyToSidebar: z.boolean().default(false),
  /** Selected background video file name (empty = auto-pick the first available). */
  videoFile: z.string().default(''),
  /** Translucent black overlay over the video (percent, 0-80) for readability. */
  videoOverlay: z.number().min(0).max(80).default(35),
  /** Master switch for theme-color customization. */
  themeEnabled: z.boolean().default(false),
  /** Brand/accent color for the light palette. Empty = leave the theme default. */
  brandLight: z.string().default(''),
  /** Brand/accent color for the dark palette. Empty = leave the theme default. */
  brandDark: z.string().default(''),
  /** Primary text color for the light palette. Empty = leave the theme default. */
  labelPrimaryLight: z.string().default(''),
  /** Primary text color for the dark palette. Empty = leave the theme default. */
  labelPrimaryDark: z.string().default(''),
  /** Secondary text color for the light palette. Empty = leave the theme default. */
  labelSecondaryLight: z.string().default(''),
  /** Secondary text color for the dark palette. Empty = leave the theme default. */
  labelSecondaryDark: z.string().default(''),
  /** Raised surface color for the light palette. Empty = leave the theme default. */
  surfaceLight: z.string().default(''),
  /** Raised surface color for the dark palette. Empty = leave the theme default. */
  surfaceDark: z.string().default(''),
  /** Border color for the light palette. Empty = leave the theme default. */
  borderLight: z.string().default(''),
  /** Border color for the dark palette. Empty = leave the theme default. */
  borderDark: z.string().default(''),
})

/**
 * Host plugin body: register the durable settings section and the video
 * routes when the corresponding services are composed. Without a settings
 * provider the plugin is a no-op — the browser half degrades to defaults.
 * @param ctx - Host Cordis context.
 */
export function apply(ctx) {
  ctx.inject(['settings', 'webServer'], (hostCtx) => {
    hostCtx.settings.register(BACKGROUND_NAMESPACE, BackgroundSettingsSchema)
    hostCtx.effect(() => {
      const dispose = hostCtx.webServer.register({ kind: 'prefix', path: VIDEO_PREFIX, handler: videoHandler })
      return dispose
    })
  })
}
