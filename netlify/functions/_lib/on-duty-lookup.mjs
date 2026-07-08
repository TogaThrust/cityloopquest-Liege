import https from "https";

const USER_AGENT = "CLQ-App-Factory/1.0 (+https://cityloopquest.com)";

function httpsRequest(url, { method = "GET", headers = {}, timeoutMs = 12000 } = {}) {
  return new Promise((resolve) => {
    const req = https.request(
      url,
      { method, headers: { "User-Agent": USER_AGENT, Accept: "application/json", ...headers }, timeout: timeoutMs },
      (res) => {
        let body = "";
        res.on("data", (chunk) => { body += chunk; });
        res.on("end", () => {
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            body,
            contentType: String(res.headers["content-type"] || ""),
          });
        });
      }
    );
    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.on("error", (err) => resolve({ ok: false, status: 0, body: String(err), contentType: "" }));
    req.end();
  });
}

function decodeHtmlEntities(text) {
  return String(text || "")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function normalizeSlug(raw) {
  return String(raw || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizePhone(raw) {
  const digits = String(raw || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("32") && digits.length >= 10) return `+${digits}`;
  if (digits.startsWith("33") && digits.length >= 11) return `+${digits}`;
  if (digits.length === 9) return `0${digits}`;
  if (digits.length === 10 && digits.startsWith("0")) return digits;
  return String(raw || "").trim();
}

function formatFrenchPhone(raw) {
  const digits = String(raw || "").replace(/\D/g, "");
  if (digits.length === 10) {
    return digits.replace(/(\d{2})(?=\d)/g, "$1 ").trim();
  }
  return normalizePhone(raw);
}

function distanceKm(a, b) {
  if (!a || !b || !Number.isFinite(a.lat) || !Number.isFinite(a.lng) || !Number.isFinite(b.lat) || !Number.isFinite(b.lng)) {
    return Number.POSITIVE_INFINITY;
  }
  const toRad = (v) => (v * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sa = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * (2 * Math.atan2(Math.sqrt(sa), Math.sqrt(1 - sa)));
}

function facilityFromNormalized(partial) {
  return {
    category: partial.category,
    name: partial.name || "",
    address: partial.address || "",
    phone: partial.phone || "",
    lat: Number.isFinite(Number(partial.lat)) ? Number(partial.lat) : null,
    lng: Number.isFinite(Number(partial.lng)) ? Number(partial.lng) : null,
    onDutyFrom: partial.onDutyFrom || "",
    onDutyUntil: partial.onDutyUntil || "",
    sourceUrl: partial.sourceUrl || "",
    provider: partial.provider || "",
    externalId: partial.externalId || "",
    live: true,
  };
}

function departmentFromPostalCode(postalCode) {
  const zip = String(postalCode || "").trim();
  if (!/^\d{5}$/.test(zip)) return "";
  if (zip.startsWith("97") || zip.startsWith("98")) return zip.slice(0, 3);
  return zip.slice(0, 2);
}

function isBelgiumCountry(country) {
  const slug = normalizeSlug(country);
  return slug === "be" || slug === "belgique" || slug === "belgium" || slug === "belgie";
}

function isFranceCountry(country) {
  const slug = normalizeSlug(country);
  return slug === "fr" || slug === "france";
}

async function reverseGeocodeFrance(lat, lng) {
  const url = `https://api-adresse.data.gouv.fr/reverse/?lon=${encodeURIComponent(lng)}&lat=${encodeURIComponent(lat)}`;
  const res = await httpsRequest(url);
  if (!res.ok) return null;
  try {
    const data = JSON.parse(res.body);
    const props = data?.features?.[0]?.properties || {};
    return {
      postalCode: String(props.postcode || "").trim(),
      city: String(props.city || props.name || "").trim(),
      department: departmentFromPostalCode(props.postcode),
      country: "France",
    };
  } catch {
    return null;
  }
}

async function reverseGeocodeNominatim(lat, lng) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&accept-language=fr`;
  const res = await httpsRequest(url, { headers: { Accept: "application/json" } });
  if (!res.ok) return null;
  try {
    const data = JSON.parse(res.body);
    const addr = data?.address || {};
    const postalCode = String(addr.postcode || "").trim();
    const country = String(addr.country || "").trim();
    return {
      postalCode,
      city: String(addr.city || addr.town || addr.village || addr.municipality || "").trim(),
      department: departmentFromPostalCode(postalCode),
      country,
    };
  } catch {
    return null;
  }
}

async function resolveLocationContext({ lat, lng, country, postalCode, city }) {
  const out = {
    lat: Number.isFinite(Number(lat)) ? Number(lat) : null,
    lng: Number.isFinite(Number(lng)) ? Number(lng) : null,
    country: String(country || "").trim(),
    postalCode: String(postalCode || "").trim(),
    city: String(city || "").trim(),
    department: departmentFromPostalCode(postalCode),
  };

  if (out.postalCode) out.department = departmentFromPostalCode(out.postalCode);

  if ((!out.postalCode || !out.city) && out.lat != null && out.lng != null) {
    const fr = await reverseGeocodeFrance(out.lat, out.lng);
    if (fr?.postalCode) {
      out.postalCode ||= fr.postalCode;
      out.city ||= fr.city;
      out.department ||= fr.department;
      out.country ||= fr.country;
    } else {
      const nom = await reverseGeocodeNominatim(out.lat, out.lng);
      if (nom) {
        out.postalCode ||= nom.postalCode;
        out.city ||= nom.city;
        out.department ||= nom.department;
        out.country ||= nom.country;
      }
    }
  }

  if (!out.department && out.postalCode) out.department = departmentFromPostalCode(out.postalCode);
  return out;
}

async function fetchApotheekPharmacies(query, onDutyOnly = true) {
  const q = encodeURIComponent(String(query || "").trim());
  if (!q) return [];
  const url = `https://www.apotheek.be/PharmacySearch?Query=${q}${onDutyOnly ? "&OnDuty=true" : ""}`;
  const res = await httpsRequest(url, { headers: { Accept: "text/html" } });
  if (!res.ok) return [];
  const match = res.body.match(/id="myTomTomPlaces"[^>]*value="([^"]+)"/);
  if (!match) return [];
  try {
    const raw = decodeHtmlEntities(match[1]);
    const data = JSON.parse(raw);
    const items = Array.isArray(data?.PharmacySearchResults) ? data.PharmacySearchResults : [];
    return items.filter((item) => !onDutyOnly || item?.OnDuty);
  } catch {
    return [];
  }
}

function parseApotheekCoords(item) {
  if (Array.isArray(item?.Center) && item.Center.length >= 2) {
    const lng = Number(item.Center[0]);
    const lat = Number(item.Center[1]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }
  const dest = String(item?.LatLongDest || "").trim();
  if (dest.includes(",")) {
    const [latRaw, lngRaw] = dest.split(",").map((part) => Number(String(part).trim()));
    if (Number.isFinite(latRaw) && Number.isFinite(lngRaw)) return { lat: latRaw, lng: lngRaw };
  }
  const lat = Number(item?.Latitude);
  const lng = Number(item?.Longitude);
  if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  return { lat: null, lng: null };
}

function mapApotheekItem(item) {
  const address = String(item?.Address || "").trim()
    || [item?.Address, item?.ZipCode, item?.City].filter(Boolean).join(", ");
  const coords = parseApotheekCoords(item);
  return facilityFromNormalized({
    category: "pharmacy",
    name: item?.Name || "",
    address,
    phone: normalizePhone(item?.Phone),
    lat: coords.lat,
    lng: coords.lng,
    sourceUrl: item?.WebsiteUrl || item?.Url || "https://www.apotheek.be/",
    provider: "belgium-apotheek",
    externalId: String(item?.Identifier || "").trim(),
  });
}

const ON_DUTY_MAX_RADIUS_KM = 15;

function filterItemsNearUser(items, ctx) {
  if (!items.length) return items;
  const origin = ctx.lat != null && ctx.lng != null ? { lat: ctx.lat, lng: ctx.lng } : null;
  if (!origin) return items;
  const nearby = items.filter((item) => {
    if (!Number.isFinite(item.lat) || !Number.isFinite(item.lng)) return false;
    return distanceKm(origin, item) <= ON_DUTY_MAX_RADIUS_KM;
  });
  return nearby.length ? nearby : items.slice(0, 5);
}

async function lookupBelgiumPharmacies(ctx) {
  const query = ctx.postalCode || ctx.city;
  if (!query) {
    return {
      items: [],
      provider: "belgium-apotheek",
      status: "needs_location",
      message: "Code postal ou ville requis pour la pharmacie de garde en Belgique.",
      fallbackUrl: "https://www.apotheek.be/",
    };
  }
  let items = (await fetchApotheekPharmacies(query, true)).map(mapApotheekItem);
  const pos = ctx.lat != null && ctx.lng != null ? { lat: ctx.lat, lng: ctx.lng } : null;
  if (pos) items.sort((a, b) => distanceKm(pos, a) - distanceKm(pos, b));
  items = filterItemsNearUser(items, ctx);
  return {
    items,
    provider: "belgium-apotheek",
    status: items.length ? "ok" : "empty",
    fallbackUrl: `https://www.apotheek.be/PharmacySearch?Query=${encodeURIComponent(query)}&OnDuty=true`,
  };
}

async function servigardesGetJson(path) {
  const url = `https://api.servigardes.fr${path}`;
  const res = await httpsRequest(url);
  if (!res.ok) return null;
  try {
    return JSON.parse(res.body);
  } catch {
    return null;
  }
}

function mapServigardesPharmacy(entry) {
  const details = entry?.details || {};
  const schedule = entry?.schedule || {};
  const zip = String(details.zipcode || "").trim();
  const city = String(details.city || "").trim();
  const street = String(details.address || "").trim();
  const address = [street, zip, city].filter(Boolean).join(", ");
  return facilityFromNormalized({
    category: "pharmacy",
    name: details.name || "",
    address,
    phone: formatFrenchPhone(details.phone || ""),
    lat: details.latitude,
    lng: details.longitude,
    onDutyFrom: schedule.startDt || "",
    onDutyUntil: schedule.endDt || "",
    sourceUrl: "https://www.servigardes.fr/",
    provider: "france-servigardes",
  });
}

async function lookupServigardesPharmacies(ctx) {
  const zip = String(ctx.postalCode || "").trim();
  if (!/^\d{5}$/.test(zip)) {
    return {
      items: [],
      provider: "france-servigardes",
      status: "needs_location",
      message: "Code postal requis pour la pharmacie de garde (Nord / Pas-de-Calais).",
      fallbackUrl: "https://www.servigardes.fr/",
    };
  }

  const cities = await servigardesGetJson(`/api/cities?s=${encodeURIComponent(zip)}`);
  const cityList = Array.isArray(cities) ? cities.filter((c) => String(c.zipcode) === zip) : [];
  if (!cityList.length) {
    return {
      items: [],
      provider: "france-servigardes",
      status: "empty",
      fallbackUrl: "https://www.servigardes.fr/",
    };
  }

  const items = [];
  const seen = new Set();
  for (const city of cityList) {
    const payload = await servigardesGetJson(
      `/api/pharmacies/on-duty?CityId=${encodeURIComponent(city.id)}&NextPeriod=false&Zipcode=${encodeURIComponent(zip)}`
    );
    const interlocutors = Array.isArray(payload?.interlocutors) ? payload.interlocutors : [];
    for (const entry of interlocutors) {
      const mapped = mapServigardesPharmacy(entry);
      const key = `${mapped.name}|${mapped.address}`;
      if (!mapped.name || seen.has(key)) continue;
      seen.add(key);
      items.push(mapped);
    }
  }

  const pos = ctx.lat != null && ctx.lng != null ? { lat: ctx.lat, lng: ctx.lng } : null;
  if (pos) items.sort((a, b) => distanceKm(pos, a) - distanceKm(pos, b));

  return {
    items: pos ? items.slice(0, 3) : items.slice(0, 5),
    provider: "france-servigardes",
    status: items.length ? "ok" : "empty",
    fallbackUrl: "https://www.servigardes.fr/",
    hotline: "0825742030",
  };
}

function lookupFranceFallbackPharmacies(ctx) {
  const zip = String(ctx.postalCode || "").trim();
  const fallbackUrl = zip
    ? `https://www.3237.fr/#/result/list?location=${encodeURIComponent(zip)}&isOnDuty=true`
    : "https://www.3237.fr/";
  return {
    items: [],
    provider: "france-3237",
    status: "fallback",
    message: "Consultez le service officiel 3237 pour la pharmacie de garde la plus proche.",
    fallbackUrl,
    hotline: "3237",
  };
}

function lookupFranceVeterinaryFallback() {
  return {
    items: [],
    provider: "france-3115",
    status: "fallback",
    message: "Pas de source publique fiable pour le veterinaire de garde : appelez le 3115.",
    fallbackUrl: "https://www.veterinaire.fr/je-suis-proprietaire-d-animaux/urgences",
    hotline: "3115",
  };
}

function lookupBelgiumVeterinaryFallback() {
  return {
    items: [],
    provider: "belgium-vet-fallback",
    status: "fallback",
    message: "Service veterinaire de garde : contactez votre veterinaire habituel ou les urgences locales.",
    fallbackUrl: "https://www.veterinaire.be/",
  };
}

/**
 * @param {{ lat?: number|string, lng?: number|string, country?: string, postalCode?: string, city?: string }} options
 */
export async function lookupOnDuty(options = {}) {
  const ctx = await resolveLocationContext(options);
  const belgium = isBelgiumCountry(ctx.country);
  const france = isFranceCountry(ctx.country) || (!belgium && ["59", "62"].includes(ctx.department));
  const servigardesDept = ["59", "62"].includes(ctx.department);

  let pharmacy;
  if (belgium) {
    pharmacy = await lookupBelgiumPharmacies(ctx);
  } else if (france && servigardesDept) {
    pharmacy = await lookupServigardesPharmacies(ctx);
    if (!pharmacy.items.length && pharmacy.status !== "needs_location") {
      pharmacy = lookupFranceFallbackPharmacies(ctx);
    }
  } else if (france) {
    pharmacy = lookupFranceFallbackPharmacies(ctx);
  } else if (ctx.department && servigardesDept) {
    pharmacy = await lookupServigardesPharmacies(ctx);
  } else {
    pharmacy = {
      items: [],
      provider: "unknown",
      status: "unsupported",
      message: "Recherche automatique non disponible pour cette zone.",
    };
  }

  const veterinary = belgium ? lookupBelgiumVeterinaryFallback() : lookupFranceVeterinaryFallback();

  return {
    ok: true,
    resolvedAt: new Date().toISOString(),
    location: {
      lat: ctx.lat,
      lng: ctx.lng,
      country: ctx.country,
      postalCode: ctx.postalCode,
      city: ctx.city,
      department: ctx.department,
    },
    pharmacy,
    veterinary,
  };
}
