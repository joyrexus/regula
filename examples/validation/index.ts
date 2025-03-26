import { Validator as validate } from "../../src/validator";
import dataSources from "./fixtures/dataSources.json";
import ruleset from "./fixtures/ruleset.json";
import snapshot from "./fixtures/snapshot.json";

// Validate programmatically defined data sources
const dataSource = {
  type: "sync",
  name: "applicant.profile",
  description: "Applicant profile data",
  parameters: [
    {
      name: "applicantAge",
      description: "The age of the applicant",
      field: "applicant.age",
      type: "number",
    },
  ],
};

// Validate a single data source
validate.dataSource(dataSource);
console.log("Data source is valid!");

// Validate an array of data sources
validate.dataSources(dataSources);
console.log("Array of data sources is valid!");

// Validate a ruleset
validate.ruleset(ruleset);
console.log("Ruleset is valid!");

// Validate an evaluated ruleset
validate.evaluatedRuleset(ruleset);
console.log("Ruleset is also a valid evaluated ruleset!");

// Validate an evaluated ruleset
validate.evaluatedRuleset(snapshot);
console.log("Evaluated ruleset is valid!");
