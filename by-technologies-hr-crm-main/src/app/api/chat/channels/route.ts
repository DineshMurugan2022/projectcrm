import { NextRequest, NextResponse } from "next/server";
import { getChatChannels, saveChatChannel } from "@/lib/db";
import { ChatChannel } from "@/lib/types";

// GET: Retrieve list of channels
export async function GET() {
  try {
    const channels = getChatChannels();
    return NextResponse.json({ success: true, channels });
  } catch (error) {
    console.error("GET channels error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load channels" },
      { status: 500 }
    );
  }
}

// POST: Create a new custom channel
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: "Channel name is required" },
        { status: 400 }
      );
    }

    const cleanName = name.startsWith("#") ? name : `#${name}`;
    const id = cleanName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    const newChannel: ChatChannel = {
      id,
      name: cleanName,
      description: description || "Team group channel",
      isGroup: true,
      memberIds: ["all"],
      createdAt: new Date().toISOString(),
    };

    saveChatChannel(newChannel);

    return NextResponse.json(
      { success: true, channel: newChannel },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST channel error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create channel" },
      { status: 500 }
    );
  }
}
