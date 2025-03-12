import { NextResponse, NextRequest } from "next/server";

export async function GET(req) {
  try {
    return NextResponse.json({
      message: "This is a test",
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
