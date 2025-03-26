# Validation Example

This example demonstrates how to use Regula's validation utilities to ensure configuration objects are valid before using them in your application. The Validator class provides methods for validating various Regula objects, including data sources, rules, rulesets, and evaluated rulesets.

```
npm run example:validation
```

- [`index.ts`](./index.ts): example code
- [`fixtures/dataSources.json`](./fixtures/dataSources.json): example data sources configuration
- [`fixtures/ruleset.json`](./fixtures/ruleset.json): example ruleset definition
- [`fixtures/snapshot.json`](./fixtures/snapshot.json): example evaluated ruleset

---

## Overview

The example in [`index.ts`](./index.ts) shows how to validate different types of configuration objects:

- **Validating Data Sources**

  - Validates a single data source
  - Validates an array of data sources

- **Validating Rules and Rulesets**

  - Validates a ruleset configuration
  - Shows that a simple ruleset can also be a valid evaluated ruleset

- **Validating Evaluated Rulesets**

  - Validates a complete snapshot of an evaluated ruleset

## Key Takeaways

- **Schema Validation**: The validator uses [Zod](https://github.com/colinhacks/zod) for robust schema validation with helpful error messages.

- **Type Safety**: Validation functions return properly typed objects, enhancing type safety in your application.

- **Early Error Detection**: Validating configurations before using them helps catch issues early in the development process.

- **Recursive Validation**: Complex nested structures like boolean expressions with nested rules are correctly validated.
