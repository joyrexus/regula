# Loan Approval

This example demonstrates how we can check the eligibility of a loan application and approve or reject it based on the applicant's credit score, employment status, income, and other factors.

For the example ([`index.ts`](./index.ts)), we define a ruleset that can produce the following evaluation results:

- `Approved`: The loan application is approved.
- `Denied`: The loan application is denied.
- `Pending`: The loan application is rejected.

The ruleset is defined in the [`ruleset.json`](./ruleset.json) file.

A snapshot of the final evaluation result (produced with `evaluation.toString()`)
can be seen in the [`snapshot.json`](./snapshot.json) file.

---

### Summary of the Loan Application Evaluation Example

This example demonstrates how to use Regula to evaluate a loan application through a series of successive evaluations. It highlights how Regula maintains the state of evaluations over time and adapts to new input from different data sources.

#### **Walkthrough of the Example**

1. **Initialize the Evaluator**

   - A `Regula.evaluator` instance is created using the predefined [`ruleset.json`](./ruleset.json).
   - This evaluator will track evaluation results as new data is received.

2. **First Evaluation: Initial Application Submission**

   - The applicant provides basic information (age, name, loan amount).
   - Since no employment or credit score data has been received yet, the evaluation result is `"Pending"`.

3. **Second Evaluation: Employment Check Completed**

   - The applicant’s income ($50,000) and employment status (`true`) are received.
   - The result remains `"Pending"` because the applicant’s credit score has not been received yet.

4. **Third Evaluation: Initial Credit Score Check**

   - A credit score of `475` is provided.
   - This is below the `500` threshold required for automatic approval, so the result remains `"Pending"`.

5. **Fourth Evaluation: Credit Score Improves**

   - The credit score is updated to `525`, which qualifies the applicant for approval.
   - The evaluation now returns `"Approved"`.

6. **Deactivating the Evaluation**

   - The evaluator is deactivated to prevent further changes (`evaluation.deactivate()`).
   - If an evaluation is attempted while deactivated, an error is thrown.

7. **Handling a Credit Score Drop After Approval**

   - The applicant’s credit score later drops to `225`, below the disqualifying threshold (`250`).
   - Since the evaluator is deactivated, attempting to evaluate again results in an error.
   - The last stored result remains `"Approved"`.

8. **Reactivating and Re-Evaluating**
   - The evaluator is reactivated (`evaluation.activate()`).
   - The new credit score (`225`) is processed.
   - Since it falls below the disqualification threshold, the evaluation result updates to `"Denied"`.

> See the [`snapshot.json`](./snapshot.json) file for a snapshot of the final evaluation result.

#### **Key Takeaways**

- **Successive Evaluations**: The ruleset maintains state across multiple evaluations.
- **Asynchronous Data Handling**: Different data sources (e.g., `credit.update`, `employment.check`) contribute data over time.
- **Mutable Evaluation State**: The evaluation result evolves as more data becomes available.
- **Deactivation and Reactivation**: Evaluations can be frozen and resumed, ensuring stability in decision-making processes.

This example effectively illustrates how Regula can be used to track compliance and business logic over time within an event-driven workflow.
