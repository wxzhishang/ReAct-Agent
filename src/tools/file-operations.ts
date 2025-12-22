/**
 * 文件操作工具集
 * 提供文件读取、写入、检查等基础操作
 * 使用 Bun 原生 API
 */

import { z } from "zod";
import { Tool } from "./base.ts";
import type { ToolResult } from "../agent/types.ts";
import type { DirectoryItem } from "./types.ts";
import fg from "fast-glob";
import { readdir, mkdir, stat } from "node:fs/promises";
import { join, dirname } from "node:path";

const fileReaderSchema = z.object({
  filePath: z.string().describe("文件路径（相对或绝对路径）"),
});

/**
 * FileReaderTool - 读取文件内容
 */
export class FileReaderTool extends Tool {
  name = "file_reader";
  description = "读取文件内容。支持读取任何文本文件（如 JSON、TS、JS、MD 等）";
  schema = fileReaderSchema;

  async execute(input: unknown): Promise<ToolResult> {
    try {
      const { filePath } = this.schema.parse(input);

      // 使用 Bun.file() 检查文件是否存在
      const file = Bun.file(filePath);
      const exists = await file.exists();

      if (!exists) {
        return {
          success: false,
          error: `文件不存在: ${filePath}`,
        };
      }

      // 使用 Bun API 读取文件内容
      const content = await file.text();

      return {
        success: true,
        data: {
          filePath,
          content,
          size: content.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

const fileWriterSchema = z.object({
  filePath: z.string().describe("文件路径（相对或绝对路径）"),
  content: z.string().describe("要写入的内容"),
  createDir: z.boolean().optional().describe("是否自动创建目录（默认 true）"),
});

/**
 * FileWriterTool - 写入文件
 */
export class FileWriterTool extends Tool {
  name = "file_writer";
  description = "写入内容到文件。如果目录不存在会自动创建，如果文件已存在会覆盖。**生成代码后必须使用此工具写入文件，不要只返回代码内容**";
  schema = fileWriterSchema;

  async execute(input: unknown): Promise<ToolResult> {
    try {
      const { filePath, content, createDir = true } = this.schema.parse(input);

      // 如果需要，创建目录
      if (createDir) {
        const dir = dirname(filePath);
        const dirFile = Bun.file(dir);
        const dirExists = await dirFile.exists();
        
        if (!dirExists) {
          await mkdir(dir, { recursive: true });
        }
      }

      // 使用 Bun.write() 写入文件
      await Bun.write(filePath, content);

      return {
        success: true,
        data: {
          filePath,
          size: content.length,
          message: `成功写入文件: ${filePath}`,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

const fileExistsSchema = z.object({
  filePath: z.string().describe("文件或目录路径"),
});

/**
 * FileExistsTool - 检查文件是否存在
 */
export class FileExistsTool extends Tool {
  name = "file_exists";
  description = "检查文件或目录是否存在";
  schema = fileExistsSchema;

  async execute(input: unknown): Promise<ToolResult> {
    try {
      const { filePath } = this.schema.parse(input);

      // 使用 Bun.file() 检查是否存在
      const file = Bun.file(filePath);
      const exists = await file.exists();
      
      // 如果存在，获取更多信息
      let stats = null;
      if (exists) {
        try {
          const fileStats = await stat(filePath);
          stats = {
            isFile: fileStats.isFile(),
            isDirectory: fileStats.isDirectory(),
            size: fileStats.size,
            modifiedTime: fileStats.mtime,
          };
        } catch {
          // 如果 stat 失败，只返回存在状态
        }
      }

      return {
        success: true,
        data: {
          filePath,
          exists,
          ...stats,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

const fileSearchSchema = z.object({
  pattern: z.string().describe("搜索模式（glob 格式），如 '**/*.json' 或 'src/**/*.ts'"),
  baseDir: z.string().optional().describe("搜索基础目录（默认当前目录）"),
  maxResults: z.number().optional().describe("最大返回结果数（默认 100）"),
});

/**
 * FileSearchTool - 搜索文件
 */
export class FileSearchTool extends Tool {
  name = "file_search";
  description = "使用 glob 模式搜索文件。支持通配符：* 匹配任意字符，** 匹配任意目录";
  schema = fileSearchSchema;

  async execute(input: unknown): Promise<ToolResult> {
    try {
      const { pattern, baseDir = ".", maxResults = 100 } = this.schema.parse(input);

      // 使用 fast-glob 搜索
      const files = await fg(pattern, {
        cwd: baseDir,
        absolute: true,
        ignore: ["**/node_modules/**", "**/.git/**"],
      });

      // 限制结果数量
      const limitedFiles = files.slice(0, maxResults);

      return {
        success: true,
        data: {
          pattern,
          baseDir,
          count: limitedFiles.length,
          totalFound: files.length,
          files: limitedFiles,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

const directoryListSchema = z.object({
  dirPath: z.string().describe("目录路径"),
  recursive: z.boolean().optional().describe("是否递归列出子目录（默认 false）"),
});

/**
 * DirectoryListTool - 列出目录内容
 */
export class DirectoryListTool extends Tool {
  name = "directory_list";
  description = "列出指定目录下的文件和子目录";
  schema = directoryListSchema;

  async execute(input: unknown): Promise<ToolResult> {
    try {
      const { dirPath, recursive = false } = this.schema.parse(input);

      // 使用 Bun.file() 检查目录是否存在
      const dir = Bun.file(dirPath);
      const exists = await dir.exists();

      if (!exists) {
        return {
          success: false,
          error: `目录不存在: ${dirPath}`,
        };
      }

      // 检查是否是目录
      const dirStats = await stat(dirPath);
      if (!dirStats.isDirectory()) {
        return {
          success: false,
          error: `路径不是目录: ${dirPath}`,
        };
      }

      // 列出目录内容
      const items: DirectoryItem[] = [];

      if (recursive) {
        // 递归列出
        const files = await fg("**/*", {
          cwd: dirPath,
          absolute: false,
          ignore: ["**/node_modules/**", "**/.git/**"],
        });
        
        // 批量获取文件信息
        const recursiveItems = await Promise.all(
          files.map(async (file): Promise<DirectoryItem> => {
            const fullPath = join(dirPath, file);
            try {
              const stats = await stat(fullPath);
              return {
                name: file,
                path: fullPath,
                type: stats.isDirectory() ? "directory" : "file",
              };
            } catch {
              return {
                name: file,
                path: fullPath,
                type: "unknown",
              };
            }
          })
        );
        items.push(...recursiveItems);
      } else {
        // 只列出当前目录
        const entries = await readdir(dirPath);
        
        // 批量获取文件信息
        const directItems = await Promise.all(
          entries.map(async (entry): Promise<DirectoryItem> => {
            const fullPath = join(dirPath, entry);
            try {
              const stats = await stat(fullPath);
              return {
                name: entry,
                path: fullPath,
                type: stats.isDirectory() ? "directory" : "file",
                size: stats.isFile() ? stats.size : undefined,
              };
            } catch {
              return {
                name: entry,
                path: fullPath,
                type: "unknown",
              };
            }
          })
        );
        items.push(...directItems);
      }

      return {
        success: true,
        data: {
          dirPath,
          count: items.length,
          items,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

