// 使用原生 fetch API
import type { CreateUserRequest, UpdateUserRequest } from '../../baseClass';

const BASE_URL = 'https://api.example.com/v1';

/**
 * 获取用户列表
 * 获取所有用户的列表，支持分页
 * @method GET
 * @path /users
 */
export async function listUsers(params?: { page?: number; pageSize?: number }) {
  try {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.pageSize) queryParams.append('pageSize', params.pageSize.toString());
    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
    const response = await fetch(`${BASE_URL}/users${queryString}`, { method: 'GET' });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json() as any;
  } catch (error) {
    console.error('API 请求失败:', error);
    throw error;
  }
}

/**
 * 创建用户
 * 创建一个新用户
 * @method POST
 * @path /users
 */
export async function createUser(data: CreateUserRequest) {
  try {
    const response = await fetch(`${BASE_URL}/users`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json() as any;
  } catch (error) {
    console.error('API 请求失败:', error);
    throw error;
  }
}

/**
 * 获取用户详情
 * 根据用户 ID 获取用户详细信息
 * @method GET
 * @path /users/{userId}
 */
export async function getUserById(userId: string) {
  try {
    const response = await fetch(`${BASE_URL}/users/${userId}`, { method: 'GET' });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json() as any;
  } catch (error) {
    console.error('API 请求失败:', error);
    throw error;
  }
}

/**
 * 更新用户
 * 更新用户信息
 * @method PUT
 * @path /users/{userId}
 */
export async function updateUser(userId: string, data: UpdateUserRequest) {
  try {
    const response = await fetch(`${BASE_URL}/users/${userId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json() as any;
  } catch (error) {
    console.error('API 请求失败:', error);
    throw error;
  }
}

/**
 * 删除用户
 * 删除指定用户
 * @method DELETE
 * @path /users/{userId}
 */
export async function deleteUser(userId: string) {
  try {
    const response = await fetch(`${BASE_URL}/users/${userId}`, { method: 'DELETE' });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    // 204 No Content 没有响应体
  } catch (error) {
    console.error('API 请求失败:', error);
    throw error;
  }
}
