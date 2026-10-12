import { Auth } from "@auth/core";
import type { NextRequest } from "next/server";

import { authConfig } from "@/auth";

function toAuthRequest(req: NextRequest): Request {
  const base = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL;
  const path = `${req.nextUrl.pathname}${req.nextUrl.search}`;
  const url = new URL(path, base ?? req.nextUrl.origin);

  const init: RequestInit & { duplex?: "half" } = {
    method: req.method,
    headers: req.headers,
    body: req.method === "POST" ? req.body : undefined,
    duplex: "half",
  };

  return new Request(url, init);
}

export function GET(req: NextRequest) {
  return Auth(toAuthRequest(req), authConfig);
}

export function POST(req: NextRequest) {
  return Auth(toAuthRequest(req), authConfig);
}
