import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "./App.js";
import { getHealth } from "./api/health.js";
import {
  createTodo,
  deleteTodo,
  getTodos,
  updateTodo,
  type Todo,
} from "./api/todos.js";

vi.mock("./api/health.js", () => ({
  getHealth: vi.fn(),
}));

vi.mock("./api/todos.js", () => ({
  createTodo: vi.fn(),
  deleteTodo: vi.fn(),
  getTodos: vi.fn(),
  updateTodo: vi.fn(),
}));

const baseTodo: Todo = {
  completed: false,
  createdAt: "2026-06-07T18:00:00.000Z",
  id: "11111111-1111-4111-8111-111111111111",
  title: "Write todo UI",
  updatedAt: "2026-06-07T18:00:00.000Z",
};

describe("App todo view", () => {
  beforeEach(() => {
    vi.mocked(getHealth).mockResolvedValue({ status: "ok" });
    vi.mocked(getTodos).mockReset();
    vi.mocked(createTodo).mockReset();
    vi.mocked(updateTodo).mockReset();
    vi.mocked(deleteTodo).mockReset();
  });

  it("adds a todo through the API", async () => {
    const user = userEvent.setup();
    const createdTodo = { ...baseTodo, title: "Buy milk" };

    vi.mocked(getTodos).mockResolvedValueOnce([]).mockResolvedValue([createdTodo]);
    vi.mocked(createTodo).mockResolvedValue(createdTodo);

    renderApp();

    await user.type(screen.getByLabelText("New todo"), "  Buy milk  ");
    await user.click(screen.getByRole("button", { name: "Add todo" }));

    await waitFor(() => {
      expect(createTodo).toHaveBeenCalled();
    });
    expect(vi.mocked(createTodo).mock.calls[0]?.[0]).toEqual({ title: "Buy milk" });
    expect(await screen.findByText("Buy milk")).toBeInTheDocument();
    expect(screen.getByLabelText("New todo")).toHaveValue("");
  });

  it("toggles and deletes todos through the API", async () => {
    const user = userEvent.setup();
    const completedTodo = { ...baseTodo, completed: true };

    vi.mocked(getTodos)
      .mockResolvedValueOnce([baseTodo])
      .mockResolvedValueOnce([completedTodo])
      .mockResolvedValue([]);
    vi.mocked(updateTodo).mockResolvedValue(completedTodo);
    vi.mocked(deleteTodo).mockResolvedValue(undefined);

    renderApp();

    const checkbox = await screen.findByRole("checkbox", {
      name: "Mark completed: Write todo UI",
    });
    await user.click(checkbox);

    await waitFor(() => {
      expect(updateTodo).toHaveBeenCalled();
    });
    expect(vi.mocked(updateTodo).mock.calls[0]?.slice(0, 2)).toEqual([
      baseTodo.id,
      { completed: true },
    ]);

    await user.click(await screen.findByRole("button", { name: "Delete: Write todo UI" }));

    await waitFor(() => {
      expect(deleteTodo).toHaveBeenCalled();
    });
    expect(vi.mocked(deleteTodo).mock.calls[0]?.[0]).toBe(baseTodo.id);
  });

  it("shows client validation when the title is blank", async () => {
    const user = userEvent.setup();

    vi.mocked(getTodos).mockResolvedValue([]);

    renderApp();

    await user.click(await screen.findByRole("button", { name: "Add todo" }));

    expect(await screen.findByText("Title is required")).toBeInTheDocument();
    expect(createTodo).not.toHaveBeenCalled();
  });
});

function renderApp() {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  );
}
