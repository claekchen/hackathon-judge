import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { scoreProject, compareProjects, ProjectInfo } from "@/lib/judge";
import { calculateElo } from "@/lib/elo";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";

export async function GET() {
  const db = getDb();
  const projects = db
    .prepare(
      "SELECT * FROM projects ORDER BY elo DESC, score_weighted DESC"
    )
    .all();
  return NextResponse.json(projects);
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();

  const name = formData.get("name") as string;
  const team = formData.get("team") as string;
  const description = formData.get("description") as string;
  const video_url = (formData.get("video_url") as string) || "";
  const code_url = (formData.get("code_url") as string) || "";
  const materials = (formData.get("materials") as string) || "";
  const videoFile = formData.get("video_file") as File | null;

  if (!name || !team || !description) {
    return NextResponse.json(
      { error: "name, team, description 为必填项" },
      { status: 400 }
    );
  }

  // Handle video file upload
  let videoFileName = "";
  if (videoFile && videoFile.size > 0) {
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const ext = path.extname(videoFile.name) || ".mp4";
    videoFileName = `${uuidv4()}${ext}`;
    const filePath = path.join(uploadsDir, videoFileName);

    const buffer = Buffer.from(await videoFile.arrayBuffer());
    fs.writeFileSync(filePath, buffer);
  }

  const db = getDb();
  const id = uuidv4();

  db.prepare(
    `INSERT INTO projects (id, name, team, description, video_url, video_file, code_url, materials)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, name, team, description, video_url, videoFileName, code_url, materials);

  // Score the project
  const projectInfo: ProjectInfo = {
    id,
    name,
    team,
    description,
    video_url,
    video_file: videoFileName,
    code_url,
    materials,
  };

  const scores = await scoreProject(projectInfo);

  db.prepare(
    `UPDATE projects SET
      score_ai_breadth = ?, score_ai_depth = ?, score_work_fit = ?,
      score_completeness = ?, score_creativity = ?, score_weighted = ?,
      ai_summary = ?, ai_highlights = ?, ai_improvements = ?,
      ai_reasoning = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).run(
    scores.ai_breadth,
    scores.ai_depth,
    scores.work_fit,
    scores.completeness,
    scores.creativity,
    scores.weighted,
    scores.summary,
    scores.highlights,
    scores.improvements,
    JSON.stringify(scores.reasoning),
    id
  );

  // ELO matchups against all existing projects
  interface ProjectRow extends ProjectInfo {
    elo: number;
    [key: string]: unknown;
  }

  const existingProjects = db
    .prepare("SELECT * FROM projects WHERE id != ?")
    .all(id) as ProjectRow[];

  for (const opponent of existingProjects) {
    const opponentInfo: ProjectInfo = {
      id: opponent.id,
      name: opponent.name,
      team: opponent.team,
      description: opponent.description,
      video_url: opponent.video_url,
      video_file: (opponent.video_file as string) || "",
      code_url: opponent.code_url,
      materials: opponent.materials,
    };

    const result = await compareProjects(projectInfo, opponentInfo);
    const currentRow = db
      .prepare("SELECT elo FROM projects WHERE id = ?")
      .get(id) as { elo: number };
    const currentElo = currentRow.elo;
    const opponentElo = opponent.elo;

    const aWins = result.winner_id === id;
    const { newA, newB, change } = calculateElo(currentElo, opponentElo, aWins);

    db.prepare("UPDATE projects SET elo = ?, updated_at = datetime('now') WHERE id = ?").run(
      newA,
      id
    );
    db.prepare("UPDATE projects SET elo = ?, updated_at = datetime('now') WHERE id = ?").run(
      newB,
      opponent.id
    );

    db.prepare(
      `INSERT INTO matchups (project_a_id, project_b_id, winner_id, elo_change, reasoning, key_differentiator)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(id, opponent.id, result.winner_id, change, result.reasoning, result.key_differentiator);
  }

  const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(id);
  return NextResponse.json(project, { status: 201 });
}
