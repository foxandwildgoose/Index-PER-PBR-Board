import { createFileRoute } from "@tanstack/react-router";
import { Desk } from "@/components/valuation/desk";

export const Route = createFileRoute("/")({ component: Desk });
