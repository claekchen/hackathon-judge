"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface ScoreReasoning {
  ai_breadth?: string;
  ai_depth?: string;
  work_fit?: string;
  completeness?: string;
  creativity?: string;
}

interface Project {
  id: string;
  name: string;
  team: string;
  description: string;
  video_url: string;
  video_file: string;
  code_url: string;
  materials: string;
  elo: number;
  investor_stars: number;
  score_ai_breadth: number;
  score_ai_depth: number;
  score_work_fit: number;
  score_completeness: number;
  score_creativity: number;
  score_weighted: number;
  ai_summary: string;
  ai_highlights: string;
  ai_improvements: string;
  ai_reasoning: string;
  created_at: string;
}

interface Matchup {
  id: number;
  project_a_id: string;
  project_b_id: string;
  project_a_name: string;
  project_b_name: string;
  winner_id: string;
  elo_change: number;
  reasoning: string;
  key_differentiator: string;
}

function ScoreBar({
  label,
  emoji,
  score,
  weight,
  reasoning,
}: {
  label: string;
  emoji: string;
  score: number;
  weight: string;
  reasoning?: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-3">
        <span className="text-lg">{emoji}</span>
        <div className="flex-1">
          <div className="flex justify-between text-sm mb-1">
            <span>
              {label}{" "}
              <span className="text-gray-400 text-xs">({weight})</span>
            </span>
            <span className="font-medium">{score.toFixed(1)}/10</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all"
              style={{ width: `${score * 10}%` }}
            />
          </div>
        </div>
      </div>
      {reasoning && (
        <p className="ml-10 mt-1 text-xs text-gray-500 leading-relaxed">
          {reasoning}
        </p>
      )}
    </div>
  );
}

export default function ProjectDetail() {
  const params = useParams();
  const [data, setData] = useState<{
    project: Project;
    matchups: Matchup[];
    votes: { investor_name: string; project_id: string }[];
  } | null>(null);

  useEffect(() => {
    fetch(`/api/projects/${params.id}`)
      .then((r) => r.json())
      .then(setData);
  }, [params.id]);

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  const { project: p, matchups } = data;

  let reasoning: ScoreReasoning = {};
  try {
    reasoning = JSON.parse(p.ai_reasoning || "{}");
  } catch {
    reasoning = {};
  }

  return (
    <div>
      <Link
        href="/"
        className="text-sm text-gray-500 hover:text-gray-900 mb-4 inline-block"
      >
        &larr; Back to Leaderboard
      </Link>

      <div className="bg-white rounded-xl border p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">
              {p.name}
              {p.investor_stars > 0 && (
                <span className="ml-2 text-yellow-500">
                  {"*".repeat(p.investor_stars)}
                </span>
              )}
            </h1>
            <p className="text-gray-500">{p.team}</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{p.elo}</div>
            <div className="text-sm text-gray-400">ELO Rating</div>
            {p.investor_stars > 0 && (
              <div className="text-sm text-yellow-600">
                +{p.investor_stars * 10} investor bonus
              </div>
            )}
          </div>
        </div>

        <p className="text-gray-700 mb-4">{p.description}</p>

        {/* Video Player */}
        {p.video_file && (
          <div className="mb-4">
            <video
              controls
              className="w-full max-w-2xl rounded-lg border"
              preload="metadata"
            >
              <source src={`/api/uploads/${p.video_file}`} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
        )}

        <div className="flex flex-wrap gap-3 text-sm">
          {p.video_url && (
            <a
              href={p.video_url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors"
            >
              Video Link
            </a>
          )}
          {p.code_url && (
            <a
              href={p.code_url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Source Code
            </a>
          )}
        </div>
        {p.materials && (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
            {p.materials}
          </div>
        )}
      </div>

      {/* AI Scores */}
      <div className="bg-white rounded-xl border p-6 mb-6">
        <h2 className="font-semibold text-lg mb-4">AI Scores</h2>
        {p.ai_summary && (
          <p className="text-sm text-gray-600 mb-4 p-3 bg-blue-50 rounded-lg">
            {p.ai_summary}
          </p>
        )}

        {(p.ai_highlights || p.ai_improvements) && (
          <div className="grid grid-cols-2 gap-4 mb-4">
            {p.ai_highlights && (
              <div className="p-3 bg-green-50 rounded-lg">
                <div className="text-xs font-medium text-green-700 mb-1">Highlights</div>
                <p className="text-sm text-green-800">{p.ai_highlights}</p>
              </div>
            )}
            {p.ai_improvements && (
              <div className="p-3 bg-orange-50 rounded-lg">
                <div className="text-xs font-medium text-orange-700 mb-1">Improvements</div>
                <p className="text-sm text-orange-800">{p.ai_improvements}</p>
              </div>
            )}
          </div>
        )}

        <div className="space-y-4">
          <ScoreBar
            emoji="🎓"
            label="AI使用广度"
            weight="30%"
            score={p.score_ai_breadth}
            reasoning={reasoning.ai_breadth}
          />
          <ScoreBar
            emoji="🤖"
            label="AI工具深度"
            weight="25%"
            score={p.score_ai_depth}
            reasoning={reasoning.ai_depth}
          />
          <ScoreBar
            emoji="💼"
            label="工作场景契合度"
            weight="25%"
            score={p.score_work_fit}
            reasoning={reasoning.work_fit}
          />
          <ScoreBar
            emoji="🛠"
            label="完成度"
            weight="15%"
            score={p.score_completeness}
            reasoning={reasoning.completeness}
          />
          <ScoreBar
            emoji="🎨"
            label="创意"
            weight="5%"
            score={p.score_creativity}
            reasoning={reasoning.creativity}
          />
        </div>
        <div className="mt-4 pt-4 border-t flex justify-between">
          <span className="font-medium">Weighted Score</span>
          <span className="font-bold text-lg">{p.score_weighted.toFixed(2)}/10</span>
        </div>
      </div>

      {/* Matchup History */}
      {matchups.length > 0 && (
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold text-lg mb-4">
            ELO Matchups ({matchups.length})
          </h2>
          <div className="space-y-3">
            {matchups.map((m) => {
              const won = m.winner_id === p.id;
              return (
                <div
                  key={m.id}
                  className={`p-3 rounded-lg border-l-4 ${
                    won
                      ? "border-l-green-500 bg-green-50"
                      : "border-l-red-500 bg-red-50"
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium">
                      vs{" "}
                      {m.project_a_id === p.id
                        ? m.project_b_name
                        : m.project_a_name}
                    </span>
                    <span
                      className={`text-sm font-bold ${
                        won ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {won ? "WIN" : "LOSS"} ({won ? "+" : "-"}
                      {m.elo_change})
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">{m.reasoning}</p>
                  {m.key_differentiator && (
                    <p className="text-xs text-gray-400 mt-1 italic">
                      Key: {m.key_differentiator}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
