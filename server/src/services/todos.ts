import type { Prisma, Todo } from "@prisma/client";

import { prisma } from "../db/prisma.js";
import { AppError } from "../errors/app-error.js";

export interface CreateTodoInput {
  readonly completed?: boolean;
  readonly title: string;
}

export interface UpdateTodoInput {
  readonly completed?: boolean;
  readonly title?: string;
}

export interface TodoDto {
  readonly completed: boolean;
  readonly createdAt: string;
  readonly id: string;
  readonly title: string;
  readonly updatedAt: string;
}

export async function createTodo(input: CreateTodoInput): Promise<TodoDto> {
  const todo = await prisma.todo.create({
    data: {
      completed: input.completed ?? false,
      title: input.title,
    },
  });

  return toTodoDto(todo);
}

export async function listTodos(): Promise<TodoDto[]> {
  const todos = await prisma.todo.findMany({
    orderBy: [{ completed: "asc" }, { createdAt: "desc" }],
  });

  return todos.map(toTodoDto);
}

export async function getTodo(id: string): Promise<TodoDto> {
  return toTodoDto(await getTodoOrThrow(id));
}

export async function updateTodo(id: string, input: UpdateTodoInput): Promise<TodoDto> {
  const data: Prisma.TodoUpdateInput = {};

  if (input.completed !== undefined) {
    data.completed = input.completed;
  }

  if (input.title !== undefined) {
    data.title = input.title;
  }

  if (Object.keys(data).length === 0) {
    return getTodo(id);
  }

  await getTodoOrThrow(id);

  const todo = await prisma.todo.update({
    where: { id },
    data,
  });

  return toTodoDto(todo);
}

export async function deleteTodo(id: string): Promise<void> {
  await getTodoOrThrow(id);
  await prisma.todo.delete({ where: { id } });
}

async function getTodoOrThrow(id: string): Promise<Todo> {
  const todo = await prisma.todo.findUnique({
    where: { id },
  });

  if (!todo) {
    throw new AppError("Todo was not found", {
      code: "TODO_NOT_FOUND",
      statusCode: 404,
    });
  }

  return todo;
}

function toTodoDto(todo: Todo): TodoDto {
  return {
    completed: todo.completed,
    createdAt: todo.createdAt.toISOString(),
    id: todo.id,
    title: todo.title,
    updatedAt: todo.updatedAt.toISOString(),
  };
}
