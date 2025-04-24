# TODO

- [x] update implementation to utilize `EvaluationInput` type
- [x] record user id as found in `input.context` in rule and ruleset `lastEvaluation.updatedBy`
- [x] enable support evaluation of all sub-rules
- [x] add tests for nested boolean expressions
- [x] utilize `lastEvaluation.updatedAt` to avoid evaluating earlier events
      (i.e., for handling event ordering)
- [x] enable support for `beforeDate` and `afterDate` data test expressions
- [x] extend validation to check that the `beforeDate` value is an iso timestamp
- [ ] enable support for a `includesAll` data test expression
- [x] enable support for `new Evaluator(ruleset)`
- [x] extend validation to check that all rules have unique names
- [x] extend the `Evaluator` constructor to create a mapping of rule names
      to their respective JMESPaths to enable efficient lookups of particular rules
- [x] extend the `Evaluator` constructor to create a `dataSources` array on initialization
- [x] create a separate set of unit tests for `Evaluator` (`test/evaluator.spec.ts`)
- [x] use static factory method `Regula.evaluator` to create and return instance of `Evaluator`
- [x] verify that rulesets themselves can be deactivated
- [x] move types from `src/regula.ts` to `./src/types.ts`
- [x] move `Evaluator` from `src/regula.ts` to `src/evaluator.ts`
- [x] create a dedicated repo
- [x] repo: add initial npm run scripts
- [x] ensure that `resultFrom` will indicate `default` if no rule produced the result and a default result was specified
- [x] revise `evaluation.results()` to only return a map of top-level rule names to their results
- [x] include default state in `evaluation.getResults()`
- [x] enable a user to add metadata to a rule
- [x] add an `evaluation.getResultRule()` method to return the rule that produced the last evaluation result
- [x] add example of a ruleset with multiple top-level rules
- [ ] update README for new example, showing significance of rule ordering
- [ ] add tests based on new example above, showing significance of rule ordering
- [ ] add example demonstrating how to get the metadata of the rule that produced the last evaluation result using the `evaluation.getResultRule()` method

---

Repo setup:

- [ ] add links to related libraries in README
- [ ] add license
- [ ] add types
- [ ] build setup
- [ ] npm run scripts
- [ ] npm publish setup

---

Note: we don't need to include/update a `meta` attribute on the `lastEvaluation` of an `Evaluator` instance. Why? Because we can use `evaluation.getResultRule()` to get the rule that was last evaluated (i.e., the `resultFrom` rule).

```ts
const resultRule = evaluation.getResultRule();
if (resultRule) {
  console.log(`Meta from "${resultRule.name}" rule: ${resultRule.meta}`);
}
```

## Evaluator

Enable `Evaluator` support for ...

- [x] evaluation counts (number of times a ruleset was evaluated)
- [x] (de)activating a ruleset
- [x] (de)activating a rule by name
- [x] getting the status/result of a rule by name
- [x] getting the status/result of all rules in a ruleset (a map of rule names to statuses)
- [x] getting the overall status/result of a ruleset
- [x] add an optional `version` attribute `Ruleset`
- [x] add an optional `meta` attribute on `Rule` and `Ruleset`
- [x] `dataSources` array setup by the constructor on initialization
- [x] add a `getDelta()` method to return the last delta of the ruleset
- [x] add a `getRuleDelta()` method to return the last delta of a particular rule

Create unit tests for `Evaluator`:

- [ ] evaluate
- [ ] getCount
- [ ] getRule
- [ ] getRuleNames
- [ ] getDataSources
- [ ] getLastEvaluation
- [ ] getResult
- [ ] getResultRule
- [ ] getDelta
- [ ] getRuleDelta
- [ ] activate
- [ ] activateRule
- [ ] deactivate
- [ ] deactivateRule
- [ ] addMeta
- [ ] getMeta

```ts
import { Evaluator } from "./src/regula/evaluator";

// initialize evaluation of a ruleset
const evaluation = new Evaluator(ruleset);

// deactivate one of the rules in the EvaluatedRuleset by name
evaluation.deactivate("ruleName");

// deactivate the EvaluatedRuleset
evaluation.deactivate();

// activate one of the rules in the EvaluatedRuleset by name
evaluation.activate("ruleName");

// activate the EvaluatedRuleset
evaluation.activate();

// re-evaluate with provided input
evaluation.evaluate(input);

// get the last evaluation
evaluation.getLastEvaluation(); // equivalent to evaluation.ruleset.lastEvaluation

// get the last evaluation of a rule
evaluation.getLastEvaluation("ruleName");

// get the changes resulting from the last evaluation
evaluation.getDelta();

// get the result of the last evaluation
evaluation.getResult(); // equivalent to evaluation.result

// get the result of the last evaluation of a particular rule
evaluation.getResult("ruleName");

// get the evaluation count
evaluation.getCount(); // equivalent to evaluation.count
```

## Composer API

Update the Composer API to accept a configuration object with data sources and parameters. This will make it easier to compose data test rules using predefined parameters.

The config object should have a `dataSources` attribute, an array of data sources, each with a `name`, `type` and `parameters` attributes.

The `parameters` attribute should be an array of parameters, each with a `name`, `field` and `meta` attributes.

```ts
const config = {
  dataSources: [
    {
      name: "draw_event",
      type: "async",
      parameters: [
        {
          name: "Total Draw Amount",
          field: {
            path: "content.total_draw_amount",
            type: "number",
          },
          meta: {},
        },
      ],
    },
  ],
};

const compose = Regula.composer(config);
```

The intent of this update is to make it easier for a user to compose a `dataTest` rule.

A user should have the option of specifying their dataSource parameters up front.

If a user specifies their dataSource parameters in advance, they would only need to specify a parameter by name when composing a `dataTest` rule. The Composer `build` method should use the parameter name to get the corresponding `dataSource` and `field` info when composing the rule.

So, instead of ...

```ts
compose
  .dataTest("Low Draw Amount")
  .field("content.total_draw_amount")
  .lessThan(100)
  .dataSource({ type: "async", name: "credit.update" })
  .build();
```

... a user composing a `dataTest` rule should be able to do ...

```ts
compose
  .dataTest("Low Draw Amount")
  .parameter("Total Draw Amount")
  .lessThan(100)
  .build();
```

The new `.parameter()` method should ...

- lookup the parameter by name from an internal mapping of parameter names to their respective datasource and field info
- only accept a known parameter name as argument, throwing an error otherwise.
- throw an error if the parameter name is not found

The existing `.build()` method should produce the same result as before, but produce the relevant parameter's datasource and field info when building the rule.

### Data Source and Parameter Builders

Consider adding a `dataSource` and `parameter` builder to the Composer API to simplify how data sources and their paramters are defined.

The aim here is to simplify the setup of ruleset configurations by allowing users to define data sources and their parameters in a more structured way.

```ts
const compose = new Composer();
const dataSources = [
    compose
      .dataSource("applicant.profile")
      .type("sync")
      .description("Applicant's profile data")
      .parameters([
        compose
          .parameter("loanAmount")
          .description("The amount of loan requested by the applicant")
          .field("applicant.loanAmount")
          .type("number")
          .meta({ unit: "USD" })
          .build(),
      ])
      .build(),
]

compose
  .ruleset("Submitted")
  .setup( { dataSources } )
  .description(
    "Evaluate loan application based on applicant's credit score, income, and employment status."
  )
  .addRule( ... )
  .build();
```

## Examples

### Xstate Transition Guards

Add an example demonstrating how a regula ruleset evaluation can be be used as a guard on a transition to a new state.

In this example we'll setup a ruleset for each state in the statechart with transitions to other states. Each top-level rule in a ruleset will be a guard for a transition to a new state. So, there will be a one-to-one correspondence between a ruleset and a state (with transitions) in the statechart, as well as between the top-level rules in a ruleset and the transitions to new states.

So, each ruleset should be named after a state (with one or more transitions) in the statechart. Each rule in a ruleset should be named after a transition to a new state and its `result` should be the name of the state to transition to.

Further, each ruleset will be setup as a transitionActor, which is responsible for maintaining and updating the state of the ruleset in response to relevant events.

We'll have a machine with four states: `Submitted`, `Pending`, `Approved`, `Rejected`.

For our xstate example, we'll need to have the transitionActors return the result of their evaluations to update the relevant `context.guard` for the machine (`evaluation.getResult()`).

We can use the machine's top-level `on` event handlers to update the relevant `context.{guard}`.

When the `Submitted` state is entered, the machine will evaluate the guards for the transitions to the other states and transition to the relevant state if possible, otherwise it will transition to the `Wait` state.

- [x] add example of a ruleset evaluator setup as a transition actor
- [x] add example demonstrating how regula can be be used to guard transitions in an xstate machine
- [x] have the workflow subscribe to its snapshot events (i.e., updates to its state)
- [x] handle events received by the subscription to update the workflow context, setting the current state of each top-level rule in the ruleset
- [x] add a wait state as the fall-through default if the current state of the guards do not permit transition to a new target state, viz. to listen for prior-state guard ruleset updated events ... and after receiving such events, do an assign to update the guard context and transition to the prior state

### Restate + Xstate

Create an example demonstrating how regula ruleset evaluations can be be used to guard transitions in an xstate machine, where the machine is executed in a lambda and persists its state (both the state of the workflow and its ruleset evaluations) in a dynamodb table. So, the lambda will be executed whenever receiving an initiating event or an event from one its async data sources.

The example should be based on [this blog post](https://restate.dev/blog/persistent-serverless-state-machines-with-xstate-and-restate/) and [code examples](https://github.com/restatedev/xstate/tree/main/examples).

### XState Store

Create an example demonstrating how to update rule parameters in an xstate store.

In this example, we'd have two event data sources, each with one or more parameters. The idea is to update the statechart's execution context with the latest values of these parameters as new event data is received.

Instead of updating the state of the rule evaluations corresponding to particular transition guards, we'll update the guard evaluation criteria (the statechart's rule parameters) as evaluation criteria is received from relevant event sources.
