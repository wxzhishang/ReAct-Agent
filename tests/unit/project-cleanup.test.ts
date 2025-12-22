/**
 * Project Cleanup Verification Tests
 * Feature: api-code-generator-refactor
 */

import { describe, test, expect } from "bun:test";
import { existsSync } from "fs";
import { readFileSync } from "fs";

describe("Project Cleanup Verification", () => {
  // Requirement 6.1, 6.2, 6.3, 6.4, 5.4
  test("should have removed all non-API tools and files", () => {
    // Tool files should be deleted
    expect(existsSync("src/tools/calculator.ts")).toBe(false);
    expect(existsSync("src/tools/search.ts")).toBe(false);
    expect(existsSync("src/tools/weather.ts")).toBe(false);
    expect(existsSync("src/utils/city-codes.json")).toBe(false);

    // Example files should be deleted
    expect(existsSync("examples/basic-example.ts")).toBe(false);
    expect(existsSync("examples/context-conversation-example.ts")).toBe(false);
    expect(existsSync("examples/custom-tool-example.ts")).toBe(false);
    expect(existsSync("examples/siliconflow-example.ts")).toBe(false);

    // API code gen example should be kept
    expect(existsSync("examples/api-code-gen-example.ts")).toBe(true);
  });

  // Requirement 6.5
  test("should have removed mathjs dependency from package.json", () => {
    const packageJson = JSON.parse(readFileSync("package.json", "utf-8"));
    expect(packageJson.dependencies?.mathjs).toBeUndefined();
  });

  // Requirement 5.1
  test("README should describe API code generation functionality", () => {
    const readme = readFileSync("README.md", "utf-8");
    expect(readme).toContain("API");
    expect(readme).toContain("代码");
    expect(readme).toContain("生成");
    expect(readme).toContain("Swagger");
    expect(readme).toContain("OpenAPI");
  });

  // Requirement 5.2
  test("package.json description should reflect API code generation", () => {
    const packageJson = JSON.parse(readFileSync("package.json", "utf-8"));
    expect(packageJson.description).toContain("API");
    expect(packageJson.description).toContain("code");
    expect(packageJson.description).toContain("generator");
  });
});
