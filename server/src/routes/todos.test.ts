import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";

import { createApp } from "../app.js";
import { prisma } from "../db/prisma.js";

const app = createApp();
const routeTodoPrefix = "test-route-todo-";

describe("todo routes", () => {
  beforeEach(async () => {
    await cleanupTodos();
  });

  afterAll(async () => {
    await cleanupTodos();
    await prisma.$disconnect();
  });

  it("creates, lists, toggles, and deletes todos", async () => {
    const createResponse = await request(app)
      .post("/todos")
      .send({ title: `  ${routeTodoPrefix}created  ` })
      .expect(201);

    const createdTodo = createResponse.body.todo;
    expect(createdTodo).toMatchObject({
      completed: false,
      title: `${routeTodoPrefix}created`,
    });
    expect(createdTodo.id).toEqual(expect.any(String));
    expect(Date.parse(createdTodo.createdAt)).not.toBeNaN();
    expect(Date.parse(createdTodo.updatedAt)).not.toBeNaN();

    const listResponse = await request(app).get("/todos").expect(200);
    expect(
      listResponse.body.todos.some((todo: { readonly id: string }) => todo.id === createdTodo.id)
    ).toBe(true);

    const completeResponse = await request(app)
      .patch(`/todos/${createdTodo.id}`)
      .send({ completed: true })
      .expect(200);

    expect(completeResponse.body.todo).toMatchObject({
      id: createdTodo.id,
      completed: true,
      title: `${routeTodoPrefix}created`,
    });

    const incompleteResponse = await request(app)
      .patch(`/todos/${createdTodo.id}`)
      .send({ completed: false })
      .expect(200);

    expect(incompleteResponse.body.todo).toMatchObject({
      id: createdTodo.id,
      completed: false,
    });

    const deleteResponse = await request(app).delete(`/todos/${createdTodo.id}`).expect(200);
    expect(deleteResponse.body).toEqual({ deleted: true });

    const afterDeleteResponse = await request(app).get("/todos").expect(200);
    expect(
      afterDeleteResponse.body.todos.some(
        (todo: { readonly id: string }) => todo.id === createdTodo.id
      )
    ).toBe(false);
  });

  it("returns validation errors for invalid todo requests", async () => {
    const invalidCreateResponse = await request(app)
      .post("/todos")
      .send({ title: "" })
      .expect(400);
    expect(invalidCreateResponse.body.error).toMatchObject({
      code: "VALIDATION_ERROR",
    });

    const invalidPatchResponse = await request(app)
      .patch("/todos/11111111-1111-4111-8111-111111111111")
      .send({})
      .expect(400);
    expect(invalidPatchResponse.body.error).toMatchObject({
      code: "VALIDATION_ERROR",
    });

    const invalidCompletedResponse = await request(app)
      .patch("/todos/11111111-1111-4111-8111-111111111111")
      .send({ completed: "maybe" })
      .expect(400);
    expect(invalidCompletedResponse.body.error).toMatchObject({
      code: "VALIDATION_ERROR",
    });

    const invalidDeleteResponse = await request(app).delete("/todos/not-a-uuid").expect(400);
    expect(invalidDeleteResponse.body.error).toMatchObject({
      code: "VALIDATION_ERROR",
    });
  });

  it("returns not found for missing todos", async () => {
    const missingId = "11111111-1111-4111-8111-111111111111";

    const patchResponse = await request(app)
      .patch(`/todos/${missingId}`)
      .send({ completed: true })
      .expect(404);
    expect(patchResponse.body.error).toMatchObject({
      code: "TODO_NOT_FOUND",
    });

    const deleteResponse = await request(app).delete(`/todos/${missingId}`).expect(404);
    expect(deleteResponse.body.error).toMatchObject({
      code: "TODO_NOT_FOUND",
    });
  });
});

async function cleanupTodos(): Promise<void> {
  await prisma.todo.deleteMany({
    where: {
      title: {
        startsWith: routeTodoPrefix,
      },
    },
  });
}
