import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: RootLayout,
});

function RootLayout() {
  return (
    <div className="min-h-screen bg-white text-neutral-900">
      <header className="border-b px-4 py-3 font-semibold">rulo</header>
      <main className="p-4">
        <Outlet />
      </main>
    </div>
  );
}
