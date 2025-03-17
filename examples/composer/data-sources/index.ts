import { EvaluationInput, Evaluator, Regula } from "../../../src";

// Initialize a single composer instance
const compose = Regula.composer();

// Specify the data sources and rule parameters to be used in the ruleset
const dataSources = [
  compose
    .dataSource("applicant.profile")
    .type("sync")
    .description("Applicant's profile data")
    .parameters([
      compose
        .parameter("loanAmount")
        .description("The amount of the loan")
        .field("applicant.loanAmount")
        .type("number")
        .meta("unit", "USD")
        .build(),
      compose
        .parameter("applicantAge")
        .description("The age of the applicant")
        .field("applicant.age")
        .type("number")
        .build(),
    ])
    .build(),
  compose
    .dataSource("employment.check")
    .type("async")
    .description("Employment verification report data")
    .parameters([
      compose
        .parameter("applicantIsEmployed")
        .description("Is the applicant currently employed?")
        .field("applicant.isEmployed")
        .type("boolean")
        .build(),
      compose
        .parameter("income")
        .description("The income of the applicant")
        .field("applicant.income")
        .type("number")
        .build(),
    ])
    .build(),
  compose
    .dataSource("credit.update")
    .type("async")
    .description("Credit score data")
    .parameters([
      compose
        .parameter("creditScore")
        .description("The credit score of the applicant")
        .field("applicant.creditScore")
        .type("number")
        .build(),
    ])
    .build(),
];

// Compose a ruleset using the rule parameters from
// the data sources specified above
const ruleset = compose
  .ruleset("Submitted")
  .setup({ dataSources })
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
          .parameter("creditScore")
          .greaterThanEquals(500)
          .build(),
        compose
          .dataTest("Check Income Qualifier")
          .parameter("income")
          .greaterThanEquals(50000)
          .build(),
        compose
          .dataTest("Check Employment Status Qualifier")
          .parameter("applicantIsEmployed")
          .equals(true)
          .build(),
        compose
          .dataTest("Loan Amount Qualifier")
          .parameter("loanAmount")
          .lessThanEquals(100000)
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
          .parameter("applicantAge")
          .lessThan(18)
          .build(),
        compose
          .dataTest("Check Credit Score Disqualifier")
          .parameter("creditScore")
          .lessThan(250)
          .build(),
        compose
          .dataTest("Check Income Disqualifier")
          .parameter("income")
          .lessThan(25000)
          .build(),
        compose
          .dataTest("Check Employment Status Disqualifier")
          .parameter("applicantIsEmployed")
          .equals(false)
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
    console.log(evaluation.toString({ pretty: true }));
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
