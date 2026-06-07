import { Router } from "express";

import { validateRequest } from "../middleware/validate-request.js";
import { createTodo, deleteTodo, listTodos, updateTodo } from "../services/todos.js";
import {
  createTodoBodySchema,
  todoParamsSchema,
  updateTodoBodySchema,
  type CreateTodoBody,
  type TodoParams,
  type UpdateTodoBody,
} from "../validation/todos.js";

export const todosRouter = Router();

todosRouter.get("/", async (_request, response) => {
  const todos = await listTodos();

  response.status(200).json({ todos });
});

todosRouter.post(
  "/",
  validateRequest({ body: createTodoBodySchema }),
  async (request, response) => {
    const body = request.body as CreateTodoBody;
    const todo = await createTodo({
      title: body.title,
    });

    response.status(201).json({ todo });
  }
);

todosRouter.patch(
  "/:id",
  validateRequest({ body: updateTodoBodySchema, params: todoParamsSchema }),
  async (request, response) => {
    const params = request.params as TodoParams;
    const body = request.body as UpdateTodoBody;
    const todo = await updateTodo(params.id, {
      completed: body.completed,
    });

    response.status(200).json({ todo });
  }
);

todosRouter.delete(
  "/:id",
  validateRequest({ params: todoParamsSchema }),
  async (request, response) => {
    const params = request.params as TodoParams;
    await deleteTodo(params.id);

    response.status(204).send();
  }
);
