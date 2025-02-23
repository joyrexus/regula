import { fromTransition, createActor } from "xstate";
import { Regula, EvaluationInput } from "../../src";
import ruleset from "./ruleset.json";

interface Event extends EvaluationInput {
  type: string;
}

// Setup a ruleset evaluator as a transition actor.
const evaluator = fromTransition((evaluation, event: Event) => {
  if (event.type === "xstate.stop") {
    evaluation.deactivate({
      reason: "Loan approval completed",
      user: "XXXXX",
    });
    return evaluation;
  }
  evaluation.evaluate(event);
  return evaluation;
}, Regula.evaluator(ruleset)); // Initial state

const evaluationActor = createActor(evaluator);

// Listen for updated evaluation results from our actor.
evaluationActor.subscribe({
  next(snapshot) {
    console.log("Updated results:", snapshot.context.getResults());
  },
  error(err) {
    console.error(err);
  },
  complete() {
    console.log("Completed");
  },
});

// Now, let's send some events to our evaluation actor and observe
// the evaluaton results (via our snapshot subscription).
async function main() {
  evaluationActor.start();
  // Initial state: { Pending: false, Approved: undefined, Denied: undefined }

  evaluationActor.send({
    type: "applicant.profile",
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
  // Results: { Pending: true, Approved: false, Denied: false }

  // Wait for some time to simulate async data sources.
  await new Promise((resolve) => {
    console.log("Waiting for employment.check and credit.update ...");
    setTimeout(resolve, 2000);
  });

  evaluationActor.send({
    type: "employment.check",
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
  // Results: { Pending: true, Approved: false, Denied: false }

  evaluationActor.send({
    type: "credit.update",
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
  // Results: { Pending: false, Approved: true, Denied: false }

  // evaluationActor.stop();
}

main();
