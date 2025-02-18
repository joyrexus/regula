import { Evaluator } from "../src/evaluator";
import { EvaluationInput, Ruleset } from "../src/types";

describe("Evaluator", () => {
  let ruleset: Ruleset;
  let evaluator: Evaluator;

  beforeEach(() => {
    ruleset = {
      name: "Test Ruleset",
      rules: [
        {
          name: "Rule1",
          path: "user.age",
          greaterThan: 18,
          lastEvaluation: undefined,
        },
        {
          name: "Rule2",
          and: [
            { name: "SubRule1", path: "user.active", equals: true },
            { name: "SubRule2", path: "user.verified", equals: true },
          ],
        },
      ],
    };
    evaluator = new Evaluator(ruleset);
  });

  it("should initialize with a valid ruleset", () => {
    expect(evaluator.ruleset).toBeDefined();
  });

  it("should convert ruleset to string", () => {
    const rulesetString = evaluator.toString();
    expect(typeof rulesetString).toBe("string");
    expect(rulesetString).toContain("Test Ruleset");
  });

  it("should evaluate input data correctly", () => {
    const input: EvaluationInput = {
      context: {
        dataSource: { type: "sync", name: "UserData" },
        entityId: "123",
        timestamp: new Date().toISOString(),
      },
      data: { user: { age: 25, active: true, verified: false } },
    };

    const result = evaluator.evaluate(input);
    expect(result).toBeDefined();
    expect(result).toBe(true);
    expect(evaluator.getResult("Rule1")).toBe(true);
    expect(evaluator.getResult("Rule2")).toBe(false);
    expect(evaluator.getResult("SubRule1")).toBe(true);
    expect(evaluator.getResult("SubRule2")).toBe(false);
  });

  it("should correctly update rule evaluations", () => {
    let input: EvaluationInput = {
      context: {
        dataSource: { type: "sync", name: "UserData" },
        entityId: "123",
        timestamp: new Date().toISOString(),
      },
      data: { user: { age: 30, active: true, verified: true } },
    };

    evaluator.evaluate(input);
    expect(evaluator.getResult("Rule1")).toBe(true);

    input.data.user.age = 15;
    evaluator.evaluate(input);
    expect(evaluator.getResult("Rule1")).toBe(false);
  });
});

describe("Evaluator.getLastResults", () => {
  let ruleset: Ruleset;
  let evaluator: Evaluator;

  beforeEach(() => {
    ruleset = {
      name: "Test Ruleset",
      default: "REJECTED",
      rules: [
        {
          name: "Valid User Check",
          and: [
            { name: "SubRule1", path: "user.active", equals: true },
            { name: "SubRule2", path: "user.verified", equals: true },
          ],
          result: "APPROVED",
        },
      ],
    };
    evaluator = new Evaluator(ruleset);
  });

  it("should return the last evaluation correctly", () => {
    const input: EvaluationInput = {
      context: {
        dataSource: { type: "sync", name: "UserData" },
        timestamp: new Date().toISOString(),
        entityId: "xxx",
        userId: "yyy",
      },
      data: { user: { age: 25, active: true, verified: false } },
    };

    evaluator.evaluate(input);
    const lastEvaluation = evaluator.getLastEvaluation();
    expect(lastEvaluation).toBeDefined();
    expect(lastEvaluation).toEqual({
      evaluatedAt: expect.any(String),
      evaluatedBy: "yyy",
      input: input,
      result: "REJECTED",
      resultFrom: "default",
    });
  });
});
