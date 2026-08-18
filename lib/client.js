window.__ModuleLoader__.load({
	id: "dsh-web-background",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		const React = require("react");
		const { jsx, jsxs, Fragment } = require("react/jsx-runtime");

		// ── constants ────────────────────────────────────────────────────────────

		/** Host settings namespace owned by this plugin (see lib/index.js). */
		const NAMESPACE = "web-background";
		/** Locale namespace owning this feature's settings-page copy. */
		const LOCALE_NS = "settings.web-background";
		/** Theme token backing the app frame / conversation surface. */
		const TOKEN_BG_BASE = "--dsw-alias-bg-base";
		/** Theme token backing the sidebar fill. */
		const TOKEN_SIDEBAR = "--dsw-specific-sidebar-fill";
		/** Theme tokens exposed by the theme-color customization section. */
		const TOKEN_BRAND = "--dsw-alias-brand-primary";
		const TOKEN_LABEL_PRIMARY = "--dsw-alias-label-primary";
		const TOKEN_LABEL_SECONDARY = "--dsw-alias-label-secondary";
		const TOKEN_SURFACE = "--dsw-alias-bg-layer-1";
		const TOKEN_BORDER = "--dsw-alias-border-l2";
		/** Video background routes served by the host half (see lib/index.js). */
		const VIDEO_LIST_URL = "/web-video-background/list";
		const VIDEO_URL_PREFIX = "/web-video-background/video/";
		const VIDEO_UPLOAD_URL = "/web-video-background/upload";
		const VIDEO_DELETE_URL = "/web-video-background/delete";
		/** Extensions the host accepts for an uploaded video. */
		const UPLOAD_ALLOWED = [".mp4", ".webm", ".ogg", ".mov", ".m4v"];
		/** Client-side guard matching the host's 300 MB cap. */
		const MAX_UPLOAD_BYTES = 300 * 1024 * 1024;
		/** How long a fetched video list stays valid before a re-fetch. */
		const VIDEO_LIST_TTL_MS = 30_000;
		/** Override-layer identity (one layer per source; re-overrides replace it). */
		const OVERRIDE_SOURCE = "dsh-web-background";
		/** Local-import size cap: settings persist to a local config file, so keep the embedded data URL modest. */
		const MAX_IMPORT_BYTES = 1024 * 1024;
		/** Persist coalescing window: rapid changes apply instantly and are flushed together once idle. */
		const DEBOUNCE_MS = 250;
		/** Pending-edit marker meaning "unset this field" (restore the schema default). */
		const UNSET = Symbol("unset");
		/** Fields a "reset to defaults" unset restores to their schema defaults. */
		const RESET_FIELDS = [
			"enabled",
			"mode",
			"colorLight",
			"colorDark",
			"gradientAngle",
			"gradientLightStart",
			"gradientLightEnd",
			"gradientDarkStart",
			"gradientDarkEnd",
			"imageUrl",
			"imageFit",
			"imageOverlay",
			"applyToSidebar",
			"videoFile",
			"videoOverlay",
			"themeEnabled",
			"brandLight",
			"brandDark",
			"labelPrimaryLight",
			"labelPrimaryDark",
			"labelSecondaryLight",
			"labelSecondaryDark",
			"surfaceLight",
			"surfaceDark",
			"borderLight",
			"borderDark",
		];

		/** Fallbacks used while the settings scope has not delivered a value yet. */
		const DEFAULTS = {
			enabled: false,
			mode: "color",
			colorLight: "#f5f6f8",
			colorDark: "#0e1116",
			gradientAngle: 135,
			gradientLightStart: "#f5f7fa",
			gradientLightEnd: "#c3cfe2",
			gradientDarkStart: "#0f2027",
			gradientDarkEnd: "#2c5364",
			imageUrl: "",
			imageFit: "cover",
			imageOverlay: 0,
			applyToSidebar: false,
			videoFile: "",
			videoOverlay: 35,
			themeEnabled: false,
			brandLight: "",
			brandDark: "",
			labelPrimaryLight: "",
			labelPrimaryDark: "",
			labelSecondaryLight: "",
			labelSecondaryDark: "",
			surfaceLight: "",
			surfaceDark: "",
			borderLight: "",
			borderDark: "",
		};

		const GRADIENT_PRESETS = [
			{ id: "aurora", angle: 135, lightStart: "#f5f7fa", lightEnd: "#c3cfe2", darkStart: "#0f2027", darkEnd: "#2c5364" },
			{ id: "sunset", angle: 135, lightStart: "#ffecd2", lightEnd: "#fcb69f", darkStart: "#42275a", darkEnd: "#734b6d" },
			{ id: "ocean", angle: 180, lightStart: "#e0eafc", lightEnd: "#cfdef3", darkStart: "#141e30", darkEnd: "#243b55" },
			{ id: "forest", angle: 135, lightStart: "#dceee8", lightEnd: "#b7d8c9", darkStart: "#1a2a22", darkEnd: "#2f4f3f" },
		];

		const COLOR_PRESETS = [
			{ id: "mist", light: "#f5f6f8", dark: "#0e1116" },
			{ id: "cream", light: "#faf6ef", dark: "#1d1a14" },
			{ id: "slate", light: "#eef1f6", dark: "#0d1117" },
			{ id: "lavender", light: "#f3f0fa", dark: "#171325" },
		];

		// ── styles (injected once at materialization; claimed for HMR bookkeeping) ──

		const CSS = [
			".wb-root{display:flex;flex-direction:column;gap:16px;padding-bottom:4px}",
			".wb-card{display:flex;flex-direction:column;gap:12px;border:1px solid var(--dsw-alias-border-l2);border-radius:12px;padding:16px}",
			".wb-cardtitle{font-size:13px;font-weight:500;color:var(--dsw-alias-label-secondary)}",
			".wb-row{display:flex;align-items:center;justify-content:space-between;gap:12px}",
			".wb-label{font-size:13px;color:var(--dsw-alias-label-primary)}",
			".wb-hint{font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary)}",
			".wb-field{display:flex;flex-direction:column;gap:6px}",
			".wb-input,.wb-select{box-sizing:border-box;width:100%;height:32px;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l2);border-radius:8px;padding:0 10px;font-size:13px;outline:none}",
			".wb-input:focus,.wb-select:focus{border-color:var(--dsw-alias-state-business-primary)}",
			".wb-vselect{position:relative;width:100%}",
			".wb-vselect .wb-select{display:flex;align-items:center;justify-content:space-between;width:100%;text-align:left;background:#fff;color:#0f1116}",
			".wb-vselect-caret{margin-left:8px;font-size:10px;opacity:.55;flex:none}",
			".wb-vselect-menu{position:absolute;z-index:20;top:36px;left:0;right:0;background:#fff;color:#0f1116;border:1px solid #d0d4da;border-radius:8px;padding:4px;max-height:220px;overflow:auto;box-shadow:0 8px 24px rgba(0,0,0,.35)}",
			".wb-vselect-item{padding:6px 8px;border-radius:6px;font-size:13px;color:#0f1116;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
			".wb-vselect-item:hover{background:rgba(127,127,127,.18)}",
			".wb-vselect-item-active{background:#4084ff;color:#fff}",
			"@media (prefers-color-scheme: dark){.wb-vselect .wb-select{background:#1e2228;color:#e6e9ef;border-color:rgba(255,255,255,.16)}.wb-vselect-menu{background:#1e2228;color:#e6e9ef;border-color:rgba(255,255,255,.16)}.wb-vselect-item{color:#e6e9ef}}",
			"@media (prefers-color-scheme: light){.wb-vselect .wb-select{background:#fff;color:#0f1116;border-color:#d0d4da}.wb-vselect-menu{background:#fff;color:#0f1116}.wb-vselect-item{color:#0f1116}}",
			".wb-seg{display:flex;gap:6px}",
			".wb-segbtn{flex:1;height:32px;border:1px solid var(--dsw-alias-border-l2);background:transparent;color:var(--dsw-alias-label-secondary);border-radius:8px;font-size:13px;cursor:pointer}",
			".wb-segbtn:hover{background:var(--dsw-alias-interactive-bg-hover)}",
			".wb-segbtn-active{background:var(--dsw-alias-bg-base);border-color:var(--dsw-alias-state-business-primary);color:var(--dsw-alias-label-primary)}",
			".wb-segbtn:disabled,.wb-btn:disabled,.wb-chip:disabled{opacity:.45;cursor:default}",
			".wb-colorrow{display:flex;align-items:center;gap:10px}",
			".wb-pair{display:flex;gap:12px}",
			".wb-pair>*{flex:1}",
			".wb-colorinput{width:38px;height:28px;padding:0;border:1px solid var(--dsw-alias-border-l2);border-radius:6px;background:transparent;cursor:pointer}",
			".wb-chips{display:flex;flex-wrap:wrap;gap:6px}",
			".wb-chip{height:28px;padding:0 12px;border:1px solid var(--dsw-alias-border-l2);border-radius:999px;background:transparent;color:var(--dsw-alias-label-secondary);font-size:12px;cursor:pointer}",
			".wb-chip:hover{background:var(--dsw-alias-interactive-bg-hover)}",
			".wb-range{width:100%;accent-color:var(--dsw-alias-state-business-primary)}",
			".wb-preview{display:grid;grid-template-columns:1fr 1fr;gap:8px}",
			".wb-previewcell{height:64px;border-radius:10px;border:1px solid var(--dsw-alias-border-l2);display:flex;align-items:flex-end;padding:8px;overflow:hidden}",
			".wb-previewlabel{font-size:11px;color:#fff;background:rgba(0,0,0,.38);border-radius:6px;padding:2px 8px}",
			".wb-btn{height:30px;padding:0 12px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:transparent;color:var(--dsw-alias-label-secondary);font-size:13px;cursor:pointer}",
			".wb-btn:hover{background:var(--dsw-alias-interactive-bg-hover)}",
			".wb-btn-disabled{opacity:.45;cursor:default}",
			".wb-btn-danger{border-color:var(--dsw-alias-state-error-primary);color:var(--dsw-alias-state-error-primary)}",
			".wb-btn-danger:hover{background:var(--dsw-alias-state-error-primary);color:#fff}",
			".wb-switch{width:16px;height:16px;accent-color:var(--dsw-alias-state-business-primary)}",
			".wb-error{color:var(--dsw-alias-state-error-primary)}",
		].join("\n");
		const CSS_TAG_ID = "dsh-web-background/styles";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(CSS_TAG_ID) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.pluginCss = CSS_TAG_ID;
			tag.textContent = CSS;
			document.head.appendChild(tag);
		}

		// ── background value computation ──────────────────────────────────────────

		/** Merge a possibly-partial wire value over the defaults. */
		function effective(value) {
			if (typeof value !== "object" || value === null) return DEFAULTS;
			return Object.assign({}, DEFAULTS, value);
		}

		/** Clamp the overlay percent into [0, 80]. */
		function overlayOf(value) {
			const n = Number(value);
			if (!Number.isFinite(n)) return 0;
			return Math.max(0, Math.min(80, n));
		}

		/** Clamp the gradient angle into [0, 360] degrees. */
		function angleOf(value) {
			const n = Number(value);
			if (!Number.isFinite(n)) return 135;
			return Math.max(0, Math.min(360, n));
		}

		/**
		 * The CSS background value applied for one palette scheme. Color and
		 * gradient modes pass the value through; image mode composes an optional
		 * dimming gradient, the image layer (with fit), and the scheme's solid
		 * fallback color (visible while the image loads and for tiles).
		 */
		function schemeValue(settings, scheme) {
			const s = effective(settings);
			if (s.mode === "gradient") {
				const angle = angleOf(s.gradientAngle);
				return scheme === "light"
					? `linear-gradient(${angle}deg, ${s.gradientLightStart}, ${s.gradientLightEnd})`
					: `linear-gradient(${angle}deg, ${s.gradientDarkStart}, ${s.gradientDarkEnd})`;
			}
			if (s.mode === "image") {
				const base = scheme === "light" ? s.colorLight : s.colorDark;
				const url = String(s.imageUrl ?? "").trim();
				if (url === "") return base;
				const fit = s.imageFit === "tile" ? "repeat" : "center/" + s.imageFit + " no-repeat";
				const dim = overlayOf(s.imageOverlay);
				const overlay = dim > 0 ? `linear-gradient(rgba(0,0,0,${(dim / 100).toFixed(2)}),rgba(0,0,0,${(dim / 100).toFixed(2)})), ` : "";
				return `${overlay}url(${JSON.stringify(url)}) ${fit} ${base}`;
			}
			return scheme === "light" ? s.colorLight : s.colorDark;
		}

		/**
		 * Build the theme override layer for the current settings, or null when
		 * the master switch is off. Every token carries both palette modes as the
		 * theme runtime requires.
		 */
		function buildOverrides(value) {
			const s = effective(value);
			if (!s.enabled) return null;
			const overrides = {};
			if (s.mode === "video" || (s.mode === "image" && s.applyToSidebar)) {
				overrides[TOKEN_BG_BASE] = { light: "transparent", dark: "transparent" };
				if (s.applyToSidebar) overrides[TOKEN_SIDEBAR] = { light: "transparent", dark: "transparent" };
			} else {
				overrides[TOKEN_BG_BASE] = { light: schemeValue(s, "light"), dark: schemeValue(s, "dark") };
				if (s.applyToSidebar) overrides[TOKEN_SIDEBAR] = { light: schemeValue(s, "light"), dark: schemeValue(s, "dark") };
			}
			if (s.themeEnabled) {
				const pairs = [
					[TOKEN_BRAND, s.brandLight, s.brandDark],
					[TOKEN_LABEL_PRIMARY, s.labelPrimaryLight, s.labelPrimaryDark],
					[TOKEN_LABEL_SECONDARY, s.labelSecondaryLight, s.labelSecondaryDark],
					[TOKEN_SURFACE, s.surfaceLight, s.surfaceDark],
					[TOKEN_BORDER, s.borderLight, s.borderDark],
				];
				for (const [token, light, dark] of pairs) {
					if (typeof light === "string" && light !== "" && typeof dark === "string" && dark !== "") {
						overrides[token] = { light, dark };
					}
				}
			}
			return overrides;
		}

		// ── video background DOM sync ────────────────────────────────────────────
		//
		// The video layer is a fixed full-screen <video> at z-index:-9999 with a
		// legibility overlay above it (z-index:-9998), both below the app UI. The
		// page background is forced transparent (with !important) ONLY while video
		// mode is active so the layer shows through; leaving video mode removes
		// both the elements and the forced styles so color/gradient/image modes
		// keep painting through the theme token.

		/** Cache of the video list (array of file names), refreshed on TTL expiry. */
		let videoListCache = null;
		let videoListFetchedAt = 0;
		/** The <video> file name currently mounted ('' = none). */
		let mountedVideoFile = "";

		function removeVideoBackground() {
			const v = document.getElementById("dsh-video-bg");
			const o = document.getElementById("dsh-video-bg-overlay");
			if (v !== null) v.remove();
			if (o !== null) o.remove();
			mountedVideoFile = "";
		}

		function injectForcedStyles() {
			if (document.getElementById("dsh-video-bg-fix") !== null) return;
			const fix = document.createElement("style");
			fix.id = "dsh-video-bg-fix";
			fix.textContent =
				"html,body{background:transparent!important}" +
				":root{--dsw-alias-bg-base:transparent!important}" +
				".pI_x6G_frame{background:transparent!important}";
			document.head.appendChild(fix);
		}

		function removeForcedStyles() {
			const fix = document.getElementById("dsh-video-bg-fix");
			if (fix !== null) fix.remove();
		}

		async function fetchVideoList(force) {
			const now = Date.now();
			if (!force && videoListCache !== null && now - videoListFetchedAt < VIDEO_LIST_TTL_MS) return videoListCache;
			try {
				const res = await fetch(VIDEO_LIST_URL, { cache: "no-store" });
				if (res.ok) {
					const files = await res.json();
					videoListCache = Array.isArray(files) ? files : [];
					videoListFetchedAt = now;
				}
			} catch {
				videoListCache = videoListCache !== null ? videoListCache : [];
				videoListFetchedAt = now;
			}
			return videoListCache;
		}

		/** Mount (or update) the video layer to match the current settings. */
		async function syncVideoBackground(value) {
			const s = effective(value);
			const active = s.enabled === true && s.mode === "video";
			if (!active) {
				removeVideoBackground();
				removeForcedStyles();
				return;
			}
			injectForcedStyles();
			const files = await fetchVideoList(false);
			const target = typeof s.videoFile === "string" && s.videoFile !== ""
				? s.videoFile
				: files.length > 0 ? files[0] : "";
			if (target === "") {
				removeVideoBackground();
				return;
			}
			const alpha = overlayOf(s.videoOverlay) / 100;
			let video = document.getElementById("dsh-video-bg");
			let overlay = document.getElementById("dsh-video-bg-overlay");
			if (mountedVideoFile !== target) {
				if (video !== null) video.remove();
				video = document.createElement("video");
				video.id = "dsh-video-bg";
				video.src = VIDEO_URL_PREFIX + encodeURIComponent(target);
				video.autoplay = true;
				video.loop = true;
				video.muted = true;
				video.playsInline = true;
				video.volume = 0;
				video.setAttribute("muted", "");
				video.setAttribute("playsinline", "");
				video.setAttribute("autoplay", "");
				video.style.cssText =
					"position:fixed;inset:0;width:100%;height:100%;object-fit:cover;" +
					"z-index:-9999;pointer-events:none;background:#000";
				document.body.appendChild(video);
				mountedVideoFile = target;
				video.play().catch(function () {});
			}
			if (overlay === null) {
				overlay = document.createElement("div");
				overlay.id = "dsh-video-bg-overlay";
				overlay.style.cssText =
					"position:fixed;inset:0;background:rgba(0,0,0," + alpha.toFixed(2) + ");" +
					"z-index:-9998;pointer-events:none";
				document.body.appendChild(overlay);
			} else {
				overlay.style.background = "rgba(0,0,0," + alpha.toFixed(2) + ")";
			}
		}

		// ── image background DOM sync (whole-window when sidebar is applied) ───────
		//
		// When "apply to sidebar" is checked for an image, we do NOT paint the image
		// separately into the main area and the sidebar (that looks like two images).
		// Instead we put a single fixed full-screen layer behind both and make the
		// app surfaces transparent so the same image spans the whole window.

		let mountedImageUrl = "";

		function removeImageBackground() {
			const img = document.getElementById("dsh-image-bg");
			const ovl = document.getElementById("dsh-image-bg-overlay");
			if (img !== null) img.remove();
			if (ovl !== null) ovl.remove();
			mountedImageUrl = "";
		}

		function syncImageBackground(value) {
			const s = effective(value);
			const active = s.enabled === true && s.mode === "image" && s.applyToSidebar === true;
			if (!active) {
				removeImageBackground();
				return;
			}
			injectForcedStyles();
			const url = String(s.imageUrl ?? "").trim();
			if (url === "") {
				removeImageBackground();
				return;
			}
			const alpha = overlayOf(s.imageOverlay) / 100;
			const isDark = document.body && document.body.getAttribute("data-ds-dark-theme") === "true";
			const fallback = isDark ? s.colorDark : s.colorLight;
			let img = document.getElementById("dsh-image-bg");
			let overlay = document.getElementById("dsh-image-bg-overlay");
			if (img === null) {
				img = document.createElement("div");
				img.id = "dsh-image-bg";
				img.style.cssText =
					"position:fixed;inset:0;width:100%;height:100%;z-index:-9999;pointer-events:none;" +
					"background-position:center center;";
				document.body.appendChild(img);
			}
			if (mountedImageUrl !== url) {
				img.style.backgroundImage = "url(" + JSON.stringify(url) + ")";
				mountedImageUrl = url;
			}
			const fit = s.imageFit;
			if (fit === "tile") {
				img.style.backgroundSize = "auto";
				img.style.backgroundRepeat = "repeat";
			} else {
				img.style.backgroundSize = fit;
				img.style.backgroundRepeat = "no-repeat";
			}
			img.style.backgroundColor = fallback;
			if (overlay === null) {
				overlay = document.createElement("div");
				overlay.id = "dsh-image-bg-overlay";
				overlay.style.cssText =
					"position:fixed;inset:0;z-index:-9998;pointer-events:none;" +
					"background:rgba(0,0,0," + alpha.toFixed(2) + ")";
				document.body.appendChild(overlay);
			} else {
				overlay.style.background = "rgba(0,0,0," + alpha.toFixed(2) + ")";
			}
		}

		// ── optimistic local state ───────────────────────────────────────────────
		//
		// Every control change applies locally and synchronously (UI + theme),
		// then persists through the settings scope in debounced, coalesced
		// flushes. Persisted snapshots are adopted only while no local edit is
		// in flight, so a slow settings round-trip can never fight the UI.

		/** The bound settings scope, assigned in apply() before any render. */
		let scope = null;
		/** Optimistic merged value; null until the first persisted snapshot arrives. */
		let optimistic = null;
		/** Stable uSES snapshot wrapping {@link optimistic}. */
		let optimisticSnapshot = { value: null };
		const localListeners = new Set();
		/** Fields edited locally but not yet flushed/accepted: field → value | UNSET. */
		let pendingFields = new Map();
		/** Bumped on every local edit; a flush only adopts persisted state when it is still the newest. */
		let generation = 0;
		let flushActive = false;
		let flushTimer = null;
		let flushChain = Promise.resolve();

		function publishLocal() {
			optimisticSnapshot = { value: optimistic };
			for (const fn of localListeners) fn();
		}
		function subscribeLocal(fn) {
			localListeners.add(fn);
			return () => localListeners.delete(fn);
		}
		function getLocalSnapshot() {
			return optimisticSnapshot;
		}
		function optimisticValue() {
			return effective(optimistic);
		}

		/** Adopt the persisted value only when no local edit is outstanding. */
		function onScopeSnapshot() {
			const persisted = scope.getSnapshot().value;
			if (persisted === undefined) return;
			if (flushActive || pendingFields.size > 0) return;
			optimistic = persisted;
			publishLocal();
		}

		/** Apply one or more field edits instantly and schedule a coalesced persist. */
		function applyLocalChange(patch) {
			optimistic = Object.assign({}, optimisticValue(), patch);
			for (const key of Object.keys(patch)) pendingFields.set(key, patch[key]);
			generation += 1;
			publishLocal();
			if (flushTimer !== null) clearTimeout(flushTimer);
			flushTimer = setTimeout(flush, DEBOUNCE_MS);
		}

		/** Instantly restore every field to its schema default and persist the reset. */
		function applyLocalReset() {
			optimistic = Object.assign({}, DEFAULTS);
			for (const field of RESET_FIELDS) pendingFields.set(field, UNSET);
			generation += 1;
			publishLocal();
			if (flushTimer !== null) clearTimeout(flushTimer);
			flushTimer = setTimeout(flush, DEBOUNCE_MS);
		}

		/**
		 * Persist everything pending in one serialized pass (one write per
		 * field, coalesced by the debounce). Returns the settle chain so tests
		 * can await it.
		 */
		function flush() {
			if (flushTimer !== null) {
				clearTimeout(flushTimer);
				flushTimer = null;
			}
			const gen = generation;
			const entries = [...pendingFields.entries()];
			pendingFields.clear();
			if (entries.length === 0) return flushChain;
			flushActive = true;
			flushChain = flushChain.then(async () => {
				for (const [field, value] of entries) {
					try {
						if (value === UNSET) await scope.unset(field);
						else await scope.set(field, value);
					} catch {
						// the scope reloads itself on failed writes; the next snapshot reconciles
					}
				}
			}).then(() => {
				// Keep the locally-written optimistic value authoritative. The
				// dsh settings scope snapshot can lag our write (a read race),
				// so re-adopting it here would revert the edit we just applied.
				// External edits are still reconciled by onScopeSnapshot, which
				// fires when the scope changes while no flush is active.
				flushActive = false;
			}).catch(() => {
				flushActive = false;
			});
			return flushChain;
		}

		// ── theme application (coalesced to one per animation frame) ─────────────
		//
		// overrideTokens → snapshot recompose → presenter DOM writes + forced
		// layout is the expensive path; dragging a slider emits far more events
		// than frames, so applications coalesce to at most one per frame while
		// the UI readouts still update per event.

		/** The theme service, captured at apply() time. */
		let themeService = null;
		/** Disposer of the currently applied override layer (null while none). */
		let disposeLayer = null;
		let themeSyncPending = false;
		let themeSyncTimer = null;

		/** Apply the override layer for the current optimistic value. */
		function applyThemeLayer() {
			const overrides = buildOverrides(optimistic);
			if (disposeLayer !== null) {
				disposeLayer();
				disposeLayer = null;
			}
			if (overrides !== null && themeService !== null) disposeLayer = themeService.overrideTokens(OVERRIDE_SOURCE, overrides);
			syncVideoBackground(optimistic);
			syncImageBackground(optimistic);
		}

		/** Coalesce theme applications to at most one per animation frame. */
		function scheduleThemeSync() {
			if (themeSyncPending) return;
			themeSyncPending = true;
			const raf = typeof requestAnimationFrame === "function" ? requestAnimationFrame : (fn) => setTimeout(fn, 0);
			themeSyncTimer = raf(() => {
				themeSyncPending = false;
				themeSyncTimer = null;
				applyThemeLayer();
			});
		}

		/** Cancel a pending coalesced application and apply now (tests; disposal). */
		function syncNow() {
			if (themeSyncTimer !== null) {
				const cancel = typeof cancelAnimationFrame === "function" ? cancelAnimationFrame : clearTimeout;
				cancel(themeSyncTimer);
				themeSyncTimer = null;
			}
			themeSyncPending = false;
			applyThemeLayer();
		}

		// ── settings page UI ──────────────────────────────────────────────────────

		function useScopeSnapshot() {
			return React.useSyncExternalStore(
				(subscribe) => scope.subscribe(subscribe),
				() => scope.getSnapshot(),
				() => scope.getSnapshot(),
			);
		}

		/** The optimistic value driving every control, preview, and the theme layer. */
		function useLocalValue() {
			const snap = React.useSyncExternalStore(subscribeLocal, getLocalSnapshot, getLocalSnapshot);
			return snap.value;
		}

		/** Normalize a stored color to something <input type=color> accepts. */
		function normalizeColor(color) {
			if (typeof color === "string" && /^#[0-9a-fA-F]{6}$/.test(color)) return color;
			return "#888888";
		}

		/** Whether the stored image reference is an embedded data URL (locally imported file). */
		function isDataUrl(url) {
			return typeof url === "string" && url.startsWith("data:");
		}

		/** Rough decoded size of a base64 data URL, in KiB. */
		function dataUrlKib(url) {
			const payload = String(url).slice(String(url).indexOf(",") + 1);
			return Math.round((payload.length * 3) / 4 / 1024);
		}

		function TextField({ label, hint, value, onCommit, placeholder, readOnly }) {
			const [draft, setDraft] = React.useState(value);
			React.useEffect(() => {
				setDraft(value);
			}, [value]);
			return jsxs("label", {
				className: "wb-field",
				children: [
					jsx("span", { className: "wb-label", children: label }),
					jsx("input", {
						className: "wb-input",
						type: "text",
						value: draft,
						placeholder,
						disabled: readOnly,
						onChange: (e) => setDraft(e.target.value),
						onBlur: () => {
							if (draft !== value) onCommit(draft);
						},
						onKeyDown: (e) => {
							if (e.key === "Enter") e.target.blur();
						},
					}),
					hint !== undefined ? jsx("span", { className: "wb-hint", children: hint }) : null,
				],
			});
		}

		function ColorField({ label, value, onCommit, readOnly }) {
			return jsxs("label", {
				className: "wb-field",
				children: [
					jsx("span", { className: "wb-label", children: label }),
					jsxs("span", {
						className: "wb-colorrow",
						children: [
							jsx("input", {
								className: "wb-colorinput",
								type: "color",
								value: normalizeColor(value),
								disabled: readOnly,
								onChange: (e) => onCommit(e.target.value),
							}),
							jsx("span", { className: "wb-hint", children: String(value) }),
						],
					}),
				],
			});
		}

		/**
		 * Local image import: pick a file, validate type/size, read it as a data
		 * URL, and hand the result back for persistence. Oversized files are
		 * rejected with a hint to use a hosted URL instead.
		 */
		function ImageImport({ t, onImported, readOnly }) {
			const inputRef = React.useRef(null);
			const [error, setError] = React.useState(null);
			const onChange = (e) => {
				const file = e.target.files !== null && e.target.files.length > 0 ? e.target.files[0] : null;
				e.target.value = "";
				if (file === null) return;
				if (!file.type.startsWith("image/")) {
					setError(t("importNotImage"));
					return;
				}
				if (file.size > MAX_IMPORT_BYTES) {
					setError(t("importTooLarge"));
					return;
				}
				const reader = new FileReader();
				reader.onload = () => {
					if (typeof reader.result === "string") onImported(reader.result);
				};
				reader.onerror = () => setError(t("importFailed"));
				reader.readAsDataURL(file);
			};
			return jsxs("div", {
				className: "wb-field",
				children: [
					jsx("label", { className: "wb-btn" + (readOnly ? " wb-btn-disabled" : ""), style: { display: "block", textAlign: "center", cursor: readOnly ? "default" : "pointer" }, children: [
						t("importLocal"),
						jsx("input", { ref: inputRef, type: "file", accept: "image/*", disabled: readOnly, style: { display: "none" }, onChange }),
					] }),
					error !== null ? jsx("span", { className: "wb-hint wb-error", children: error }) : null,
				],
			});
		}

		function Segmented({ options, active, onSelect, readOnly }) {
			return jsx("div", {
				className: "wb-seg",
				role: "tablist",
				children: options.map(([id, label]) =>
					jsx(
						"button",
						{
							type: "button",
							className: active === id ? "wb-segbtn wb-segbtn-active" : "wb-segbtn",
							"aria-pressed": active === id,
							disabled: readOnly,
							onClick: () => onSelect(id),
							children: label,
						},
						id,
					),
				),
			});
		}

		/** Custom dropdown for picking a video file. We avoid the native <select> because its option list is painted by the OS and ignores page CSS (white-on-white in dark theme). */
		function VideoSelect({ t, files, selected, readOnly, onSelect, setSelected }) {
			const [open, setOpen] = React.useState(false);
			const wrapRef = React.useRef(null);
			React.useEffect(() => {
				if (!open) return;
				const onDoc = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
				document.addEventListener("mousedown", onDoc);
				return () => document.removeEventListener("mousedown", onDoc);
			}, [open]);
			const current = files.includes(selected) ? selected : "";
			const choose = (v) => { onSelect(v); setSelected(v); setOpen(false); };
			return jsxs("div", {
				ref: wrapRef,
				className: "wb-vselect",
				children: [
					jsxs("button", { type: "button", className: "wb-select", disabled: readOnly, onClick: () => setOpen((o) => !o), children: [
						jsx("span", { className: "wb-vselect-label", children: current === "" ? t("videoAuto") : current }),
						jsx("span", { className: "wb-vselect-caret", children: open ? "▲" : "▼" }),
					] }),
					open ? jsxs("div", { className: "wb-vselect-menu", children: [
						jsx("div", { key: "", className: "wb-vselect-item" + (current === "" ? " wb-vselect-item-active" : ""), onClick: () => choose(""), children: t("videoAuto") }),
						files.map((f) => jsx("div", { key: f, className: "wb-vselect-item" + (current === f ? " wb-vselect-item-active" : ""), onClick: () => choose(f), children: f })),
					] }) : null,
				],
			});
		}

		function VideoPicker({ t, value, onSelect, readOnly }) {
			const [files, setFiles] = React.useState(null);
			const [error, setError] = React.useState(false);
			const [uploadError, setUploadError] = React.useState(null);
			const [uploading, setUploading] = React.useState(false);
		const inputRef = React.useRef(null);
		/** Local mirror of the chosen file so the dropdown reflects uploads/deletes immediately, independent of the parent's optimistic re-render. */
		const [selected, setSelected] = React.useState(value);
		React.useEffect(() => { setSelected(value); }, [value]);
	const refresh = React.useCallback((selectName) => {
			setError(false);
			fetchVideoList(true).then((list) => {
				setFiles(list);
				if (selectName !== undefined && list.includes(selectName)) {
					onSelect(selectName);
				} else if (list.length > 0 && !list.includes(value)) {
					onSelect(list[0]);
				}
			}).catch(() => setError(true));
		}, [onSelect, value]);
			React.useEffect(() => {
				fetchVideoList(false).then((list) => {
					setFiles(list);
					if (list.length > 0 && !list.includes(value)) onSelect(list[0]);
				}).catch(() => setError(true));
				// eslint-disable-next-line react-hooks/exhaustive-deps
			}, []);
			const onUploadChange = (e) => {
				const file = e.target.files !== null && e.target.files.length > 0 ? e.target.files[0] : null;
				e.target.value = "";
				if (file === null) return;
				const ext = "." + (file.name.split(".").pop() || "").toLowerCase();
				if (!UPLOAD_ALLOWED.includes(ext)) {
					setUploadError(t("videoImportBadType"));
					return;
				}
				if (file.size > MAX_UPLOAD_BYTES) {
					setUploadError(t("videoImportTooLarge"));
					return;
				}
				setUploading(true);
				setUploadError(null);
				file.arrayBuffer().then((buf) => {
					return fetch(VIDEO_UPLOAD_URL + "?name=" + encodeURIComponent(file.name), {
						method: "POST",
						headers: { "content-type": "application/octet-stream" },
						body: buf,
					});
				}).then(async (res) => {
				const data = await res.json().catch(() => ({}));
				if (!res.ok || !data.ok) {
					setUploadError(t("videoImportFailed"));
					return;
				}
				const picked = data && data.name ? data.name : file.name;
				setSelected(picked);
				refresh(picked);
			}).catch(() => {
					setUploadError(t("videoImportFailed"));
				}).finally(() => {
					setUploading(false);
				});
			};
			/** Delete the currently selected video file from the host folder. */
			const deleteVideo = (name) => {
				if (name === "" || uploading) return;
				setUploadError(null);
				fetch(VIDEO_DELETE_URL + "?name=" + encodeURIComponent(name), { method: "DELETE" })
					.then(async (res) => {
						const data = await res.json().catch(() => ({}));
						if (!res.ok || !data.ok) {
							setUploadError(t("videoDeleteFailed"));
							return;
						}
											videoListCache = null;
					const list = await fetchVideoList(true);
					setFiles(list);
					if (selected === name || !list.includes(selected)) { onSelect(""); setSelected(""); }
					})
					.catch(() => {
						setUploadError(t("videoDeleteFailed"));
					});
			};
			/** The shared upload control (label styled as a button + hidden input + error line). */
			const uploadControl = jsxs("div", {
				className: "wb-field",
				children: [
					jsx("label", { className: "wb-btn" + (readOnly || uploading ? " wb-btn-disabled" : ""), style: { display: "block", textAlign: "center", cursor: readOnly || uploading ? "default" : "pointer" }, children: [
						uploading ? t("videoUploading") : t("videoImportLocal"),
						jsx("input", { ref: inputRef, type: "file", accept: "video/*", disabled: readOnly || uploading, style: { display: "none" }, onChange: onUploadChange }),
					] }),
					uploadError !== null ? jsx("span", { className: "wb-hint wb-error", children: uploadError }) : null,
				],
			});
			if (error) {
				return jsxs("div", { className: "wb-field", children: [
					jsx("span", { className: "wb-hint wb-error", children: t("videoListError") }),
					jsx("button", { type: "button", className: "wb-btn", disabled: readOnly, onClick: refresh, children: t("videoRefresh") }),
				] });
			}
			if (files === null) {
				return jsx("span", { className: "wb-hint", children: t("videoLoading") });
			}
			if (files.length === 0) {
				return jsxs("div", { className: "wb-field", children: [
					jsx("span", { className: "wb-hint", children: t("videoEmpty") }),
					uploadControl,
					jsx("button", { type: "button", className: "wb-btn", disabled: readOnly, onClick: refresh, children: t("videoRefresh") }),
				] });
			}
			return jsxs("div", {
				className: "wb-field",
				children: [
					jsxs("label", {
						className: "wb-field",
						children: [
						jsx("span", { className: "wb-label", children: t("videoFile") }),
						jsx(VideoSelect, { t, files, selected, readOnly, onSelect, setSelected }),
						],
					}),
					uploadControl,
					jsx("button", { type: "button", className: "wb-btn", disabled: readOnly, onClick: refresh, children: t("videoRefresh") }),
					jsx("button", { type: "button", className: "wb-btn wb-btn-danger", disabled: readOnly || selected === "", onClick: () => deleteVideo(selected), children: t("videoDelete") }),
				],
			});
		}

		function PreviewCard({ t, value }) {
			const s = effective(value);
			const lightBg = s.mode === "video" ? "rgba(0,0,0,0.15)" : schemeValue(s, "light");
			const darkBg = s.mode === "video" ? "rgba(0,0,0,0.35)" : schemeValue(s, "dark");
			return jsxs("div", {
				className: "wb-card",
				children: [
					jsx("div", { className: "wb-cardtitle", children: t("preview") }),
					jsxs("div", {
						className: "wb-preview",
						children: [
							jsxs("div", { className: "wb-previewcell", style: { background: lightBg }, children: [
								jsx("span", { className: "wb-previewlabel", children: t("schemeLight") }),
							] }),
							jsxs("div", { className: "wb-previewcell", style: { background: darkBg }, children: [
								jsx("span", { className: "wb-previewlabel", children: t("schemeDark") }),
							] }),
						],
					}),
				],
			});
		}

		/**
		 * The Background settings page, registered into `settings.section`.
		 * Every control edits the optimistic local value (instant) and persists
		 * through a debounced flush — one source of truth for presentation,
		 * with the Host document as the durable sink.
		 */
		function BackgroundSection({ t }) {
			const snap = useScopeSnapshot();
			const readOnly = snap.writable === false;
			const value = useLocalValue();
			if (value === null) {
				return jsx("div", { className: "wb-root", children: jsx("p", { className: "wb-hint", children: t("unavailable") }) });
			}
			const s = effective(value);
			const modeOptions = [
				["color", t("modeColor")],
				["gradient", t("modeGradient")],
				["image", t("modeImage")],
				["video", t("modeVideo")],
			];
			const fitOptions = [
				["cover", t("fitCover")],
				["contain", t("fitContain")],
				["tile", t("fitTile")],
			];
			return jsxs("div", {
				className: "wb-root",
				children: [
					jsxs("div", {
						className: "wb-card",
						children: [
							jsxs("label", {
								className: "wb-row",
								children: [
									jsx("span", { className: "wb-label", children: t("enable") }),
									jsx("input", {
										className: "wb-switch",
										type: "checkbox",
										checked: s.enabled === true,
										disabled: readOnly,
										onChange: (e) => applyLocalChange({ enabled: e.target.checked }),
									}),
								],
							}),
							readOnly ? jsx("span", { className: "wb-hint", children: t("memoryMode") }) : null,
						],
					}),
					jsxs("div", {
						className: "wb-card",
						children: [
							jsx("div", { className: "wb-cardtitle", children: t("mode") }),
							jsx(Segmented, { options: modeOptions, active: s.mode, readOnly, onSelect: (mode) => applyLocalChange({ mode }) }),
							s.mode === "color"
								? jsxs(Fragment, {
										children: [
											jsx(ColorField, { label: t("schemeLight"), value: s.colorLight, readOnly, onCommit: (v) => applyLocalChange({ colorLight: v }) }),
											jsx(ColorField, { label: t("schemeDark"), value: s.colorDark, readOnly, onCommit: (v) => applyLocalChange({ colorDark: v }) }),
											jsx("div", {
												className: "wb-chips",
												children: COLOR_PRESETS.map((p) =>
													jsx("button", {
														type: "button",
														className: "wb-chip",
														disabled: readOnly,
														onClick: () => applyLocalChange({ colorLight: p.light, colorDark: p.dark }),
														children: t("preset") + " · " + p.id,
													}, p.id),
												),
											}),
										],
									})
								: null,
							s.mode === "gradient"
								? jsxs(Fragment, {
										children: [
											jsx("div", { className: "wb-cardtitle", children: t("schemeLight") }),
											jsxs("div", {
												className: "wb-pair",
												children: [
													jsx(ColorField, { label: t("gradientStart"), value: s.gradientLightStart, readOnly, onCommit: (v) => applyLocalChange({ gradientLightStart: v }) }),
													jsx(ColorField, { label: t("gradientEnd"), value: s.gradientLightEnd, readOnly, onCommit: (v) => applyLocalChange({ gradientLightEnd: v }) }),
												],
											}),
											jsx("div", { className: "wb-cardtitle", children: t("schemeDark") }),
											jsxs("div", {
												className: "wb-pair",
												children: [
													jsx(ColorField, { label: t("gradientStart"), value: s.gradientDarkStart, readOnly, onCommit: (v) => applyLocalChange({ gradientDarkStart: v }) }),
													jsx(ColorField, { label: t("gradientEnd"), value: s.gradientDarkEnd, readOnly, onCommit: (v) => applyLocalChange({ gradientDarkEnd: v }) }),
												],
											}),
											jsxs("label", {
												className: "wb-field",
												children: [
													jsxs("span", {
														className: "wb-row",
														children: [
															jsx("span", { className: "wb-label", children: t("gradientAngle") }),
															jsx("span", { className: "wb-hint", children: String(angleOf(s.gradientAngle)) + "°" }),
														],
													}),
													jsx("input", {
														className: "wb-range",
														type: "range",
														min: 0,
														max: 360,
														step: 15,
														value: angleOf(s.gradientAngle),
														disabled: readOnly,
														onChange: (e) => applyLocalChange({ gradientAngle: Number(e.target.value) }),
													}),
												],
											}),
											jsx("div", {
												className: "wb-chips",
												children: GRADIENT_PRESETS.map((p) =>
													jsx("button", {
														type: "button",
														className: "wb-chip",
														disabled: readOnly,
														onClick: () => applyLocalChange({
															gradientAngle: p.angle,
															gradientLightStart: p.lightStart,
															gradientLightEnd: p.lightEnd,
															gradientDarkStart: p.darkStart,
															gradientDarkEnd: p.darkEnd,
														}),
														children: t("preset") + " · " + p.id,
													}, p.id),
												),
											}),
										],
									})
								: null,
							s.mode === "image"
								? jsxs(Fragment, {
										children: [
											isDataUrl(s.imageUrl)
												? jsxs("div", {
														className: "wb-field",
														children: [
															jsx("span", { className: "wb-label", children: t("imageUrl") }),
															jsxs("div", {
																className: "wb-row",
																children: [
																	jsx("span", { className: "wb-hint", children: t("imported") + " · " + dataUrlKib(s.imageUrl) + " KB" }),
																	jsx("button", { type: "button", className: "wb-btn", disabled: readOnly, onClick: () => applyLocalChange({ imageUrl: "" }), children: t("clear") }),
																],
															}),
														],
													})
												: jsx(TextField, { label: t("imageUrl"), hint: t("imageUrlHint"), value: s.imageUrl, readOnly, onCommit: (v) => applyLocalChange({ imageUrl: v }), placeholder: "https://example.com/bg.jpg" }),
											jsx(ImageImport, { t, readOnly, onImported: (dataUrl) => applyLocalChange({ mode: "image", imageUrl: dataUrl }) }),
											jsx(Segmented, { options: fitOptions, active: s.imageFit, readOnly, onSelect: (fit) => applyLocalChange({ imageFit: fit }) }),
											jsxs("label", {
												className: "wb-field",
												children: [
													jsxs("span", {
														className: "wb-row",
														children: [
															jsx("span", { className: "wb-label", children: t("overlay") }),
															jsx("span", { className: "wb-hint", children: String(overlayOf(s.imageOverlay)) + "%" }),
														],
													}),
													jsx("input", {
														className: "wb-range",
														type: "range",
														min: 0,
														max: 80,
														step: 1,
														value: overlayOf(s.imageOverlay),
														disabled: readOnly,
														onChange: (e) => applyLocalChange({ imageOverlay: Number(e.target.value) }),
													}),
													jsx("span", { className: "wb-hint", children: t("overlayHint") }),
												],
											}),
											jsx(ColorField, { label: t("schemeLight"), value: s.colorLight, readOnly, onCommit: (v) => applyLocalChange({ colorLight: v }) }),
											jsx(ColorField, { label: t("schemeDark"), value: s.colorDark, readOnly, onCommit: (v) => applyLocalChange({ colorDark: v }) }),
										],
									})
								: null,
							s.mode === "video"
								? jsxs(Fragment, {
										children: [
											jsx(VideoPicker, { t, value: s.videoFile, readOnly, onSelect: (file) => applyLocalChange({ videoFile: file }) }),
											jsxs("label", {
												className: "wb-field",
												children: [
													jsxs("span", {
														className: "wb-row",
														children: [
															jsx("span", { className: "wb-label", children: t("videoOverlay") }),
															jsx("span", { className: "wb-hint", children: String(overlayOf(s.videoOverlay)) + "%" }),
														],
													}),
													jsx("input", {
														className: "wb-range",
														type: "range",
														min: 0,
														max: 80,
														step: 1,
														value: overlayOf(s.videoOverlay),
														disabled: readOnly,
														onChange: (e) => applyLocalChange({ videoOverlay: Number(e.target.value) }),
													}),
													jsx("span", { className: "wb-hint", children: t("videoOverlayHint") }),
												],
											}),
										],
									})
								: null,
						],
					}),
					jsxs("div", {
						className: "wb-card",
						children: [
							jsxs("label", {
								className: "wb-row",
								children: [
									jsx("span", { className: "wb-label", children: t("sidebar") }),
									jsx("input", {
										className: "wb-switch",
										type: "checkbox",
										checked: s.applyToSidebar === true,
										disabled: readOnly,
										onChange: (e) => applyLocalChange({ applyToSidebar: e.target.checked }),
									}),
								],
							}),
							jsx("button", {
								type: "button",
								className: "wb-btn",
								disabled: readOnly,
								onClick: applyLocalReset,
								children: t("reset"),
							}),
						],
					}),
					jsxs("div", {
						className: "wb-card",
						children: [
							jsxs("label", {
								className: "wb-row",
								children: [
									jsx("span", { className: "wb-label", children: t("themeEnable") }),
									jsx("input", {
										className: "wb-switch",
										type: "checkbox",
										checked: s.themeEnabled === true,
										disabled: readOnly,
										onChange: (e) => applyLocalChange({ themeEnabled: e.target.checked }),
									}),
								],
							}),
							jsx("span", { className: "wb-hint", children: t("themeHint") }),
							s.themeEnabled === true
								? jsxs(Fragment, {
										children: [
											jsx("div", { className: "wb-cardtitle", children: t("themeBrand") }),
											jsxs("div", {
												className: "wb-pair",
												children: [
													jsx(ColorField, { label: t("schemeLight"), value: s.brandLight, readOnly, onCommit: (v) => applyLocalChange({ brandLight: v }) }),
													jsx(ColorField, { label: t("schemeDark"), value: s.brandDark, readOnly, onCommit: (v) => applyLocalChange({ brandDark: v }) }),
												],
											}),
											jsxs("details", {
												className: "wb-field",
												children: [
													jsx("summary", { className: "wb-label", children: t("themeAdvanced") }),
													jsx("div", { className: "wb-cardtitle", children: t("themeLabelPrimary") }),
													jsxs("div", {
														className: "wb-pair",
														children: [
															jsx(ColorField, { label: t("schemeLight"), value: s.labelPrimaryLight, readOnly, onCommit: (v) => applyLocalChange({ labelPrimaryLight: v }) }),
															jsx(ColorField, { label: t("schemeDark"), value: s.labelPrimaryDark, readOnly, onCommit: (v) => applyLocalChange({ labelPrimaryDark: v }) }),
														],
													}),
													jsx("div", { className: "wb-cardtitle", children: t("themeLabelSecondary") }),
													jsxs("div", {
														className: "wb-pair",
														children: [
															jsx(ColorField, { label: t("schemeLight"), value: s.labelSecondaryLight, readOnly, onCommit: (v) => applyLocalChange({ labelSecondaryLight: v }) }),
															jsx(ColorField, { label: t("schemeDark"), value: s.labelSecondaryDark, readOnly, onCommit: (v) => applyLocalChange({ labelSecondaryDark: v }) }),
														],
													}),
													jsx("div", { className: "wb-cardtitle", children: t("themeSurface") }),
													jsxs("div", {
														className: "wb-pair",
														children: [
															jsx(ColorField, { label: t("schemeLight"), value: s.surfaceLight, readOnly, onCommit: (v) => applyLocalChange({ surfaceLight: v }) }),
															jsx(ColorField, { label: t("schemeDark"), value: s.surfaceDark, readOnly, onCommit: (v) => applyLocalChange({ surfaceDark: v }) }),
														],
													}),
													jsx("div", { className: "wb-cardtitle", children: t("themeBorder") }),
													jsxs("div", {
														className: "wb-pair",
														children: [
															jsx(ColorField, { label: t("schemeLight"), value: s.borderLight, readOnly, onCommit: (v) => applyLocalChange({ borderLight: v }) }),
															jsx(ColorField, { label: t("schemeDark"), value: s.borderDark, readOnly, onCommit: (v) => applyLocalChange({ borderDark: v }) }),
														],
													}),
												],
											}),
										],
									})
								: null,
						],
					}),
					jsx(PreviewCard, { t, value }),
				],
			});
		}

		// ── plugin body ───────────────────────────────────────────────────────────

		/** Required services (Cordis fiber inject — the loader passes the module exports as an object plugin). */
		const inject = ["connection", "remote", "settingsScope", "theme", "slots", "locale"];

		/**
		 * Client plugin body:
		 * 1. Bind the durable `web-background` settings scope.
		 * 2. Keep the theme override layer in sync with the optimistic value
		 *    (instant, frame-coalesced) and adopt persisted snapshots when idle.
		 * 3. Register the Background settings page and its dictionaries.
		 * @param ctx - client Cordis context.
		 */
		function apply(ctx) {
			scope = ctx.settingsScope.bind({ namespace: NAMESPACE });
			themeService = ctx.theme;
			ctx.effect(() => {
				const offScope = scope.subscribe(onScopeSnapshot);
				const offLocal = subscribeLocal(scheduleThemeSync);
				onScopeSnapshot();
				applyThemeLayer();
				return () => {
					offScope();
					offLocal();
					if (themeSyncTimer !== null) {
						const cancel = typeof cancelAnimationFrame === "function" ? cancelAnimationFrame : clearTimeout;
						cancel(themeSyncTimer);
						themeSyncTimer = null;
					}
					themeSyncPending = false;
					if (disposeLayer !== null) {
						disposeLayer();
						disposeLayer = null;
					}
					removeVideoBackground();
					removeImageBackground();
					removeForcedStyles();
				};
			}, "dsh-web-background: background application");

			ctx.effect(() => ctx.locale.register(LOCALE_NS, { zh: zh, en: en }), "dsh-web-background: dictionaries");
			const t = ctx.locale.bind(LOCALE_NS);
			ctx.slots.inject("settings.section", () => ctx.slots.register({
				name: "settings.section",
				id: "background",
				order: 30,
				label: () => t("nav"),
				locale: LOCALE_NS,
			}, BackgroundSection));
		}

		// ── dictionaries ──────────────────────────────────────────────────────────

		const zh = {
			nav: "背景",
			enable: "启用自定义背景",
			memoryMode: "当前为远程访问，设置仅在本次会话内生效，不会写入本地配置。",
			mode: "背景类型",
			modeColor: "纯色",
			modeGradient: "渐变",
			modeImage: "图片",
			schemeLight: "浅色模式",
			schemeDark: "深色模式",
			preset: "预设",
			gradientStart: "起始色",
			gradientEnd: "结束色",
			gradientAngle: "方向角度",
			imageUrl: "图片链接",
			imageUrlHint: "支持 http(s) 链接与 data URL；浏览器无法读取本地文件路径。",
			importLocal: "选择本地图片导入",
			importTooLarge: "图片超过 1 MB。设置会写入本地配置文件，请先压缩，更大的图片建议使用图片链接。",
			importNotImage: "所选文件不是图片。",
			importFailed: "读取文件失败，请重试。",
			imported: "已导入本地图片",
			clear: "清除",
			fitCover: "覆盖",
			fitContain: "包含",
			fitTile: "平铺",
			overlay: "暗化程度",
			overlayHint: "在图片上叠加半透明黑色遮罩，提升文字可读性。",
			sidebar: "侧边栏也应用",
			reset: "恢复默认",
			preview: "实时预览",
			unavailable: "背景设置暂不可用（设置传输未就绪）。",
			modeVideo: "视频",
			videoFile: "播放的视频",
			videoAuto: "自动（目录里第一个）",
			videoFileHint: "从 background-videos 目录选择；支持 mp4 / webm / ogg / mov / m4v。",
			videoEmpty: "目录里还没有视频。可以直接点「上传本地视频」选一个，或把视频放进 background-videos 目录后点「刷新列表」。",
			videoLoading: "正在读取视频列表…",
			videoImportLocal: "上传本地视频",
			videoUploading: "上传中…",
			videoImportFailed: "上传失败，请重试。",
			videoImportBadType: "不支持的视频格式（仅 mp4 / webm / ogg / mov / m4v）。",
			videoImportTooLarge: "视频超过 300 MB，请压缩后再上传。",
			videoDelete: "删除选中视频",
			videoDeleteFailed: "删除失败，请重试。",
			videoListError: "读取视频列表失败，请重试。",
			videoRefresh: "刷新列表",
			videoOverlay: "视频暗化程度",
			videoOverlayHint: "在视频上叠加半透明黑色遮罩，提升文字可读性。",
			themeEnable: "启用主题色定制",
			themeHint: "自定义界面强调色等主题色（浅色/深色各一套）；留空表示使用默认主题色。",
			themeBrand: "强调色（按钮 / 高亮 / 链接）",
			themeAdvanced: "高级：文字 / 表面 / 边框色",
			themeLabelPrimary: "主文字色",
			themeLabelSecondary: "次文字色",
			themeSurface: "表面色（卡片 / 面板）",
			themeBorder: "边框色",
		};

		const en = {
			nav: "Background",
			enable: "Enable custom background",
			memoryMode: "Remote browser: choices apply to this session only and are not persisted.",
			mode: "Background type",
			modeColor: "Solid color",
			modeGradient: "Gradient",
			modeImage: "Image",
			schemeLight: "Light mode",
			schemeDark: "Dark mode",
			preset: "Preset",
			gradientStart: "Start color",
			gradientEnd: "End color",
			gradientAngle: "Angle",
			imageUrl: "Image URL",
			imageUrlHint: "http(s) URLs and data URLs work; browsers cannot read local file paths.",
			importLocal: "Import local image",
			importTooLarge: "Image exceeds 1 MB. Settings are persisted to a local config file — compress it first, or use an image URL for larger files.",
			importNotImage: "The selected file is not an image.",
			importFailed: "Failed to read the file; please retry.",
			imported: "Imported local image",
			clear: "Clear",
			fitCover: "Cover",
			fitContain: "Contain",
			fitTile: "Tile",
			overlay: "Dimming",
			overlayHint: "A translucent black overlay over the image for text readability.",
			sidebar: "Apply to sidebar too",
			reset: "Reset to defaults",
			preview: "Live preview",
			unavailable: "Background settings unavailable (settings transport not ready).",
			modeVideo: "Video",
			videoFile: "Video to play",
			videoAuto: "Auto (first in folder)",
			videoFileHint: "Choose from the background-videos folder; supports mp4 / webm / ogg / mov / m4v.",
			videoEmpty: "No videos yet. Upload one with Upload local video, or drop a file into background-videos and hit Refresh list.",
			videoLoading: "Loading video list…",
			videoImportLocal: "Upload local video",
			videoUploading: "Uploading…",
			videoImportFailed: "Upload failed; please retry.",
			videoImportBadType: "Unsupported video format (only mp4 / webm / ogg / mov / m4v).",
			videoImportTooLarge: "Video exceeds 300 MB; compress it before uploading.",
			videoDelete: "Delete selected video",
			videoDeleteFailed: "Delete failed; please retry.",
			videoListError: "Failed to load the video list; please retry.",
			videoRefresh: "Refresh list",
			videoOverlay: "Video dimming",
			videoOverlayHint: "Overlays a translucent black veil over the video for legibility.",
			themeEnable: "Enable theme color customization",
			themeHint: "Customize accent and other theme colors (light/dark). Leave empty to keep the default theme.",
			themeBrand: "Accent color (buttons / highlights / links)",
			themeAdvanced: "Advanced: text / surface / border colors",
			themeLabelPrimary: "Primary text color",
			themeLabelSecondary: "Secondary text color",
			themeSurface: "Surface color (cards / panels)",
			themeBorder: "Border color",
		};

		exports.apply = apply;
		exports.inject = inject;
		exports.BackgroundSection = BackgroundSection;
		exports.__test = { applyLocalChange, applyLocalReset, flush, syncNow, getLocalSnapshot, optimisticValue };
		return module.exports;
	}
});
