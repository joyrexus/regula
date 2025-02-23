# Transition Actor

```
npm install
npm start
```

- [`main.ts`](./main.ts): configure our ruleset evaluator as a transition actor
- [`ruleset.json`](./ruleset.json): ruleset definition specifying transition conditions for the `Submitted` state of a [loan application workflow](../workflows/loan-application)

This example demonstrates how to configure a Ruleset Evaluator as a [Transition Actor](https://stately.ai/docs/transition-actors).

Such an actor can be useful for [guarding](https://stately.ai/docs/guards) [transitions](https://stately.ai/docs/transitions) from a particular [state](https://stately.ai/docs/states) in a [state machine](https://stately.ai/docs/machines), where the transition is only allowed if an evaluation result matches a certain condition.

In [another example](../workflows/loan-application), we'll show how the we can use this ruleset evaluation actor to guard the transitions from the initial `Submitted` state in a loan application workflow.
