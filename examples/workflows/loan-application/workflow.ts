import { fromPromise, setup, assign } from "xstate";

interface SubmittedGuard {
  Approved: boolean;
  Denied: boolean;
  Pending: boolean;
}

interface PendingGuard {
  Approved: boolean;
  Denied: boolean;
}

export const workflow = setup({
  types: {} as {
    context: {
      userUid: string;
      SubmittedGuard: SubmittedGuard;
      PendingGuard: PendingGuard;
    };
    input: {
      userUid: string;
      executionUid: string;
      SubmittedGuard: SubmittedGuard;
      PendingGuard: PendingGuard;
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
    SubmittedToApproved: ({ context }) => {
      return context.SubmittedGuard.Approved;
    },
    SubmittedToDenied: ({ context }) => {
      return context.SubmittedGuard.Denied;
    },
    SubmittedToPending: ({ context }) => {
      return context.SubmittedGuard.Pending;
    },
    PendingToApproved: ({ context }) => {
      return context.PendingGuard.Approved;
    },
    PendingToDenied: ({ context }) => {
      return context.PendingGuard.Denied;
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
        ({ context, event }) => {
          console.log(`event received ${JSON.stringify(event)}`);
          console.log(`context is now ${JSON.stringify(context)}`);
        },
      ],
    },
    "pending.guard.updated": {
      actions: [
        assign({
          PendingGuard: ({ event }) => event.data,
        }),
        ({ context, event }) => {
          console.log(`event received ${JSON.stringify(event)}`);
          console.log(`context is now ${JSON.stringify(context)}`);
        },
      ],
    },
  },

  initial: "Submitted",
  context: ({ input }) => ({
    userUid: input?.userUid || "unknown",
    executionUid: input?.executionUid,
    SubmittedGuard: input?.SubmittedGuard || {
      Approved: false,
      Denied: false,
      Pending: false,
    },
    PendingGuard: input?.PendingGuard || {
      Approved: false,
      Denied: false,
    },
  }),
  states: {
    Submitted: {
      always: [
        {
          target: "Approved",
          guard: "SubmittedToApproved",
        },
        {
          target: "Denied",
          guard: "SubmittedToDenied",
        },
        {
          target: "Pending",
          guard: "SubmittedToPending",
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
              PendingGuard: ({ context }) => ({
                ...context.PendingGuard,
              }),
            }),
            ({ context, event }) => {
              console.log(`event received ${JSON.stringify(event)}`);
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
          userUid: context.userUid,
        }),
        onDone: "End",
      },
    },
    Pending: {
      always: [
        {
          target: "Approved",
          guard: "PendingToApproved",
        },
        {
          target: "Denied",
          guard: "PendingToDenied",
        },
        {
          target: "PendingdWait",
        },
      ],
    },
    PendingdWait: {
      on: {
        "pending.guard.updated": {
          actions: [
            assign({
              PendingGuard: ({ event }) => event.data,
              SubmittedGuard: ({ context }) => ({
                ...context.SubmittedGuard,
              }),
            }),
            ({ context, event }) => {
              console.log(`event received ${JSON.stringify(event)}`);
              console.log(`context is now ${JSON.stringify(context)}`);
            },
          ],
          target: "Pending",
        },
      },
    },
    End: {
      type: "final",
    },
  },
});
