import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { name, id } = await request.json();
  return NextResponse.json({ message: "Student added", name, id });
}
