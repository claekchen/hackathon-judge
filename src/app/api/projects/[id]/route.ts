import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const db = getDb();
  const project = db
    .prepare("SELECT * FROM projects WHERE id = ?")
    .get(params.id);

  if (!project) {
    return NextResponse.json({ error: "项目不存在" }, { status: 404 });
  }

  const matchups = db
    .prepare(
      `SELECT m.*,
        pa.name as project_a_name, pb.name as project_b_name
       FROM matchups m
       JOIN projects pa ON m.project_a_id = pa.id
       JOIN projects pb ON m.project_b_id = pb.id
       WHERE m.project_a_id = ? OR m.project_b_id = ?
       ORDER BY m.created_at DESC`
    )
    .all(params.id, params.id);

  const votes = db
    .prepare("SELECT * FROM investor_votes WHERE project_id = ?")
    .all(params.id);

  return NextResponse.json({ project, matchups, votes });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const db = getDb();
  db.prepare("DELETE FROM matchups WHERE project_a_id = ? OR project_b_id = ?").run(
    params.id,
    params.id
  );
  db.prepare("DELETE FROM investor_votes WHERE project_id = ?").run(params.id);
  db.prepare("DELETE FROM projects WHERE id = ?").run(params.id);
  return NextResponse.json({ ok: true });
}
