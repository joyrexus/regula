# TODO

- [x] update implementation to utilize `EvaluationInput` type
- [x] record user id as found in `input.context` in rule and ruleset `lastEvaluation.updatedBy`
- [x] enable support evaluation of all sub-rules
- [x] add tests for nested boolean expressions
- [x] utilize `lastEvaluation.updatedAt` to avoid evaluating earlier events
      (i.e., for handling event ordering)
- [x] enable support for `beforeDate` and `afterDate` data test expressions
- [x] extend validation to check that the `beforeDate` value is an iso timestamp
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
- [x] ensure that `resultFrom` will indicate `default` if no rule produced the result and a default result was specified
- [x] revise `evaluation.results()` to only return a map of top-level rule names to their results
- [x] include default state in `evaluation.getResults()`
- [x] enable a user to add metadata to a rule
- [x] add an `evaluation.getResultRule()` method to return the rule that produced the last evaluation result
- [x] add example of a ruleset with multiple top-level rules
- [ ] update README for new example, showing significance of rule ordering
- [ ] add tests based on new example above, showing significance of rule ordering
- [ ] add example demonstrating how to get the metadata of the rule that produced the last evaluation result using the `evaluation.getResultRule()` method
- [ ] repo: README with links to related libraries
- [ ] repo: license
- [ ] repo: build setup
- [ ] repo: npm run scripts
- [ ] repo: npm publish setup

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

Create unit tests for `Evaluator`:

- [ ] evaluate
- [ ] getCount
- [ ] getRule
- [ ] getRuleNames
- [ ] getDataSources
- [ ] getLastEvaluation
- [ ] getResult
- [ ] getResultRule
- [ ] activate
- [ ] activateRule
- [ ] deactivate
- [ ] deactivateRule
- [ ] addMeta
- [ ] getMeta

```ts
import { Evaluator } from "./src/regula/evaluator";

// Initialize evaluation of a ruleset.
const evaluation = new Evaluator(ruleset);

// it should deactivate one of the rules in the EvaluatedRuleset by name
evaluation.deactivate("ruleName");

// it should deactivate the EvaluatedRuleset
evaluation.deactivate();

// it should activate one of the rules in the EvaluatedRuleset by name
evaluation.activate("ruleName");

// it should activate the EvaluatedRuleset
evaluation.activate();

// it should re-evaluate the ruleset with provided input.
evaluation.evaluate(input);

// it should get the last evaluation of the ruleset.
evaluation.getLastEvaluation(); // equivalent to evaluation.ruleset.lastEvaluation

// it should get the last evaluation of a rule.
evaluation.getLastEvaluation("ruleName");

// it should get the result of the last evaluation.
evaluation.getResult(); // equivalent to evaluation.result

// Get the result of the last evaluation of a particular rule.
evaluation.getResult("ruleName");

// it should get the count of evaluations.
evaluation.getCount(); // equivalent to evaluation.count
```

## Examples

### Current Task

We need to update the Xstate Transition Guards example.

In particular, when entering the `Submitted` state, we need to setup and invoke the `SubmittedEvaluator` transition actor for the `Submitted` state (i.e., a ruleset evaluator for the transition guards in the `Submitted` state) to get the current state of the ruleset and do an assignment to update the workflow context (`context.SubmittedGuard`) with the result of the evaluation.

After the `context.SubmittedGuard` is updated, the workflow should then immediately transition to the new state (if one of the guarded transitions is permitted). Otherwise, it should transition to the `SubmittedWait` state.

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
- [ ] invoke a state's transition actor (i.e., guard ruleset evaluator) when entering the state it's guarding to get current state of the ruleset
- [ ] provide more details about the example in the README

## Restate + Xstate

Create an example demonstrating how regula ruleset evaluations can be be used to guard transitions in an xstate machine, where the machine is executed in a lambda and persists its state (both the state of the workflow and its ruleset evaluations) in a dynamodb table. So, the lambda will be executed whenever receiving an initiating event or an event from one its async data sources.
