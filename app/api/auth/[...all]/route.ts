import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

const fallback = {
  GET: async () => new Response("Demo mode", { status: 404 }),
  POST: async () => new Response("Demo mode", { status: 404 }),
};

export const { GET, POST } = auth ? toNextJsHandler(auth) : fallback;
