import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

test("adds, completes, persists after reload, and deletes a todo", async ({ page, request }) => {
  const title = `E2E todo ${Date.now()}`;

  await deleteE2eTodos(request);

  try {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "todomvc-030" })).toBeVisible();

    await page.getByLabel("New todo").fill(title);
    const createResponsePromise = waitForTodoResponse(page, "POST");
    await page.getByRole("button", { name: "Add todo" }).click();
    const createResponse = await createResponsePromise;
    expect(createResponse.ok()).toBe(true);

    let todoItem = page.locator("li").filter({ hasText: title });
    await expect(todoItem).toBeVisible();
    await expect(todoItem.getByRole("checkbox")).not.toBeChecked();

    const completeResponsePromise = waitForTodoResponse(page, "PATCH");
    await todoItem.getByRole("checkbox", { name: `Mark completed: ${title}` }).click();
    const completeResponse = await completeResponsePromise;
    expect(completeResponse.ok()).toBe(true);
    await expect(todoItem.getByRole("checkbox")).toBeChecked();

    await page.reload();
    todoItem = page.locator("li").filter({ hasText: title });
    await expect(todoItem).toBeVisible();
    await expect(todoItem.getByRole("checkbox", { name: `Mark active: ${title}` })).toBeChecked();

    const deleteResponsePromise = waitForTodoResponse(page, "DELETE");
    await todoItem.getByRole("button", { name: `Delete: ${title}` }).click();
    const deleteResponse = await deleteResponsePromise;
    expect(deleteResponse.ok()).toBe(true);
    await expect(page.locator("li").filter({ hasText: title })).toHaveCount(0);
  } finally {
    await deleteE2eTodos(request);
  }
});

async function deleteE2eTodos(request: APIRequestContext): Promise<void> {
  const apiBaseUrl = process.env.E2E_API_BASE_URL ?? "http://127.0.0.1:8080";
  const response = await request.get(new URL("/todos", apiBaseUrl).toString());
  expect(response.ok()).toBe(true);

  const body = (await response.json()) as {
    readonly todos: ReadonlyArray<{ readonly id: string; readonly title: string }>;
  };

  await Promise.all(
    body.todos
      .filter((todo) => todo.title.startsWith("E2E todo "))
      .map((todo) => request.delete(new URL(`/todos/${todo.id}`, apiBaseUrl).toString()))
  );
}

function waitForTodoResponse(page: Page, method: string) {
  return page.waitForResponse(
    (response) => response.url().includes("/todos") && response.request().method() === method
  );
}
