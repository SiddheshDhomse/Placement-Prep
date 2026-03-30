import { getTrackerDocument, saveTrackerDocument } from "../../../lib/store";

export async function GET() {
  const data = await getTrackerDocument("revision");
  return Response.json(data);
}

export async function POST(request) {
  const body = await request.json();
  const data = await saveTrackerDocument("revision", body);
  return Response.json(data);
}
