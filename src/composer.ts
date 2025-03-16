import {
  Rule,
  Ruleset,
  DataTestExpression,
  BooleanExpression,
  DataSource,
} from "./types";
import { ValidationError } from "./errors";
import { Regula } from "./regula";
import { Evaluator } from "./evaluator";

/**
 * Data source parameter
 */
export interface Parameter {
  name: string;
  description?: string;
  field: {
    path: string;
    type: string;
  };
  meta?: Record<string, any>;
}

/**
 * Data source configuration
 */
export interface DataSourceConfig {
  type: string;
  name: string;
  description?: string;
  parameters: Parameter[];
}

/**
 * Composer configuration
 */
export interface ComposerConfig {
  dataSources?: DataSourceConfig[];
  prefixRuleNames?: boolean; // whether to prefix rule names with their parent rule name
}

/**
 * Parameter information
 */
interface ParameterInfo {
  dataSource: DataSource;
  field: string;
  meta?: Record<string, any>;
}

/**
 * Configuration object for rules
 */
export interface RuleConfig {
  description?: string;
  result?: string;
  deactivated?: boolean;
  dataSource?: DataSource;
  meta?: Record<string, any>;
}

/**
 * Configuration object for rulesets
 */
export interface RulesetConfig {
  description?: string;
  defaultResult?: string;
  version?: string;
  meta?: Record<string, any>;
}

/**
 * Base class for building rules with a fluent API
 */
export class RuleBuilder {
  protected rule: Partial<Rule> = {};

  /**
   * Creates a new rule builder
   * @param name The name of the rule
   * @param config Optional configuration for the rule
   */
  constructor(name: string, config?: RuleConfig) {
    if (!name || name.trim() === "") {
      throw new ValidationError("Rule name cannot be empty");
    }

    this.rule = {
      name,
      ...(config?.description && { description: config.description }),
      ...(config?.result && { result: config.result }),
      ...(config?.deactivated !== undefined && {
        deactivated: config.deactivated,
      }),
      ...(config?.dataSource && { dataSource: config.dataSource }),
      ...(config?.meta && { meta: config.meta }),
    };
  }

  /**
   * Sets the result when the rule evaluates to true
   * @param result The result value
   */
  result(result: string): this {
    this.rule.result = result;
    return this;
  }

  /**
   * Sets the description for the rule
   * @param description The description
   */
  description(description: string): this {
    this.rule.description = description;
    return this;
  }

  /**
   * Sets whether the rule is deactivated
   * @param deactivated Whether the rule is deactivated
   */
  deactivated(deactivated: boolean = true): this {
    this.rule.deactivated = deactivated;
    return this;
  }

  /**
   * Sets the data source for the rule
   * @param dataSource Data source name or object
   */
  dataSource(dataSource: DataSource): this {
    this.rule.dataSource = dataSource;
    return this;
  }

  /**
   * Sets meta for the rule
   * @param key Metadata key
   * @param value Metadata value
   */
  meta(key: string, value: any): this {
    if (!this.rule.meta) {
      this.rule.meta = {};
    }
    this.rule.meta[key] = value;
    return this;
  }

  /**
   * Builds and returns the rule
   */
  build(): Rule {
    return this.rule as Rule;
  }
}

/**
 * Builder for data test expressions
 */
export class DataTestBuilder extends RuleBuilder {
  constructor(
    name: string,
    config?: RuleConfig,
    private parameterMap?: Map<string, ParameterInfo>
  ) {
    super(name, config);
  }

  /**
   * Sets the field path for the data test
   * @param field The field path (JMESPath expression)
   */
  field(field: string): this {
    (this.rule as DataTestExpression).field = field;
    return this;
  }

  /**
   * Sets the parameter for the data test by name
   * @param parameterName The name of the parameter defined in the configuration
   */
  parameter(parameterName: string): this {
    if (!this.parameterMap || this.parameterMap.size === 0) {
      throw new ValidationError("No parameters have been configured");
    }

    const paramInfo = this.parameterMap.get(parameterName);
    if (!paramInfo) {
      throw new ValidationError(`Parameter "${parameterName}" not found`);
    }

    // Set field path from the parameter config
    (this.rule as DataTestExpression).field = paramInfo.field;

    // Set data source from the parameter config
    this.rule.dataSource = paramInfo.dataSource;

    // Set metadata from the parameter config if available
    if (paramInfo.meta && Object.keys(paramInfo.meta).length > 0) {
      if (!this.rule.meta) {
        this.rule.meta = {};
      }

      // Merge parameter metadata with existing rule metadata
      Object.assign(this.rule.meta, paramInfo.meta);
    }

    return this;
  }

  /**
   * Creates an equals operator
   * @param value The value to compare against
   */
  equals(value: any): this {
    (this.rule as DataTestExpression).equals = value;
    return this;
  }

  /**
   * Creates an equalsOneOf operator
   * @param values Array of possible values
   */
  equalsOneOf(values: any[]): this {
    (this.rule as DataTestExpression).equalsOneOf = values;
    return this;
  }

  /**
   * Creates a greaterThan operator
   * @param value The value to compare against
   */
  greaterThan(value: number | string): this {
    (this.rule as DataTestExpression).greaterThan = value;
    return this;
  }

  /**
   * Creates a greaterThanEquals operator
   * @param value The value to compare against
   */
  greaterThanEquals(value: number | string): this {
    (this.rule as DataTestExpression).greaterThanEquals = value;
    return this;
  }

  /**
   * Creates a lessThan operator
   * @param value The value to compare against
   */
  lessThan(value: number | string): this {
    (this.rule as DataTestExpression).lessThan = value;
    return this;
  }

  /**
   * Creates a lessThanEquals operator
   * @param value The value to compare against
   */
  lessThanEquals(value: number | string): this {
    (this.rule as DataTestExpression).lessThanEquals = value;
    return this;
  }

  /**
   * Creates a between operator
   * @param min Minimum value
   * @param max Maximum value
   */
  between(min: number, max: number): this {
    (this.rule as DataTestExpression).between = [min, max];
    return this;
  }

  /**
   * Creates an includes operator
   * @param value The value to check for
   */
  includes(value: string | number): this {
    (this.rule as DataTestExpression).includes = value;
    return this;
  }

  /**
   * Creates an includesAny operator
   * @param values Array of values to check for
   */
  includesAny(values: (string | number)[]): this {
    (this.rule as DataTestExpression).includesAny = values;
    return this;
  }

  /**
   * Creates a matches operator
   * @param pattern Regular expression pattern
   */
  matches(pattern: string): this {
    (this.rule as DataTestExpression).matches = pattern;
    return this;
  }

  /**
   * Creates an isNull operator
   * @param value Whether the field should be null
   */
  isNull(value: boolean = true): this {
    (this.rule as DataTestExpression).isNull = value;
    return this;
  }

  /**
   * Creates an isPresent operator
   * @param value Whether the field should be present
   */
  isPresent(value: boolean = true): this {
    (this.rule as DataTestExpression).isPresent = value;
    return this;
  }

  /**
   * Creates an afterDate operator
   * @param date ISO 8601 date string
   */
  afterDate(date: string): this {
    (this.rule as DataTestExpression).afterDate = date;
    return this;
  }

  /**
   * Creates a beforeDate operator
   * @param date ISO 8601 date string
   */
  beforeDate(date: string): this {
    (this.rule as DataTestExpression).beforeDate = date;
    return this;
  }

  /**
   * Creates a betweenDates operator
   * @param startDate ISO 8601 start date
   * @param endDate ISO 8601 end date
   */
  betweenDates(startDate: string, endDate: string): this {
    (this.rule as DataTestExpression).betweenDates = [startDate, endDate];
    return this;
  }

  /**
   * Validates and builds the data test expression
   */
  build(): Rule {
    if (!(this.rule as DataTestExpression).field) {
      throw new ValidationError("DataTestExpression must have a field");
    }

    // Ensure we have at least one operator
    const operators = [
      "equals",
      "equalsOneOf",
      "greaterThan",
      "greaterThanEquals",
      "lessThan",
      "lessThanEquals",
      "between",
      "includes",
      "includesAny",
      "matches",
      "isNull",
      "isPresent",
      "afterDate",
      "beforeDate",
      "betweenDates",
    ];

    const hasOperator = operators.some(
      (op) => op in (this.rule as DataTestExpression)
    );
    if (!hasOperator) {
      throw new ValidationError(
        "DataTestExpression must have at least one operator"
      );
    }

    return super.build();
  }
}

export class BooleanBuilder extends RuleBuilder {
  private booleanType?: "and" | "or" | "not";
  private rules: Rule[] = [];

  /**
   * Creates a new boolean rule builder
   * @param name Rule name
   * @param config Optional rule configuration
   * @param prefixRuleNames Whether to prefix subrule names with parent rule name
   */
  constructor(
    name: string,
    config?: RuleConfig,
    private prefixRuleNames: boolean = true
  ) {
    super(name, config);
  }

  /**
   * Creates a deep clone of a rule with an optionally prefixed name
   * @param rule Rule to clone and rename
   * @returns A new rule with optionally prefixed name
   */
  private cloneAndPrefixRule(rule: Rule): Rule {
    // Create a deep clone of the rule
    const clonedRule = structuredClone(rule);

    // Prefix the rule name with the parent rule name if configured to do so
    if (this.prefixRuleNames) {
      clonedRule.name = `${this.rule.name} | ${rule.name}`;

      // If this is a boolean expression, recursively rename its subrules too
      if ("and" in clonedRule && Array.isArray(clonedRule.and)) {
        clonedRule.and = clonedRule.and.map((r: Rule) =>
          this.cloneAndPrefixRule(r)
        );
      }
      if ("or" in clonedRule && Array.isArray(clonedRule.or)) {
        clonedRule.or = clonedRule.or.map((r: Rule) =>
          this.cloneAndPrefixRule(r)
        );
      }
      if ("not" in clonedRule) {
        clonedRule.not = this.cloneAndPrefixRule(clonedRule.not);
      }
    }

    return clonedRule;
  }

  /**
   * Creates an AND expression
   * @param rules Optional array of rules to add
   */
  and(rules: Rule[] = []): this {
    this.booleanType = "and";
    this.rules = rules.map((rule) => this.cloneAndPrefixRule(rule));
    return this;
  }

  /**
   * Creates an OR expression
   * @param rules Optional array of rules to add
   */
  or(rules: Rule[] = []): this {
    this.booleanType = "or";
    this.rules = rules.map((rule) => this.cloneAndPrefixRule(rule));
    return this;
  }

  /**
   * Creates a NOT expression
   * @param rule The rule to negate
   */
  not(rule?: Rule): this {
    this.booleanType = "not";
    if (rule) {
      this.rules = [this.cloneAndPrefixRule(rule)];
    }
    return this;
  }

  /**
   * Adds a rule to the boolean expression
   * @param rule The rule to add
   */
  addRule(rule: Rule): this {
    if (this.booleanType === "not" && this.rules.length > 0) {
      throw new ValidationError("NOT expressions can only have one rule");
    }
    this.rules.push(this.cloneAndPrefixRule(rule));
    return this;
  }

  /**
   * Validates and builds the boolean expression
   */
  build(): Rule {
    if (!this.booleanType) {
      throw new ValidationError(
        "Boolean expression must have a type (and, or, not)"
      );
    }

    if (this.rules.length === 0) {
      throw new ValidationError(
        `${this.booleanType.toUpperCase()} expression must have at least one rule`
      );
    }

    if (this.booleanType === "not" && this.rules.length !== 1) {
      throw new ValidationError("NOT expression must have exactly one rule");
    }

    const booleanRule = this.rule as BooleanExpression;

    if (this.booleanType === "and") {
      booleanRule.and = this.rules;
    } else if (this.booleanType === "or") {
      booleanRule.or = this.rules;
    } else if (this.booleanType === "not") {
      booleanRule.not = this.rules[0];
    }

    return super.build();
  }
}

/**
 * Builder for rulesets
 */
export class RulesetBuilder {
  private ruleset: Ruleset;

  /**
   * Creates a new ruleset builder
   * @param name The ruleset name
   * @param config Optional configuration for the ruleset
   */
  constructor(name: string, config?: RulesetConfig) {
    if (!name || name.trim() === "") {
      throw new ValidationError("Ruleset name cannot be empty");
    }

    this.ruleset = {
      name,
      rules: [],
      ...(config?.description && { description: config.description }),
      ...(config?.defaultResult && { default: config.defaultResult }),
      ...(config?.version && { version: config.version }),
      ...(config?.meta && { meta: config.meta }),
    };
  }

  /**
   * Sets the description for the ruleset
   * @param description The description
   */
  description(description: string): this {
    this.ruleset.description = description;
    return this;
  }

  /**
   * Sets the default result for the ruleset
   * @param defaultResult The default result
   */
  defaultResult(defaultResult: string): this {
    this.ruleset.default = defaultResult;
    return this;
  }

  /**
   * Sets the version for the ruleset
   * @param version The version string
   */
  version(version: string): this {
    this.ruleset.version = version;
    return this;
  }

  /**
   * Sets meta for the ruleset
   * @param key Metadata key
   * @param value Metadata value
   */
  meta(key: string, value: any): this {
    if (!this.ruleset.meta) {
      this.ruleset.meta = {};
    }
    this.ruleset.meta[key] = value;
    return this;
  }

  /**
   * Adds a rule to the ruleset
   * @param rule The rule to add
   */
  addRule(rule: Rule): this {
    this.ruleset.rules.push(rule);
    return this;
  }

  /**
   * Adds multiple rules to the ruleset
   * @param rules The rules to add
   */
  addRules(rules: Rule[]): this {
    this.ruleset.rules.push(...rules);
    return this;
  }

  /**
   * Appends another ruleset's rules to this ruleset
   * @param ruleset The ruleset to append
   */
  appendRuleset(ruleset: Ruleset): this {
    this.ruleset.rules.push(...ruleset.rules);
    return this;
  }

  /**
   * Validates and builds the ruleset
   */
  build(): Ruleset {
    Regula.validate(this.ruleset);
    return { ...this.ruleset };
  }

  /**
   * Creates an evaluator using this ruleset
   */
  buildEvaluator(): Evaluator {
    return Regula.evaluator(this.build());
  }
}

/**
 * Factory methods for creating rules and rulesets
 */
export class Composer {
  private parameterMap: Map<string, ParameterInfo> = new Map();
  private prefixRuleNames: boolean = false; // Default to false

  /**
   * Creates a new composer instance
   * @param config Configuration object with data sources and parameters
   * @example
   * const compose = Regula.composer({
   *   dataSources: [
   *     { type: "sync", name: "applicant.profile", parameters: [...] },
   *   ]
   * });
   * @see {@link ComposerConfig} for more details on the configuration structure
   * @see {@link DataSourceConfig} for details on data source configuration
   * @see {@link ParameterConfig} for details on parameter configuration
   */
  constructor(config?: ComposerConfig) {
    if (config?.dataSources) {
      this.initializeParameters(config.dataSources);
    }

    // Set prefixRuleNames from config or default to false
    this.prefixRuleNames = config?.prefixRuleNames ?? false;
  }

  /**
   * Initialize parameters from configuration
   */
  private initializeParameters(dataSources: DataSourceConfig[]): void {
    dataSources.forEach((ds) => {
      const dataSource: DataSource = {
        name: ds.name,
        type: ds.type as "sync" | "async",
      };

      ds.parameters.forEach((param) => {
        this.parameterMap.set(param.name, {
          dataSource,
          field: param.field.path,
          meta: param.meta || {},
        });
      });
    });
  }

  /**
   * Creates a new data test rule builder
   * @param name Rule name
   * @param config Optional rule configuration
   */
  dataTest(name: string, config?: RuleConfig): DataTestBuilder {
    return new DataTestBuilder(name, config, this.parameterMap);
  }

  /**
   * Creates a new boolean rule builder
   * @param name Rule name
   * @param config Optional rule configuration
   */
  boolean(name: string, config?: RuleConfig): BooleanBuilder {
    return new BooleanBuilder(name, config, this.prefixRuleNames);
  }

  /**
   * Creates a new ruleset builder
   * @param name Ruleset name
   * @param config Optional ruleset configuration
   */
  ruleset(name: string, config?: RulesetConfig): RulesetBuilder {
    return new RulesetBuilder(name, config);
  }

  /**
   * Creates a new ruleset by combining existing rulesets
   * @param name The name for the new ruleset
   * @param rulesets The rulesets to combine
   * @param config Optional configuration for the new ruleset
   */
  combineRulesets(
    name: string,
    rulesets: Ruleset[],
    config?: RulesetConfig
  ): Ruleset {
    const builder = new RulesetBuilder(name, config);
    rulesets.forEach((ruleset) => {
      builder.appendRuleset(ruleset);
    });
    return builder.build();
  }

  /**
   * Creates a standalone data test rule using the given builder function
   * @param name Rule name
   * @param builder Function that builds the data test rule
   * @param config Optional rule configuration
   */
  createDataTestRule(
    name: string,
    builder: (b: DataTestBuilder) => DataTestBuilder,
    config?: RuleConfig
  ): Rule {
    const b = new DataTestBuilder(name, config, this.parameterMap);
    return builder(b).build();
  }

  /**
   * Creates a standalone boolean rule using the given builder function
   * @param name Rule name
   * @param builder Function that builds the boolean rule
   * @param config Optional rule configuration
   */
  createBooleanRule(
    name: string,
    builder: (b: BooleanBuilder) => BooleanBuilder,
    config?: RuleConfig
  ): Rule {
    const b = new BooleanBuilder(name, config, this.prefixRuleNames);
    return builder(b).build();
  }

  /**
   * Creates a standalone rule using the given builder function
   * @param name Rule name
   * @param builder Function that builds the rule
   * @param config Optional rule configuration
   * @deprecated Use createDataTestRule or createBooleanRule for better type safety
   */
  createRule(
    name: string,
    builder: (b: any) => any,
    config?: RuleConfig
  ): Rule {
    // Create the appropriate builder based on the first called method
    const determineType = (builderFn: Function) => {
      const fnString = builderFn.toString();
      if (fnString.includes(".field(")) {
        return new DataTestBuilder(name, config, this.parameterMap);
      } else if (
        fnString.includes(".and(") ||
        fnString.includes(".or(") ||
        fnString.includes(".not(")
      ) {
        return new BooleanBuilder(name, config, this.prefixRuleNames);
      }
      throw new ValidationError(
        "Unable to determine rule type from builder function"
      );
    };

    const b = determineType(builder);
    return builder(b).build();
  }
}
