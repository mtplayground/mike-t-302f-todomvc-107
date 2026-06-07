import { apiRequest } from "./client.js";

export interface Todo {
  readonly completed: boolean;
  readonly createdAt: string;
  readonly id: string;
  readonly title: string;
  readonly updatedAt: string;
}

export interface CreateTodoInput {
  readonly title: string;
}

export interface UpdateTodoInput {
  readonly completed: boolean;
}

interface ListTodosResponse {
  readonly todos: Todo[];
}

interface TodoResponse {
  readonly todo: Todo;
}

export async function createTodo(input: CreateTodoInput): Promise<Todo> {
  const response = await apiRequest<TodoResponse>("/todos", {
    body: input,
    method: "POST",
  });

  return response.todo;
}

export async function getTodos(
  options: { readonly signal?: AbortSignal } = {}
): Promise<Todo[]> {
  const response = await apiRequest<ListTodosResponse>("/todos", {
    signal: options.signal,
  });

  return response.todos;
}

export async function updateTodo(id: string, input: UpdateTodoInput): Promise<Todo> {
  const response = await apiRequest<TodoResponse>(`/todos/${id}`, {
    body: input,
    method: "PATCH",
  });

  return response.todo;
}

export async function deleteTodo(id: string): Promise<void> {
  await apiRequest<void>(`/todos/${id}`, {
    method: "DELETE",
  });
}
