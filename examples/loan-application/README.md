# Loan Approval

This example demonstrates how we can check the eligibility of a loan application and approve or reject it based on the applicant's credit score, employment status, income, and other factors.

For the example, we define a ruleset that can produce the following evaluation results:
- `Approved`: The loan application is approved.
- `Denied`: The loan application is denied.
- `Pending`: The loan application is rejected.

The ruleset is defined in the `ruleset.json` file.

We first create an instance of the `Evaluator` class and load the ruleset into it.

We then evaluate the ruleset with the applicant's information to determine the loan application's status.

The loan application isn't automatically `Denied` since there is no automatically disqualifying criteria in the application's loan profile.

The loan application isn't automatically `Approved` since the data we have so far doesn't contain all of the qualifying criteria (e.g., sufficient income, employment status, credit score, etc.).

Instead, the initial evaluation result is `Pending` since the applicant's employment verification check and credit score status have not been received yet.

// TODO: Continue walking through what's happening in the example code, step by step.

// Should return "Pending" since the applicant's employment check and credit score results have not been received yet.

// Should return "Pending" since the applicant's credit score has yet to be received.

// Should return "Pending" since the applicant's credit score is still below the threshold for automatic approval.

// Should return "Approved" as the applicant's credit score has been updated to 525.

// Deactivate the evaluation instance.

// Now imagine the applicant's credit score has dropped below the qualifying threshold.

// If we try to evaluate the ruleset again, it will throw an error, as the evaluation instance has been deactivated.

// Should return "Approved" since the evaluation instance has been deactivated and the last result was 
// Reactivate the evaluation instance.

// Now we can evaluate the ruleset again.

// Should return "Denied" as the applicant's credit score is now below the qualifying threshold.
