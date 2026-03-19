import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { investor_name, project_id } = await req.json();

  if (!investor_name || !project_id) {
    return NextResponse.json(
      { error: "investor_name 和 project_id 为必填项" },
      { status: 400 }
    );
  }

  const db = getDb();

  // Check investor has votes remaining (max 3 total)
  const voteCount = db
    .prepare(
      "SELECT COUNT(*) as count FROM investor_votes WHERE investor_name = ?"
    )
    .get(investor_name) as { count: number };

  if (voteCount.count >= 3) {
    return NextResponse.json(
      { error: "该投资人已用完3票" },
      { status: 400 }
    );
  }

  // Check project exists
  const project = db
    .prepare("SELECT * FROM projects WHERE id = ?")
    .get(project_id);

  if (!project) {
    return NextResponse.json({ error: "项目不存在" }, { status: 404 });
  }

  // Add vote
  db.prepare(
    "INSERT INTO investor_votes (investor_name, project_id) VALUES (?, ?)"
  ).run(investor_name, project_id);

  // Update star count
  const stars = db
    .prepare(
      "SELECT COUNT(*) as count FROM investor_votes WHERE project_id = ?"
    )
    .get(project_id) as { count: number };

  db.prepare(
    "UPDATE projects SET investor_stars = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(stars.count, project_id);

  return NextResponse.json({ ok: true, stars: stars.count });
}

export async function GET(req: NextRequest) {
  const investor = req.nextUrl.searchParams.get("investor");
  if (!investor) {
    return NextResponse.json({ votes: [] });
  }

  const db = getDb();
  const votes = db
    .prepare("SELECT * FROM investor_votes WHERE investor_name = ?")
    .all(investor);

  return NextResponse.json({ votes, remaining: 3 - votes.length });
}
