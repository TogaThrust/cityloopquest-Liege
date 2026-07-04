import crypto from "crypto";
import fs from "fs";
import path from "path";

export const TRACKED_BUILD_FILES = [
  "app.js",
  "main.html",
  "parcours.html",
  "circuit.html",
  "circuit-data.js",
  "quiz-data.js",
  "explore-data.js",
  "descriptions.json",
  "service-worker.js",
  "instructions.html",
];

const CIRCUIT_LABELS = {
  petit: "short tour",
  moyen: "medium tour",
  grand: "long tour",
};

function stableList(values) {
  return [...new Set((values || []).map((v) => String(v || "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "en"));
}

function listDiff(before = [], after = []) {
  const prev = new Set(before);
  const next = new Set(after);
  return {
    added: after.filter((item) => !prev.has(item)),
    removed: before.filter((item) => !next.has(item)),
  };
}

function routeKey(route, index) {
  return String(route?.circuitKey || "").trim().toLowerCase() || `route-${index + 1}`;
}

function collectRoutePoiNames(state) {
  const out = {};
  for (const [index, route] of (state?.routes || []).entries()) {
    const key = routeKey(route, index);
    out[key] = stableList((route?.pois || []).map((poi) => poi?.name));
  }
  return out;
}

export function extractCitySummary(state) {
  if (!state || typeof state !== "object") return null;
  const annexTitles = [];
  const walkAnnex = (nodes) => {
    for (const node of nodes || []) {
      if (node?.children?.length) walkAnnex(node.children);
      else {
        const title = node?.title?.fr || node?.title?.en || node?.title;
        if (typeof title === "string" && title.trim()) annexTitles.push(title.trim());
        else if (title && typeof title === "object") {
          const t = title.fr || title.en || Object.values(title).find((v) => typeof v === "string" && v.trim());
          if (t) annexTitles.push(String(t).trim());
        }
      }
    }
  };
  walkAnnex(state.annexPages || []);

  let quizPoiCount = 0;
  const seenPois = new Set();
  for (const route of state.routes || []) {
    for (const poi of route.pois || []) {
      const name = String(poi?.name || "").trim();
      if (!name || seenPois.has(name)) continue;
      seenPois.add(name);
      if (Array.isArray(poi?.quiz) && poi.quiz.length >= 3) quizPoiCount += 1;
    }
  }

  return {
    cityName: String(state.city?.name || "").trim(),
    appTitle: String(state.city?.appTitle || "").trim(),
    routeCount: (state.routes || []).length,
    enabledCircuits: stableList(state.city?.enabledCircuits),
    routePois: collectRoutePoiNames(state),
    explorationNames: stableList((state.explorationPois || []).map((poi) => poi?.name)),
    museumNames: stableList((state.museums || []).map((museum) => museum?.name)),
    culturePageTitles: stableList(annexTitles),
    quizPoiCount,
    sourceLanguage: String(state.city?.sourceLanguage || "fr").trim(),
  };
}

function formatNameList(names, limit = 4) {
  if (!names.length) return "";
  if (names.length <= limit) return names.join(", ");
  return `${names.slice(0, limit).join(", ")} (+${names.length - limit} more)`;
}

function circuitLabel(key) {
  return CIRCUIT_LABELS[key] || key;
}

export function summarizeCitySnapshotChanges(previousState, nextState) {
  const before = extractCitySummary(previousState);
  const after = extractCitySummary(nextState);
  if (!before || !after) return [];
  const lines = [];

  if (before.cityName !== after.cityName && after.cityName) {
    lines.push(`Renamed city app to ${after.cityName}.`);
  }
  if (before.appTitle !== after.appTitle && after.appTitle) {
    lines.push(`Updated app title to "${after.appTitle}".`);
  }
  if (before.routeCount !== after.routeCount) {
    lines.push(`Tour count changed from ${before.routeCount} to ${after.routeCount}.`);
  }
  if (JSON.stringify(before.enabledCircuits) !== JSON.stringify(after.enabledCircuits)) {
    lines.push(`Enabled tours: ${after.enabledCircuits.join(", ") || "none"}.`);
  }
  if (before.sourceLanguage !== after.sourceLanguage) {
    lines.push(`Source language changed to ${after.sourceLanguage}.`);
  }

  const routeKeys = stableList([...Object.keys(before.routePois), ...Object.keys(after.routePois)]);
  for (const key of routeKeys) {
    const diff = listDiff(before.routePois[key] || [], after.routePois[key] || []);
    const label = circuitLabel(key);
    if (diff.added.length) {
      lines.push(`Added ${diff.added.length} stop(s) to the ${label}: ${formatNameList(diff.added)}.`);
    }
    if (diff.removed.length) {
      lines.push(`Removed ${diff.removed.length} stop(s) from the ${label}: ${formatNameList(diff.removed)}.`);
    }
  }

  const explorationDiff = listDiff(before.explorationNames, after.explorationNames);
  if (explorationDiff.added.length) {
    lines.push(`Added ${explorationDiff.added.length} Explorer POI(s): ${formatNameList(explorationDiff.added)}.`);
  }
  if (explorationDiff.removed.length) {
    lines.push(`Removed ${explorationDiff.removed.length} Explorer POI(s): ${formatNameList(explorationDiff.removed)}.`);
  }

  const museumDiff = listDiff(before.museumNames, after.museumNames);
  if (museumDiff.added.length) {
    lines.push(`Added ${museumDiff.added.length} museum(s): ${formatNameList(museumDiff.added)}.`);
  }
  if (museumDiff.removed.length) {
    lines.push(`Removed ${museumDiff.removed.length} museum(s): ${formatNameList(museumDiff.removed)}.`);
  }

  const cultureDiff = listDiff(before.culturePageTitles, after.culturePageTitles);
  if (cultureDiff.added.length) {
    lines.push(`Added ${cultureDiff.added.length} culture chapter(s): ${formatNameList(cultureDiff.added)}.`);
  }
  if (cultureDiff.removed.length) {
    lines.push(`Removed ${cultureDiff.removed.length} culture chapter(s): ${formatNameList(cultureDiff.removed)}.`);
  }

  if (before.quizPoiCount !== after.quizPoiCount) {
    lines.push(`Quiz coverage updated: ${after.quizPoiCount} tour stop(s) now have quizzes (was ${before.quizPoiCount}).`);
  }

  return lines;
}

const FILE_CHANGE_LABELS = {
  "app.js": "Updated main tour app logic.",
  "main.html": "Updated main tour page.",
  "parcours.html": "Updated tour selection page.",
  "circuit.html": "Updated circuit overview page.",
  "circuit-data.js": "Updated tour routes and stop coordinates.",
  "quiz-data.js": "Updated quiz questions and answers.",
  "explore-data.js": "Updated Explorer POI data.",
  "descriptions.json": "Updated multilingual descriptions.",
  "service-worker.js": "Updated offline cache and service worker.",
  "instructions.html": "Updated instructions and help page.",
};

export function hashFileContent(content) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

export function buildFileManifest(root, relativeFiles = TRACKED_BUILD_FILES) {
  const files = {};
  for (const rel of relativeFiles) {
    const abs = path.join(root, rel);
    if (!fs.existsSync(abs)) continue;
    try {
      const stat = fs.statSync(abs);
      if (!stat.isFile()) continue;
      files[rel] = hashFileContent(fs.readFileSync(abs));
    } catch {
      // ignore unreadable files
    }
  }
  return files;
}

export function summarizeFileManifestChanges(previousFiles = {}, nextFiles = {}) {
  const lines = [];
  const keys = stableList([...Object.keys(previousFiles), ...Object.keys(nextFiles)]);
  for (const key of keys) {
    const before = previousFiles[key];
    const after = nextFiles[key];
    if (before === after) continue;
    if (!before && after) {
      lines.push(`Added ${key}.`);
      continue;
    }
    if (before && !after) {
      lines.push(`Removed ${key}.`);
      continue;
    }
    lines.push(FILE_CHANGE_LABELS[key] || `Updated ${key}.`);
  }
  return lines;
}

export function readPendingReleaseNoteLines(root) {
  const pendingPath = path.join(root, "data", "pending-release-notes.en.txt");
  if (!fs.existsSync(pendingPath)) return [];
  const raw = fs.readFileSync(pendingPath, "utf8");
  return raw
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*[-*]\s*/, "").trim())
    .filter(Boolean);
}

export function clearPendingReleaseNotes(root) {
  const pendingPath = path.join(root, "data", "pending-release-notes.en.txt");
  if (fs.existsSync(pendingPath)) fs.unlinkSync(pendingPath);
}

export function uniqueLines(lines) {
  const out = [];
  const seen = new Set();
  for (const line of lines) {
    const value = String(line || "").trim();
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}

export const DEFAULT_RELEASE_NOTES_FALLBACK =
  "Production build (no tracked content changes since last release).";

export function formatReleaseNotesBody(lines) {
  const items = uniqueLines(lines);
  if (!items.length) {
    return `- ${DEFAULT_RELEASE_NOTES_FALLBACK}\r\n`;
  }
  return `${items.map((line) => `- ${line}`).join("\r\n")}\r\n`;
}

/** Guarantees a non-empty English changelog block (with bullet prefixes). */
export function ensureReleaseNotesBodyText(body) {
  const trimmed = String(body || "").trim();
  if (!trimmed) {
    return formatReleaseNotesBody([]);
  }
  if (!/^-\s/m.test(trimmed)) {
    return formatReleaseNotesBody(
      trimmed.split(/\r?\n/).map((line) => line.replace(/^\s*[-*]\s*/, "").trim()).filter(Boolean),
    );
  }
  return `${trimmed.replace(/\r?\n?$/, "")}\r\n`;
}

const RELEASE_NOTES_ENTRY_RE = /^CityLoop Quest .+ - Release notes\r?\nVersion [^\r\n]+\r?\n-{40}\r?\n/;

function releaseNoteBlockHasBody(block) {
  const match = block.match(RELEASE_NOTES_ENTRY_RE);
  if (!match) return Boolean(String(block || "").trim());
  const body = block.slice(match[0].length).trim();
  return body.length > 0;
}

/** Removes historical release-note entries whose body is empty (header + separator only). */
export function removeEmptyReleaseNoteEntries(text) {
  const raw = String(text || "");
  if (!raw.trim()) return "";
  const parts = raw.split(/(?=CityLoop Quest .+ - Release notes\r?\nVersion )/);
  return parts.filter((part) => part.trim() && releaseNoteBlockHasBody(part)).join("");
}

export function loadBuildBaseline(root) {
  const baselinePath = path.join(root, "data", ".build-baseline.json");
  if (!fs.existsSync(baselinePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(baselinePath, "utf8"));
  } catch {
    return null;
  }
}

export function saveBuildBaseline(root, version, citySnapshot = null) {
  const dataDir = path.join(root, "data");
  fs.mkdirSync(dataDir, { recursive: true });
  const snapshot = citySnapshot || loadCitySnapshot(root);
  const baseline = {
    version,
    savedAt: new Date().toISOString(),
    citySummary: snapshot ? extractCitySummary(snapshot) : null,
    files: buildFileManifest(root),
  };
  fs.writeFileSync(path.join(dataDir, ".build-baseline.json"), `${JSON.stringify(baseline, null, 2)}\n`, "utf8");
  return baseline;
}

function loadCitySnapshot(root) {
  const snapshotPath = path.join(root, "data", "factory-source.city.json");
  if (!fs.existsSync(snapshotPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(snapshotPath, "utf8"));
  } catch {
    return null;
  }
}

export function buildReleaseNotesLines(root) {
  const lines = [];
  lines.push(...readPendingReleaseNoteLines(root));

  const currentSnapshot = loadCitySnapshot(root);
  const baseline = loadBuildBaseline(root);
  const currentFiles = buildFileManifest(root);

  if (baseline?.citySummary && currentSnapshot) {
    const before = baseline.citySummary;
    lines.push(...summarizeCitySnapshotChanges(
      {
        city: { name: before.cityName, appTitle: before.appTitle, enabledCircuits: before.enabledCircuits, sourceLanguage: before.sourceLanguage },
        routes: Object.entries(before.routePois || {}).map(([circuitKey, pois]) => ({ circuitKey, pois: pois.map((name) => ({ name })) })),
        explorationPois: (before.explorationNames || []).map((name) => ({ name })),
        museums: (before.museumNames || []).map((name) => ({ name })),
        annexPages: (before.culturePageTitles || []).map((title) => ({ title: { fr: title }, children: [] })),
      },
      currentSnapshot,
    ));
  } else if (!baseline && currentSnapshot) {
    const summary = extractCitySummary(currentSnapshot);
    lines.push(`Initial release for ${summary.cityName || "this city"}.`);
    const totalStops = Object.values(summary.routePois || {}).reduce((sum, names) => sum + names.length, 0);
    if (totalStops) lines.push(`Includes ${totalStops} tour stop(s) across ${summary.routeCount} route(s).`);
    if (summary.explorationNames.length) lines.push(`Includes ${summary.explorationNames.length} Explorer POI(s).`);
    if (summary.museumNames.length) lines.push(`Includes ${summary.museumNames.length} museum(s).`);
    if (summary.quizPoiCount) lines.push(`Includes quizzes for ${summary.quizPoiCount} tour stop(s).`);
  }

  if (baseline?.files) {
    lines.push(...summarizeFileManifestChanges(baseline.files, currentFiles));
  }

  return uniqueLines(lines);
}

function summarizeFactoryMetaChanges(previousState, nextState) {
  const lines = [];
  const prevUpdated = previousState?.city?.factoryMeta?.translationUpdatedAt || {};
  const nextUpdated = nextState?.city?.factoryMeta?.translationUpdatedAt || {};
  for (const lang of stableList([...Object.keys(prevUpdated), ...Object.keys(nextUpdated)])) {
    if (String(prevUpdated[lang] || "") !== String(nextUpdated[lang] || "")) {
      lines.push(`Updated ${lang.toUpperCase()} translations.`);
    }
  }
  const prevAudio = previousState?.city?.factoryMeta?.audioSyncedAt || {};
  const nextAudio = nextState?.city?.factoryMeta?.audioSyncedAt || {};
  for (const lang of stableList([...Object.keys(prevAudio), ...Object.keys(nextAudio)])) {
    if (String(prevAudio[lang] || "") !== String(nextAudio[lang] || "")) {
      lines.push(`Regenerated ${lang.toUpperCase()} tour audio.`);
    }
  }
  return lines;
}

export function writePendingReleaseNotes(root, previousState, nextState, options = {}) {
  const before = extractCitySummary(previousState);
  const after = extractCitySummary(nextState);
  const lines = [
    ...summarizeCitySnapshotChanges(previousState, nextState),
    ...summarizeFactoryMetaChanges(previousState, nextState),
  ];

  const previousBaseline = options.previousBaseline || null;
  if (previousBaseline?.files) {
    lines.push(...summarizeFileManifestChanges(previousBaseline.files, buildFileManifest(root)));
  }

  const audioGenerated = Number(options.audioGenerated || 0);
  if (audioGenerated > 0) {
    lines.push(`Regenerated ${audioGenerated} tour audio file(s).`);
  }

  if (!lines.length) {
    const cityName = String(after?.cityName || nextState?.city?.name || "this city").trim();
    if (!before?.cityName) {
      lines.push(`Initial release for ${cityName}.`);
      const totalStops = Object.values(after?.routePois || {}).reduce((sum, names) => sum + names.length, 0);
      if (totalStops) lines.push(`Includes ${totalStops} tour stop(s) across ${after.routeCount || 0} route(s).`);
      if (after?.culturePageTitles?.length) {
        lines.push(`Includes ${after.culturePageTitles.length} culture chapter(s).`);
      }
      if (after?.quizPoiCount) {
        lines.push(`Includes quizzes for ${after.quizPoiCount} tour stop(s).`);
      }
    } else {
      lines.push(`Factory regeneration for ${cityName}.`);
      lines.push("Refreshed tour routes, culture pages, translations, quiz data and generated assets.");
    }
  }

  const dataDir = path.join(root, "data");
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(
    path.join(dataDir, "pending-release-notes.en.txt"),
    ensureReleaseNotesBodyText(formatReleaseNotesBody(lines)),
    "utf8",
  );
  return true;
}
