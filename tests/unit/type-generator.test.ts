/**
 * Type Generator Unit Tests
 * Feature: api-code-generator-refactor
 */

import { describe, test, expect } from "bun:test";
import { BasicTypeGeneratorTool } from "../../src/tools/type-generator.ts";

describe("BasicTypeGeneratorTool", () => {
  const tool = new BasicTypeGeneratorTool();

  // Property 3: Enum Type Generation
  test("should generate enum types using type keyword", async () => {
    const schema = {
      Status: {
        type: "string",
        enum: ["active", "inactive", "pending"],
      },
    };

    const result = await tool.execute({ schemas: schema });

    expect(result.success).toBe(true);
    expect(result.data.code).toMatch(/export\s+type\s+Status\s*=/);
    expect(result.data.code).not.toContain("interface Status");
    expect(result.data.code).toContain('"active"');
    expect(result.data.code).toContain('"inactive"');
    expect(result.data.code).toContain('"pending"');
  });

  // Property 4: Nested Object Type Generation
  test("should generate nested object types correctly", async () => {
    const schema = {
      User: {
        type: "object",
        properties: {
          profile: {
            type: "object",
            properties: {
              name: { type: "string" },
              age: { type: "number" },
            },
          },
        },
      },
    };

    const result = await tool.execute({ schemas: schema });

    expect(result.success).toBe(true);
    expect(result.data.code).toContain("export interface User");
    expect(result.data.code).toContain("profile");
    expect(result.data.code).toContain("name");
    expect(result.data.code).toContain("age");
  });

  // Property 5: Array Type Generation
  test("should generate array types using Type[] syntax", async () => {
    const schema = {
      StringArray: {
        type: "array",
        items: { type: "string" },
      },
      NumberArray: {
        type: "array",
        items: { type: "number" },
      },
    };

    const result = await tool.execute({ schemas: schema });

    expect(result.success).toBe(true);
    expect(result.data.code).toContain("string[]");
    expect(result.data.code).toContain("number[]");
  });

  // Property 14: Type Generation Syntax Validity
  test("should generate valid TypeScript syntax", async () => {
    const schema = {
      User: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          age: { type: "number" },
          active: { type: "boolean" },
        },
        required: ["id", "name"],
      },
    };

    const result = await tool.execute({ schemas: schema });

    expect(result.success).toBe(true);
    expect(result.data.code).toMatch(/export\s+(interface|type)\s+User/);
    expect(result.data.code).toContain("id:");
    expect(result.data.code).toContain("name:");
    expect(result.data.code).toContain("age");
    expect(result.data.code).toContain("active");
    // Required fields should not have ?
    expect(result.data.code).toMatch(/id:\s*string/);
    expect(result.data.code).toMatch(/name:\s*string/);
    // Optional fields should have ?
    expect(result.data.code).toMatch(/age\?:/);
    expect(result.data.code).toMatch(/active\?:/);
  });
});
