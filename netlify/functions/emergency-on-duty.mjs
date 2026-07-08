import { json, corsHeaders } from "./_lib/http.mjs";
import { lookupOnDuty } from "./_lib/on-duty-lookup.mjs";

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders(), body: "" };
  }
  if (event.httpMethod !== "GET") {
    return json(405, { error: "method_not_allowed" });
  }

  try {
    const qs = event.queryStringParameters || {};
    const lat = qs.lat != null ? Number(qs.lat) : undefined;
    const lng = qs.lng != null ? Number(qs.lng) : undefined;
    const payload = await lookupOnDuty({
      lat: Number.isFinite(lat) ? lat : undefined,
      lng: Number.isFinite(lng) ? lng : undefined,
      country: qs.country || qs.countryCode || "",
      postalCode: qs.postalCode || qs.zip || "",
      city: qs.city || "",
    });
    return json(200, payload);
  } catch (error) {
    console.error("[emergency-on-duty]", error);
    return json(500, { ok: false, error: "server_error" });
  }
}
