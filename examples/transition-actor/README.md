# Evaluator as Transition Actor

```
npm install
npm start
```

- [`main.ts`](./main.ts): example code
- [`ruleset.json`](./ruleset.json): ruleset definition for the `Submitted` state of a loan application workflow

This example demonstrates how to configure a Ruleset Evaluator as a [Transition Actor](https://stately.ai/docs/transition-actors).

Such a setup can be useful for [guarding](https://stately.ai/docs/guards) [transitions](https://stately.ai/docs/transitions) from a particular [state](https://stately.ai/docs/states) in a [state machine](https://stately.ai/docs/machines), where the transition is only allowed if an evaluation result matches a certain condition.

In another example, we'll show how the we can use such an actor to transition a state machine for a loan application workflow based on the evaluation results of the ruleset as new evaluation criteria is received.
