import { getTrackerDocument, saveTrackerDocument } from "../../../lib/store";

export async function GET() {
  try {
    const data = await getTrackerDocument("revision");
    return Response.json(data);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to load revision tracker data." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const data = await saveTrackerDocument("revision", body);
    return Response.json(data);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to save revision tracker data." },
      { status: 500 }
    );
  }
}
