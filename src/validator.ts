import { z } from "zod";
import { DataSource, EvaluatedRuleset, Rule, Ruleset } from "./types";

/**
 * Parameter schema
 */
const parameterSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Parameter name cannot be empty"),
  description: z.string().optional(),
  field: z.string().min(1, "Field path cannot be empty"),
  type: z.string().min(1, "Type cannot be empty"),
  meta: z.record(z.string(), z.any()).optional(),
});

/**
 * Data source schema
 */
const dataSourceSchema = z.object({
  type: z.union([z.literal("sync"), z.literal("async")], {
    errorMap: () => ({ message: "Type must be either 'sync' or 'async'" }),
  }),
  name: z.string().min(1, "Data source name cannot be empty"),
  description: z.string().optional(),
  parameters: z
    .array(parameterSchema)
    .min(1, "Data source must have at least one parameter"),
});

/**
 * Array of data sources schema
 */
const dataSourcesSchema = z.array(dataSourceSchema);

/**
 * Data source schema used in rules
 */
const ruleDataSourceSchema = z.object({
  type: z.union([z.literal("sync"), z.literal("async")], {
    errorMap: () => ({ message: "Type must be either 'sync' or 'async'" }),
  }),
  name: z.string().min(1, "Data source name cannot be empty"),
  description: z.string().optional(),
});

/**
 * Rule evaluation schema
 */
const ruleEvaluationSchema = z.object({
  result: z.union([z.string(), z.boolean()]),
  updatedAt: z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/,
      "Invalid ISO 8601 date format"
    ),
  updatedBy: z.string().optional(),
});

/**
 * Base rule schema with common properties
 */
const baseRuleSchema = z.object({
  name: z.string().min(1, "Rule name cannot be empty"),
  description: z.string().optional(),
  dataSource: ruleDataSourceSchema.optional(),
  deactivated: z
    .union([
      z.boolean(),
      z.object({
        reason: z.string().optional(),
        updatedBy: z.string().optional(),
        updatedAt: z
          .string()
          .regex(
            /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/,
            "Invalid ISO 8601 date format"
          ),
      }),
    ])
    .optional(),
  result: z.string().optional(),
  lastEvaluation: ruleEvaluationSchema.optional(),
  meta: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
    .optional(),
});

/**
 * Forward declaration for rule schema to allow recursive references
 */
type RuleSchema = z.ZodType<any, any, any>;
let ruleSchema: RuleSchema;

/**
 * Data test expression schema
 */
const dataTestExpressionSchema = baseRuleSchema.extend({
  field: z.string().min(1, "Field cannot be empty"),
  equals: z.union([z.string(), z.number(), z.boolean()]).optional(),
  equalsOneOf: z.array(z.union([z.string(), z.number()])).optional(),
  greaterThan: z.union([z.number(), z.string()]).optional(),
  greaterThanEquals: z.union([z.number(), z.string()]).optional(),
  lessThan: z.union([z.number(), z.string()]).optional(),
  lessThanEquals: z.union([z.number(), z.string()]).optional(),
  between: z.tuple([z.number(), z.number()]).optional(),
  includes: z.union([z.string(), z.number()]).optional(),
  includesAny: z.array(z.union([z.string(), z.number()])).optional(),
  matches: z.string().optional(),
  isNull: z.boolean().optional(),
  isPresent: z.boolean().optional(),
  afterDate: z.string().optional(),
  beforeDate: z.string().optional(),
  betweenDates: z.tuple([z.string(), z.string()]).optional(),
});

/**
 * Initialize the recursive rule schema
 */
const initRuleSchema = () => {
  // Boolean expression schema with recursive references to rules
  const booleanExpressionSchema = baseRuleSchema.extend({
    and: z.array(z.lazy(() => ruleSchema)).optional(),
    or: z.array(z.lazy(() => ruleSchema)).optional(),
    not: z.lazy(() => ruleSchema).optional(),
  });

  // Combined rule schema as union of data test and boolean expressions
  ruleSchema = z.union([dataTestExpressionSchema, booleanExpressionSchema]);
};

// Initialize the rule schema
initRuleSchema();

/**
 * Evaluation schema for an evaluated ruleset
 */
const evaluationSchema = z.object({
  input: z.object({
    context: z.object({
      dataSource: ruleDataSourceSchema,
      timestamp: z
        .string()
        .regex(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/,
          "Invalid ISO 8601 date format"
        ),
      entityId: z.string().optional(),
      userId: z.string().optional(),
    }),
    data: z.record(z.string(), z.any()),
  }),
  result: z.union([z.string(), z.boolean()]),
  resultFrom: z.string().optional(),
  evaluatedAt: z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/,
      "Invalid ISO 8601 date format"
    ),
  evaluatedBy: z.string().optional(),
});

/**
 * Ruleset schema
 */
const rulesetSchema = z.object({
  name: z.string().min(1, "Ruleset name cannot be empty"),
  description: z.string().optional(),
  rules: z.array(ruleSchema).min(1, "Ruleset must have at least one rule"),
  default: z.string().optional(),
  version: z.string().optional(),
  meta: z.record(z.string(), z.any()).optional(),
});

/**
 * Evaluated ruleset schema, extending ruleset with evaluation data
 */
const evaluatedRulesetSchema = rulesetSchema.extend({
  deactivated: z
    .union([
      z.boolean(),
      z.object({
        reason: z.string().optional(),
        updatedBy: z.string().optional(),
        updatedAt: z
          .string()
          .regex(
            /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/,
            "Invalid ISO 8601 date format"
          ),
      }),
    ])
    .optional(),
  lastEvaluation: evaluationSchema.optional(),
});

export type ValidatedParameter = z.infer<typeof parameterSchema>;
export type ValidatedDataSource = z.infer<typeof dataSourceSchema>;
export type ValidatedDataSources = z.infer<typeof dataSourcesSchema>;
export type ValidatedRule = z.infer<typeof ruleSchema>;
export type ValidatedRuleset = z.infer<typeof rulesetSchema>;
export type ValidatedEvaluatedRuleset = z.infer<typeof evaluatedRulesetSchema>;

/**
 * Class for validating Regula configuration objects
 */
export class Validator {
  /**
   * Validates a single data source configuration
   * @param dataSource Data source to validate
   * @returns Validated data source or throws ZodError
   */
  static dataSource(dataSource: unknown): DataSource {
    return dataSourceSchema.parse(dataSource) as DataSource;
  }

  /**
   * Validates an array of data source configurations
   * @param dataSources Data sources to validate
   * @returns Validated data sources or throws ZodError
   */
  static dataSources(dataSources: unknown): DataSource[] {
    return dataSourcesSchema.parse(dataSources) as DataSource[];
  }

  /**
   * Validates a rule
   * @param rule Rule to validate
   * @returns Validated rule or throws ZodError
   */
  static rule(rule: unknown): Rule {
    return ruleSchema.parse(rule) as Rule;
  }

  /**
   * Validates a ruleset
   * @param ruleset Ruleset to validate
   * @returns Validated ruleset or throws ZodError
   */
  static ruleset(ruleset: unknown): Ruleset {
    return rulesetSchema.parse(ruleset) as Ruleset;
  }

  /**
   * Validates an evaluated ruleset
   * @param evaluatedRuleset Evaluated ruleset to validate
   * @returns Validated evaluated ruleset or throws ZodError
   */
  static evaluatedRuleset(evaluatedRuleset: unknown): EvaluatedRuleset {
    return evaluatedRulesetSchema.parse(evaluatedRuleset) as EvaluatedRuleset;
  }

  /**
   * Formats validation errors into a readable string
   * @param error The ZodError to format
   * @returns A formatted error message
   */
  static formatErrors(error: z.ZodError): string {
    // check if this is a ZodError
    if (!(error instanceof z.ZodError)) {
      return (error as Error).toString();
    }
    return error.errors
      .map((err) => `- Error at '${err.path.join(".")}': ${err.message}`)
      .join("\n");
  }
}
