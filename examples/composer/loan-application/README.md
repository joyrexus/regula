# Loan Approval

This example demonstrates how we can compose a ruleset for evaluating loan applications.

In particular, it illustrates how a ruleset's data sources can be specified prior to composing a ruleset, simplifying the composition process: ([`dataSources.json`](./dataSources.json)).

> Instead of specifying each rule's data source when composing a ruleset, we configure the ruleset composer with a list of available data sources and their parameters. This allows us to focus on the logic of the ruleset without getting bogged down in the details of data sources.

```
npm run example:composer:loan-application
```

- [`index.ts`](./index.ts): example code
- [`dataSources.json`](./dataSources.json): configuration file for the ruleset composer, specifying available data sources and their parameters
- [`snapshot.json`](./snapshot.json): snapshot of the final evaluation result

---

## Overview

For the example ([`index.ts`](./index.ts)), we compose a ruleset that can produce the following evaluation results:

- `Approved`: The loan application is approved.
- `Pending`: The loan application is pending.
- `Denied`: The loan application is denied.

A snapshot of the final evaluation result (produced with `evaluation.toString()`)
can be seen in the [`snapshot.json`](./snapshot.json) file.

## Walkthrough

This example demonstrates how to use Regula to evaluate a loan application through a series of successive evaluations. It highlights how Regula maintains the state of evaluations over time and adapts to new input from different data sources.

- **Compose the Ruleset**

  - The `Composer` class is used to create a ruleset that evaluates loan applications.
  - It contains rules that evaluate the applicant’s credit score, employment status, and other factors.

- **Initialize the Evaluator**

  - A `Regula.evaluator` instance is created using the ruleset composed in the previous step.
  - This evaluator will track evaluation results as new data is received.

- **First Evaluation: Initial Application Submission**

  - The applicant provides basic information (age, name, loan amount).
  - Since no employment or credit score data has been received yet, the evaluation result is `"Pending"`.

- **Second Evaluation: Employment Check Completed**

  - The applicant’s income ($50,000) and employment status (`true`) are received.
  - The result remains `"Pending"` because the applicant’s credit score has not been received yet.

- **Third Evaluation: Initial Credit Score Check**

  - A credit score of `475` is provided.
  - This is below the `500` threshold required for automatic approval, so the result remains `"Pending"`.

- **Fourth Evaluation: Credit Score Improves**

  - The credit score is updated to `525`, which qualifies the applicant for approval.
  - The evaluation now returns `"Approved"`.

- **Deactivating the Evaluation**

  - The evaluator is deactivated to prevent further changes (`evaluation.deactivate()`).
  - If an evaluation is attempted while deactivated, an error is thrown.

- **Handling a Credit Score Drop After Approval**

  - The applicant’s credit score later drops to `225`, below the disqualifying threshold (`250`).
  - Since the evaluator is deactivated, attempting to evaluate again results in an error.
  - The last stored result remains `"Approved"`.

- **Reactivating and Re-Evaluating**
  - The evaluator is reactivated (`evaluation.activate()`).
  - The new credit score (`225`) is processed.
  - Since it falls below the disqualification threshold, the evaluation result updates to `"Denied"`.

> See the [`snapshot.json`](./snapshot.json) file for a snapshot of the final evaluation result.

## Key Takeaways

- The `Composer` class simplifies the process of creating rulesets by allowing us to specify data sources and parameters in advance.
