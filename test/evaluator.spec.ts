import { Evaluator } from "../src/evaluator";
import { DataTestExpression, EvaluationInput, Ruleset } from "../src/types";
import { EvaluationError } from "../src/errors";

function makeEvaluationInput(): EvaluationInput {
  return {
    context: {
      dataSource: { type: "sync", name: "UserData" },
      entityId: "123",
      timestamp: new Date().toISOString(),
      userId: "user-123",
    },
    data: { user: { age: 25, active: true, verified: false } },
  };
}

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
          field: "user.age",
          greaterThan: 18,
          dataSource: { type: "sync", name: "UserData" },
        },
        {
          name: "Rule2",
          and: [
            { name: "SubRule1", field: "user.active", equals: true },
            { name: "SubRule2", field: "user.verified", equals: true },
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

  afterEach(() => {
    evaluator = null; // Clean up the evaluator instance after each test
    ruleset = null;
    defaultInput = null;
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
    expect(result).toBe(evaluator.getResult());
    expect(evaluator.getResult("Rule1")).toBe(true);
    expect(evaluator.getResult("Rule2")).toBe(false);
    expect(evaluator.getResult("SubRule1")).toBe(true);
    expect(evaluator.getResult("SubRule2")).toBe(false);
  });

  it("should correctly update rule evaluations", () => {
    const input1 = makeEvaluationInput();
    input1.data.user.verified = true;

    evaluator.evaluate(input1);
    expect(evaluator.getResult("Rule2")).toBe(true);

    const input2 = makeEvaluationInput();
    input2.data.user.verified = false;

    evaluator.evaluate(input2);
    // expect(evaluation.ruleset).toBe({});
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
    expect((rule1 as DataTestExpression).field).toBe("user.age");

    const subRule = evaluator.getRule("SubRule1");
    expect(subRule.name).toBe("SubRule1");
    expect((subRule as DataTestExpression).field).toBe("user.active");

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

  it("should provide delta of evaluation results", () => {
    // Initial evaluation
    const input1 = makeEvaluationInput();
    evaluator.evaluate(input1);
    let delta = evaluator.getDelta();
    expect(delta.ruleset.updated).toBe(true);
    expect(delta.ruleset.from).toBe(null);
    expect(delta.ruleset.to).toBe(true);
    expect(delta.rules["Rule2"]).toEqual({ from: null, to: false });
    expect(delta.rules["SubRule1"]).toEqual({ from: null, to: true });
    expect(delta.rules["SubRule2"]).toEqual({ from: null, to: false });

    // Change input to trigger rule2 to true
    const input2 = makeEvaluationInput();
    input2.data.user.verified = true;

    evaluator.evaluate(input2);
    delta = evaluator.getDelta();

    expect(delta.ruleset.updated).toBe(false);
    expect(delta.ruleset.from).toBeUndefined();
    expect(delta.ruleset.to).toBeUndefined();

    expect(delta.rules["Rule2"]).toEqual({ from: false, to: true });
    expect(delta.rules["SubRule2"]).toEqual({ from: false, to: true });

    // Rule1 and SubRule1 should not appear in delta as their results did not change
    expect(delta.rules["Rule1"]).toBeUndefined();
    expect(delta.rules["SubRule1"]).toBeUndefined();
  });

  it("should provide delta of an individual rule result", () => {
    const input1 = makeEvaluationInput();
    evaluator.evaluate(input1);
    expect(evaluator.getRuleDelta("SubRule1")).toEqual({
      from: null,
      to: true,
    });
    expect(evaluator.getRuleDelta("SubRule2")).toEqual({
      from: null,
      to: false,
    });
  });

  it("should throw if getDelta is called before an evaluation was run", () => {
    expect(() => evaluator.getDelta()).toThrow("No evaluations have been performed yet. Please evaluate first.");
    evaluator.evaluate(defaultInput);
    expect(() => evaluator.getDelta()).not.toThrow();
  });

  it("should show rule delta from null to true/false on first evaluation", () => {
    const ruleset = {
      name: "Test Ruleset",
      rules: [
        {
          name: "Rule1",
          field: "user.age",
          greaterThan: 18,
          dataSource: { type: "sync", name: "UserData" },
        },
        {
          name: "Rule2",
          and: [
            { name: "SubRule1", field: "user.active", equals: true },
            { name: "SubRule2", field: "user.verified", equals: true },
          ],
          dataSource: { type: "sync", name: "UserData" },
        },
      ],
    } as Ruleset;
    const evaluator = new Evaluator(ruleset);

    const input1 = makeEvaluationInput();
    evaluator.evaluate(input1);

    // Change input to trigger a rule change
    const input2 = makeEvaluationInput();
    input2.data.user.active = false;
    evaluator.evaluate(input2);

    const delta = evaluator.getDelta();
    expect(delta.rules["SubRule1"]).toEqual({ from: true, to: false });
    // Only changed rules are present
    expect(Object.keys(delta.rules)).toEqual(["SubRule1"]);
  });

  it("should return null from getDelta when no rules change between evaluations", () => {
    // Initial evaluation
    const input = makeEvaluationInput();
    evaluator.evaluate(input);

    // Second evaluation with the same data (no changes)
    evaluator.evaluate({...input});

    // Delta should be null when no rule results change
    const delta = evaluator.getDelta();
    expect(delta).toBeNull();
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
            { name: "SubRule1", field: "user.active", equals: true },
            { name: "SubRule2", field: "user.verified", equals: true },
          ],
          result: "APPROVED",
        },
      ],
    };
    evaluator = new Evaluator(ruleset);
  });

  afterEach(() => {
    evaluator = null; // Clean up the evaluator instance after each test
    ruleset = null;
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
      input: JSON.stringify(input),
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

  it("should get the rule that produced the result", () => {
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

/**
 * Here's a test that demonstrates the significance of ordering in top-level rules for the Evaluator.
 *
 * This test demonstrates:
 *
 * - The importance of rule ordering by showing that when multiple rules evaluate to true, the first one in order determines the overall result
 * - That all rules are still evaluated even after finding a true result
 * - That the order remains important even when the ruleset definition is changed
 * - How deactivating rules affects which rule determines the result
 *
 * The test explicitly shows three scenarios:
 * - When only the last rule is true
 * - When multiple rules (but not all) are true
 * - When all rules are true
 *
 * Each scenario verifies that the first truthy rule in order becomes the determining rule for the overall evaluation result.
 */
describe("Evaluator rule ordering", () => {
  it("should respect the order of top-level rules when determining the overall result", () => {
    // Define a ruleset with three top-level rules in specific order
    const orderingRuleset: Ruleset = {
      name: "Rule Ordering Test",
      rules: [
        {
          name: "Rule A",
          field: "user.age",
          greaterThan: 30,
          result: "RESULT_A",
        },
        {
          name: "Rule B",
          field: "user.active",
          equals: true,
          result: "RESULT_B",
        },
        {
          name: "Rule C",
          field: "user.verified",
          equals: true,
          result: "RESULT_C",
        },
      ],
    };

    const evaluator = new Evaluator(orderingRuleset);

    // Scenario 1: Only Rule C evaluates to true
    const input1: EvaluationInput = {
      context: {
        dataSource: { type: "sync", name: "UserData" },
        timestamp: new Date().toISOString(),
        userId: "user-123",
      },
      data: { user: { age: 25, active: false, verified: true } },
    };

    let result = evaluator.evaluate(input1);
    expect(result).toBe("RESULT_C");
    expect(evaluator.getResultRule().name).toBe("Rule C");

    // Scenario 2: Both Rule B and C evaluate to true
    // Rule B should determine the result as it comes first in order
    const input2: EvaluationInput = {
      context: {
        dataSource: { type: "sync", name: "UserData" },
        timestamp: new Date().toISOString(),
        userId: "user-123",
      },
      data: { user: { age: 25, active: true, verified: true } },
    };

    result = evaluator.evaluate(input2);
    expect(result).toBe("RESULT_B");
    expect(evaluator.getResultRule().name).toBe("Rule B");
    expect(evaluator.getResult("Rule C")).toBe("RESULT_C"); // Rule C also evaluated to a truthy result

    // Scenario 3: All rules evaluate to true
    // Rule A should determine the result as it comes first in order
    const input3: EvaluationInput = {
      context: {
        dataSource: { type: "sync", name: "UserData" },
        timestamp: new Date().toISOString(),
        userId: "user-123",
      },
      data: { user: { age: 35, active: true, verified: true } },
    };

    result = evaluator.evaluate(input3);
    expect(result).toBe("RESULT_A");
    expect(evaluator.getResultRule().name).toBe("Rule A");
    expect(evaluator.getResult("Rule B")).toBe("RESULT_B"); // Rule B also evaluated to true
    expect(evaluator.getResult("Rule C")).toBe("RESULT_C"); // Rule C also evaluated to true

    // Verify all rules were evaluated (even after finding a truthy result)
    expect(evaluator.getResults()).toEqual({
      "Rule A": "RESULT_A",
      "Rule B": "RESULT_B",
      "Rule C": "RESULT_C",
    });
  });

  it("should maintain rule ordering when ruleset is modified", () => {
    // Define a ruleset with three top-level rules but in different order
    const orderingRuleset: Ruleset = {
      name: "Modified Rule Ordering Test",
      rules: [
        {
          name: "Rule C",
          field: "user.verified",
          equals: true,
          result: "RESULT_C",
        },
        {
          name: "Rule A",
          field: "user.age",
          greaterThan: 30,
          result: "RESULT_A",
        },
        {
          name: "Rule B",
          field: "user.active",
          equals: true,
          result: "RESULT_B",
        },
      ],
    };

    const evaluator = new Evaluator(orderingRuleset);

    // All rules evaluate to true, but Rule C should determine the result
    // as it comes first in this modified order
    const input: EvaluationInput = {
      context: {
        dataSource: { type: "sync", name: "UserData" },
        timestamp: new Date().toISOString(),
        userId: "user-123",
      },
      data: { user: { age: 35, active: true, verified: true } },
    };

    const result = evaluator.evaluate(input);
    expect(result).toBe("RESULT_C"); // First rule in order
    expect(evaluator.getResultRule().name).toBe("Rule C");

    // Deactivate the first rule and check if the next rule becomes determinant
    evaluator.deactivateRule("Rule C");
    const nextResult = evaluator.evaluate(input);
    expect(nextResult).toBe("RESULT_A"); // Now second rule determines result
    expect(evaluator.getResultRule().name).toBe("Rule A");
  });
});
