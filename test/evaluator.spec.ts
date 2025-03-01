import { Evaluator } from "../src/evaluator";
import { DataTestExpression, EvaluationInput, Ruleset } from "../src/types";
import { EvaluationError } from "../src/errors";

describe("Evaluator", () => {
  let ruleset: Ruleset;
  let evaluator: Evaluator;
  let defaultInput: EvaluationInput;

  beforeEach(() => {
    ruleset = {
      name: "Test Ruleset",
      rules: [
        {
          name: "Rule1",
          path: "user.age",
          greaterThan: 18,
          dataSource: { type: "sync", name: "UserData" },
        },
        {
          name: "Rule2",
          and: [
            { name: "SubRule1", path: "user.active", equals: true },
            { name: "SubRule2", path: "user.verified", equals: true },
          ],
          dataSource: { type: "sync", name: "UserData" },
        },
      ],
    };

    defaultInput = {
      context: {
        dataSource: { type: "sync", name: "UserData" },
        entityId: "123",
        timestamp: new Date().toISOString(),
        userId: "user-123",
      },
      data: { user: { age: 25, active: true, verified: false } },
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

    const prettyString = evaluator.toString({ pretty: true });
    expect(prettyString).toContain("\n");
  });

  it("should evaluate input data correctly", () => {
    const result = evaluator.evaluate(defaultInput);
    expect(result).toBeDefined();
    expect(result).toBe(true);
    expect(evaluator.getResult("Rule1")).toBe(true);
    expect(evaluator.getResult("Rule2")).toBe(false);
    expect(evaluator.getResult("SubRule1")).toBe(true);
    expect(evaluator.getResult("SubRule2")).toBe(false);
  });

  it("should correctly update rule evaluations", () => {
    let input = { ...defaultInput };
    input.data.user.verified = true;

    evaluator.evaluate(input);
    expect(evaluator.getResult("Rule2")).toBe(true);

    input.data.user.active = false;
    evaluator.evaluate(input);
    expect(evaluator.getResult("Rule2")).toBe(false);
  });

  it("should get a snapshot of the ruleset", () => {
    evaluator.evaluate(defaultInput);
    const snapshot = evaluator.getSnapshot();
    expect(snapshot).toEqual(evaluator.ruleset);
    expect(snapshot).not.toBe(evaluator.ruleset); // Different object reference
  });

  it("should get data sources", () => {
    const dataSources = evaluator.getDataSources();
    console.log(evaluator);
    expect(dataSources).toEqual([{ type: "sync", name: "UserData" }]);
  });

  it("should track evaluation count", () => {
    expect(evaluator.getCount()).toBe(0);
    evaluator.evaluate(defaultInput);
    expect(evaluator.getCount()).toBe(1);
    evaluator.evaluate(defaultInput);
    expect(evaluator.getCount()).toBe(2);
  });

  it("should get rules by name", () => {
    const rule1 = evaluator.getRule("Rule1");
    expect(rule1.name).toBe("Rule1");
    expect((rule1 as DataTestExpression).path).toBe("user.age");

    const subRule = evaluator.getRule("SubRule1");
    expect(subRule.name).toBe("SubRule1");
    expect((subRule as DataTestExpression).path).toBe("user.active");

    expect(() => evaluator.getRule("NonExistentRule")).toThrow(EvaluationError);
  });

  it("should get all rule names", () => {
    const names = evaluator.getRuleNames();
    expect(names).toContain("Rule1");
    expect(names).toContain("Rule2");
    expect(names).toContain("SubRule1");
    expect(names).toContain("SubRule2");
    expect(names.length).toBe(4);
  });

  it("should get all deactivated rules", () => {
    expect(evaluator.getDeactivatedRules()).toEqual([]);

    evaluator.deactivateRule("Rule1");
    const deactivated = evaluator.getDeactivatedRules();
    expect(deactivated.length).toBe(1);
    expect(deactivated[0].name).toBe("Rule1");
  });

  it("should handle rule deactivation and activation", () => {
    evaluator.evaluate(defaultInput);
    expect(evaluator.getResult("Rule1")).toBe(true);

    evaluator.deactivateRule("Rule1");
    expect(evaluator.getDeactivatedRules().length).toBe(1);

    evaluator.activateRule("Rule1");
    expect(evaluator.getDeactivatedRules().length).toBe(0);
  });

  it("should deactivate with reason", () => {
    evaluator.deactivateRule("Rule1", {
      reason: "Testing",
      user: "tester",
    });

    const rule = evaluator.getRule("Rule1");
    expect(rule.deactivated).toEqual({
      reason: "Testing",
      updatedBy: "tester",
      updatedAt: expect.any(String),
    });
  });

  it("should set and get rule metadata", () => {
    evaluator.addMeta("Rule1", { priority: "high" });
    expect(evaluator.getMeta("Rule1")).toEqual({ priority: "high" });

    evaluator.addMeta("Rule1", { category: "critical" });
    expect(evaluator.getMeta("Rule1")).toEqual({
      priority: "high",
      category: "critical",
    });
  });

  it("should throw error when getting result for non-existent rule", () => {
    expect(() => evaluator.getResult("NonExistentRule")).toThrow(
      EvaluationError
    );
  });

  it("should get results for all top-level rules", () => {
    evaluator.evaluate(defaultInput);
    const results = evaluator.getResults();
    expect(results).toEqual({
      Rule1: true,
      Rule2: false,
    });
  });

  it("should handle ruleset deactivation and activation", () => {
    evaluator.deactivate({ reason: "Testing", user: "tester" });
    expect(evaluator.ruleset.deactivated).toEqual({
      reason: "Testing",
      updatedBy: "tester",
      updatedAt: expect.any(String),
    });

    expect(() => evaluator.evaluate(defaultInput)).toThrow(EvaluationError);

    evaluator.activate();
    expect(evaluator.ruleset.deactivated).toBe(false);

    // Should not throw after activation
    expect(() => evaluator.evaluate(defaultInput)).not.toThrow();
  });
});

describe("Evaluator.getLastEvaluation", () => {
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

  it("should return the last evaluation for specific rules", () => {
    const input: EvaluationInput = {
      context: {
        dataSource: { type: "sync", name: "UserData" },
        timestamp: new Date().toISOString(),
        entityId: "xxx",
        userId: "yyy",
      },
      data: { user: { age: 25, active: true, verified: true } },
    };

    evaluator.evaluate(input);

    const subRuleEval = evaluator.getLastEvaluation("SubRule1");
    expect(subRuleEval).toBeDefined();
    expect(subRuleEval).toEqual({
      result: true,
      updatedAt: expect.any(String),
      updatedBy: "yyy",
    });
  });

  it("should get the result rule", () => {
    const input: EvaluationInput = {
      context: {
        dataSource: { type: "sync", name: "UserData" },
        timestamp: new Date().toISOString(),
        entityId: "xxx",
        userId: "yyy",
      },
      data: { user: { age: 25, active: true, verified: true } },
    };

    evaluator.evaluate(input);
    const resultRule = evaluator.getResultRule();
    expect(resultRule.name).toBe("Valid User Check");
    expect(resultRule.result).toBe("APPROVED");
  });

  it("should throw error when getting result rule with no evaluation", () => {
    const emptyEvaluator = new Evaluator(ruleset);
    expect(() => emptyEvaluator.getResultRule()).toThrow(EvaluationError);
  });
});
