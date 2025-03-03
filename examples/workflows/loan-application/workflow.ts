import { fromPromise, setup, assign } from "xstate";

interface SubmittedGuard {
  Approved: boolean;
  Denied: boolean;
  Pending: boolean;
}

export const workflow = setup({
  types: {} as {
    context: {
      userId: string;
      SubmittedGuard: SubmittedGuard;
    };
    input: {
      userId: string;
      SubmittedGuard: SubmittedGuard;
    };
  },
  actors: {
    ApprovedPromise: fromPromise(async () => {
      console.log("Loan application approved");
    }),
    DeniedEmailPromise: fromPromise(async () => {
      console.log("Sending email ... loan application denied");
    }),
  },
  guards: {
    Approved: ({ context }) => {
      return context.SubmittedGuard.Approved;
    },
    Denied: ({ context }) => {
      return context.SubmittedGuard.Denied;
    },
    Pending: ({ context }) => {
      return context.SubmittedGuard.Pending;
    },
  },
}).createMachine({
  id: "loan-application",
  version: "1.0.0",
  on: {
    "submitted.guard.updated": {
      actions: [
        assign({
          SubmittedGuard: ({ event }) => event.data,
        }),
      ],
    },
  },

  initial: "Submitted",
  context: ({ input }) => ({
    userId: input?.userId || "unknown",
    SubmittedGuard: input?.SubmittedGuard || {
      Approved: false,
      Denied: false,
      Pending: false,
    },
  }),
  states: {
    Submitted: {
      always: [
        {
          target: "Approved",
          guard: "Approved",
        },
        {
          target: "Denied",
          guard: "Denied",
        },
        {
          target: "Pending",
          guard: "Pending",
        },
        {
          target: "SubmittedWait",
        },
      ],
    },
    SubmittedWait: {
      on: {
        "submitted.guard.updated": {
          actions: [
            assign({
              SubmittedGuard: ({ event }) => event.data,
            }),
            ({ context }) => {
              console.log(`context is now ${JSON.stringify(context)}`);
            },
          ],
          target: "Submitted",
        },
      },
    },
    Approved: {
      invoke: {
        src: "ApprovedPromise",
        onDone: "End",
        onError: "Denied",
      },
    },
    Denied: {
      invoke: {
        src: "DeniedEmailPromise",
        input: ({ context }) => ({
          userId: context.userId,
        }),
        onDone: "End",
      },
    },
    Pending: {
      on: {
        "submitted.guard.updated": {
          actions: [
            assign({
              SubmittedGuard: ({ event }) => event.data,
            }),
            ({ context }) => {
              console.log(`context is now ${JSON.stringify(context)}`);
            },
          ],
          target: "Submitted",
        },
      },
    },
    End: {
      type: "final",
    },
  },
});
