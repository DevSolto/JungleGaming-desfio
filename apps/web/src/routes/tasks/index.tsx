import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute('/tasks/')({
  component: Tasks,
})

export function Tasks() {
  return <div>Tasks</div>
}