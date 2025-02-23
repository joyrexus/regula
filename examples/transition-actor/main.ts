import { fromTransition, createActor } from "xstate";
import { Regula, EvaluationInput } from "../../src";
import ruleset from "./ruleset.json";

interface Event extends EvaluationInput {
  type: string;
}

// Setup a guard evaluator for the `Submitted` state as a transition actor.
const submittedEvaluator = fromTransition((evaluation, event: Event) => {
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

const submittedGuardActor = createActor(submittedEvaluator);

// Listen for updated evaluation results from our submitted guard actor
submittedGuardActor.subscribe({
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

// Now, let's send some events to our guard evaluator
// and observe the evaluaton results (via our snapshot subscription).
async function main() {
  submittedGuardActor.start();
  // Initial state: { Pending: false, Approved: undefined, Denied: undefined }

  submittedGuardActor.send({
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

  // wait for 2 seconds
  await new Promise((resolve) => {
    console.log("Waiting for employment.check and credit.update ...");
    setTimeout(resolve, 2000);
  });

  submittedGuardActor.send({
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

  submittedGuardActor.send({
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

  // submittedGuardActor.stop();
}

main();
