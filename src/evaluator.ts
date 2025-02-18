import * as jmespath from "@aws-lambda-powertools/jmespath";
import { Regula } from "./regula";
import { EvaluationError } from "./errors";
import {
  Ruleset,
  Rule,
  RuleResult,
  RuleResults,
  RuleEvaluation,
  DataSource,
  Evaluation,
  EvaluationInput,
  EvaluatedRuleset,
} from "./types";

/**
 * The Evaluator class is used for successive evaluations of a ruleset.
 */
export class Evaluator {
  ruleset: EvaluatedRuleset;
  private count: number;
  private dataSources: DataSource[];
  private rulePaths: { [ruleName: string]: string };

  /**
   * Creates a new Evaluator instance with the specified ruleset.
   * @param ruleset The ruleset to evaluate.
   * @throws {ValidationError} If the ruleset is invalid.
   * @see {@link Regula.validate}
   */
  constructor(ruleset: Ruleset | EvaluatedRuleset) {
    Regula.validate(ruleset);
    this.dataSources = Regula.getDataSources(ruleset);
    this.rulePaths = Regula.getRulePaths(ruleset);
    this.ruleset = structuredClone(ruleset);
    this.count = 0;
  }

  /**
   * Get the ruleset as a string.
   */
  toString(): string {
    return JSON.stringify(this.ruleset, null, 2);
  }

  /**
   * Evaluates the ruleset against the input object and returns the result.
   * @param input The input object to evaluate against the ruleset.
   * @returns The evaluation result.
   * @throws {EvaluationError} If the ruleset is deactivated.
   * @see {@link Regula.evaluate}
   */
  evaluate(input: EvaluationInput): RuleResult {
    if (this.ruleset.deactivated) {
      throw new EvaluationError("Ruleset is deactivated.");
    }
    const { lastEvaluation } = Regula.evaluate(this.ruleset, input);
    this.count++;
    this.ruleset.lastEvaluation = lastEvaluation;
    return lastEvaluation?.result;
  }

  /**
   * Get a snapshot of the current state of the ruleset's evaluation.
   * @return The evaluated ruleset.
   * @see {@link EvaluatedRuleset}
   */
  getSnapshot(): EvaluatedRuleset {
    return structuredClone(this.ruleset);
  }

  /**
   * Get the data sources used in the ruleset.
   * @returns An array of data sources.
   * @see {@link Regula.getDataSources}
   * @see {@link DataSource}
   */
  getDataSources(): DataSource[] {
    return this.dataSources;
  }

  /**
   * Get the current count of evaluations.
   * @returns The number of evaluations performed.
   * @see {@link Evaluator.evaluate}
   */
  getCount(): number {
    return this.count;
  }

  /**
   * Get a rule by name.
   * @param name The name of the rule to get.
   * @returns The rule object.
   * @throws {EvaluationError} If the rule is not found.
   */
  getRule(name: string): Rule {
    const path = this.rulePaths[name];
    if (!path) {
      throw new EvaluationError(`Rule not found: ${name}`);
    }
    const rule = jmespath.search(path, this.ruleset) as Rule;
    if (!rule) {
      throw new EvaluationError(`Rule not found: ${name}`);
    }
    return rule;
  }

  /**
   * Get an array of all rule names in the ruleset.
   */
  getRuleNames(): string[] {
    return Object.keys(this.rulePaths);
  }

  /**
   * Get an array of all deactivated rules in the ruleset.
   */
  getDeactivatedRules(): Rule[] {
    let deactivatedRules: Rule[] = [];
    for (const ruleName of this.getRuleNames()) {
      const rule = this.getRule(ruleName);
      if (rule.deactivated) {
        deactivatedRules.push(rule);
      }
    }
    return deactivatedRules;
  }

  /**
   * Get the last evaluation of a specific rule by name.
   *
   * If no rule name is provided, the last top-level evaluation of the ruleset is returned.
   * @param {string} [ruleName] The name of the rule to get the result for.
   * @returns The result of the rule evaluation.
   * @throws {EvaluationError} If the rule is not found.
   */
  getLastEvaluation(ruleName?: string): Evaluation | RuleEvaluation {
    if (!ruleName) {
      return this.ruleset.lastEvaluation;
    }
    const rule = this.getRule(ruleName);
    return rule.lastEvaluation;
  }

  /**
   * Get the result of a specific rule by name.
   *
   * If no rule name is provided, the result of the overall ruleset evaluation is returned.
   * @param {string} [ruleName] The name of the rule to get the result for.
   * @returns The result of the rule evaluation.
   * @throws {EvaluationError} If the rule is not found.
   */
  getResult(ruleName?: string): RuleResult {
    if (!ruleName) {
      return this.ruleset.lastEvaluation?.result;
    }
    const rule = this.getRule(ruleName);
    return rule.lastEvaluation?.result;
  }

  /**
   * Get the evaluation results.
   * @returns The overall result and results of all top-level rules.
   */
  getResults(): RuleResults {
    const results: RuleResults = {
      result: this.ruleset.lastEvaluation?.result,
      resultFrom: this.ruleset.lastEvaluation?.resultFrom,
      rules: this.ruleset.rules.reduce((acc, rule) => {
        acc[rule.name] = rule.lastEvaluation?.result;
        return acc;
      }, {}),
    };
    return results;
  }

  /**
   * Activate a ruleset.
   * @see {@link Evaluator.deactivate}
   */
  activate(): void {
    this.ruleset.deactivated = false;
  }

  /**
   * Deactivate a ruleset.
   * @param {object} details Details about the deactivation.
   * @param {string} [details.reason] The reason for deactivation.
   * @param {string} [details.user] The user who deactivated the rule.
   * @see {@link Evaluator.activate}
   */
  deactivate(details?: { reason?: string; user?: string }): void {
    this.ruleset.deactivated = details
      ? {
          reason: details?.reason ?? "unknown",
          updatedBy: details?.user ?? "unknown",
          updatedAt: new Date().toISOString(),
        }
      : true;
  }

  /**
   * Activates a rule by name.
   * @param name The name of the rule to activate.
   * @throws {EvaluationError} If the rule is not found.
   */
  activateRule(name: string): void {
    const rule = this.getRule(name);
    rule.deactivated = false;
  }

  /**
   * Deactivates a rule by name.
   * @param {string} name The name of the rule to deactivate.
   * @param {object} details Details about the deactivation.
   * @param {string} [details.reason] The reason for deactivation.
   * @param {string} [details.user] The user who deactivated the rule.
   * @throws {EvaluationError} If the rule is not found.
   */
  deactivateRule(
    name: string,
    details?: { reason?: string; user?: string }
  ): void {
    const rule = this.getRule(name);
    rule.deactivated = details
      ? {
          reason: details?.reason ?? "unknown",
          updatedBy: details?.user ?? "unknown",
          updatedAt: new Date().toISOString(),
        }
      : true;
  }
}
