import * as jmespath from "@aws-lambda-powertools/jmespath";
import { Evaluator } from "./evaluator";
import {
  Ruleset,
  Rule,
  RuleResult,
  DataSource,
  EvaluationInput,
  EvaluatedRuleset,
} from "./types";
import { ValidationError, EvaluationError } from "./errors";

/**
 * The Regula class provides static methods for evaluating rulesets.
 */
export class Regula {
  /**
   * Create and return an instance of Evaluator.
   * @param ruleset The ruleset to evaluate.
   * @returns A new Evaluator instance.
   * @throws {ValidationError} If the ruleset is invalid.
   * @see {@link Regula.validate}
   */
  static evaluator(ruleset: Ruleset | EvaluatedRuleset): Evaluator {
    return new Evaluator(ruleset);
  }

  /**
   * Extracts data sources from a ruleset.
   * @param ruleset The ruleset to extract data sources from.
   * @returns An array of data source names.
   */
  static getDataSources(ruleset: Ruleset | EvaluatedRuleset): DataSource[] {
    const dataSources = new Set<DataSource>();

    function traverse(rules: Rule[]): void {
      rules.forEach((rule) => {
        if ("path" in rule && rule.dataSource) {
          dataSources.add(rule.dataSource);
        }
        if ("and" in rule) {
          traverse(rule.and);
        }
        if ("or" in rule) {
          traverse(rule.or);
        }
        if ("not" in rule) {
          traverse([rule.not]);
        }
      });
    }

    traverse(ruleset.rules);
    return Array.from(dataSources);
  }

  /**
   * Derives a mapping of rule names to JMESPaths.
   *
   * This is useful for quickly finding the JMESPath of a rule by its name.
   * @param ruleset The ruleset to map.
   * @returns A mapping of rule names to JMESPaths.
   */
  static getRulePaths(ruleset: Ruleset | EvaluatedRuleset): {
    [ruleName: string]: string;
  } {
    const mapping: { [ruleName: string]: string } = {};

    function traverse(rules: Rule[], currentPath: string): void {
      rules.forEach((rule, index) => {
        const rulePath = `${currentPath}[${index}]`;
        if (rule.name) {
          mapping[rule.name] = rulePath;
        }
        if ("and" in rule) {
          traverse(rule.and, `${rulePath}.and`);
        }
        if ("or" in rule) {
          traverse(rule.or, `${rulePath}.or`);
        }
        if ("not" in rule) {
          traverse([rule.not], `${rulePath}.not`);
        }
      });
    }

    traverse(ruleset.rules, "rules");
    return mapping;
  }

  /**
   * Checks if a string is in ISO 8601 format.
   * @param dateString The string to check.
   * @returns True if the string is in ISO 8601 format, false otherwise.
   * @see https://en.wikipedia.org/wiki/ISO_8601
   * @see https://www.regextester.com/96657
   * @example
   * Regula.isISO8601("2021-09-01T12:34:56Z"); // true
   * Regula.isISO8601("2021-09-01T12:34:56.789Z"); // true
   * Regula.isISO8601("2021-09-01T12:34:56"); // false
   */
  static isISO8601(dateString: string): boolean {
    const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;
    return iso8601Regex.test(dateString);
  }

  /**
   * Recursively validates the ruleset.
   * @param ruleset The ruleset to validate.
   * @throws {ValidationError} If the ruleset is invalid.
   */
  static validate(ruleset: Ruleset): void {
    if (!ruleset || !ruleset.rules || !Array.isArray(ruleset.rules)) {
      throw new ValidationError(
        "Invalid ruleset: Ruleset must contain an array of rules."
      );
    }
    const names = new Set<string>();
    ruleset.rules.forEach((rule, index) => {
      Regula.validateRule(rule, `rules[${index}]`, names);
    });
  }

  /**
   * Recursively validates a rule and its sub-rules.
   *
   * A valid rule must either have a 'path' property (for data test expressions)
   * or at least one of 'and', 'or', or 'not' (for boolean expressions).
   *
   * A rule can also have a 'name' property, which must be unique within the ruleset.
   *
   * @param rule The rule to validate.
   * @param path The path to the rule in the ruleset.
   * @param names A set of rule names to check for duplicates.
   * @throws {ValidationError} If the rule is invalid.
   * @see {@link Regula.validate}
   */
  private static validateRule(
    rule: Rule,
    path: string = "root",
    names: Set<string> = new Set()
  ): void {
    if (!("path" in rule || rule.and || rule.or || rule.not)) {
      throw new ValidationError(
        `Invalid rule at ${path}: A rule must have a path, and/or, or, or not condition.`
      );
    }
    if (rule.name) {
      if (names.has(rule.name)) {
        throw new ValidationError(
          `Duplicate rule name found at ${path}: '${rule.name}' already exists.`
        );
      }
      names.add(rule.name);
    }
    if ("path" in rule) {
      if (rule.includesAny && !Array.isArray(rule.includesAny)) {
        throw new ValidationError(
          `Invalid type for 'includesAny' in rule at ${path}: ${rule.includesAny}`
        );
      }
      if (rule.afterDate && !Regula.isISO8601(rule.afterDate)) {
        throw new ValidationError(
          `Invalid date format for 'afterDate' in rule at ${path}: ${rule.afterDate}`
        );
      }
      if (rule.beforeDate && !Regula.isISO8601(rule.beforeDate)) {
        throw new ValidationError(
          `Invalid date format for 'beforeDate' in rule at ${path}: ${rule.beforeDate}`
        );
      }
      if (rule.betweenDates) {
        const [start, end] = rule.betweenDates;
        if (!Regula.isISO8601(start) || !Regula.isISO8601(end)) {
          throw new ValidationError(
            `Invalid date format for 'betweenDates' in rule at ${path}: ${rule.betweenDates.join(
              ", "
            )}`
          );
        }
      }
    }
    if ("and" in rule) {
      rule.and.forEach((subRule, index) => {
        Regula.validateRule(subRule, `${path}.and[${index}]`, names);
      });
    }
    if ("or" in rule) {
      rule.or.forEach((subRule, index) => {
        Regula.validateRule(subRule, `${path}.or[${index}]`, names);
      });
    }
    if ("not" in rule) {
      Regula.validateRule(rule.not, `${path}.not`, names);
    }
  }

  /**
   * Evaluates a ruleset and returns the result.
   * @param ruleset The ruleset to evaluate.
   * @param input The input data to evaluate against the ruleset.
   * @returns The evaluated ruleset.
   */
  static evaluate(
    ruleset: Ruleset | EvaluatedRuleset,
    input: EvaluationInput
  ): EvaluatedRuleset {
    const now = new Date().toISOString();
    const { dataSource, userId } = input.context;

    // Pass 1: Recursively update all sub-rules that match the input.
    for (const rule of ruleset.rules) {
      Regula.recursivelyUpdateRule(rule, input, now);
    }

    // Pass 2: Evaluate top-level rules and pick the first rule with a truthy evaluation.
    let overallResult: RuleResult = null;
    for (const rule of ruleset.rules) {
      if (rule.deactivated) continue;
      // If the top-level rule has a dataSource, it must match the input.
      if (
        "dataSource" in rule &&
        (rule.dataSource.name !== dataSource.name ||
          rule.dataSource.type !== dataSource.type)
      ) {
        continue;
      }
      if (rule.lastEvaluation && rule.lastEvaluation.result) {
        overallResult = rule.lastEvaluation.result;
        break;
      }
    }
    // Fallback to the ruleset default if no rule evaluated truthy.
    if (overallResult === null && ruleset.default) {
      overallResult = ruleset.default;
    }
    return {
      ...ruleset,
      lastEvaluation: {
        input,
        result: overallResult ?? false,
        evaluatedAt: now,
        evaluatedBy: userId,
      },
    };
  }

  /**
   * Recursively update a rule and its sub-rules if they match the input.
   *
   * For data test expressions, the rule is updated only if its path exists
   * in the input data.
   *
   * For boolean expressions, the rule is updated based on the lastEvaluation
   * of its immediate sub-rules.
   *
   * @param rule The rule to update.
   * @param input The input data to evaluate against the rule.
   * @param now The current timestamp.
   * @see {@link Regula.evaluate}
   */
  private static recursivelyUpdateRule(
    rule: Rule,
    input: EvaluationInput,
    now: string
  ): void {
    if (rule.deactivated) return;

    const { dataSource, userId } = input.context;

    // Check rule's dataSource if specified.
    if ("dataSource" in rule) {
      if (
        rule.dataSource.name !== dataSource.name ||
        rule.dataSource.type !== dataSource.type
      ) {
        return; // Skip evaluation if data source doesn't match.
      }
      if (
        rule?.lastEvaluation &&
        rule.lastEvaluation.updatedAt > input.context.timestamp
      ) {
        return; // Skip evaluation if rule has already been updated by a later event.
      }
    }

    // If the rule is a Boolean expression, first recursively update all sub-rules.
    if (["and", "or", "not"].some((key) => key in rule)) {
      if ("and" in rule) {
        rule.and.forEach((subRule) =>
          Regula.recursivelyUpdateRule(subRule, input, now)
        );
      }
      if ("or" in rule) {
        rule.or.forEach((subRule) =>
          Regula.recursivelyUpdateRule(subRule, input, now)
        );
      }
      if ("not" in rule) {
        Regula.recursivelyUpdateRule(rule.not, input, now);
      }

      // Now update the Boolean expression based on its immediate sub-rules' lastEvaluation.
      let boolResult: RuleResult = null;
      if ("and" in rule) {
        boolResult = rule.and.every(
          (subRule) => subRule.lastEvaluation?.result || subRule.deactivated
        )
          ? true
          : false;
      } else if ("or" in rule) {
        boolResult = rule.or.some((subRule) => subRule.lastEvaluation?.result)
          ? true
          : false;
      } else if ("not" in rule) {
        boolResult = !(rule.not.lastEvaluation?.result !== false);
      }
      if (boolResult !== false && rule.result) {
        boolResult = rule.result;
      }
      rule.lastEvaluation = {
        result: boolResult,
        updatedAt: now,
        updatedBy: userId,
      };
    } else if ("path" in rule) {
      // For a data test expression, check if the specified path exists in input.data.
      const value = jmespath.search(rule.path, input.data);
      if (value === undefined || value === null) {
        // Do not update if the path doesn't exist.
        return;
      }
      let result: RuleResult = null;
      if (rule.equals !== undefined) {
        result = value === rule.equals;
      } else if (rule.equalsOneOf !== undefined) {
        result =
          (typeof value === "number" || typeof value === "string") &&
          rule.equalsOneOf.includes(value);
      } else if (rule.greaterThan !== undefined) {
        result =
          (typeof value === "number" || typeof value === "string") &&
          value > rule.greaterThan;
      } else if (rule.lessThan !== undefined) {
        result =
          (typeof value === "number" || typeof value === "string") &&
          value < rule.lessThan;
      } else if (rule.between !== undefined) {
        result =
          typeof value === "number" &&
          value >= rule.between[0] &&
          value <= rule.between[1];
      } else if (rule.includes !== undefined) {
        result = Array.isArray(value) && value.includes(rule.includes);
      } else if (rule.includesAny !== undefined) {
        result =
          Array.isArray(value) &&
          Array.isArray(rule.includesAny) &&
          rule.includesAny.some((x) => value.includes(x));
      } else if (rule.matches !== undefined) {
        result =
          typeof value === "string" && new RegExp(rule.matches).test(value);
      } else if (rule.isNull !== undefined) {
        result = (value === null) === rule.isNull;
      } else if (rule.isPresent !== undefined) {
        result = (value !== undefined) === rule.isPresent;
      } else if (rule.afterDate !== undefined) {
        result = value > rule.afterDate;
      } else if (rule.beforeDate !== undefined) {
        result = value < rule.beforeDate;
      } else if (rule.betweenDates !== undefined) {
        result = value >= rule.betweenDates[0] && value <= rule.betweenDates[1];
      }
      if (result !== false && rule.result) {
        result = rule.result;
      }
      rule.lastEvaluation = { result, updatedAt: now, updatedBy: userId };
    }
  }
}
