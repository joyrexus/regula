import { createActor } from "xstate";
import { workflow } from "./workflow";
import { submittedGuardActor } from "./evaluator";

// We need to revise this so that we can optionally pass in
// data for the initial evaluation of the submitted guard actor.
//
// export const workflowActor = createActor(workflow, {
//   input: {
//     userId: "xxx",
//     SubmittedGuard: {
//       Approved: false,
//       Denied: false,
//       Pending: false,
//     },
//   },
// });

export const workflowActor = createActor(workflow);

// Listen for state changes from our workflow actor
workflowActor.subscribe({
  next(snapshot) {
    console.log("workflow state changed to", snapshot.value);
  },
  complete() {
    console.log("workflow completed", workflowActor.getSnapshot().toJSON());
  },
  error(err) {
    console.error("workflow error", err);
  },
});

workflowActor.start();

// Listen for updates from our submitted guard actor
// and send the results to our workflow actor.
submittedGuardActor.subscribe((snapshot) => {
  return workflowActor.send({
    type: "submitted.guard.updated",
    data: snapshot.context.getResults(),
  });
});

submittedGuardActor.start();

// Now, let's send some events to our submitted guard actor
// and see how our workflow actor responds.
async function main() {
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
  // Guard results: { Approved: false, Denied: false, Pending: true }
  //
  // Given our subscription to any state changes from the submitted guard actor,
  // we should see the following event sent to our workflow actor:
  //
  // ```
  // workflowActor.send({
  //   type: "'submitted.guard.updated'",
  //   data: {
  //     Approved: false,
  //     Denied: false,
  //     Pending: true,
  //   },
  // });
  // ```

  // Wait for a bit before sending the next event to simulate async behavior.
  await new Promise((resolve) => setTimeout(resolve, 2000));

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
  // Results: { Approved: false, Denied: false, Pending: true }

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
  // Results: { Approved: true, Denied: false, Pending: false }
}

main();
