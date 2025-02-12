# Regula

Regula is a rules engine library specifically designed for compliance tracking within long-running business processes. It provides a structured specification for defining JSON-based rulesets whose evaluations evolve over time based on input from various data sources.

At its core, Regula serves as both a ruleset manager and an evaluator, enabling users to:

- Define and evaluate rulesets whose rules are associated with particular data sources.
- Perform successive evaluations that update the ruleset evaluation state dynamically.
- Evaluate sub-rules independently and aggregate results into a comprehensive snapshot.

By maintaining evaluation state and supporting incremental updates, Regula provides a flexible and reliable framework for compliance monitoring, decision automation, and policy enforcement when dealing with long-running business processes operating in event-driven environments.

## Key Features

- **JSON-Based Rulesets** – Define rules in a structured JSON format, allowing for clear and flexible rule definitions.
- **Mutable Evaluations** – Track rule compliance over time by updating evaluation states dynamically.
- **Incremental Rule Processing** – Independently evaluate sub-rules based on incoming data and aggregate results into an overall compliance state.
- **Data Source Matching** – Automatically determine relevant evaluation records by matching incoming data to a rule's `dataSource`.
- **Successive Evaluations** – Support iterative evaluations where new data can update an existing ruleset evaluation instead of starting from scratch.
- **Scalability & Extensibility** – Designed to integrate into distributed, event-driven systems with minimal overhead.

Regula is particularly useful in cases where you need to ...

- Trigger evaluations based on asynchronous events (e.g., Kafka topics) or synchronous API calls.
- Generate a snapshot of a ruleset’s state on every evaluation to track compliance progress.
- Maintain a history of a ruleset's evaluations, enabling full auditability.

## Supported Expressions

Regula rulesets support two types of rule expressions:

- **Boolean Expressions** – Used to define logical relationships between multiple rules.
- **Data Test Expressions** – Used to evaluate specific conditions on incoming data.

### Boolean Expressions

Boolean expressions allow for logical combinations of rules using `and`, `or`, and `not`.

| Expression | Description                          | Example Usage           |
| ---------- | ------------------------------------ | ----------------------- |
| `and`      | All conditions must be true.         | `"and": [{...}, {...}]` |
| `or`       | At least one condition must be true. | `"or": [{...}, {...}]`  |
| `not`      | Negates a condition.                 | `"not": {...}`          |

---

### Data Test Expressions

Data test expressions evaluate incoming data from a specified `path` and, optionally, a `dataSource`.

| Expression     | Description                                                       | Example Usage                                                      |
| -------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------ |
| `equals`       | Checks if the value equals a specific value.                      | `"equals": 100`                                                    |
| `equalsOneOf`  | Checks if the value matches one of the provided values.           | `"equalsOneOf": [100, 200, 300]`                                   |
| `greaterThan`  | Checks if the value is greater than a specified number or string. | `"greaterThan": 50`                                                |
| `lessThan`     | Checks if the value is less than a specified number or string.    | `"lessThan": 20`                                                   |
| `between`      | Checks if the value is within an inclusive numeric range.         | `"between": [10, 50]`                                              |
| `includes`     | Checks if a list contains a specified value.                      | `"includes": "admin"`                                              |
| `matches`      | Validates a string against a regular expression.                  | `"matches": "^[A-Z]{3}-\\d{4}$"`                                   |
| `isNull`       | Checks if the value is `null`.                                    | `"isNull": true`                                                   |
| `isPresent`    | Checks if the value is present (not `null` or `undefined`).       | `"isPresent": true`                                                |
| `afterDate`    | Checks if a date is after a specified ISO 8601 timestamp.         | `"afterDate": "2025-01-01T00:00:00Z"`                              |
| `beforeDate`   | Checks if a date is before a specified ISO 8601 timestamp.        | `"beforeDate": "2024-12-31T23:59:59Z"`                             |
| `betweenDates` | Checks if a date falls within a specified range.                  | `"betweenDates": ["2024-01-01T00:00:00Z", "2025-01-01T00:00:00Z"]` |

---

## Example Usage

> See [`./examples/index.ts`](https://github.com/joyrexus/regula/blob/main/examples/index.ts), which can be run with `npm start` for a quick demonstration.

```ts
import { Regula, Ruleset, EvaluationInput } from "../src";

// Define a sample ruleset for a premium membership eligibility check.
const ruleset: Ruleset = {
  name: "Premium Membership Eligibility",
  description:
    "User qualifies for premium membership if they are older than 18 and have an active subscription.",
  rules: [
    {
      // Parent rule: an AND boolean expression that aggregates two conditions.
      name: "Eligibility Check",
      and: [
        {
          // Subrule 1: Check that the user has an active subscription.
          name: "Check Subscription",
          path: "user.subscription.active",
          equals: true,
          result: "Subscription OK",
          dataSource: { type: "async", name: "SubscriptionService" },
        },
        {
          // Subrule 2: Check that the user's age is greater than 18.
          name: "Check Age",
          path: "user.age",
          greaterThan: 18,
          result: "Age OK",
          dataSource: { type: "sync", name: "UserDB" },
        },
      ],
      // Overall result returned if both subrules are satisfied.
      result: "User is eligible for premium membership",
    },
  ],
  // Default result returned if the AND expression is not fully satisfied.
  default: "User is not eligible",
};

// Initialize a new Evaluator instance with the ruleset.
const evaluation = Regula.evaluator(ruleset);

// Define an input object for the first evaluation.
const input: EvaluationInput = {
  context: {
    dataSource: { type: "sync", name: "UserDB" },
    entityId: "transaction-123",
    timestamp: new Date().toISOString(),
    userId: "user-1",
  },
  data: {
    user: {
      age: 20,
      // No subscription info provided.
    },
  },
};

// Evaluate the input object and get the overall result.
let result = evaluation.evaluate(input); // User is not eligible
```

## Utility Methods

The `Regula` class provides the following static methods:

- `Regula.validate(ruleset)`: validate a ruleset
- `Regula.evaluator(ruleset)`: create an evaluator for a ruleset (returns an `Evaluator` instance)
- `Regula.evaluate(ruleset, input)`: evaluate an input object against a ruleset

The `Evaluator` class provides the following utility methods:

- `evaluation.getSnapshot()`: get a snapshot of the current evaluation state
- `evaluation.getCount()`: get the number of evaluations performed
- `evaluation.getDataSources()`: get the data sources used in the ruleset
- `evaluation.getRuleNames()`: get an array of all rule names in the ruleset
- `evaluation.getRule("Check Age")`: get a rule by name
- `evaluation.getResult("Check Age")`: get the result of a specific rule
- `evaluation.getResult()`: get the overall result
- `evaluation.getResults()`: get the results of all rules
- `evaluation.getLastEvaluation()`: get the last top-level evaluation of the ruleset
- `evaluation.getLastEvaluation("Check Age")`: get the last evaluation of a specific rule
- `evaluation.deactivate()`: deactivate the ruleset
- `evaluation.deactivate({ reason: "Testing", updatedBy: "user-1" })`: deactivate the ruleset with a reason
- `evaluation.deactivateRule("Check Age")`: deactivate a specific rule
- `evaluation.deactivateRule("Check Age", { reason: "Testing", updatedBy: "user-1" })`: deactivate a specific rule with a reason
- `evaluation.activateRule("Check Age")`: activate a specific rule
- `evaluation.activate()`: activate the ruleset (if deactivated)
- `evaluation.toString()`: convert the ruleset to string
