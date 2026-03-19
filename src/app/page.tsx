"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Project {
  id: string;
  name: string;
  team: string;
  description: string;
  elo: number;
  investor_stars: number;
  score_ai_breadth: number;
  score_ai_depth: number;
  score_work_fit: number;
  score_completeness: number;
  score_creativity: number;
  score_weighted: number;
  ai_summary: string;
}

function Stars({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="ml-2 text-yellow-500">
      {"⭐".repeat(count)}
    </span>
  );
}

function ScoreBadge({ label, score }: { label: string; score: number }) {
  const color =
    score >= 8
      ? "bg-green-100 text-green-800"
      : score >= 6
        ? "bg-blue-100 text-blue-800"
        : score >= 4
          ? "bg-yellow-100 text-yellow-800"
          : "bg-red-100 text-red-800";
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${color}`}
    >
      {label} {score.toFixed(1)}
    </span>
  );
}

export default function Leaderboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((data) => {
        setProjects(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="text-center py-20">
        <h1 className="text-2xl font-bold mb-4">Hackathon Leaderboard</h1>
        <p className="text-gray-500 mb-6">No projects yet.</p>
        <Link
          href="/admin"
          className="inline-flex items-center px-4 py-2 bg-black text-white rounded-lg text-sm hover:bg-gray-800 transition-colors"
        >
          Submit a Project
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Leaderboard</h1>
        <span className="text-sm text-gray-500">
          {projects.length} projects
        </span>
      </div>

      <div className="space-y-3">
        {projects.map((p, i) => (
          <Link
            key={p.id}
            href={`/project/${p.id}`}
            className="block bg-white rounded-xl border p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-lg">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="font-semibold text-lg truncate">{p.name}</h2>
                  <Stars count={p.investor_stars} />
                </div>
                <p className="text-sm text-gray-500 mb-2">
                  {p.team} &middot; {p.ai_summary || p.description.slice(0, 80)}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <ScoreBadge label="AI广度" score={p.score_ai_breadth} />
                  <ScoreBadge label="AI深度" score={p.score_ai_depth} />
                  <ScoreBadge label="场景" score={p.score_work_fit} />
                  <ScoreBadge label="完成度" score={p.score_completeness} />
                  <ScoreBadge label="创意" score={p.score_creativity} />
                </div>
              </div>
              <div className="flex-shrink-0 text-right">
                <div className="text-2xl font-bold">{p.elo}</div>
                <div className="text-xs text-gray-400">ELO</div>
                {p.investor_stars > 0 && (
                  <div className="text-xs text-yellow-600 mt-1">
                    +{p.investor_stars * 10} bonus
                  </div>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
