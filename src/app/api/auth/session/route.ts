import { NextResponse } from "next/server";
import { getServerIfsSession } from "@/src/lib/ifs/session";

export async function GET() {
  const session = await getServerIfsSession();
  if (!session) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  return NextResponse.json({ ok: true, email: session.email });
}
