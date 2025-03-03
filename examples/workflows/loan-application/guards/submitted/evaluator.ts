import { fromTransition, createActor } from "xstate";
import { Regula, EvaluationInput } from "../../../../../src";
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
