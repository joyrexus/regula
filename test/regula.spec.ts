import { Regula } from "../src/regula";
import {
  Ruleset,
  EvaluatedRuleset,
  EvaluationInput,
  BooleanExpression,
} from "../src/types";

describe("Regula.evaluate", () => {
  // Helper to create a timestamp for testing purposes.
  const now = new Date().toISOString();

  it("evaluates a simple data test expression when input data is present and datasource matches", () => {
    const ruleset: Ruleset = {
      name: "Simple Rule Test",
      rules: [
        {
          name: "Check Age",
          path: "user.age",
          greaterThan: 18,
          result: "Adult",
          dataSource: { type: "sync", name: "UserDB" },
        },
      ],
      default: "Not eligible",
    };

    const evaluationInput: EvaluationInput = {
      context: {
        dataSource: {
          type: "sync",
          name: "UserDB",
          description: "User Database",
        },
        entityId: "entity-001",
        timestamp: now,
        userId: "user123",
      },
      data: {
        user: {
          age: 25,
        },
      },
    };

    const evaluated = Regula.evaluate(ruleset, evaluationInput);
    expect(evaluated.lastEvaluation).toBeDefined();
    expect(evaluated.lastEvaluation?.result).toBe("Adult");
  });

  it("returns the default value if the rule dataSource does not match", () => {
    const ruleset: Ruleset = {
      name: "DataSource Mismatch Test",
      rules: [
        {
          name: "Check Age",
          path: "user.age",
          greaterThan: 18,
          result: "Adult",
          dataSource: { type: "sync", name: "UserDB" },
        },
      ],
      default: "Not eligible",
    };

    const evaluationInput: EvaluationInput = {
      context: {
        dataSource: {
          type: "sync",
          name: "OtherDB",
          description: "Other Database",
        },
        entityId: "entity-002",
        timestamp: now,
        userId: "user123",
      },
      data: {
        user: {
          age: 25,
        },
      },
    };

    const evaluated = Regula.evaluate(ruleset, evaluationInput);
    // Since the datasource doesn't match, the rule isn't evaluated; default is returned.
    expect(evaluated.lastEvaluation).toBeDefined();
    expect(evaluated.lastEvaluation?.result).toBe("Not eligible");
  });

  it("evaluates an AND boolean expression with subrules from different datasources over successive evaluations", () => {
    // The top-level rule does not specify a data source.
    // Its two subrules have different datasources.
    const ruleset: Ruleset = {
      name: "AND Expression Test",
      rules: [
        {
          name: "Eligibility Check",
          and: [
            {
              name: "Check Subscription",
              path: "user.subscription.active",
              equals: true,
              result: "Subscription OK",
              dataSource: { type: "async", name: "SubscriptionService" },
            },
            {
              name: "Check Age",
              path: "user.age",
              greaterThan: 18,
              result: "Age OK",
              dataSource: { type: "sync", name: "UserDB" },
            },
            {
              name: "Check Membership",
              path: "user.membership",
              equalsOneOf: ["gold", "silver"],
              dataSource: { type: "sync", name: "membership.data" },
              result: "Premium member",
            },
          ],
          result: "User is eligible for premium membership",
        },
      ],
      default: "User is not eligible",
    };

    // Evaluation 1: Input from UserDB (only age information provided)
    const evalInput1: EvaluationInput = {
      context: {
        dataSource: {
          type: "sync",
          name: "UserDB",
          description: "User Database",
        },
        entityId: "entity-003",
        timestamp: now,
        userId: "user123",
      },
      data: {
        user: {
          age: 20,
          // Subscription info missing
        },
      },
    };

    let evaluated = Regula.evaluate(ruleset, evalInput1);
    // Since only the "Check Age" subrule is updated and "Check Subscription" has no new input,
    // the overall AND expression should not be satisfied.
    expect(evaluated.lastEvaluation?.result).toBe("User is not eligible");

    // Evaluation 2: Input from SubscriptionService (only subscription info provided)
    const evalInput2: EvaluationInput = {
      context: {
        dataSource: {
          type: "async",
          name: "SubscriptionService",
          description: "Subscription Service",
        },
        entityId: "entity-003",
        timestamp: now,
        userId: "user123",
      },
      data: {
        user: {
          subscription: { active: true },
          // Age info is not provided here, so the "Check Age" subrule should use its previous value.
        },
      },
    };

    evaluated = Regula.evaluate(evaluated, evalInput2);
    // Now the first two subrules should be satisfied:
    // - "Check Age" was updated in the first evaluation (20 > 18).
    // - "Check Subscription" is updated in this evaluation (active equals true).
    // - "Check Membership" is not satisfied, so the overall result should be "User is not eligible".
    expect(evaluated.lastEvaluation?.result).toBe("User is not eligible");

    // Evaluation 3: Input from membership.data (only membership info provided)
    const evalInput3: EvaluationInput = {
      context: {
        dataSource: {
          type: "sync",
          name: "membership.data",
          description: "Membership Data",
        },
        entityId: "entity-003",
        timestamp: now,
        userId: "user123",
      },
      data: {
        user: {
          membership: "gold",
          // Age and subscription info are not provided here.
        },
      },
    };

    evaluated = Regula.evaluate(evaluated, evalInput3);
    // Now all three subrules should be satisfied:
    // - "Check Age" was updated in the first evaluation (20 > 18).
    // - "Check Subscription" was updated in the second evaluation (active equals true).
    // - "Check Membership" is updated in this evaluation (membership is "gold").
    // So the overall result should be "User is eligible for premium membership".
    expect(evaluated.lastEvaluation?.result).toBe(
      "User is eligible for premium membership"
    );
  });

  it("does not update a rule if its path is not found in the current input, preserving the previous evaluation", () => {
    const ruleset: Ruleset = {
      name: "Path Existence Test",
      rules: [
        {
          name: "Check Email",
          path: "user.email",
          isPresent: true,
          result: "Email exists",
          dataSource: { type: "sync", name: "UserDB" },
        },
      ],
      default: "No email",
    };

    // First evaluation provides an email.
    const evalInput1: EvaluationInput = {
      context: {
        dataSource: {
          type: "sync",
          name: "UserDB",
          description: "User Database",
        },
        entityId: "entity-004",
        timestamp: now,
        userId: "user1",
      },
      data: {
        user: {
          email: "test@example.com",
        },
      },
    };

    let evaluated = Regula.evaluate(ruleset, evalInput1);
    expect(evaluated.lastEvaluation?.result).toBe("Email exists");

    // Second evaluation does NOT provide an email.
    const evalInput2: EvaluationInput = {
      context: {
        dataSource: {
          type: "sync",
          name: "UserDB",
          description: "User Database",
        },
        entityId: "entity-004",
        timestamp: now,
        userId: "user2",
      },
      data: {
        user: {
          // email is missing
        },
      },
    };

    evaluated = Regula.evaluate(evaluated, evalInput2);
    // Since the path "user.email" isn't present in evalInput2, the previous result should persist.
    expect(evaluated.rules[0].lastEvaluation?.result).toBe("Email exists");
    expect(evaluated.rules[0].lastEvaluation.updatedBy).toBe("user1");
    expect(evaluated.lastEvaluation?.result).toBe("Email exists");
    expect(evaluated.lastEvaluation.evaluatedBy).toBe("user2");
  });

  it("evaluates a data test expression with a between condition correctly", () => {
    const ruleset: Ruleset = {
      name: "Between Expression Test",
      rules: [
        {
          name: "Check total",
          path: "user.total",
          between: [0, 100],
          result: "User total in normal range",
        },
      ],
      default: "User total out of normal range",
    };

    const eval1Input: EvaluationInput = {
      context: {
        dataSource: {
          type: "sync",
          name: "UserDB",
          description: "User Database",
        },
        entityId: "entity-005",
        timestamp: now,
        userId: "user123",
      },
      data: {
        user: {
          total: 50,
        },
      },
    };

    let evaluated = Regula.evaluate(ruleset, eval1Input);
    expect(evaluated.lastEvaluation?.result).toBe("User total in normal range");

    const eval2Input: EvaluationInput = {
      context: {
        dataSource: {
          type: "sync",
          name: "UserDB",
          description: "User Database",
        },
        entityId: "entity-005",
        timestamp: now,
        userId: "user123",
      },
      data: {
        user: {
          total: 500,
        },
      },
    };

    evaluated = Regula.evaluate(ruleset, eval2Input);
    expect(evaluated.lastEvaluation?.result).toBe(
      "User total out of normal range"
    );
  });

  it("evaluates a data test expression with an includesAny condition correctly", () => {
    const ruleset: Ruleset = {
      name: "IncludesAny Expression Test",
      rules: [
        {
          name: "Check roles",
          path: "user.roles",
          includesAny: ["admin", "moderator"],
          result: "User has admin or moderator role",
        },
      ],
      default: "User does not have required roles",
    };

    const eval1Input: EvaluationInput = {
      context: {
        dataSource: {
          type: "sync",
          name: "UserDB",
          description: "User Database",
        },
        entityId: "entity-005",
        timestamp: now,
        userId: "user123",
      },
      data: {
        user: {
          roles: ["admin", "user"],
        },
      },
    };

    let evaluated = Regula.evaluate(ruleset, eval1Input);
    expect(evaluated.lastEvaluation?.result).toBe(
      "User has admin or moderator role"
    );
  });

  it("evaluates a NOT boolean expression correctly", () => {
    const ruleset: Ruleset = {
      name: "NOT Expression Test",
      rules: [
        {
          name: "Not VIP Check",
          not: {
            name: "VIP Check",
            path: "user.vip",
            equals: true,
            dataSource: { type: "sync", name: "UserDB" },
          },
          result: "User is not VIP",
          dataSource: { type: "sync", name: "UserDB" },
        },
      ],
      default: "Unknown",
    };

    const evalInput: EvaluationInput = {
      context: {
        dataSource: {
          type: "sync",
          name: "UserDB",
          description: "User Database",
        },
        entityId: "entity-005",
        timestamp: now,
        userId: "user123",
      },
      data: {
        user: {
          vip: false,
        },
      },
    };

    const evaluated = Regula.evaluate(ruleset, evalInput);
    expect(evaluated.lastEvaluation?.result).toBe("User is not VIP");
  });

  it("avoids evaluating a deactivated rule", () => {
    const ruleset: Ruleset = {
      name: "Deactivated Rule Test",
      rules: [
        {
          name: "Check Age", // This rule is deactivated.
          path: "user.age",
          greaterThan: 18,
          result: "Adult",
          deactivated: {
            reason: "Age check is deactivated",
            updatedAt: now,
            updatedBy: "user123",
          },
        },
      ],
      default: "Not eligible",
    };

    const evalInput: EvaluationInput = {
      context: {
        dataSource: {
          type: "sync",
          name: "UserDB",
          description: "User Database",
        },
        entityId: "entity-006",
        timestamp: now,
        userId: "user123",
      },
      data: {
        user: {
          age: 25,
        },
      },
    };

    const evaluated = Regula.evaluate(ruleset, evalInput);

    // Since the "Check Age" rule is deactivated, it should not be evaluated.
    expect(evaluated.rules[0].lastEvaluation).toBeUndefined();
    expect(evaluated.lastEvaluation?.result).toBe("Not eligible");
  });

  it("avoids evaluating a deactivated sub-rule", () => {
    const ruleset: Ruleset = {
      name: "Deactivated Sub-Rule Test",
      rules: [
        {
          name: "Eligibility Check",
          and: [
            {
              name: "Check Subscription",
              path: "user.subscription.active",
              equals: true,
              result: "Subscription OK",
              dataSource: { type: "sync", name: "UserDB" },
            },
            {
              name: "Check Age",
              path: "user.age",
              greaterThan: 18,
              result: "Age OK",
              dataSource: { type: "sync", name: "UserDB" },
              deactivated: {
                reason: "Age check is deactivated",
                updatedAt: now,
                updatedBy: "user123",
              },
            },
          ],
          result: "User is eligible for premium membership",
        },
      ],
      default: "User is not eligible",
    };

    const evalInput: EvaluationInput = {
      context: {
        dataSource: {
          type: "sync",
          name: "UserDB",
          description: "User Database",
        },
        entityId: "entity-007",
        timestamp: now,
        userId: "user123",
      },
      data: {
        user: {
          age: 15,
          subscription: { active: true },
        },
      },
    };

    const evaluated = Regula.evaluate(ruleset, evalInput);

    // The "Check Age" sub-rule is deactivated, so it should not be evaluated.
    expect(
      (evaluated.rules[0] as BooleanExpression).and[1].lastEvaluation
    ).toBeUndefined();
    // The "Check Subscription" sub-rule should be evaluated.
    expect(
      (evaluated.rules[0] as BooleanExpression).and[0].lastEvaluation?.result
    ).toBe("Subscription OK");
    // Since the "Check Age" sub-rule is deactivated, the overall result should be "User is eligible".
    expect(evaluated.lastEvaluation?.result).toBe(
      "User is eligible for premium membership"
    );
  });

  it("avoids evaluating a rule if the input has a timestamp earlier than the rule's last evaluation", () => {
    const event1timestamp = new Date().toISOString();
    const event2timestamp = new Date(new Date().getTime() + 1000).toISOString();
    const event2EvalTimestamp = new Date(
      new Date().getTime() + 2000
    ).toISOString();

    const ruleset: EvaluatedRuleset = {
      name: "Future Evaluation Test",
      rules: [
        {
          name: "Check Points",
          path: "user.totalPoints",
          greaterThan: 20,
          result: "Eligible for bonus round",
          dataSource: { type: "async", name: "user.scored" },
          lastEvaluation: {
            result: "Eligible for bonus round",
            updatedAt: event2EvalTimestamp,
            updatedBy: "user123",
          },
        },
      ],
      default: "Not eligible for bonus round",
      lastEvaluation: {
        input: {
          context: {
            dataSource: {
              type: "async",
              name: "user.scored",
              description: "user.scored kafka topic",
            },
            entityId: "entity-008",
            timestamp: event2timestamp,
            userId: "user123",
          },
          data: {
            user: {
              totalPoints: 25,
            },
          },
        },
        result: "Eligible for bonus round",
        evaluatedAt: event2EvalTimestamp,
        evaluatedBy: "user123",
      },
    };

    // Simulating an earlier event that should not update the rule.
    const event1Input: EvaluationInput = {
      context: {
        dataSource: {
          type: "async",
          name: "user.scored",
          description: "user.scored kafka topic",
        },
        entityId: "entity-008",
        timestamp: event1timestamp,
        userId: "user123",
      },
      data: {
        user: {
          totalPoints: 20,
        },
      },
    };

    const evaluated = Regula.evaluate(ruleset, event1Input);

    // Since the rule was last evaluated after the timestamp of the input event,
    // the rule should not be updated and the previous result should persist.
    expect(evaluated.rules[0].lastEvaluation?.result).toBe(
      "Eligible for bonus round"
    );
    expect(evaluated.lastEvaluation?.result).toBe("Eligible for bonus round");
  });
});

describe("Regula.evaluate with nested boolean expressions", () => {
  it("should update sub-rules and evaluate overall result correctly over successive evaluations", () => {
    let ruleset: Ruleset;

    // Ruleset to check user eligibility based on age, membership, and blacklist status.
    ruleset = {
      name: "Check user eligibility",
      default: "User is not eligible",
      rules: [
        {
          name: "Eligibility Check",
          and: [
            {
              name: "Check age",
              path: "user.age",
              greaterThan: 18,
              dataSource: { type: "sync", name: "user.data" },
              result: "Age is valid",
            },
            {
              name: "Check premium membership",
              or: [
                {
                  name: "Check gold membership",
                  path: "user.membership",
                  equals: "gold",
                  dataSource: { type: "sync", name: "membership.data" },
                  result: "Premium member",
                },
                {
                  name: "Check silver membership",
                  path: "user.membership",
                  equals: "silver",
                  dataSource: { type: "sync", name: "membership.data" },
                  result: "Premium member",
                },
              ],
              result: "User has premium membership",
            },
            {
              name: "Check user is not blacklisted",
              not: {
                name: "Check blacklist status",
                path: "user.blacklisted",
                equals: true,
                dataSource: { type: "sync", name: "blacklist.data" },
                result: "User is blacklisted",
              },
            },
          ],
          result: "User is eligible",
        },
      ],
    };

    let evaluated: EvaluatedRuleset;

    // First, let's evaluate the ruleset with data from a sync data source,
    // providing the user's blacklist info, but no age or membership info.
    const input1: EvaluationInput = {
      context: {
        dataSource: { type: "sync", name: "blacklist.data" },
        entityId: "entity-123",
        timestamp: new Date().toISOString(),
        userId: "user-1",
      },
      data: {
        user: { blacklisted: false },
      },
    };
    evaluated = Regula.evaluate(ruleset, input1);

    // The "User is blacklisted" sub-rule should NOT be satisfied,
    expect(
      ((evaluated.rules[0] as BooleanExpression).and[2] as BooleanExpression)
        .not.lastEvaluation?.result
    ).not.toBe("User is blacklisted");

    // Since the user's age and membership info are missing,
    // the overall result should be "User is not eligible".
    expect(evaluated.lastEvaluation?.result).toBe("User is not eligible");

    // Now, let's evaluate the ruleset with data from a sync data source
    // providing the user's age, but no membership or blacklist info.
    const input2: EvaluationInput = {
      context: {
        dataSource: { type: "sync", name: "user.data" },
        entityId: "entity-123",
        timestamp: new Date().toISOString(),
        userId: "user-1",
      },
      data: {
        user: { age: 25 },
      },
    };

    evaluated = Regula.evaluate(ruleset, input2);
    expect(
      (evaluated.rules[0] as BooleanExpression).and[0].lastEvaluation?.result
    ).toBe("Age is valid");

    // Since the user's membership and blacklist info is missing,
    // the overall result should be "User is not eligible".
    expect(evaluated.lastEvaluation?.result).toBe("User is not eligible");

    // Now, let's provide the user's membership info, reflecting a premium membership.
    const input3: EvaluationInput = {
      context: {
        dataSource: { type: "sync", name: "membership.data" },
        entityId: "entity-123",
        timestamp: new Date().toISOString(),
        userId: "user-2",
      },
      data: {
        user: { membership: "gold" },
      },
    };

    evaluated = Regula.evaluate(evaluated, input3);

    // We're expecting the "User has premium membership" sub-rule to be satisfied,
    // since the user's membership is "gold".
    expect(
      ((evaluated.rules[0] as BooleanExpression).and[1] as BooleanExpression)
        .or[0].lastEvaluation?.result
    ).toBe("Premium member");

    // Since the user is a premium member, the overall result should now be "User is eligible",
    // viz. since both AND conditions are satisfied.
    expect(evaluated.lastEvaluation?.result).toBe("User is eligible");

    // Finally, let's now blacklist the user and re-evaluate the ruleset
    // to confirm that the user is no longer eligible.
    let input4: EvaluationInput = {
      context: {
        dataSource: { type: "sync", name: "blacklist.data" },
        entityId: "entity-123",
        timestamp: new Date().toISOString(),
        userId: "user-1",
      },
      data: {
        user: { blacklisted: true },
      },
    };

    evaluated = Regula.evaluate(evaluated, input4);

    // The user should now be blacklisted, so the "User is blacklisted" sub-rule should be satisfied.
    expect(
      ((evaluated.rules[0] as BooleanExpression).and[2] as BooleanExpression)
        .not.lastEvaluation?.result
    ).toBe("User is blacklisted");

    // Since the user is blacklisted, the overall result should now be "User is not eligible".
    expect(evaluated.lastEvaluation?.result).toBe("User is not eligible");
  });
});

describe("Regula.validate", () => {
  it("should validate a valid ruleset with nested sub-rules", () => {
    const validRuleset: Ruleset = {
      name: "Valid Ruleset",
      rules: [
        {
          name: "Top Level Rule",
          // This top-level rule uses a boolean expression (and) with two sub-rules.
          and: [
            {
              name: "Sub Rule 1",
              path: "user.age",
              greaterThan: 18,
            },
            {
              name: "Sub Rule 2",
              // This sub-rule is a boolean expression (or) with nested sub-rules.
              or: [
                {
                  name: "Sub Sub Rule 1",
                  path: "user.membership",
                  equals: "premium",
                },
                {
                  name: "Sub Sub Rule 2",
                  path: "user.vip",
                  equals: true,
                },
              ],
            },
          ],
        },
      ],
      default: "Default Result",
    };

    expect(() => Regula.validate(validRuleset)).not.toThrow();
  });

  it("should throw an error for an invalid top-level rule missing conditions", () => {
    const invalidRuleset: Ruleset = {
      name: "Invalid Ruleset",
      rules: [
        {
          name: "Invalid Rule",
          // Missing any of: path, and, or, not.
        } as any,
      ],
      default: "Default Result",
    };

    expect(() => Regula.validate(invalidRuleset)).toThrow(
      /Invalid rule at rules\[0\]:/
    );
  });

  it("should throw an error for an invalid sub-rule missing conditions", () => {
    const invalidRuleset: Ruleset = {
      name: "Invalid Ruleset with Sub-Rule",
      rules: [
        {
          name: "Top Level Rule",
          and: [
            {
              name: "Valid Sub-Rule",
              path: "user.age",
              greaterThan: 18,
            },
            {
              name: "Invalid Sub-Rule",
              // Missing any of: path, and, or, not.
            } as any,
          ],
        },
      ],
      default: "Default Result",
    };

    expect(() => Regula.validate(invalidRuleset)).toThrow(
      /Invalid rule at rules\[0\].and\[1\]:/
    );
  });

  it("should throw an error for an invalid nested sub-rule", () => {
    const invalidRuleset: Ruleset = {
      name: "Invalid Nested Ruleset",
      rules: [
        {
          name: "Top Level Rule",
          or: [
            {
              name: "Valid Sub-Rule",
              path: "user.age",
              greaterThan: 18,
            },
            {
              name: "Invalid Sub-Rule",
              not: {
                name: "Invalid Nested Rule",
                // Missing any of: path, and, or, not.
              } as any,
            } as any,
          ],
        },
      ],
      default: "Default Result",
    };

    expect(() => Regula.validate(invalidRuleset)).toThrow(
      /Invalid rule at rules\[0\].or\[1\].not:/
    );
  });

  it("should validate a ruleset with unique rule names", () => {
    const ruleset: Ruleset = {
      name: "Unique Ruleset",
      rules: [
        {
          name: "Rule1",
          path: "user.age",
          greaterThan: 18,
        },
        {
          name: "Rule2",
          and: [
            {
              name: "SubRule1",
              path: "user.membership",
              equals: "premium",
            },
            {
              name: "SubRule2",
              path: "user.vip",
              equals: true,
            },
          ],
        },
      ],
      default: "Default result",
    };

    expect(() => Regula.validate(ruleset)).not.toThrow();
  });

  it("should throw error for duplicate top-level rule names", () => {
    const ruleset: Ruleset = {
      name: "Duplicate Top-Level Names",
      rules: [
        {
          name: "Rule1",
          path: "user.age",
          greaterThan: 18,
        },
        {
          name: "Rule1",
          path: "user.membership",
          equals: "premium",
        },
      ],
    };

    expect(() => Regula.validate(ruleset)).toThrow(/Duplicate rule name/);
  });

  it("should throw error for duplicate sub-rule names", () => {
    const ruleset: Ruleset = {
      name: "Duplicate Sub-Rule Names",
      rules: [
        {
          name: "TopRule",
          and: [
            {
              name: "SubRule1",
              path: "user.age",
              greaterThan: 18,
            },
            {
              name: "SubRule1", // Duplicate name in sub-rules
              path: "user.membership",
              equals: "premium",
            },
          ],
        },
      ],
    };

    expect(() => Regula.validate(ruleset)).toThrow(/Duplicate rule name/);
  });

  it("should throw error for duplicate names across top-level and sub-rules", () => {
    const ruleset: Ruleset = {
      name: "Duplicate Across Levels",
      rules: [
        {
          name: "Rule1",
          path: "user.age",
          greaterThan: 18,
        },
        {
          name: "TopRule",
          and: [
            {
              name: "Rule1", // Duplicate name with top-level rule
              path: "user.membership",
              equals: "premium",
            },
          ],
        },
      ],
    };

    expect(() => Regula.validate(ruleset)).toThrow(/Duplicate rule name/);
  });
});

describe("Regula.validate/evaluate with date-based data test expressions", () => {
  it("should throw an error if afterDate is not in ISO 8601 format", () => {
    const ruleset: Ruleset = {
      name: "Invalid Date Format",
      rules: [
        {
          name: "User signup date",
          path: "user.signupDate",
          afterDate: "02-07-2025", // Invalid format
        },
      ],
    };

    expect(() => Regula.validate(ruleset)).toThrow(
      "Invalid date format for 'afterDate'"
    );
  });

  it("should throw an error if beforeDate is not in ISO 8601 format", () => {
    const ruleset: Ruleset = {
      name: "Invalid Date Format",
      rules: [
        {
          name: "Invalid Date Rule",
          path: "user.membershipExpiration",
          beforeDate: "07-Feb-2025", // Invalid format
        },
      ],
    };

    expect(() => Regula.validate(ruleset)).toThrow(
      "Invalid date format for 'beforeDate'"
    );
  });

  it("should throw an error if betweenDates contains invalid ISO 8601 values", () => {
    const ruleset: Ruleset = {
      name: "Invalid Date Format",
      rules: [
        {
          name: "User active period",
          path: "user.activePeriod",
          betweenDates: ["2025-02-07", "not-a-date"], // Invalid format for second value
        },
      ],
    };

    expect(() => Regula.validate(ruleset)).toThrow(
      "Invalid date format for 'betweenDates'"
    );
  });

  it("should not throw an error for valid date-based expressions", () => {
    const ruleset: Ruleset = {
      name: "User qualification ruleset",
      rules: [
        {
          name: "User signup date",
          path: "user.signupDate",
          afterDate: "2025-02-07T13:25:13.666Z",
        },
        {
          name: "User membership expiration",
          path: "user.membershipExpiration",
          beforeDate: "2030-12-31T23:59:59.999Z",
        },
        {
          name: "User was actived in 2024-2025",
          path: "user.activePeriod",
          betweenDates: [
            "2024-01-01T00:00:00.000Z",
            "2025-12-31T23:59:59.999Z",
          ],
        },
      ],
    };

    expect(() => Regula.validate(ruleset)).not.toThrow();
  });

  it("should evaluate a rule correctly when input date is after specified afterDate", () => {
    const ruleset: Ruleset = {
      name: "After Date Test",
      rules: [
        {
          name: "Timestamp is after date",
          path: "timestamp",
          afterDate: "2025-02-01T00:00:00.000Z",
        },
      ],
    };

    const input: EvaluationInput = {
      context: {
        dataSource: { type: "sync", name: "testSource" },
        entityId: "123",
        timestamp: new Date().toISOString(),
      },
      data: { timestamp: "2025-02-10T12:00:00.000Z" }, // After the rule's afterDate
    };

    const evaluatedRuleset = Regula.evaluate(ruleset, input);
    expect(evaluatedRuleset.rules[0].lastEvaluation?.result).toBeTruthy();
  });

  it("should evaluate a rule correctly when input date is before specified beforeDate", () => {
    const ruleset: Ruleset = {
      name: "Before Date Test",
      rules: [
        {
          name: "Timestamp is before date",
          path: "timestamp",
          beforeDate: "2025-02-10T00:00:00.000Z",
        },
      ],
    };

    const input: EvaluationInput = {
      context: {
        dataSource: { type: "sync", name: "testSource" },
        entityId: "123",
        timestamp: new Date().toISOString(),
      },
      data: { timestamp: "2025-02-05T12:00:00.000Z" }, // Before the rule's beforeDate
    };

    const evaluatedRuleset = Regula.evaluate(ruleset, input);
    expect(evaluatedRuleset.rules[0].lastEvaluation?.result).toBeTruthy();
  });

  it("should evaluate a rule correctly when input date is within betweenDates range", () => {
    const ruleset: Ruleset = {
      name: "Between Dates Test",
      rules: [
        {
          name: "Timestamp is in date range",
          path: "timestamp",
          betweenDates: [
            "2025-02-01T00:00:00.000Z",
            "2025-02-15T23:59:59.999Z",
          ],
        },
      ],
    };

    const input: EvaluationInput = {
      context: {
        dataSource: { type: "sync", name: "testSource" },
        entityId: "123",
        timestamp: new Date().toISOString(),
      },
      data: { timestamp: "2025-02-10T12:00:00.000Z" }, // Within the range
    };

    const evaluatedRuleset = Regula.evaluate(ruleset, input);
    expect(evaluatedRuleset.rules[0].lastEvaluation?.result).toBeTruthy();
  });

  it("should evaluate a rule correctly when input date is outside betweenDates range", () => {
    const ruleset: Ruleset = {
      name: "Between Dates Test",
      rules: [
        {
          name: "Timestamp is in date range",
          path: "timestamp",
          betweenDates: [
            "2025-02-01T00:00:00.000Z",
            "2025-02-15T23:59:59.999Z",
          ],
        },
      ],
    };

    const input: EvaluationInput = {
      context: {
        dataSource: { type: "sync", name: "testSource" },
        entityId: "123",
        timestamp: new Date().toISOString(),
      },
      data: { timestamp: "2025-02-20T12:00:00.000Z" }, // Outside the range
    };

    const evaluatedRuleset = Regula.evaluate(ruleset, input);
    expect(evaluatedRuleset.rules[0].lastEvaluation?.result).toBeFalsy();
  });
});
