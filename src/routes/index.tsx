import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return <h1 className="text-2xl font-bold">Find the best route for your money</h1>;
}
