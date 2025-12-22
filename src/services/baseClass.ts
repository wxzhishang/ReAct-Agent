/**
 * API 类型定义
 * 自动生成，请勿手动修改
 */

/**
 * 用户对象
 */
export interface User {
  /** 用户唯一标识 */
  id: string;
  /** 用户名 */
  username: string;
  /** 电子邮箱 */
  email: string;
  /** 头像 URL */
  avatar?: string;
  /** 用户角色 */
  role?: string;
  /** 创建时间 */
  createdAt?: string;
  /** 更新时间 */
  updatedAt?: string;
}

/**
 * 创建用户请求
 */
export interface CreateUserRequest {
  /** 用户名 */
  username: string;
  /** 电子邮箱 */
  email: string;
  /** 密码 */
  password: string;
  /** 用户角色 */
  role?: string;
}

/**
 * 更新用户请求
 */
export interface UpdateUserRequest {
  /** 用户名 */
  username?: string;
  /** 电子邮箱 */
  email?: string;
  /** 头像 URL */
  avatar?: string;
  /** 用户角色 */
  role?: string;
}

/**
 * 用户列表响应
 */
export interface UserListResponse {
  /** 总数 */
  total?: number;
  /** 当前页 */
  page?: number;
  /** 每页数量 */
  pageSize?: number;
  /** 用户列表 */
  data?: { id: string; username: string; email: string; avatar?: string; role?: string; createdAt?: string; updatedAt?: string }[];
}

/**
 * 用户角色
 */
export type UserRole = "admin" | "user" | "guest";
