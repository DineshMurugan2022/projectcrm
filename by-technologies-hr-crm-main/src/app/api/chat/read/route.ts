import { NextRequest, NextResponse } from "next/server";
import { markMessagesAsRead } from "@/lib/db";

// PUT: Mark messages as read for a given channel or DM
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, channelId } = body;
    const dmSenderId = body.dmSenderId || body.senderId;

    if (!userId || (!channelId && !dmSenderId)) {
      return NextResponse.json(
        { success: false, error: "Missing required read tracking parameters" },
        { status: 400 }
      );
    }

    const modified = markMessagesAsRead(userId, { channelId, dmSenderId });

    return NextResponse.json({
      success: true,
      marked: modified,
    });
  } catch (error) {
    console.error("PUT mark read error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to mark messages read" },
      { status: 500 }
    );
  }
}
