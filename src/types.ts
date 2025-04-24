export interface DataSource {
  type: "sync" | "async";
  name: string;
  description?: string;
}

export interface BooleanExpression {
  and?: SubRule[];
  or?: SubRule[];
  not?: SubRule;
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
  includesAll?: (string | number)[]; // Check if all of the specifed values are included in a list (if input `field` references an array)
  matches?: string; // Regular expression
  isNull?: boolean;
  isPresent?: boolean;
  afterDate?: string; // ISO 8601 Date Time stamp
  beforeDate?: string; // ISO 8601 Date Time stamp
  betweenDates?: [string, string]; // ISO 8601 Date Time stamps
}

type RuleExpression = BooleanExpression | DataTestExpression;

export type SubRule = RuleExpression & {
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
  lastEvaluation?: RuleEvaluation;
  meta?: Meta;
};

export type Rule = SubRule & {
  result?: string;
};

export interface RuleEvaluation {
  result: RuleResult;
  updatedAt: string;
  updatedBy?: string;
}

type BaseValue = string | number | boolean;

interface Meta {
  [key: string]: BaseValue | Array<BaseValue> | Record<string, BaseValue>;
}

export type Ruleset = {
  name: string;
  description?: string;
  rules: Rule[];
  default?: string;
  version?: string;
  meta?: Meta;
};

export type RuleResult = string | boolean;

export interface RuleResults {
  // map of top-level rule names to their results
  [name: string]: RuleResult;
}

export interface EvaluationInput {
  context: {
    dataSource: DataSource;
    timestamp: string; // ISO 8601 Date Time stamp
    [key: string]: any; // additional context fields
  };
  data: {
    [key: string]: any;
  };
}

export interface Evaluation {
  input: string; // JSON serialized EvaluationInput;
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

// This is how we'll persist the evaluation
export interface EvaluationRecord {
  id: string; // UUID
  evaluation: EvaluatedRuleset;
  dataSources?: DataSource[]; // data sources relevant to evaluation
  schedule?: string[]; // to schedule recurring evaluations
  done?: boolean; // avoid evaluating if true
  deleted?: boolean; // avoid displaying if true
  createdAt: string; // ISO 8601 Date Time stamp
  updatedAt?: string; // ISO 8601 Date Time stamp
  updatedBy?: string; // user ID
}
