import { Validator } from "../src/validator";
import { ValidationError } from "../src/errors";
import { z } from "zod";

describe("Validator", () => {
  describe("dataSource", () => {
    it("should validate a valid data source", () => {
      const validDataSource = {
        name: "user_data",
        type: "sync",
        parameters: [
          {
            name: "User Age",
            field: "user.age",
            type: "number",
          },
        ],
      };

      const result = Validator.dataSource(validDataSource);
      expect(result).toEqual(validDataSource);
    });

    it("should throw error for invalid data source type", () => {
      const invalidDataSource = {
        name: "user_data",
        type: "invalid", // Should be 'sync' or 'async'
        parameters: [
          {
            name: "User Age",
            field: "user.age",
            type: "number",
          },
        ],
      };

      expect(() => Validator.dataSource(invalidDataSource)).toThrow(
        ValidationError
      );
    });

    it("should throw error for empty data source name", () => {
      const invalidDataSource = {
        name: "", // Should not be empty
        type: "sync",
        parameters: [
          {
            name: "User Age",
            field: "user.age",
            type: "number",
          },
        ],
      };

      expect(() => Validator.dataSource(invalidDataSource)).toThrow(
        ValidationError
      );
    });

    it("should throw error for missing parameters", () => {
      const invalidDataSource = {
        name: "user_data",
        type: "sync",
        parameters: [], // Should have at least one parameter
      };

      expect(() => Validator.dataSource(invalidDataSource)).toThrow(
        ValidationError
      );
    });
  });

  describe("dataSources", () => {
    it("should validate valid data sources array", () => {
      const validDataSources = [
        {
          name: "user_data",
          type: "sync",
          parameters: [
            {
              name: "User Age",
              field: "user.age",
              type: "number",
            },
          ],
        },
        {
          name: "transaction_data",
          type: "async",
          parameters: [
            {
              name: "Amount",
              field: "transaction.amount",
              type: "number",
            },
          ],
        },
      ];

      const result = Validator.dataSources(validDataSources);
      expect(result).toEqual(validDataSources);
    });

    it("should throw error if any data source is invalid", () => {
      const invalidDataSources = [
        {
          name: "user_data",
          type: "sync",
          parameters: [
            {
              name: "User Age",
              field: "user.age",
              type: "number",
            },
          ],
        },
        {
          name: "transaction_data",
          type: "invalid", // Invalid type
          parameters: [
            {
              name: "Amount",
              field: "transaction.amount",
              type: "number",
            },
          ],
        },
      ];

      expect(() => Validator.dataSources(invalidDataSources)).toThrow(
        ValidationError
      );
    });
  });

  describe("rule", () => {
    it("should validate a valid data test rule", () => {
      const validRule = {
        name: "Age Check",
        field: "person.age",
        greaterThan: 18,
        result: "adult",
      };

      const result = Validator.rule(validRule);
      expect(result).toEqual(validRule);
    });

    it("should validate a valid boolean rule with AND", () => {
      const validRule = {
        name: "Complex Check",
        and: [
          {
            name: "Age Check",
            field: "person.age",
            greaterThan: 18,
          },
          {
            name: "Active Check",
            field: "person.active",
            equals: true,
          },
        ],
        result: "qualified",
      };

      const result = Validator.rule(validRule);
      expect(result).toEqual(validRule);
    });

    it("should validate a valid boolean rule with OR", () => {
      const validRule = {
        name: "Payment Method",
        or: [
          {
            name: "Credit Card",
            field: "payment.type",
            equals: "credit_card",
          },
          {
            name: "Debit Card",
            field: "payment.type",
            equals: "debit_card",
          },
        ],
      };

      const result = Validator.rule(validRule);
      expect(result).toEqual(validRule);
    });

    it("should validate a valid boolean rule with NOT", () => {
      const validRule = {
        name: "Not Blocked",
        not: {
          name: "Blocked",
          field: "user.status",
          equals: "blocked",
        },
      };

      const result = Validator.rule(validRule);
      expect(result).toEqual(validRule);
    });

    it("should throw error for rule without name", () => {
      const invalidRule = {
        field: "person.age",
        greaterThan: 18,
      };

      expect(() => Validator.rule(invalidRule)).toThrow(ValidationError);
    });

    it("should throw error for data test rule without field", () => {
      const invalidDataTestExpression = {
        name: "Invalid Rule",
        greaterThan: 18, // Missing 'field'
      };

      expect(() =>
        Validator.dataTestExpression(invalidDataTestExpression)
      ).toThrow(ValidationError);
    });
  });

  describe("ruleset", () => {
    it("should validate a valid ruleset", () => {
      const validRuleset = {
        name: "Eligibility Check",
        rules: [
          {
            name: "Age Check",
            field: "person.age",
            greaterThan: 18,
          },
          {
            name: "Status Check",
            field: "person.status",
            equals: "active",
          },
        ],
        default: "REJECTED",
      };

      const result = Validator.ruleset(validRuleset);
      expect(result).toEqual(validRuleset);
    });

    it("should throw error for ruleset without name", () => {
      const invalidRuleset = {
        rules: [
          {
            name: "Age Check",
            field: "person.age",
            greaterThan: 18,
          },
        ],
      };

      expect(() => Validator.ruleset(invalidRuleset)).toThrow(ValidationError);
    });

    it("should throw error for ruleset without rules", () => {
      const invalidRuleset = {
        name: "Empty Ruleset",
        rules: [], // Should have at least one rule
      };

      expect(() => Validator.ruleset(invalidRuleset)).toThrow(ValidationError);
    });

    it("should throw error for ruleset with invalid rule", () => {
      const invalidRuleset = {
        name: "Invalid Ruleset",
        rules: [
          {
            name: "Invalid Rule",
            // Missing field or boolean expression
          },
        ],
      };

      expect(() => Validator.ruleset(invalidRuleset)).toThrow(ValidationError);
    });
  });

  describe("evaluatedRuleset", () => {
    it("should validate a valid evaluated ruleset", () => {
      const timestamp = new Date().toISOString();
      const validEvaluatedRuleset = {
        name: "Eligibility Check",
        rules: [
          {
            name: "Age Check",
            field: "person.age",
            greaterThan: 18,
            lastEvaluation: {
              result: true,
              updatedAt: timestamp,
              updatedBy: "system",
            },
          },
        ],
        lastEvaluation: {
          input: {
            context: {
              dataSource: { type: "sync", name: "user_data" },
              timestamp: timestamp,
              userId: "user-123",
            },
            data: { person: { age: 25 } },
          },
          result: true,
          evaluatedAt: timestamp,
          evaluatedBy: "system",
        },
      };

      const result = Validator.evaluatedRuleset(validEvaluatedRuleset);
      expect(result).toEqual(validEvaluatedRuleset);
    });

    it("should validate a deactivated evaluated ruleset", () => {
      const timestamp = new Date().toISOString();
      const validEvaluatedRuleset = {
        name: "Eligibility Check",
        rules: [
          {
            name: "Age Check",
            field: "person.age",
            greaterThan: 18,
          },
        ],
        deactivated: {
          reason: "No longer used",
          updatedBy: "admin",
          updatedAt: timestamp,
        },
      };

      const result = Validator.evaluatedRuleset(validEvaluatedRuleset);
      expect(result).toEqual(validEvaluatedRuleset);
    });

    it("should throw error for invalid evaluation format", () => {
      const invalidEvaluatedRuleset = {
        name: "Eligibility Check",
        rules: [
          {
            name: "Age Check",
            field: "person.age",
            greaterThan: 18,
          },
        ],
        lastEvaluation: {
          // Missing required fields
          result: true,
        },
      };

      expect(() => Validator.evaluatedRuleset(invalidEvaluatedRuleset)).toThrow(
        ValidationError
      );
    });
  });

  describe("formatError", () => {
    it("should format Zod errors correctly", () => {
      try {
        // Create a Zod validation error
        z.object({
          name: z.string().min(3),
          age: z.number().min(18),
        }).parse({ name: "A", age: 10 });
        fail("Expected validation to fail");
      } catch (error) {
        if (error instanceof z.ZodError) {
          const formatted = Validator.formatError(error);
          expect(formatted).toContain("Error at 'name'");
          expect(formatted).toContain("Error at 'age'");
        } else {
          fail("Expected ZodError");
        }
      }
    });

    it("should handle non-Zod errors", () => {
      const error = new Error("Some other error");
      const formatted = Validator.formatError(error as any);
      expect(formatted).toBe("Error: Some other error");
    });
  });
});
