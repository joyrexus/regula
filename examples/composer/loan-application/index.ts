import { EvaluationInput, Evaluator, Regula } from "../../../src";

// Use the Composer to create a new ruleset.
const compose = Regula.composer();

const ruleset = compose
  .ruleset("Submitted")
  .description(
    "Evaluate loan application based on applicant's credit score, income, and employment status."
  )
  .addRule(
    compose
      .boolean("Qualifying Factors")
      .description(
        "Check if the applicant is approved based on certain criteria."
      )
      .and([
        compose
          .dataTest("Check Credit Score Qualifier")
          .field("applicant.creditScore")
          .greaterThanEquals(500)
          .dataSource({ type: "async", name: "credit.update" })
          .build(),
        compose
          .dataTest("Check Income Qualifier")
          .field("applicant.income")
          .greaterThanEquals(50000)
          .dataSource({ type: "async", name: "employment.check" })
          .build(),
        compose
          .dataTest("Check Employment Status Qualifier")
          .field("applicant.isEmployed")
          .equals(true)
          .dataSource({ type: "async", name: "employment.check" })
          .build(),
        compose
          .dataTest("Loan Amount Qualifier")
          .field("applicant.loanAmount")
          .lessThanEquals(100000)
          .dataSource({ type: "sync", name: "applicant.profile" })
          .build(),
      ])
      .result("Approved")
      .build()
  )
  .addRule(
    compose
      .boolean("Disqualifing Factors")
      .description(
        "Check if the applicant should be denied based on certain criteria."
      )
      .or([
        compose
          .dataTest("Check Age Disqualifier")
          .field("applicant.age")
          .lessThan(18)
          .dataSource({ type: "sync", name: "applicant.profile" })
          .build(),
        compose
          .dataTest("Check Credit Score Disqualifier")
          .field("applicant.creditScore")
          .lessThan(250)
          .dataSource({ type: "async", name: "credit.update" })
          .build(),
        compose
          .dataTest("Check Income Disqualifier")
          .field("applicant.income")
          .lessThan(25000)
          .dataSource({ type: "async", name: "employment.check" })
          .build(),
        compose
          .dataTest("Check Employment Status Disqualifier")
          .field("applicant.isEmployed")
          .equals(false)
          .dataSource({ type: "async", name: "employment.check" })
          .build(),
      ])
      .result("Denied")
      .build()
  )
  .defaultResult("Pending")
  .build();

// Set to true to print detailed evaluation snapshots.
const VERBOSE = false;

const pprint = (evaluation: Evaluator): void => {
  if (VERBOSE) {
    // console.log(evaluation.getSnapshot());
    console.log(evaluation.toString());
    return;
  }
  console.log(evaluation.getResult());
};

// Initialize a new Evaluator instance with the ruleset.
const evaluation = Regula.evaluator(ruleset);

evaluation.evaluate({
  context: {
    dataSource: { type: "sync", name: "applicant.profile" },
    timestamp: new Date().toISOString(),
    entityId: "XXXXXX",
    userId: "XXX",
  },
  data: {
    applicant: {
      age: 20,
      name: "John Doe",
      loanAmount: 50000,
    },
  },
});

pprint(evaluation);
// Should return "Pending" since the applicant's employment check and credit score results have not been received yet.

evaluation.evaluate({
  context: {
    dataSource: { type: "async", name: "employment.check" },
    timestamp: new Date().toISOString(),
    entityId: "XXXXXX",
    userId: "YYY",
  },
  data: {
    applicant: {
      income: 50000,
      isEmployed: true,
    },
  },
});

pprint(evaluation);
// Should return "Pending" since the applicant's credit score has yet to be received.

evaluation.evaluate({
  context: {
    dataSource: { type: "async", name: "credit.update" },
    timestamp: new Date().toISOString(),
    entityId: "XXXXXX",
    userId: "ZZZ",
  },
  data: {
    applicant: {
      creditScore: 475, // Applicant's credit score is below the threshold for automatic approval.
    },
  },
});

pprint(evaluation);
// Should return "Pending" since the applicant's credit score is still below the threshold for automatic approval.

evaluation.evaluate({
  context: {
    dataSource: { type: "async", name: "credit.update" },
    timestamp: new Date().toISOString(),
    entityId: "XXXXXX",
    userId: "ZZZ",
  },
  data: {
    applicant: {
      creditScore: 525,
    },
  },
});

pprint(evaluation);
// Should return "Approved" as the applicant's credit score has been updated to 525.

// Deactivate the evaluation instance.
evaluation.deactivate({ reason: "Loan approval completed", user: "admin" });

// Now imagine the applicant's credit score has dropped below the qualifying threshold.
const updatedCreditScore: EvaluationInput = {
  context: {
    dataSource: { type: "async", name: "credit.update" },
    timestamp: new Date().toISOString(),
    entityId: "XXXXXX",
    userId: "ZZZ",
  },
  data: {
    applicant: {
      creditScore: 225, // Applicant's credit score has dropped!
    },
  },
};

// If we try to evaluate the ruleset again, it will throw an error, as the evaluation instance has been deactivated.
try {
  evaluation.evaluate(updatedCreditScore);
} catch (err) {
  console.log(`Ruleset could not be evaluated: ${err.message}`);
}

pprint(evaluation);
// Should return "Approved" since the evaluation instance has been deactivated and the last result was "Approved".

// Reactivate the evaluation instance.
evaluation.activate();

// Now we can evaluate the ruleset again.
evaluation.evaluate(updatedCreditScore);

pprint(evaluation);
// Should return "Denied" as the applicant's credit score is now below the qualifying threshold.

console.log(evaluation.toString({ pretty: true }));
