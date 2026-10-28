import { QueryClient } from "@tanstack/react-query";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { routeTree } from "@/routeTree.gen";

test("home route renders its heading", async () => {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ["/"] }),
    context: { queryClient: new QueryClient() },
  });
  render(<RouterProvider router={router} />);
  expect(await screen.findByRole("heading", { level: 1 })).toBeVisible();
});
