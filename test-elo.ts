// Quick ELO test with 3 real video demos
// Run: npx tsx test-elo.ts

import { scoreProject, compareProjects, ProjectInfo } from "./src/lib/judge";
import { calculateElo } from "./src/lib/elo";

const projects: ProjectInfo[] = [
  {
    id: "1",
    name: "Government Scheduling App",
    team: "Cal Hacks Team A",
    description: "A government scheduling application with calendar UI, built during Cal Hacks 12.0. Features project title overlay, team member introductions, and laptop UI demo.",
    video_url: "",
    video_file: "hackathon_best_demo.mp4",
    code_url: "",
    materials: "Cal Hacks 12.0 hackathon project. 5-minute demo video with product walkthrough.",
  },
  {
    id: "2",
    name: "Mobile + Web Dual Platform Product",
    team: "Cal Hacks Team B",
    description: "A dual-platform product with both mobile app and web UI. Demo shows close-up of phone app interface and web dashboard.",
    video_url: "",
    video_file: "hackathon_demo_2nd.mp4",
    code_url: "",
    materials: "Cal Hacks 12.0 hackathon project. Shows both mobile and web interfaces.",
  },
  {
    id: "3",
    name: "Quicker AI Coding",
    team: "Cal Hacks Team C",
    description: "An AI-powered coding assistant tool. Demo includes project title overlay and team interview segments discussing their approach to making AI coding faster.",
    video_url: "",
    video_file: "hackathon_demo_3rd.mp4",
    code_url: "",
    materials: "Cal Hacks 12.0 hackathon project. Focus on AI-assisted development workflow.",
  },
];

async function main() {
  console.log("=== Step 1: Individual Scoring ===\n");

  const scores: Record<string, any> = {};
  for (const p of projects) {
    console.log(`Scoring: ${p.name}...`);
    const result = await scoreProject(p);
    scores[p.id] = result;
    console.log(`  Weighted: ${result.weighted}`);
    console.log(`  AI Breadth: ${result.ai_breadth} | AI Depth: ${result.ai_depth} | Work Fit: ${result.work_fit} | Completeness: ${result.completeness} | Creativity: ${result.creativity}`);
    console.log(`  Summary: ${result.summary}`);
    console.log(`  Highlights: ${result.highlights}`);
    console.log(`  Improvements: ${result.improvements}\n`);
  }

  console.log("=== Step 2: ELO 1v1 PK ===\n");

  const elos: Record<string, number> = {};
  for (const p of projects) elos[p.id] = 1500;

  // Round-robin: every pair fights
  for (let i = 0; i < projects.length; i++) {
    for (let j = i + 1; j < projects.length; j++) {
      const a = projects[i];
      const b = projects[j];
      console.log(`PK: "${a.name}" vs "${b.name}"`);
      const result = await compareProjects(a, b);
      const winner = result.winner_id === a.id ? a : b;
      const loser = result.winner_id === a.id ? b : a;
      console.log(`  Winner: ${winner.name}`);
      console.log(`  Reasoning: ${result.reasoning}`);
      console.log(`  Key Differentiator: ${result.key_differentiator}`);

      const { newA, newB } = calculateElo(
        elos[winner.id],
        elos[loser.id],
        true
      );
      elos[winner.id] = newA;
      elos[loser.id] = newB;
      console.log(`  ELO update: ${winner.name}=${newA}, ${loser.name}=${newB}\n`);
    }
  }

  console.log("=== Final Leaderboard ===\n");
  const sorted = projects
    .map((p) => ({ name: p.name, elo: elos[p.id], score: scores[p.id].weighted }))
    .sort((a, b) => b.elo - a.elo);

  sorted.forEach((p, i) => {
    console.log(`#${i + 1} ${p.name} — ELO: ${p.elo} | Score: ${p.score}`);
  });
}

main().catch(console.error);
