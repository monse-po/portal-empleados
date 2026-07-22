import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/src/lib/ifs/constants";

export async function GET(request: Request) {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  return NextResponse.redirect(new URL("/login", new URL(request.url).origin));
}
