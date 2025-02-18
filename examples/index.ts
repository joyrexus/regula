import { Regula, Ruleset, EvaluationInput } from "../src";

const pprint = (obj: any): void => console.log(JSON.stringify(obj, null, 2));

// Define a sample ruleset for a premium membership eligibility check.
const ruleset: Ruleset = {
  name: "Premium Membership Eligibility",
  description:
    "User qualifies for premium membership if they are older than 18 and have an active subscription.",
  rules: [
    {
      // Parent rule: an AND boolean expression that aggregates two conditions.
      name: "Eligibility Check",
      and: [
        {
          // Subrule 1: Check that the user has an active subscription.
          name: "Check Subscription",
          path: "user.subscription.active",
          equals: true,
          result: "Subscription OK",
          dataSource: { type: "async", name: "SubscriptionService" },
        },
        {
          // Subrule 2: Check that the user's age is greater than 18.
          name: "Check Age",
          path: "user.age",
          greaterThan: 18,
          result: "Age OK",
          dataSource: { type: "sync", name: "UserDB" },
        },
      ],
      // Overall result returned if both subrules are satisfied.
      result: "User is eligible for premium membership",
      metaData: { priority: 1, category: "membership" },
    },
  ],
  // Default result returned if the AND expression is not fully satisfied.
  default: "User is not eligible",
};

// Initialize a new Evaluator instance with the ruleset.
const evaluation = Regula.evaluator(ruleset);

// ...... EVALUATION 1 ......

// Define an input object for the first evaluation.
const input1: EvaluationInput = {
  context: {
    dataSource: { type: "sync", name: "UserDB" },
    entityId: "transaction-123",
    timestamp: new Date().toISOString(),
    userId: "user-1",
  },
  data: {
    user: {
      age: 20,
      // No subscription info provided.
    },
  },
};

// Evaluate the input object and get the overall result.
let result = evaluation.evaluate(input1);

console.log(`\nEvaluation ${evaluation.getCount()}: ${result}\n`);
// Evaluation 1: User is not eligible

pprint(evaluation.getLastEvaluation());
// {
//   input: "<input1>",
//   result: "User is not eligible",   // default result since the AND expression is not fully satisfied
//   resultFrom: "default",            // no top-level rule produced the result
//   evaluatedAt: "<timestamp>",
//   evaluatedBy: "user-1"
// }

pprint(evaluation.getResults());
// {
//   "result": "User is not eligible",
//   "resultFrom": "default",
//   "rules": {
//     "Eligibility Check": false
//   }
// }

// ...... EVALUATION 2 ......

// Define a new input object for the second evaluation.
const input2: EvaluationInput = {
  context: {
    dataSource: {
      type: "async",
      name: "SubscriptionService",
      description: "Subscription Service",
    },
    entityId: "transaction-123",
    timestamp: new Date().toISOString(),
    userId: "user-2",
  },
  data: {
    user: {
      subscription: { active: true },
      // No age info provided in this evaluation.
    },
  },
};

result = evaluation.evaluate(input2);

console.log(`\n\nEvaluation ${evaluation.getCount()}: ${result}\n`);
// Evaluation 2: User is eligible for premium membership

pprint(evaluation.getLastEvaluation());
// {
//   input: "<input2>",
//   result: "User is eligible for premium membership",  // now both subrules are satisfied:
//                                                       // "Check Age" uses its stored result (true),
//                                                       // "Check Subscription" now returns true.
//   resultFrom: "Eligibility Check",                    // name of the rule that produced the result
//   evaluatedAt: "<timestamp>",
//   evaluatedBy: "user-2"
// }

pprint(evaluation.getResults());
// {
//   "result": "User is eligible for premium membership",
//   "resultFrom": "Eligibility Check",
//   "rules": {
//     "Eligibility Check": "User is eligible for premium membership"
//   }
// }

// ...... EVALUATION 3 ......

// Define a new input object for the third evaluation.
const input3: EvaluationInput = {
  context: {
    dataSource: {
      type: "async",
      name: "SubscriptionService",
      description: "Subscription Service",
    },
    entityId: "transaction-123",
    timestamp: new Date().toISOString(),
    userId: "user-3",
  },
  data: {
    user: {
      subscription: { active: false },
      // No age info provided in this evaluation.
    },
  },
};

result = evaluation.evaluate(input3);

console.log(`\n\nEvaluation ${evaluation.getCount()}: ${result}\n`);
// Evaluation 3: User is not eligible

pprint(evaluation.getLastEvaluation());
// {
//   input: <input3>,
//   result: "User is not eligible",   // default result is returned
//                                     // because the AND expression is no longer fully satisfied
//                                     // "Check Age" uses its stored result (true),
//                                     // "Check Subscription" now returns false.
//   resultFrom: "default",
//   evaluatedAt: "<timestamp>",
//   evaluatedBy: "user-3"
// }

pprint(evaluation.getResults());
// {
//   "result": "User is not eligible",
//   "resultFrom": "default",
//   "rules": {
//     "Eligibility Check": false
//   }
// }

pprint(evaluation.getSnapshot());
// {
//   "name": "Premium Membership Eligibility",
//   "description": "User qualifies for ...",
//   "rules": [ ... ],
//   "default": "User is not eligible",
//   "lastEvaluation": {
//     "input": <input3>,
//     "result": "User is not eligible",  // default result
//     "resultFrom": null,
//     "evaluatedAt": "<timestamp>",
//     "evaluatedBy": "user-3"
//   }
// }

// Try also the following utility methods:
// evaluation.getCount(); // get the number of evaluations performed
// evaluation.getDataSources(); // get the data sources used in the ruleset
// evaluation.getDeactivatedRules(); // get an array of all deactivated rules
// evaluation.getRuleNames(); // get an array of all rule names in the ruleset
// evaluation.getRule("Check Age"); // get a rule by name
// evaluation.getResult("Check Age"); // get the result of a specific rule
// evaluation.getResult(); // get the overall result
// evaluation.getResults(); // get the overall result and results of all top-level rules
// evaluation.getLastEvaluation(); // get the last top-level evaluation of the ruleset
// evaluation.getLastEvaluation("Check Age"); // get the last evaluation of a specific rule
// evaluation.deactivate(); // deactivate the ruleset
// evaluation.deactivate({ reason: "Testing", updatedBy: "user-1" });
// evaluation.deactivateRule("Check Age"); // deactivate a specific rule
// evaluation.deactivateRule("Check Age", { reason: "Testing", updatedBy: "user-1" });
// evaluation.activateRule("Check Age"); // activate a specific rule
// evaluation.activate(); // activate the ruleset (if deactivated)
// evaluation.toString(); // convert the ruleset to a JSON string
