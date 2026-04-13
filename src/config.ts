import type { ApiConfig } from "./shared";

export const API_CONFIG: ApiConfig = {
  name: "address-validator",
  slug: "address-validator",
  description: "Parse and validate postal addresses -- country detection, component split, postal code verification. US/UK/FR/DE.",
  version: "1.0.0",
  routes: [
    {
      method: "POST",
      path: "/api/validate",
      price: "$0.003",
      description: "Parse, validate, and normalize a postal address",
      toolName: "address_validate",
      toolDescription:
        `Use this when you need to parse, validate, or normalize a postal address. Returns structured address components in JSON.

Returns: 1. components (street, city, state, postalCode, country) 2. valid (boolean) 3. normalizedAddress (formatted string) 4. detectedCountry and countryCode 5. postalCodeValid (boolean) 6. confidence score (0-1).

Example output: {"address":"123 Main St, New York, NY 10001","valid":true,"components":{"street":"123 Main St","city":"New York","state":"NY","postalCode":"10001","country":"United States"},"normalizedAddress":"123 Main St, New York, NY 10001, US","detectedCountry":"United States","postalCodeValid":true,"confidence":0.95}

Use this FOR CRM data cleaning, e-commerce checkout validation, shipping address normalization, and KYC address verification.

Do NOT use for phone validation -- use phone_validate_number instead. Do NOT use for email validation -- use email_verify_address instead. Do NOT use for PII detection in text -- use compliance_detect_pii instead.`,
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
