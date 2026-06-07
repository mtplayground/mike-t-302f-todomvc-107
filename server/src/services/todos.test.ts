import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "../db/prisma.js";
import { createTodo, deleteTodo, getTodo, listTodos, updateTodo } from "./todos.js";

const todoTestPrefix = "test-service-todo-";

describe("todo service", () => {
  beforeEach(async () => {
    await cleanupTodos();
  });

  afterAll(async () => {
    await cleanupTodos();
    await prisma.$disconnect();
  });

  it("creates todos with PostgreSQL timestamps and lists incomplete items first", async () => {
    const incompleteTodo = await createTodo({
      title: `${todoTestPrefix}incomplete`,
    });
    const completedTodo = await createTodo({
      completed: true,
      title: `${todoTestPrefix}completed`,
    });

    const todos = (await listTodos()).filter((todo) => todo.title.startsWith(todoTestPrefix));

    expect(incompleteTodo).toMatchObject({
      completed: false,
      title: `${todoTestPrefix}incomplete`,
    });
    expect(completedTodo).toMatchObject({
      completed: true,
      title: `${todoTestPrefix}completed`,
    });
    expect(Date.parse(incompleteTodo.createdAt)).not.toBeNaN();
    expect(Date.parse(incompleteTodo.updatedAt)).not.toBeNaN();
    expect(todos.map((todo) => todo.id)).toEqual([incompleteTodo.id, completedTodo.id]);
  });

  it("reads, updates, and deletes todos", async () => {
    const todo = await createTodo({
      title: `${todoTestPrefix}edit-me`,
    });

    await expect(getTodo(todo.id)).resolves.toMatchObject({
      id: todo.id,
      completed: false,
      title: `${todoTestPrefix}edit-me`,
    });

    const updatedTodo = await updateTodo(todo.id, {
      completed: true,
      title: `${todoTestPrefix}edited`,
    });

    expect(updatedTodo).toMatchObject({
      id: todo.id,
      completed: true,
      title: `${todoTestPrefix}edited`,
    });

    await deleteTodo(todo.id);

    await expect(getTodo(todo.id)).rejects.toMatchObject({
      code: "TODO_NOT_FOUND",
      statusCode: 404,
    });
  });
});

async function cleanupTodos(): Promise<void> {
  await prisma.todo.deleteMany({
    where: {
      title: {
        startsWith: todoTestPrefix,
      },
    },
  });
}
