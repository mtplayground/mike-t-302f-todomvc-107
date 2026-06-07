import { z } from "zod";

const titleSchema = z.string().trim().min(1).max(200);
const booleanStringSchema = z.preprocess((value) => {
  if (value === "true" || value === "1" || value === "on") {
    return true;
  }

  if (value === "false" || value === "0" || value === "off") {
    return false;
  }

  return value;
}, z.boolean());

export const createTodoBodySchema = z.object({
  title: titleSchema,
});

export const todoParamsSchema = z.object({
  id: z.string().uuid(),
});

export const updateTodoBodySchema = z.object({
  completed: booleanStringSchema,
});

export type CreateTodoBody = z.infer<typeof createTodoBodySchema>;
export type TodoParams = z.infer<typeof todoParamsSchema>;
export type UpdateTodoBody = z.infer<typeof updateTodoBodySchema>;
