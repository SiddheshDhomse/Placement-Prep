import { getTrackerDocument, saveTrackerDocument } from "../../../lib/store";

export async function GET() {
  try {
    const data = await getTrackerDocument("daily");
    return Response.json(data);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to load daily tracker data." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const data = await saveTrackerDocument("daily", body);
    return Response.json(data);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to save daily tracker data." },
      { status: 500 }
    );
  }
}
