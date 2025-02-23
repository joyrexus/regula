import { fromTransition, createActor } from "xstate";
import { Regula, EvaluationInput } from "../../../src";
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

export const submittedGuardActor = createActor(submittedEvaluator);

// // Listen for state changes
// submittedGuardActor.subscribe((snapshot) => {
//   // console.log("Snaphsot:", snapshot);
//   console.log(snapshot.context.getResults());
//   // return workflowActor.send(snapshot.context.getResults());
// });

// submittedGuardActor.start();
// // Initial state: { Pending: false, Approved: undefined, Denied: undefined }

// submittedGuardActor.send({
//   type: "loan.submitted",
//   context: {
//     dataSource: { type: "sync", name: "applicant.profile" },
//     entityId: "XXXXXX",
//     timestamp: new Date().toISOString(),
//     userId: "XXX",
//   },
//   data: {
//     applicant: {
//       age: 20,
//       name: "John Doe",
//       loanAmount: 50000,
//     },
//   },
// });
// // Results: { Pending: true, Approved: false, Denied: false }

// submittedGuardActor.send({
//   type: "loan.submitted",
//   context: {
//     dataSource: { type: "async", name: "employment.check" },
//     entityId: "XXXXXX",
//     timestamp: new Date().toISOString(),
//     userId: "YYY",
//   },
//   data: {
//     applicant: {
//       income: 50000,
//       isEmployed: true,
//     },
//   },
// });
// // Results: { Pending: true, Approved: false, Denied: false }

// submittedGuardActor.send({
//   type: "loan.submitted",
//   context: {
//     dataSource: { type: "async", name: "credit.update" },
//     entityId: "XXXXXX",
//     timestamp: new Date().toISOString(),
//     userId: "ZZZ",
//   },
//   data: {
//     applicant: {
//       creditScore: 525,
//     },
//   },
// });
// // Results: { Pending: false, Approved: true, Denied: false }

// submittedGuardActor.stop();
