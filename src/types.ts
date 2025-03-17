export interface DataSource {
  type: string; // "sync" | "async";
  name: string;
  description?: string;
}

export interface BooleanExpression {
  and?: Rule[];
  or?: Rule[];
  not?: Rule;
}

export interface DataTestExpression {
  field: string; // a JMESPath to a value in the input data
  equals?: string | number | boolean;
  equalsOneOf?: (string | number)[];
  greaterThan?: number | string;
  greaterThanEquals?: number | string;
  lessThan?: number | string;
  lessThanEquals?: number | string;
  between?: [number, number];
  includes?: string | number; // Check if specified value is included in a list (if input `field` references an array)
  includesAny?: (string | number)[]; // Check if any of the specifed values are included in a list (if input `field` references an array)
  matches?: string; // Regular expression
  isNull?: boolean;
  isPresent?: boolean;
  afterDate?: string; // ISO 8601 Date Time stamp
  beforeDate?: string; // ISO 8601 Date Time stamp
  betweenDates?: [string, string]; // ISO 8601 Date Time stamps
}

type RuleExpression = BooleanExpression | DataTestExpression;

export type Rule = RuleExpression & {
  name: string;
  description?: string;
  dataSource?: DataSource;
  deactivated?:
    | boolean
    | {
        reason?: string;
        updatedBy?: string;
        updatedAt: string;
      };
  result?: string;
  lastEvaluation?: RuleEvaluation;
  meta?: {
    [key: string]: string | number | boolean;
  };
};

export interface RuleEvaluation {
  result: RuleResult;
  updatedAt: string;
  updatedBy?: string;
}

export interface Ruleset {
  name: string;
  rules: Rule[];
  description?: string;
  default?: string;
  version?: string;
  meta?: Record<string, any>;
}

export type RuleResult = string | boolean;

export interface RuleResults {
  // map of top-level rule names to their results
  [name: string]: RuleResult;
}

export interface EvaluationInput {
  context: {
    dataSource: DataSource;
    timestamp: string; // ISO 8601 Date Time stamp
    entityId?: string;
    userId?: string;
  };
  data: {
    [key: string]: any;
  };
}

export interface Evaluation {
  input: EvaluationInput;
  result: RuleResult;
  resultFrom?: string;
  evaluatedAt: string;
  evaluatedBy?: string;
}

export interface EvaluatedRuleset extends Ruleset {
  deactivated?:
    | boolean
    | {
        reason?: string;
        updatedBy?: string;
        updatedAt: string;
      };
  lastEvaluation?: Evaluation;
}

// This is how we'd persist the evaluation in a database.
export interface EvaluationRecord extends EvaluatedRuleset {
  id: string;
  tenantId: string;
  createdAt: string;
  updatedAt?: string; // ISO 8601 Date Time stamp
  updatedBy?: string; // user ID
  evaluations: Evaluation[];
  done?: boolean; // avoid evaluating if true
  deleted?: boolean; // avoid displaying if true
}