import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";

import { ApiError } from "./api/client.js";
import { getHealth } from "./api/health.js";
import { createTodo, deleteTodo, getTodos, updateTodo, type Todo } from "./api/todos.js";

export function App() {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const healthQuery = useQuery({
    queryKey: ["health"],
    queryFn: ({ signal }) => getHealth({ signal }),
    retry: 1,
    staleTime: 30_000,
  });
  const todosQuery = useQuery({
    queryKey: ["todos"],
    queryFn: ({ signal }) => getTodos({ signal }),
    staleTime: 10_000,
  });
  const createMutation = useMutation({
    mutationFn: createTodo,
    onSuccess: async () => {
      setTitle("");
      setFormError(null);
      await queryClient.invalidateQueries({ queryKey: ["todos"] });
    },
  });
  const toggleMutation = useMutation({
    mutationFn: ({ completed, todo }: { readonly completed: boolean; readonly todo: Todo }) =>
      updateTodo(todo.id, { completed }),
    onMutate: async ({ completed, todo }) => {
      await queryClient.cancelQueries({ queryKey: ["todos"] });
      const previousTodos = queryClient.getQueryData<Todo[]>(["todos"]);

      queryClient.setQueryData<Todo[]>(["todos"], (currentTodos) =>
        currentTodos?.map((currentTodo) =>
          currentTodo.id === todo.id
            ? { ...currentTodo, completed, updatedAt: new Date().toISOString() }
            : currentTodo
        )
      );

      return { previousTodos };
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(["todos"], context?.previousTodos);
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ["todos"] });
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (todo: Todo) => deleteTodo(todo.id),
    onSuccess: async (_data, todo) => {
      queryClient.setQueryData<Todo[]>(["todos"], (currentTodos) =>
        currentTodos?.filter((currentTodo) => currentTodo.id !== todo.id)
      );
    },
  });

  const todos = todosQuery.data ?? [];
  const activeCount = todos.filter((todo) => !todo.completed).length;
  const apiStatus =
    healthQuery.data?.status === "ok" ? "Online" : healthQuery.isError ? "Offline" : "Checking";
  const mutationError = createMutation.error || toggleMutation.error || deleteMutation.error;
  const pendingTodoIds = getPendingTodoIds(
    toggleMutation.isPending ? toggleMutation.variables?.todo : undefined,
    deleteMutation.isPending ? deleteMutation.variables : undefined
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const normalizedTitle = title.trim();

    if (!normalizedTitle) {
      setFormError("Title is required");
      return;
    }

    await createMutation.mutateAsync({ title: normalizedTitle });
  }

  return (
    <main className="min-h-screen bg-stone-50 text-zinc-950">
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 pb-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal">todomvc-030</h1>
            <p className="mt-1 text-sm text-zinc-600">Todo list</p>
          </div>
          <ApiStatusBadge status={apiStatus} />
        </header>

        <section className="py-6">
          <form
            className="flex flex-col gap-3 border-b border-zinc-200 pb-5 sm:flex-row"
            onSubmit={handleSubmit}
          >
            <div className="min-w-0 flex-1">
              <label className="sr-only" htmlFor="new-todo">
                New todo
              </label>
              <input
                className="h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-base outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-200"
                disabled={createMutation.isPending}
                id="new-todo"
                maxLength={200}
                onChange={(event) => {
                  setTitle(event.target.value);
                  setFormError(null);
                }}
                placeholder="What needs to be done?"
                value={title}
              />
            </div>
            <button
              className="h-11 rounded-md bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
              disabled={createMutation.isPending}
              type="submit"
            >
              {createMutation.isPending ? "Adding" : "Add todo"}
            </button>
          </form>

          {formError || mutationError ? (
            <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {formError ?? formatApiError(mutationError as Error)}
            </div>
          ) : null}

          <div className="mt-5 flex items-center justify-between gap-3 text-sm text-zinc-600">
            <span>{activeCount} active</span>
            <span>{todos.length} total</span>
          </div>

          <TodoList
            error={todosQuery.error ? formatApiError(todosQuery.error) : null}
            isLoading={todosQuery.isLoading}
            onDelete={(todo) => deleteMutation.mutate(todo)}
            onToggle={(todo, completed) => toggleMutation.mutate({ completed, todo })}
            pendingTodoIds={pendingTodoIds}
            todos={todos}
          />
        </section>
      </div>
    </main>
  );
}

function TodoList({
  error,
  isLoading,
  onDelete,
  onToggle,
  pendingTodoIds,
  todos,
}: {
  readonly error: string | null;
  readonly isLoading: boolean;
  readonly onDelete: (todo: Todo) => void;
  readonly onToggle: (todo: Todo, completed: boolean) => void;
  readonly pendingTodoIds: ReadonlySet<string>;
  readonly todos: readonly Todo[];
}) {
  if (isLoading) {
    return <p className="mt-8 text-sm text-zinc-600">Loading todos...</p>;
  }

  if (error) {
    return (
      <div className="mt-6 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (todos.length === 0) {
    return (
      <div className="mt-8 rounded-md border border-dashed border-zinc-300 bg-white px-4 py-8 text-center text-sm text-zinc-600">
        No todos yet.
      </div>
    );
  }

  return (
    <ul className="mt-4 divide-y divide-zinc-200 border-y border-zinc-200 bg-white">
      {todos.map((todo) => {
        const isPending = pendingTodoIds.has(todo.id);

        return (
          <li className="flex min-h-14 items-center gap-3 px-3 py-2" key={todo.id}>
            <input
              aria-label={`${todo.completed ? "Mark active" : "Mark completed"}: ${todo.title}`}
              checked={todo.completed}
              className="h-5 w-5 shrink-0 rounded border-zinc-300 text-zinc-950"
              disabled={isPending}
              onChange={(event) => onToggle(todo, event.target.checked)}
              type="checkbox"
            />
            <span
              className={`min-w-0 flex-1 break-words text-base ${
                todo.completed ? "text-zinc-500 line-through" : "text-zinc-950"
              }`}
            >
              {todo.title}
            </span>
            <button
              aria-label={`Delete: ${todo.title}`}
              className="shrink-0 rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:border-red-300 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isPending}
              onClick={() => onDelete(todo)}
              type="button"
            >
              Delete
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function ApiStatusBadge({ status }: { readonly status: "Checking" | "Offline" | "Online" }) {
  const className =
    status === "Online"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : status === "Offline"
        ? "border-red-200 bg-red-50 text-red-700"
        : "border-amber-200 bg-amber-50 text-amber-700";

  return (
    <span className={`rounded-full border px-3 py-1 text-sm font-medium ${className}`}>
      {status}
    </span>
  );
}

function formatApiError(error: Error): string {
  if (error instanceof ApiError) {
    return `${error.status} ${error.statusText}`;
  }

  return error.message;
}

function getPendingTodoIds(...todos: ReadonlyArray<Todo | undefined>): ReadonlySet<string> {
  return new Set(todos.filter((todo): todo is Todo => Boolean(todo)).map((todo) => todo.id));
}
