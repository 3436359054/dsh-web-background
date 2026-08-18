#!/usr/bin/env node
/**
 * Idempotent install / uninstall for the dsh-web-background plugin
 * (unified background + theme customization for the dsh web UI).
 *
 * What it does on install:
 *   1. Copies the plugin package into $DSH_HOME/profiles/node_modules (no-op
 *      when already in place).
 *   2. Ensures cordis.patch.yml (profile `web` by default) contains an ACTIVE
 *      insert for dsh-web-background and removes the retired
 *      dsh-web-video-background insert (its routes were merged into this
 *      plugin; keeping it would double-register /web-video-background).
 *   3. Removes the retired dsh-web-video-background package directory
 *      ($DSH_HOME/background-videos itself is kept — both plugins share it).
 *   4. Re-applies the two one-line product patches that a dsh upgrade wipes:
 *      - dsh-host-apiproxy: add "web-background" to WEB_SETTINGS_NAMESPACES
 *        (without it the browser cannot read/write the settings page).
 *      - dsh-client-ui-settings-general: navIcon() returns the background
 *        glyph for section id "background" (cosmetic only).
 *      Each patched file is backed up once as <file>.dsh-wb-backup.
 *
 * Usage:
 *   node install.mjs [--dsh-home <dir>] [--profile <name>] [--uninstall]
 * Re-run after every dsh upgrade to re-apply the two product patches.
 */
import { existsSync, readFileSync, writeFileSync, copyFileSync, rmSync, cpSync, realpathSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import os from "node:os";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const PLUGIN_NAME = "dsh-web-background";
const RETIRED_PLUGIN = "dsh-web-video-background";

// ── argument parsing ─────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const argValue = (name) => {
  const i = argv.indexOf(name);
  return i >= 0 && i + 1 < argv.length ? argv[i + 1] : null;
};
const UNINSTALL = argv.includes("--uninstall");
const DSH_HOME = argValue("--dsh-home") || process.env.DSH_HOME || join(os.homedir(), ".dsh");
const PROFILE = argValue("--profile") || "web";

const PROFILE_DIR = join(DSH_HOME, "profiles", PROFILE);
const PROFILES_NODE_MODULES = join(DSH_HOME, "profiles", "node_modules");
const PLUGIN_DIR = join(PROFILES_NODE_MODULES, PLUGIN_NAME);
const RETIRED_DIR = join(PROFILES_NODE_MODULES, RETIRED_PLUGIN);
const PATCH_YML = join(PROFILE_DIR, "cordis.patch.yml");

const log = (msg) => console.log(`[dsh-web-background] ${msg}`);
const fail = (msg) => {
  console.error(`[dsh-web-background] ERROR: ${msg}`);
  process.exit(1);
};

// ── dsh install discovery (through the profiles/node_modules symlinks) ────────
function dshPackageDir(pkg) {
  const link = join(PROFILES_NODE_MODULES, "@deepseek-ai", pkg);
  if (!existsSync(link)) return null;
  try {
    return realpathSync(link);
  } catch {
    return link;
  }
}
const apiproxyDir = dshPackageDir("dsh-host-apiproxy");
const settingsGeneralDir = dshPackageDir("dsh-client-ui-settings-general");
const APIPROXY_INDEX = apiproxyDir ? join(apiproxyDir, "lib", "index.js") : null;
const SETTINGS_GENERAL_CLIENT = settingsGeneralDir ? join(settingsGeneralDir, "lib", "client.js") : null;

// ── helpers ───────────────────────────────────────────────────────────────────
function backup(file) {
  const bak = file + ".dsh-wb-backup";
  if (existsSync(bak)) return false;
  copyFileSync(file, bak);
  return true;
}

function restoreBackup(file) {
  const bak = file + ".dsh-wb-backup";
  if (existsSync(bak)) {
    copyFileSync(bak, file);
    rmSync(bak, { force: true });
    return true;
  }
  return false;
}

/** Match insert blocks (`- insert:` + `- id: X` + `name: <name>`), each line optionally commented. */
function insertBlockRegex(name) {
  // Per-line prefix `[ \t]*#?[ \t]*` accepts an indented, optionally `# `-commented
  // line; `gm` anchors ^ per line and replaces every occurrence.
  return new RegExp(
    `^[ \\t]*#?[ \\t]*- insert:[ \\t]*\\n` +
      `^[ \\t]*#?[ \\t]*- id: [^\\n]+\\n` +
      `^[ \\t]*#?[ \\t]*name: ${name}[ \\t]*(?:\\n|$)`,
    "gm",
  );
}

/** Remove every insert block (active or commented) whose name is `name`. */
function removeInsertBlock(text, name) {
  return text.replace(insertBlockRegex(name), "");
}

/** Ensure exactly one ACTIVE insert block: drop all matching, then append the canonical one. */
function ensureActiveInsertBlock(text, name, id) {
  text = text.replace(insertBlockRegex(name), "").replace(/\n{3,}/g, "\n\n");
  const trimmed = text.replace(/\s+$/, "");
  return trimmed + (trimmed === "" ? "" : "\n") + `- insert:\n    - id: ${id}\n      name: ${name}\n`;
}

// ── patch 1: WEB_SETTINGS_NAMESPACES whitelist ────────────────────────────────
function applyWhitelistPatch() {
  if (!APIPROXY_INDEX || !existsSync(APIPROXY_INDEX)) {
    log("skip whitelist patch: dsh-host-apiproxy not found under profiles/node_modules");
    return;
  }
  const text = readFileSync(APIPROXY_INDEX, "utf8");
  if (text.includes(`"web-background"`)) {
    log("whitelist patch already applied (web-background present)");
    return;
  }
  backup(APIPROXY_INDEX);
  const marker = "const WEB_SETTINGS_NAMESPACES = [";
  const start = text.indexOf(marker);
  if (start < 0) {
    log("skip whitelist patch: WEB_SETTINGS_NAMESPACES declaration not found");
    return;
  }
  const close = text.indexOf("];", start);
  if (close < 0) {
    log("skip whitelist patch: could not locate end of WEB_SETTINGS_NAMESPACES");
    return;
  }
  const insertion =
    "\n\t// Third-party: the dsh-web-background settings namespace (re-run install.mjs after a dsh update).\n\t\"web-background\"";
  writeFileSync(APIPROXY_INDEX, text.slice(0, close) + insertion + text.slice(close), "utf8");
  log("whitelist patch applied to dsh-host-apiproxy (backed up)");
}

// ── patch 2: navIcon glyph for section id "background" ────────────────────────
const NAV_ICON_BLOCK = `\t\t\t// Third-party: the dsh-web-background section glyph (re-run install.mjs after a dsh update).
\t\t\tif (id === "background") return (0, react_jsx_runtime.jsx)("svg", {
\t\t\t\twidth: 16,
\t\t\t\theight: 16,
\t\t\t\tclassName: SettingsRoot_module_css_default.navIcon,
\t\t\t\tviewBox: "0 0 24 24",
\t\t\t\tfill: "currentColor",
\t\t\t\txmlns: "http://www.w3.org/2000/svg",
\t\t\t\tchildren: (0, react_jsx_runtime.jsx)("path", {
\t\t\t\t\tfillRule: "evenodd",
\t\t\t\t\tclipRule: "evenodd",
\t\t\t\t\td: "M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"
\t\t\t\t})
\t\t\t});
`;

function applyNavIconPatch() {
  if (!SETTINGS_GENERAL_CLIENT || !existsSync(SETTINGS_GENERAL_CLIENT)) {
    log("skip nav icon patch: dsh-client-ui-settings-general not found under profiles/node_modules");
    return;
  }
  const text = readFileSync(SETTINGS_GENERAL_CLIENT, "utf8");
  if (text.includes(`id === "background"`)) {
    log("nav icon patch already applied (background branch present)");
    return;
  }
  const anchor = `return (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSettingsOutline16, {`;
  const idx = text.indexOf(anchor);
  if (idx < 0) {
    log("skip nav icon patch: navIcon default return not found");
    return;
  }
  backup(SETTINGS_GENERAL_CLIENT);
  writeFileSync(SETTINGS_GENERAL_CLIENT, text.slice(0, idx) + NAV_ICON_BLOCK + text.slice(idx), "utf8");
  log("nav icon patch applied to dsh-client-ui-settings-general (backed up)");
}

// ── patch yml management ──────────────────────────────────────────────────────
function syncPatchYml() {
  if (!existsSync(PROFILE_DIR)) fail(`profile dir not found: ${PROFILE_DIR}`);
  let text = existsSync(PATCH_YML) ? readFileSync(PATCH_YML, "utf8") : "";
  const before = text;
  text = removeInsertBlock(text, RETIRED_PLUGIN);
  text = ensureActiveInsertBlock(text, PLUGIN_NAME, "web-background");
  if (text !== before) {
    writeFileSync(PATCH_YML, text, "utf8");
    log(`cordis.patch.yml updated (${PLUGIN_NAME} active, ${RETIRED_PLUGIN} removed)`);
  } else {
    log(`cordis.patch.yml already correct`);
  }
}

// ── plugin copy ───────────────────────────────────────────────────────────────
function copyPlugin() {
  mkdirSync(PROFILES_NODE_MODULES, { recursive: true });
  if (existsSync(PLUGIN_DIR) && resolve(PLUGIN_DIR) === resolve(SCRIPT_DIR)) {
    log(`plugin already installed in place: ${PLUGIN_DIR}`);
    return;
  }
  if (existsSync(PLUGIN_DIR)) {
    log(`replacing existing ${PLUGIN_DIR}`);
    rmSync(PLUGIN_DIR, { recursive: true, force: true });
  }
  const filter = (src) => !/node_modules|\\.git$/.test(src);
  cpSync(SCRIPT_DIR, PLUGIN_DIR, { recursive: true, filter });
  log(`plugin copied to ${PLUGIN_DIR}`);
}

// ── retired plugin cleanup ────────────────────────────────────────────────────
function removeRetired() {
  if (existsSync(RETIRED_DIR)) {
    rmSync(RETIRED_DIR, { recursive: true, force: true });
    log(`removed retired plugin dir ${RETIRED_DIR}`);
  } else {
    log("no retired plugin dir to remove");
  }
}

// ── main ──────────────────────────────────────────────────────────────────────
function main() {
  if (UNINSTALL) {
    log(`uninstalling ${PLUGIN_NAME} (dsh home: ${DSH_HOME}, profile: ${PROFILE})`);
    let changed = false;
    if (APIPROXY_INDEX && existsSync(APIPROXY_INDEX)) changed = restoreBackup(APIPROXY_INDEX) || changed;
    if (SETTINGS_GENERAL_CLIENT && existsSync(SETTINGS_GENERAL_CLIENT)) changed = restoreBackup(SETTINGS_GENERAL_CLIENT) || changed;
    if (existsSync(PATCH_YML)) {
      const text = removeInsertBlock(readFileSync(PATCH_YML, "utf8"), PLUGIN_NAME);
      writeFileSync(PATCH_YML, text, "utf8");
      changed = true;
    }
    if (existsSync(PLUGIN_DIR)) {
      rmSync(PLUGIN_DIR, { recursive: true, force: true });
      changed = true;
    }
    log(changed ? "uninstall done (product patches restored from backup)" : "nothing to uninstall");
    log("remember to restart dsh web");
    return;
  }

  log(`installing ${PLUGIN_NAME} (dsh home: ${DSH_HOME}, profile: ${PROFILE})`);
  copyPlugin();
  syncPatchYml();
  removeRetired();
  applyWhitelistPatch();
  applyNavIconPatch();
  log("done. restart dsh web (stop the process on port 3080, start again), then hard-refresh the browser (Ctrl+Shift+R).");
}

main();
