# Address Validator API

[![MCP Server](https://img.shields.io/badge/MCP-server-blue)](https://address-validator.api.klymax402.com/mcp)
[![x402](https://img.shields.io/badge/payments-x402-6E56CF)](https://x402.org)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)

Parse and validate postal addresses -- country detection, component split, postal code verification. US/UK/FR/DE. Pay-per-call via [x402](https://x402.org) (USDC on Base L2) -- no API key, no signup, no rate-limit wall.

Part of the [klymax402](https://klymax402.com) marketplace -- 100 x402 micropayment APIs for AI agents, one wallet, USDC on Base.

## Quickstart -- MCP

Add to your MCP client config (Claude Desktop, Cursor, ElizaOS, etc.):

```json
{
  "mcpServers": {
    "address-validator": {
      "url": "https://address-validator.api.klymax402.com/mcp"
    }
  }
}
```

## Quickstart -- HTTP (x402)

```bash
curl -X POST "https://address-validator.api.klymax402.com/api/validate" \
  -H "Content-Type: application/json" \
  -d '{"address":"0x0000000000000000000000000000000000dEaD"}'
# -> 402 Payment Required, with an x402 payment challenge in the response body
```

Any x402-aware client ([`@x402/fetch`](https://www.npmjs.com/package/@x402/fetch), [`x402-agent-tools`](https://www.npmjs.com/package/x402-agent-tools), ATXP) handles the 402 -> sign -> retry cycle automatically.

## Tools

| Tool | Method | Path | Price | Description |
|---|---|---|---|---|
| `address_validate` | POST | `/api/validate` | $0.003 | Parse, validate, and normalize a postal address |

### `address_validate`

Use this when you need to parse, validate, or normalize a postal address. Returns structured address components in JSON.

**Parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `address` | string | yes | Full address string to parse and validate (e.g. '123 Main St, New York, NY 10001') |

Example response:

```json
{"address":"123 Main St, New York, NY 10001","valid":true,"components":{"street":"123 Main St","city":"New York","state":"NY","postalCode":"10001","country":"United States"},"normalizedAddress":"123 Main St, New York, NY 10001, US","detectedCountry":"United States","postalCodeValid":true,"confidence":0.95}
```

**When to use**: CRM data cleaning, e-commerce checkout validation, shipping address normalization, and KYC address verification.

**Not for**: phone validation (use `phone_validate_number`), email validation (use `email_verify_address`), PII detection in text (use `compliance_detect_pii`).

## Example agent prompts

- "Parse, validate, or normalize a postal address"

## Payment

- Protocol: [x402](https://x402.org) -- HTTP-native pay-per-call, no signup, no API key
- Network: Base L2 (`eip155:8453`)
- Asset: USDC
- Facilitator: Coinbase CDP (primary), PayAI (fallback)

## Part of klymax402

100 x402 micropayment APIs for AI agents -- one wallet, USDC on Base, zero signup.

- Catalog: https://klymax402.com/llms.txt
- Full API reference: https://klymax402.com/llms-full.txt
- Live stats: https://klymax402.com/stats

## License

MIT
