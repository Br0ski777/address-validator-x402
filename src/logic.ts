import type { Hono } from "hono";


// ATXP: requirePayment only fires inside an ATXP context (set by atxpHono middleware).
// For raw x402 requests, the existing @x402/hono middleware handles the gate.
// If neither protocol is active (ATXP_CONNECTION unset), tryRequirePayment is a no-op.
async function tryRequirePayment(price: number): Promise<void> {
  if (!process.env.ATXP_CONNECTION) return;
  try {
    const { requirePayment } = await import("@atxp/server");
    const BigNumber = (await import("bignumber.js")).default;
    await requirePayment({ price: BigNumber(price) });
  } catch (e: any) {
    if (e?.code === -30402) throw e;
  }
}

interface AddressComponents {
  street: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
}

interface ValidateResult {
  input: string;
  parsed: AddressComponents;
  valid: boolean;
  normalized: string;
  countryDetected: string | null;
  postalCodeValid: boolean;
  confidence: number;
}

const US_STATES: Record<string, string> = {
  alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR", california: "CA",
  colorado: "CO", connecticut: "CT", delaware: "DE", florida: "FL", georgia: "GA",
  hawaii: "HI", idaho: "ID", illinois: "IL", indiana: "IN", iowa: "IA",
  kansas: "KS", kentucky: "KY", louisiana: "LA", maine: "ME", maryland: "MD",
  massachusetts: "MA", michigan: "MI", minnesota: "MN", mississippi: "MS", missouri: "MO",
  montana: "MT", nebraska: "NE", nevada: "NV", "new hampshire": "NH", "new jersey": "NJ",
  "new mexico": "NM", "new york": "NY", "north carolina": "NC", "north dakota": "ND",
  ohio: "OH", oklahoma: "OK", oregon: "OR", pennsylvania: "PA", "rhode island": "RI",
  "south carolina": "SC", "south dakota": "SD", tennessee: "TN", texas: "TX",
  utah: "UT", vermont: "VT", virginia: "VA", washington: "WA", "west virginia": "WV",
  wisconsin: "WI", wyoming: "WY", "district of columbia": "DC",
};

const US_STATE_CODES = new Set(Object.values(US_STATES));

interface PostalFormat {
  country: string;
  regex: RegExp;
  format: string;
}

const POSTAL_FORMATS: PostalFormat[] = [
  { country: "US", regex: /^\d{5}(?:-\d{4})?$/, format: "NNNNN or NNNNN-NNNN" },
  { country: "UK", regex: /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i, format: "A9 9AA" },
  { country: "FR", regex: /^\d{5}$/, format: "NNNNN" },
  { country: "DE", regex: /^\d{5}$/, format: "NNNNN" },
  { country: "CA", regex: /^[A-Z]\d[A-Z]\s*\d[A-Z]\d$/i, format: "A9A 9A9" },
  { country: "AU", regex: /^\d{4}$/, format: "NNNN" },
  { country: "JP", regex: /^\d{3}-?\d{4}$/, format: "NNN-NNNN" },
  { country: "BR", regex: /^\d{5}-?\d{3}$/, format: "NNNNN-NNN" },
];

function detectCountryFromPostal(postalCode: string): string | null {
  // UK has a distinctive format
  if (/^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i.test(postalCode)) return "UK";
  // CA has letter-digit-letter pattern
  if (/^[A-Z]\d[A-Z]\s*\d[A-Z]\d$/i.test(postalCode)) return "CA";
  // US ZIP+4
  if (/^\d{5}-\d{4}$/.test(postalCode)) return "US";
  // BR
  if (/^\d{5}-\d{3}$/.test(postalCode)) return "BR";
  // JP
  if (/^\d{3}-\d{4}$/.test(postalCode)) return "JP";
  // 5 digits could be US, FR, DE — use context
  if (/^\d{5}$/.test(postalCode)) return null; // ambiguous
  // 4 digits
  if (/^\d{4}$/.test(postalCode)) return "AU";
  return null;
}

function validatePostalCode(postalCode: string, country: string | null): boolean {
  if (!postalCode) return false;
  if (country) {
    const format = POSTAL_FORMATS.find((f) => f.country === country);
    if (format) return format.regex.test(postalCode);
  }
  // If no country, check if it matches any format
  return POSTAL_FORMATS.some((f) => f.regex.test(postalCode));
}

function properCase(str: string): string {
  return str.replace(/\b\w+/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase());
}

function normalizeState(state: string): string {
  const lower = state.toLowerCase().trim();
  if (US_STATES[lower]) return US_STATES[lower];
  if (state.length === 2 && US_STATE_CODES.has(state.toUpperCase())) return state.toUpperCase();
  return properCase(state);
}

function parseAddress(address: string): { components: AddressComponents; country: string | null; confidence: number } {
  const trimmed = address.trim();
  let street: string | null = null;
  let city: string | null = null;
  let state: string | null = null;
  let postalCode: string | null = null;
  let country: string | null = null;
  let confidence = 0;

  // Try to extract postal code
  const usZipMatch = trimmed.match(/\b(\d{5}(?:-\d{4})?)\b/);
  const ukPostMatch = trimmed.match(/\b([A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})\b/i);
  const caPostMatch = trimmed.match(/\b([A-Z]\d[A-Z]\s*\d[A-Z]\d)\b/i);

  if (ukPostMatch) {
    postalCode = ukPostMatch[1].toUpperCase();
    country = "UK";
    confidence += 0.3;
  } else if (caPostMatch) {
    postalCode = caPostMatch[1].toUpperCase();
    country = "CA";
    confidence += 0.3;
  } else if (usZipMatch) {
    postalCode = usZipMatch[1];
    confidence += 0.2;
  }

  // Split by comma
  const parts = trimmed.split(",").map((p) => p.trim());

  if (parts.length >= 3) {
    street = parts[0];
    city = parts[1];
    // Last part may have state + zip
    const lastPart = parts[parts.length - 1].trim();
    const stateZipMatch = lastPart.match(/^([A-Za-z\s]+?)\s+(\d{5}(?:-\d{4})?)$/);
    if (stateZipMatch) {
      state = stateZipMatch[1].trim();
      postalCode = postalCode || stateZipMatch[2];
    } else if (lastPart.length <= 3) {
      state = lastPart;
    } else {
      // Could be country or state
      const maybeCountry = lastPart.toLowerCase();
      if (["usa", "us", "united states", "uk", "united kingdom", "france", "germany", "canada", "australia"].includes(maybeCountry)) {
        country = lastPart;
        if (parts.length >= 4) state = parts[parts.length - 2].trim();
      } else {
        state = lastPart;
      }
    }
    confidence += 0.3;
  } else if (parts.length === 2) {
    street = parts[0];
    const secondPart = parts[1].trim();
    const cityStateZip = secondPart.match(/^(.+?)\s+([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$/);
    if (cityStateZip) {
      city = cityStateZip[1];
      state = cityStateZip[2];
      postalCode = postalCode || cityStateZip[3];
      confidence += 0.3;
    } else {
      city = secondPart;
      confidence += 0.1;
    }
  } else {
    // Single line — try to parse
    const fullMatch = trimmed.match(/^(.+?),?\s+(.+?),?\s+([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$/);
    if (fullMatch) {
      street = fullMatch[1];
      city = fullMatch[2];
      state = fullMatch[3];
      postalCode = postalCode || fullMatch[4];
      confidence += 0.3;
    } else {
      street = trimmed;
      confidence += 0.05;
    }
  }

  // Detect country from context
  if (!country && state) {
    const normalizedState = state.toLowerCase().trim();
    if (US_STATES[normalizedState] || (state.length === 2 && US_STATE_CODES.has(state.toUpperCase()))) {
      country = "US";
      confidence += 0.2;
    }
  }
  if (!country && postalCode) {
    const detected = detectCountryFromPostal(postalCode);
    if (detected) {
      country = detected;
      confidence += 0.15;
    }
  }

  // Validate postal code
  if (postalCode && validatePostalCode(postalCode, country)) {
    confidence += 0.1;
  }

  // Base confidence for having street
  if (street && street.match(/\d+\s+\w+/)) confidence += 0.1;

  confidence = Math.min(1, confidence);

  return {
    components: { street, city, state, postalCode, country },
    country,
    confidence: Math.round(confidence * 100) / 100,
  };
}

export function registerRoutes(app: Hono) {
  app.post("/api/validate", async (c) => {
    await tryRequirePayment(0.003);
    const body = await c.req.json().catch(() => null);
    if (!body || !body.address) return c.json({ error: "Missing required field: address" }, 400);
    if (typeof body.address !== "string") return c.json({ error: "Field 'address' must be a string" }, 400);

    const { components, country, confidence } = parseAddress(body.address);

    // Normalize
    const normalizedState = components.state ? normalizeState(components.state) : null;
    const normalizedCity = components.city ? properCase(components.city) : null;

    const parsed: AddressComponents = {
      street: components.street,
      city: normalizedCity,
      state: normalizedState,
      postalCode: components.postalCode,
      country: country,
    };

    const postalCodeValid = components.postalCode ? validatePostalCode(components.postalCode, country) : false;

    // Build normalized address string
    const normalizedParts: string[] = [];
    if (parsed.street) normalizedParts.push(parsed.street);
    if (parsed.city) normalizedParts.push(parsed.city);
    if (parsed.state && parsed.postalCode) normalizedParts.push(`${parsed.state} ${parsed.postalCode}`);
    else if (parsed.state) normalizedParts.push(parsed.state);
    else if (parsed.postalCode) normalizedParts.push(parsed.postalCode);
    if (parsed.country) normalizedParts.push(parsed.country);

    const valid = confidence >= 0.4 && postalCodeValid && !!parsed.city;

    const result: ValidateResult = {
      input: body.address,
      parsed,
      valid,
      normalized: normalizedParts.join(", "),
      countryDetected: country,
      postalCodeValid,
      confidence,
    };

    return c.json(result);
  });
}
