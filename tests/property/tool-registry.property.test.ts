/**
 * Tool Registry Property-Based Tests
 * Feature: api-code-generator-refactor
 */

import { describe, test, expect } from "bun:test";
import fc from "fast-check";
import { ToolRegistry } from "../../src/tools/base.ts";
import {
  SwaggerParserTool,
  BasicTypeGeneratorTool,
  BasicAPIGeneratorTool,
  FileReaderTool,
  FileWriterTool,
  FileExistsTool,
  FileSearchTool,
  DirectoryListTool,
} from "../../src/tools/index.ts";

describe("Tool Registry Properties", () => {
  // Feature: api-code-generator-refactor, Property 1: Tool Registry Exclusion
  test("Tool Registry should not contain removed tools", () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const registry = new ToolRegistry();
        
        // Register all API code generation tools
        registry.register(new SwaggerParserTool());
        registry.register(new BasicTypeGeneratorTool());
        registry.register(new BasicAPIGeneratorTool());
        registry.register(new FileReaderTool());
        registry.register(new FileWriterTool());
        registry.register(new FileExistsTool());
        registry.register(new FileSearchTool());
        registry.register(new DirectoryListTool());
        
        const toolNames = registry.getNames();
        
        // Verify removed tools are not present
        expect(toolNames).not.toContain("calculator");
        expect(toolNames).not.toContain("search");
        expect(toolNames).not.toContain("weather");
      }),
      { numRuns: 100 }
    );
  });

  // Feature: api-code-generator-refactor, Property 2: Tool Registry Inclusion
  test("Tool Registry should only contain API code generation tools", () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const registry = new ToolRegistry();
        
        // Register all API code generation tools
        registry.register(new SwaggerParserTool());
        registry.register(new BasicTypeGeneratorTool());
        registry.register(new BasicAPIGeneratorTool());
        registry.register(new FileReaderTool());
        registry.register(new FileWriterTool());
        registry.register(new FileExistsTool());
        registry.register(new FileSearchTool());
        registry.register(new DirectoryListTool());
        
        const toolNames = registry.getNames();
        const expectedTools = [
          "swagger_parser",
          "basic_type_generator",
          "basic_api_generator",
          "file_reader",
          "file_writer",
          "file_exists",
          "file_search",
          "directory_list",
        ];
        
        // Verify exactly these 8 tools are present
        expect(toolNames.length).toBe(8);
        expectedTools.forEach(toolName => {
          expect(toolNames).toContain(toolName);
        });
      }),
      { numRuns: 100 }
    );
  });
});
