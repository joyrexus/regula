import { EvaluationInput, Evaluator, Regula, Ruleset } from "../../src";
import ruleset from "./ruleset.json";

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
    entityId: "XXXXXX",
    timestamp: new Date().toISOString(),
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
    entityId: "XXXXXX",
    timestamp: new Date().toISOString(),
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
    entityId: "XXXXXX",
    timestamp: new Date().toISOString(),
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
    entityId: "XXXXXX",
    timestamp: new Date().toISOString(),
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
    entityId: "XXXXXX",
    timestamp: new Date().toISOString(),
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
