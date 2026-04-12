import type { ApiConfig } from "./shared";

export const API_CONFIG: ApiConfig = {
  name: "address-validator",
  slug: "address-validator",
  description: "Parse and validate postal addresses. Detect country, normalize components, verify format.",
  version: "1.0.0",
  routes: [
    {
      method: "POST",
      path: "/api/validate",
      price: "$0.003",
      description: "Parse, validate, and normalize a postal address",
      toolName: "address_validate",
      toolDescription:
        "Use this when you need to parse, validate, or normalize a postal address. Splits an address string into components (street, city, state/region, postalCode, country). Validates postal code format per country (US 5-digit/ZIP+4, UK A9 9AA, FR/DE 5-digit). Detects country from postal code pattern. Normalizes state codes to uppercase and city names to proper case. Returns parsed components, validity, normalized address, detected country, and confidence score. Do NOT use for phone validation — use phone_validate_number. Do NOT use for email validation — use email_verify_address.",
      inputSchema: {
        type: "object",
        properties: {
          address: {
            type: "string",
            description: "Full address string to parse and validate (e.g. '123 Main St, New York, NY 10001')",
          },
        },
        required: ["address"],
      },
    },
  ],
};
