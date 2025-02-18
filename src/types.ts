export interface DataSource {
  type: "sync" | "async";
  name: string;
  description?: string;
}

export interface BooleanExpression {
  and?: Rule[];
  or?: Rule[];
  not?: Rule;
}

export interface DataTestExpression {
  path: string; // a JMESPath to a value in the input data
  dataSource?: DataSource;
  equals?: string | number | boolean;
  equalsOneOf?: (string | number)[];
  greaterThan?: number | string;
  lessThan?: number | string;
  between?: [number, number];
  includes?: string | number; // Check if specified value is included in a list (if input `path` references an array)
  includesAny?: (string | number)[]; // Check if any of the specifed values are included in a list (if input `path` references an array)
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
  deactivated?:
    | boolean
    | {
        reason?: string;
        updatedBy?: string;
        updatedAt: string;
      };
  result?: string;
  lastEvaluation?: RuleEvaluation;
  metaData?: {
    [key: string]: any;
  };
};

export interface RuleEvaluation {
  result: RuleResult;
  updatedAt: string;
  updatedBy?: string;
}

export type Ruleset = {
  name: string;
  description?: string;
  rules: Rule[];
  default?: string;
  version?: string;
  metaData?: {
    [key: string]: any;
  };
};

export type RuleResult = string | boolean;

export interface RuleResults {
  result: RuleResult; // overall result of the ruleset
  resultFrom: string; // name of the rule that produced the result
  rules: {
    // map of top-level rule names to their results
    [name: string]: RuleResult;
  };
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
  id: string; // UUID
  dataSources?: DataSource[]; // data sources relevant to evaluation
  updateTopic: string; // topic to send evaluation updates
  schedule?: string; // to schedule recurring evaluations
  done?: boolean; // avoid evaluating if true
  deleted?: boolean; // avoid displaying if true
  createdAt: string; // ISO 8601 Date Time stamp
  updatedAt?: string; // ISO 8601 Date Time stamp
  updatedBy?: string; // user ID
}
