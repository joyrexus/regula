import { Evaluator, Regula, Ruleset } from "../../src";

const VERBOSE = false;

const pprint = (evaluation: Evaluator): void => {
  if (VERBOSE) {
    // console.log(evaluation.getSnapshot());
    console.log(evaluation.toString());
    return;
  }
  console.log(evaluation.getResult());
};

// Define a sample ruleset for a loan approval workflow.
const ruleset: Ruleset = {
  name: "Submitted",
  description:
    "Evaluate loan application based on user's credit score, income, and employment status.",
  rules: [
    {
      name: "Disqualifing Factors",
      or: [
        {
          name: "Check Age Disqualifier",
          path: "user.age",
          lessThan: 18,
          dataSource: { type: "sync", name: "user.profile" },
        },
        {
          name: "Check Credit Score Disqualifier",
          path: "user.creditScore",
          lessThan: 250,
          dataSource: { type: "async", name: "credit.check" },
        },
        {
          name: "Check Income Disqualifier",
          path: "user.income",
          lessThan: 25000,
          dataSource: { type: "async", name: "income.check" },
        },
        {
          name: "Check Employment Status Disqualifier",
          path: "user.isEmployed",
          equals: false,
          dataSource: { type: "async", name: "employment.check" },
        },
      ],
      result: "Denied",
    },
    {
      name: "Qualifying Factors",
      and: [
        {
          name: "Check Credit Score Qualifier",
          path: "user.creditScore",
          greaterThanEquals: 500,
        },
        {
          name: "Check Income Qualifier",
          path: "user.income",
          greaterThanEquals: 50000,
        },
        {
          name: "Check Employment Status Qualifier",
          path: "user.isEmployed",
          equals: true,
        },
      ],
      result: "Approved",
    },
  ],
  default: "Pending",
};

// Initialize a new Evaluator instance with the ruleset.
const evaluation = Regula.evaluator(ruleset);

evaluation.evaluate({
  context: {
    dataSource: { type: "sync", name: "user.profile" },
    entityId: "XXXXXX",
    timestamp: new Date().toISOString(),
    userId: "XXX",
  },
  data: {
    user: {
      age: 20,
      name: "John Doe",
    },
  },
});

pprint(evaluation);

evaluation.evaluate({
  context: {
    dataSource: { type: "async", name: "employment.check" },
    entityId: "XXXXXX",
    timestamp: new Date().toISOString(),
    userId: "YYY",
  },
  data: {
    user: {
      income: 50000,
      isEmployed: true,
    },
  },
});

pprint(evaluation);

evaluation.evaluate({
  context: {
    dataSource: { type: "async", name: "credit.check" },
    entityId: "XXXXXX",
    timestamp: new Date().toISOString(),
    userId: "ZZZ",
  },
  data: {
    user: {
      creditScore: 475,
    },
  },
});

pprint(evaluation);

evaluation.evaluate({
  context: {
    dataSource: { type: "async", name: "credit.update" },
    entityId: "XXXXXX",
    timestamp: new Date().toISOString(),
    userId: "ZZZ",
  },
  data: {
    user: {
      creditScore: 525,
    },
  },
});

pprint(evaluation);

evaluation.deactivate({ reason: "Loan approval completed", user: "admin" });

try {
  evaluation.evaluate({
    context: {
      dataSource: { type: "async", name: "credit.update" },
      entityId: "XXXXXX",
      timestamp: new Date().toISOString(),
      userId: "ZZZ",
    },
    data: {
      user: {
        creditScore: 345, // User's credit score has dropped!
      },
    },
  });
} catch (err) {
  console.log(`Ruleset could not be evaluated: ${err.message}`);
}

pprint(evaluation);
