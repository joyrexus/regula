# Regula

Regula is a rules engine library specifically designed for compliance tracking within long-running business processes. It provides a structured specification for defining JSON-based rulesets whose evaluations evolve over time based on input from various data sources.

At its core, Regula serves as both a ruleset manager and an evaluator, enabling users to:

- Define and evaluate rulesets whose rules are associated with particular data sources.
- Perform successive evaluations that update the ruleset evaluation state dynamically.
- Evaluate sub-rules independently and aggregate results into a comprehensive snapshot.

By maintaining evaluation state, supporting incremental updates, and tracking data provenance, Regula provides a flexible and reliable framework for compliance monitoring, decision automation, and policy enforcement.

<details><summary><i>What makes Regula unique as a rules engine?</i></summary>
<p>

Regula goes beyond simply defining the conditions and constraints of a ruleset—it provides a dynamic representation of the <b>current state</b> of those rules. Instead of one-off evaluations returning a boolean result, Regula allows you to track the <b>evolution</b> of your ruleset evaluations over time, providing a comprehensive audit trail for compliance monitoring and decision automation.

Regula is particularly useful in cases where you need to ...

<ul>
  <li>Utilize complex decision logic within your workflow platform.</li>
  <li>Trigger evaluations based on asynchronous events (e.g., Kafka topics) or synchronous API calls.</li>
  <li>Return distinct results, depending on which part of your ruleset first evaluates successfully.</li>
  <li>Generate a snapshot of your ruleset's state on every evaluation to track compliance progress and data provenance.</li>
  <li>Maintain a history of your ruleset's evaluations, enabling full auditability.</li>
</ul> 
</p>
</details>

## Examples

- [**Membership Check**](./examples/membership-check/README.md): evaluate a simple ruleset to determine whether a user qualifies for a premium membership.
- [**Loan Application**](./examples/loan-application/README.md): evaluate a loan application through a series of successive evaluations.
- [**Transition Actor**](./examples/transition-actor/README.md): setup a ruleset evaluator as a transition actor for guarding state transitions in a state machine.
- Workflows
  - [**Loan Application**](./examples/workflows/loan-application/README.md): use Regula to guard transitions in a loan application workflow.

## Key Features

- **JSON-Based Rulesets** – Define rules in a structured JSON format, allowing for clear and flexible rule definitions.
- **Mutable Evaluations** – Track rule compliance over time by updating evaluation states dynamically.
- **Incremental Rule Processing** – Independently evaluate sub-rules based on incoming data and aggregate results into an overall compliance state.
- **Data Source Matching** – Automatically determine relevant rules for evaluation by matching incoming data to a rule's `dataSource`.
- **Deactivation Management** – Deactivate rulesets or individual rules to temporarily suspend evaluations, with optional reasons and metadata.
- **Ignore Late-Arriving Data** – Built in support for ignoring late-arriving data with a timestamp precedence check.
- **Successive Evaluations** – Support iterative evaluations where new data can update an existing ruleset evaluation instead of starting from scratch.
- **Introspection** – Easily inspect the current state of a ruleset evaluation, including rule results, evaluation counts, and data sources.
- **Scalability & Extensibility** – Designed to integrate into distributed, event-driven systems with minimal overhead.

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

Data test expressions evaluate incoming data from a specified `field` in the input.

| Expression          | Description                                                                   | Example Usage                                                      |
| ------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `equals`            | Checks if the value equals a specific value.                                  | `"equals": 100`                                                    |
| `equalsOneOf`       | Checks if the value matches one of the provided values.                       | `"equalsOneOf": [100, 200, 300]`                                   |
| `greaterThan`       | Checks if the value is greater than a specified number or string.             | `"greaterThan": 50`                                                |
| `greaterThanEquals` | Checks if the value is greater than or equal to a specified number or string. | `"greaterThanEquals": 50`                                          |
| `lessThan`          | Checks if the value is less than a specified number or string.                | `"lessThan": 20`                                                   |
| `lessThanEquals`    | Checks if the value is less than or equal to a specified number or string.    | `"lessThanEquals": 20`                                             |
| `between`           | Checks if the value is within an inclusive numeric range.                     | `"between": [10, 50]`                                              |
| `includes`          | Checks if a list contains a specified value.                                  | `"includes": "admin"`                                              |
| `includesAny`       | Checks if a list contains any of the specified values.                        | `"includesAny": ["admin", "owner"]`                                |
| `matches`           | Validates a string against a regular expression.                              | `"matches": "^[A-Z]{3}-\\d{4}$"`                                   |
| `isNull`            | Checks if the value is `null`.                                                | `"isNull": true`                                                   |
| `isPresent`         | Checks if the value is present (not `null` or `undefined`).                   | `"isPresent": true`                                                |
| `afterDate`         | Checks if a date is after a specified ISO 8601 timestamp.                     | `"afterDate": "2025-01-01T00:00:00Z"`                              |
| `beforeDate`        | Checks if a date is before a specified ISO 8601 timestamp.                    | `"beforeDate": "2024-12-31T23:59:59Z"`                             |
| `betweenDates`      | Checks if a date falls within a specified range.                              | `"betweenDates": ["2024-01-01T00:00:00Z", "2025-01-01T00:00:00Z"]` |

## Utility Methods

The `Regula` class provides the following static methods:

- `Regula.validate(ruleset)`: validate a ruleset
- `Regula.evaluator(ruleset)`: create an evaluator for a ruleset (returns an `Evaluator` instance)
- `Regula.evaluate(ruleset, input)`: evaluate an input object against a ruleset

The `Evaluator` class provides the following utility methods:

- `evaluation.evaluate(input)`: evaluate an input object against the ruleset
- `evaluation.getSnapshot()`: get a snapshot of the current evaluation state
- `evaluation.getCount()`: get the number of evaluations performed
- `evaluation.getDataSources()`: get the data sources used in the ruleset
- `evaluation.getDeactivatedRules()`: get an array of all deactivated rules
- `evaluation.getRuleNames()`: get an array of all rule names in the ruleset
- `evaluation.getRule("Check Age")`: get a rule by name
- `evaluation.getResult("Check Age")`: get the result of a specific rule
- `evaluation.getResult()`: get the overall result
- `evaluation.getResultRule()`: get the rule that determined the overall result
- `evaluation.getResults()`: get the results of all top-level rules
- `evaluation.getLastEvaluation()`: get the last top-level evaluation of the ruleset
- `evaluation.getLastEvaluation("Check Age")`: get the last evaluation of a specific rule
- `evaluation.deactivate()`: deactivate the ruleset
- `evaluation.deactivate({ reason: "Done", updatedBy: "user-1" })`: deactivate the ruleset with a reason
- `evaluation.deactivateRule("Check Age")`: deactivate a specific rule
- `evaluation.deactivateRule("Check Age", { reason: "Parent approved", updatedBy: "user-1" })`: deactivate a specific rule with a reason
- `evaluation.activateRule("Check Age")`: activate a specific rule
- `evaluation.activate()`: activate the ruleset (if deactivated)
- `evaluation.addMeta("Check Age", { note: "critical" })`: add metadata to a specific rule
- `evaluation.getMeta("Check Age")`: get metadata for a specific rule
- `evaluation.toString()`: convert the ruleset to a JSON string
