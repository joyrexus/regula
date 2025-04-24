import {
  Composer,
  RuleConfig,
  RulesetConfig,
  ComposerConfig,
} from "../src/composer";
import { ValidationError } from "../src/errors";
import { DataTestExpression, BooleanExpression } from "../src/types";

const composer = new Composer({ prefixRuleNames: true });

describe("composer", () => {
  describe("DataTestBuilder", () => {
    it("should create a valid data test rule", () => {
      const rule = composer
        .dataTest("Age Check")
        .field("person.age")
        .greaterThan(18)
        .result("adult")
        .build();

      expect(rule.name).toBe("Age Check");
      expect((rule as DataTestExpression).field).toBe("person.age");
      expect((rule as DataTestExpression).greaterThan).toBe(18);
      expect(rule.result).toBe("adult");
    });

    it("should create a rule with all data test operators", () => {
      const now = new Date().toISOString();

      const rule = composer
        .dataTest("All Operators")
        .field("user")
        .equals("admin")
        .equalsOneOf(["admin", "moderator"])
        .greaterThan(5)
        .greaterThanEquals(5)
        .lessThan(10)
        .lessThanEquals(10)
        .between(5, 10)
        .includes("tag")
        .includesAny(["tag1", "tag2"])
        .includesAll(["tag1", "tag2"])
        .matches("^test")
        .isNull(false)
        .isPresent(true)
        .afterDate(now)
        .beforeDate(now)
        .betweenDates(now, now)
        .build();

      expect(rule.name).toBe("All Operators");
      expect((rule as DataTestExpression).equals).toBe("admin");
      expect((rule as DataTestExpression).equalsOneOf).toEqual([
        "admin",
        "moderator",
      ]);
      expect((rule as DataTestExpression).greaterThan).toBe(5);
      expect((rule as DataTestExpression).greaterThanEquals).toBe(5);
      expect((rule as DataTestExpression).lessThan).toBe(10);
      expect((rule as DataTestExpression).lessThanEquals).toBe(10);
      expect((rule as DataTestExpression).between).toEqual([5, 10]);
      expect((rule as DataTestExpression).includes).toBe("tag");
      expect((rule as DataTestExpression).includesAny).toEqual([
        "tag1",
        "tag2",
      ]);
      expect((rule as DataTestExpression).includesAll).toEqual([
        "tag1",
        "tag2",
      ]);
      expect((rule as DataTestExpression).matches).toBe("^test");
      expect((rule as DataTestExpression).isNull).toBe(false);
      expect((rule as DataTestExpression).isPresent).toBe(true);
      expect((rule as DataTestExpression).afterDate).toBe(now);
      expect((rule as DataTestExpression).beforeDate).toBe(now);
      expect((rule as DataTestExpression).betweenDates).toEqual([now, now]);
    });

    it("should throw error when building an invalid data test rule", () => {
      // Missing field
      expect(() => {
        composer.dataTest("Invalid Rule").equals("test").build();
      }).toThrow(ValidationError);

      // Missing operator
      expect(() => {
        composer.dataTest("Invalid Rule").field("user.name").build();
      }).toThrow(ValidationError);

      // Empty name
      expect(() => {
        composer.dataTest("").field("user.name").equals("test").build();
      }).toThrow(ValidationError);
    });

    it("should support creating a rule with a config object", () => {
      const config: RuleConfig = {
        description: "Check if person is an adult",
        result: "adult",
        deactivated: false,
        dataSource: { type: "sync", name: "userDatabase" },
        meta: { importance: "high" },
      };

      const rule = composer
        .dataTest("Age Check", config)
        .field("person.age")
        .greaterThan(18)
        .build();

      expect(rule.name).toBe("Age Check");
      expect(rule.description).toBe("Check if person is an adult");
      expect(rule.result).toBe("adult");
      expect(rule.deactivated).toBe(false);
      expect(rule.dataSource).toEqual({ type: "sync", name: "userDatabase" });
      expect(rule.meta).toEqual({ importance: "high" });
    });

    it("should allow meta to be added incrementally", () => {
      const rule = composer
        .dataTest("Metadata Test")
        .field("user.id")
        .isPresent()
        .meta("category", "identity")
        .meta("priority", "high")
        .build();

      expect(rule.meta).toEqual({
        category: "identity",
        priority: "high",
      });
    });
  });

  describe("BooleanBuilder", () => {
    it("should create an AND rule", () => {
      const ageRule = composer
        .dataTest("Age Rule")
        .field("person.age")
        .greaterThan(18)
        .build();

      const verifiedRule = composer
        .dataTest("Verified Rule")
        .field("person.verified")
        .equals(true)
        .build();

      const andRule = composer
        .boolean("Adult and Verified")
        .and([ageRule, verifiedRule])
        .result("qualified")
        .build();

      expect(andRule.name).toBe("Adult and Verified");
      expect((andRule as BooleanExpression).and).toHaveLength(2);
      expect((andRule as BooleanExpression).and?.[0].name).toBe(
        "Adult and Verified | Age Rule"
      );
      expect((andRule as BooleanExpression).and?.[1].name).toBe(
        "Adult and Verified | Verified Rule"
      );
      expect(andRule.result).toBe("qualified");
    });

    it("should create an OR rule", () => {
      const goldRule = composer
        .dataTest("Gold Member")
        .field("person.membership")
        .equals("gold")
        .build();

      const silverRule = composer
        .dataTest("Silver Member")
        .field("person.membership")
        .equals("silver")
        .build();

      const orRule = composer
        .boolean("Premium Member")
        .or([goldRule, silverRule])
        .result("premium")
        .build();

      expect(orRule.name).toBe("Premium Member");
      expect((orRule as BooleanExpression).or).toHaveLength(2);
      expect(orRule.result).toBe("premium");
    });

    it("should create a NOT rule", () => {
      const blacklistRule = composer
        .dataTest("Blacklisted")
        .field("person.blacklisted")
        .equals(true)
        .build();

      const notRule = composer
        .boolean("Not Blacklisted")
        .not(blacklistRule)
        .result("allowed")
        .build();

      expect(notRule.name).toBe("Not Blacklisted");
      expect((notRule as BooleanExpression).not).toBeDefined();
      expect((notRule as BooleanExpression).not?.name).toBe(
        "Not Blacklisted | Blacklisted"
      );
      expect(notRule.result).toBe("allowed");
    });

    it("should support adding rules after initialization", () => {
      const rule1 = composer.dataTest("Rule 1").field("a").equals(1).build();

      const rule2 = composer.dataTest("Rule 2").field("b").equals(2).build();

      const rule3 = composer.dataTest("Rule 3").field("c").equals(3).build();

      const andRule = composer
        .boolean("And Rule")
        .and([rule1])
        .addRule(rule2)
        .addRule(rule3)
        .build();

      expect((andRule as BooleanExpression).and).toHaveLength(3);
    });

    it("should throw error when building an invalid boolean rule", () => {
      // Missing boolean type
      expect(() => {
        composer.boolean("Invalid Rule").build();
      }).toThrow(ValidationError);

      // Empty rules
      expect(() => {
        composer.boolean("Invalid Rule").and([]).build();
      }).toThrow(ValidationError);

      // NOT with multiple rules
      expect(() => {
        const rule1 = composer.dataTest("Rule 1").field("a").equals(1).build();

        const rule2 = composer.dataTest("Rule 2").field("b").equals(2).build();

        composer.boolean("Invalid NOT").not(rule1).addRule(rule2).build();
      }).toThrow(ValidationError);
    });

    it("should support creating a boolean rule with a config object", () => {
      const config: RuleConfig = {
        description: "Check if user meets all requirements",
        result: "qualified",
        deactivated: false,
        meta: { type: "composite" },
      };

      const rule1 = composer.dataTest("Rule 1").field("a").equals(1).build();

      const rule2 = composer.dataTest("Rule 2").field("b").equals(2).build();

      const andRule = composer
        .boolean("Requirements", config)
        .and([rule1, rule2])
        .build();

      expect(andRule.name).toBe("Requirements");
      expect(andRule.description).toBe("Check if user meets all requirements");
      expect(andRule.result).toBe("qualified");
      expect(andRule.deactivated).toBe(false);
      expect(andRule.meta).toEqual({ type: "composite" });
    });
  });

  describe("RulesetBuilder", () => {
    it("should create a valid ruleset", () => {
      const rule1 = composer.dataTest("Rule 1").field("a").equals(1).build();

      const rule2 = composer.dataTest("Rule 2").field("b").equals(2).build();

      const ruleset = composer
        .ruleset("Test Ruleset")
        .description("A test ruleset")
        .defaultResult("default")
        .version("1.0")
        .meta("owner", "test-team")
        .addRule(rule1)
        .addRule(rule2)
        .build();

      expect(ruleset.name).toBe("Test Ruleset");
      expect(ruleset.description).toBe("A test ruleset");
      expect(ruleset.default).toBe("default");
      expect(ruleset.version).toBe("1.0");
      expect(ruleset.meta).toEqual({ owner: "test-team" });
      expect(ruleset.rules).toHaveLength(2);
    });

    it("should support creating a ruleset with a config object", () => {
      const config: RulesetConfig = {
        description: "A test ruleset",
        defaultResult: "default",
        version: "1.0",
        meta: { owner: "test-team" },
      };

      const rule = composer.dataTest("Rule").field("a").equals(1).build();

      const ruleset = composer
        .ruleset("Test Ruleset", config)
        .addRule(rule)
        .build();

      expect(ruleset.name).toBe("Test Ruleset");
      expect(ruleset.description).toBe("A test ruleset");
      expect(ruleset.default).toBe("default");
      expect(ruleset.version).toBe("1.0");
      expect(ruleset.meta).toEqual({ owner: "test-team" });
      expect(ruleset.rules).toHaveLength(1);
    });

    it("should support adding multiple rules at once", () => {
      const rule1 = composer.dataTest("Rule 1").field("a").equals(1).build();

      const rule2 = composer.dataTest("Rule 2").field("b").equals(2).build();

      const rule3 = composer.dataTest("Rule 3").field("c").equals(3).build();

      const ruleset = composer
        .ruleset("Test Ruleset")
        .addRule(rule1)
        .addRules([rule2, rule3])
        .build();

      expect(ruleset.rules).toHaveLength(3);
    });

    it("should support appending rules from an existing ruleset", () => {
      const rule1 = composer.dataTest("Rule 1").field("a").equals(1).build();

      const baseRuleset = composer
        .ruleset("Base Ruleset")
        .addRule(rule1)
        .build();

      const rule2 = composer.dataTest("Rule 2").field("b").equals(2).build();

      const extendedRuleset = composer
        .ruleset("Extended Ruleset")
        .appendRuleset(baseRuleset)
        .addRule(rule2)
        .build();

      expect(extendedRuleset.rules).toHaveLength(2);
      expect(extendedRuleset.rules[0].name).toBe("Rule 1");
      expect(extendedRuleset.rules[1].name).toBe("Rule 2");
    });
  });

  describe("Combining Rulesets", () => {
    it("should combine multiple rulesets", () => {
      const ruleset1 = composer
        .ruleset("Ruleset 1")
        .addRule(composer.dataTest("Rule 1").field("a").equals(1).build())
        .build();

      const ruleset2 = composer
        .ruleset("Ruleset 2")
        .addRule(composer.dataTest("Rule 2").field("b").equals(2).build())
        .build();

      const combinedRuleset = composer.combineRulesets(
        "Combined Ruleset",
        [ruleset1, ruleset2],
        {
          description: "A combined ruleset",
          defaultResult: "default",
        }
      );

      expect(combinedRuleset.name).toBe("Combined Ruleset");
      expect(combinedRuleset.description).toBe("A combined ruleset");
      expect(combinedRuleset.default).toBe("default");
      expect(combinedRuleset.rules).toHaveLength(2);
      expect(combinedRuleset.rules[0].name).toBe("Rule 1");
      expect(combinedRuleset.rules[1].name).toBe("Rule 2");
    });
  });

  describe("Creating Standalone Rules", () => {
    it("should create a standalone data test rule", () => {
      const rule = composer.createRule("Age Check", (builder) => {
        return builder.field("person.age").greaterThan(18).result("adult");
      });

      expect(rule.name).toBe("Age Check");
      expect((rule as DataTestExpression).field).toBe("person.age");
      expect((rule as DataTestExpression).greaterThan).toBe(18);
      expect(rule.result).toBe("adult");
    });

    it("should create a standalone boolean rule", () => {
      const ageRule = composer
        .dataTest("Age Rule")
        .field("person.age")
        .greaterThan(18)
        .build();

      const verifiedRule = composer
        .dataTest("Verified Rule")
        .field("person.verified")
        .equals(true)
        .build();

      const rule = composer.createRule("Composite Rule", (builder) => {
        return builder.and([ageRule, verifiedRule]).result("qualified");
      });

      expect(rule.name).toBe("Composite Rule");
      expect((rule as BooleanExpression).and).toHaveLength(2);
      expect(rule.result).toBe("qualified");
    });

    it("should support creating a standalone rule with a config object", () => {
      const config: RuleConfig = {
        description: "Check if person is an adult",
        result: "adult",
        deactivated: false,
      };

      const rule = composer.createRule(
        "Age Check",
        (builder) => {
          return builder.field("person.age").greaterThan(18);
        },
        config
      );

      expect(rule.name).toBe("Age Check");
      expect(rule.description).toBe("Check if person is an adult");
      expect(rule.result).toBe("adult");
      expect(rule.deactivated).toBe(false);
    });

    it("should throw an error if the rule type cannot be determined", () => {
      expect(() => {
        composer.createRule("Invalid Rule", (builder) => {
          return builder.result("invalid");
        });
      }).toThrow(ValidationError);
    });

    it("should create a data test rule using createDataTestRule", () => {
      const rule = composer.createDataTestRule("Age Check", (builder) => {
        return builder.field("person.age").greaterThan(18).result("adult");
      });

      expect(rule.name).toBe("Age Check");
      expect((rule as DataTestExpression).field).toBe("person.age");
      expect((rule as DataTestExpression).greaterThan).toBe(18);
      expect(rule.result).toBe("adult");
    });

    it("should create a data test rule with config using createDataTestRule", () => {
      const config: RuleConfig = {
        description: "Verify the person's age",
        dataSource: { type: "sync", name: "personDatabase" },
        meta: { category: "identity" },
      };

      const rule = composer.createDataTestRule(
        "Age Check",
        (builder) => {
          return builder.field("person.age").greaterThan(18).result("adult");
        },
        config
      );

      expect(rule.name).toBe("Age Check");
      expect(rule.description).toBe("Verify the person's age");
      expect(rule.dataSource).toEqual({ type: "sync", name: "personDatabase" });
      expect(rule.meta).toEqual({ category: "identity" });
      expect((rule as DataTestExpression).field).toBe("person.age");
      expect((rule as DataTestExpression).greaterThan).toBe(18);
    });

    it("should create a boolean rule using createBooleanRule", () => {
      const ageRule = composer
        .dataTest("Age Rule")
        .field("person.age")
        .greaterThan(18)
        .build();

      const verifiedRule = composer
        .dataTest("Verified Rule")
        .field("person.verified")
        .equals(true)
        .build();

      const rule = composer.createBooleanRule("Composite Rule", (builder) => {
        return builder.and([ageRule, verifiedRule]).result("qualified");
      });

      expect(rule.name).toBe("Composite Rule");
      expect((rule as BooleanExpression).and).toHaveLength(2);
      expect(rule.result).toBe("qualified");
    });

    it("should create a boolean rule with OR expression using createBooleanRule", () => {
      const goldRule = composer
        .dataTest("Gold Member")
        .field("person.membership")
        .equals("gold")
        .build();

      const platinumRule = composer
        .dataTest("Platinum Member")
        .field("person.membership")
        .equals("platinum")
        .build();

      const rule = composer.createBooleanRule(
        "Premium Membership",
        (builder) => {
          return builder
            .or([goldRule, platinumRule])
            .result("premium_benefits");
        }
      );

      expect(rule.name).toBe("Premium Membership");
      expect((rule as BooleanExpression).or).toHaveLength(2);
      expect(rule.result).toBe("premium_benefits");
    });

    it("should create a boolean rule with config using createBooleanRule", () => {
      const config: RuleConfig = {
        description: "Check for premium membership status",
        dataSource: { type: "sync", name: "memberDatabase" },
        meta: { priority: "high" },
      };

      const goldRule = composer
        .dataTest("Gold Member")
        .field("person.membership")
        .equals("gold")
        .build();

      const platinumRule = composer
        .dataTest("Platinum Member")
        .field("person.membership")
        .equals("platinum")
        .build();

      const rule = composer.createBooleanRule(
        "Premium Membership",
        (builder) => {
          return builder
            .or([goldRule, platinumRule])
            .result("premium_benefits");
        },
        config
      );

      expect(rule.name).toBe("Premium Membership");
      expect(rule.description).toBe("Check for premium membership status");
      expect(rule.dataSource).toEqual({ type: "sync", name: "memberDatabase" });
      expect(rule.meta).toEqual({ priority: "high" });
      expect((rule as BooleanExpression).or).toHaveLength(2);
    });
  });

  describe("Complex Examples", () => {
    it("should support creating a complex loan application ruleset", () => {
      // Create individual rules
      const adultRule = composer
        .dataTest("Adult Check")
        .field("applicant.age")
        .greaterThanEquals(18)
        .build();

      const creditScoreRule = composer
        .dataTest("Credit Score Check")
        .field("applicant.creditScore")
        .greaterThan(700)
        .result("good_credit")
        .build();

      const incomeRule = composer
        .dataTest("Income Check")
        .field("applicant.income")
        .greaterThan(50000)
        .build();

      const debtRule = composer
        .dataTest("Debt Check")
        .field("applicant.debt")
        .lessThan(10000)
        .build();

      // Create boolean expressions
      const financialRule = composer
        .boolean("Financial Requirements")
        .and([incomeRule, debtRule])
        .result("financially_qualified")
        .build();

      const baseEligibilityRule = composer
        .boolean("Base Eligibility")
        .and([adultRule, creditScoreRule, financialRule])
        .result("eligible")
        .build();

      // Create special condition rules
      const preferredPartnerRule = composer
        .dataTest("Preferred Partner")
        .field("applicant.referral")
        .equals("preferred")
        .build();

      const specialEligibilityRule = composer
        .boolean("Special Eligibility")
        .and([adultRule, preferredPartnerRule])
        .or([creditScoreRule, financialRule])
        .result("special_eligible")
        .build();

      // Create the final ruleset
      const loanRuleset = composer
        .ruleset("Loan Application Ruleset")
        .description("Evaluates loan applications for approval")
        .defaultResult("rejected")
        .version("1.0")
        .meta("department", "finance")
        .addRule(baseEligibilityRule)
        .addRule(specialEligibilityRule)
        .build();

      expect(loanRuleset.name).toBe("Loan Application Ruleset");
      expect(loanRuleset.rules).toHaveLength(2);
    });
  });
});

describe("Composer with parameters", () => {
  const config: ComposerConfig = {
    dataSources: [
      {
        name: "draw_event",
        type: "async",
        parameters: [
          {
            name: "Total Draw Amount",
            field: "content.total_draw_amount",
            type: "number",
            meta: {},
          },
          {
            name: "Draw Currency",
            field: "content.currency",
            type: "string",
            meta: { description: "Currency code" },
          },
        ],
      },
      {
        name: "user_profile",
        type: "sync",
        parameters: [
          {
            name: "User Age",
            field: "profile.age",
            type: "number",
            meta: { validation: "required" },
          },
        ],
      },
    ],
  };

  it("should create a data test rule using a parameter", () => {
    const composerWithParams = new Composer(config);

    const rule = composerWithParams
      .dataTest("Low Draw Amount")
      .parameter("Total Draw Amount")
      .lessThan(100)
      .result("low_draw")
      .build();

    expect(rule.name).toBe("Low Draw Amount");
    expect((rule as DataTestExpression).field).toBe(
      "content.total_draw_amount"
    );
    expect((rule as DataTestExpression).lessThan).toBe(100);
    expect(rule.result).toBe("low_draw");
    expect(rule.dataSource).toEqual({ name: "draw_event", type: "async" });
  });

  it("should create multiple data test rules with different parameters", () => {
    const composerWithParams = new Composer(config);

    const drawRule = composerWithParams
      .dataTest("USD Currency")
      .parameter("Draw Currency")
      .equals("USD")
      .build();

    const ageRule = composerWithParams
      .dataTest("Adult User")
      .parameter("User Age")
      .greaterThanEquals(18)
      .build();

    expect(drawRule.name).toBe("USD Currency");
    expect((drawRule as DataTestExpression).field).toBe("content.currency");
    expect((drawRule as DataTestExpression).equals).toBe("USD");
    expect(drawRule.dataSource).toEqual({ name: "draw_event", type: "async" });

    expect(ageRule.name).toBe("Adult User");
    expect((ageRule as DataTestExpression).field).toBe("profile.age");
    expect((ageRule as DataTestExpression).greaterThanEquals).toBe(18);
    expect(ageRule.dataSource).toEqual({ name: "user_profile", type: "sync" });
  });

  it("should create data test rule using parameter in createDataTestRule", () => {
    const composerWithParams = new Composer(config);

    const rule = composerWithParams.createDataTestRule(
      "High Draw Amount",
      (builder) => {
        return builder
          .parameter("Total Draw Amount")
          .greaterThanEquals(1000)
          .result("high_draw");
      }
    );

    expect(rule.name).toBe("High Draw Amount");
    expect((rule as DataTestExpression).field).toBe(
      "content.total_draw_amount"
    );
    expect((rule as DataTestExpression).greaterThanEquals).toBe(1000);
    expect(rule.dataSource).toEqual({ name: "draw_event", type: "async" });
  });

  it("should create a complex rule using parameters", () => {
    const composerWithParams = new Composer(config);

    const highDrawRule = composerWithParams
      .dataTest("High Draw")
      .parameter("Total Draw Amount")
      .greaterThan(1000)
      .build();

    const usdRule = composerWithParams
      .dataTest("USD Currency")
      .parameter("Draw Currency")
      .equals("USD")
      .build();

    const adultRule = composerWithParams
      .dataTest("Adult User")
      .parameter("User Age")
      .greaterThanEquals(18)
      .build();

    const compositeRule = composerWithParams
      .boolean("High USD Draw for Adult")
      .and([highDrawRule, usdRule, adultRule])
      .result("flag_for_review")
      .build();

    expect(compositeRule.name).toBe("High USD Draw for Adult");
    expect(compositeRule.result).toBe("flag_for_review");
    expect((compositeRule as BooleanExpression).and).toHaveLength(3);
  });

  it("should throw error when parameter name not found", () => {
    const composerWithParams = new Composer(config);

    expect(() => {
      composerWithParams
        .dataTest("Invalid Parameter")
        .parameter("Non-existent Parameter")
        .equals("test")
        .build();
    }).toThrow(ValidationError);

    expect(() => {
      composerWithParams
        .dataTest("Invalid Parameter")
        .parameter("Non-existent Parameter")
        .equals("test")
        .build();
    }).toThrow('Parameter "Non-existent Parameter" not found');
  });

  it("should throw error when using parameter with no config", () => {
    const composerNoConfig = new Composer();

    expect(() => {
      composerNoConfig
        .dataTest("No Config")
        .parameter("Any Parameter")
        .equals("test")
        .build();
    }).toThrow(ValidationError);

    expect(() => {
      composerNoConfig
        .dataTest("No Config")
        .parameter("Any Parameter")
        .equals("test")
        .build();
    }).toThrow("No parameters have been configured");
  });

  it("should allow using field() and dataSource() with parameter() in the same rule", () => {
    const composerWithParams = new Composer(config);

    // First set via parameter, then override field
    const rule1 = composerWithParams
      .dataTest("Override Field")
      .parameter("Total Draw Amount")
      .field("custom.field.path")
      .greaterThan(100)
      .build();

    expect(rule1.name).toBe("Override Field");
    expect((rule1 as DataTestExpression).field).toBe("custom.field.path");
    expect(rule1.dataSource).toEqual({ name: "draw_event", type: "async" });

    // First set via parameter, then override dataSource
    const rule2 = composerWithParams
      .dataTest("Override DataSource")
      .parameter("Total Draw Amount")
      .dataSource({ name: "custom_source", type: "sync" })
      .greaterThan(100)
      .build();

    expect(rule2.name).toBe("Override DataSource");
    expect((rule2 as DataTestExpression).field).toBe(
      "content.total_draw_amount"
    );
    expect(rule2.dataSource).toEqual({ name: "custom_source", type: "sync" });
  });
});
