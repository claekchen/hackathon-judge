"use client";

import { useEffect, useState, useRef } from "react";

interface Project {
  id: string;
  name: string;
  team: string;
  elo: number;
  investor_stars: number;
}

export default function AdminPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [votingAs, setVotingAs] = useState("");
  const [votesRemaining, setVotesRemaining] = useState(3);
  const [message, setMessage] = useState("");

  // Form fields
  const [name, setName] = useState("");
  const [team, setTeam] = useState("");
  const [description, setDescription] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [codeUrl, setCodeUrl] = useState("");
  const [materials, setMaterials] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadProjects = () => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then(setProjects);
  };

  const loadVotes = (investor: string) => {
    if (!investor) return;
    fetch(`/api/vote?investor=${encodeURIComponent(investor)}`)
      .then((r) => r.json())
      .then((data) => setVotesRemaining(data.remaining));
  };

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    loadVotes(votingAs);
  }, [votingAs]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !team || !description) return;

    setSubmitting(true);
    setMessage("Submitting project & running Gemini AI evaluation...");

    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("team", team);
      formData.append("description", description);
      formData.append("video_url", videoUrl);
      formData.append("code_url", codeUrl);
      formData.append("materials", materials);
      if (videoFile) {
        formData.append("video_file", videoFile);
      }

      const res = await fetch("/api/projects", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        setMessage("Project submitted successfully!");
        setName("");
        setTeam("");
        setDescription("");
        setVideoUrl("");
        setCodeUrl("");
        setMaterials("");
        setVideoFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        loadProjects();
      } else {
        const err = await res.json();
        setMessage(`Error: ${err.error}`);
      }
    } catch {
      setMessage("Submission failed. Check your GEMINI_API_KEY.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVote = async (projectId: string) => {
    if (!votingAs) {
      setMessage("Please enter your investor name first.");
      return;
    }
    const res = await fetch("/api/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ investor_name: votingAs, project_id: projectId }),
    });
    const data = await res.json();
    if (res.ok) {
      setMessage(`Vote cast! Stars: ${data.stars}`);
      loadProjects();
      loadVotes(votingAs);
    } else {
      setMessage(`Vote failed: ${data.error}`);
    }
  };

  const handleDelete = async (projectId: string, projectName: string) => {
    if (!confirm(`Delete "${projectName}"? This cannot be undone.`)) return;
    await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
    loadProjects();
    setMessage(`Deleted ${projectName}`);
  };

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Admin Panel</h1>

      {message && (
        <div className="p-3 bg-blue-50 text-blue-800 rounded-lg text-sm">
          {message}
        </div>
      )}

      {/* Submit Project */}
      <div className="bg-white rounded-xl border p-6">
        <h2 className="font-semibold text-lg mb-4">Submit New Project</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. AI Code Reviewer"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Team *
              </label>
              <input
                type="text"
                value={team}
                onChange={(e) => setTeam(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. Team Alpha"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Describe your project, how AI was used, what problem it solves..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Video Demo (MP4)
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,video/*"
              onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {videoFile && (
              <p className="mt-1 text-xs text-gray-500">
                Selected: {videoFile.name} ({(videoFile.size / 1024 / 1024).toFixed(1)} MB)
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Video URL (optional)
              </label>
              <input
                type="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://youtube.com/..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Code Repository URL
              </label>
              <input
                type="url"
                value={codeUrl}
                onChange={(e) => setCodeUrl(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://github.com/..."
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Additional Materials
            </label>
            <textarea
              value={materials}
              onChange={(e) => setMaterials(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Any additional context, slides link, etc."
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Evaluating with Gemini AI..." : "Submit & Evaluate"}
          </button>
        </form>
      </div>

      {/* Investor Voting */}
      <div className="bg-white rounded-xl border p-6">
        <h2 className="font-semibold text-lg mb-4">Investor Voting</h2>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Your Name
          </label>
          <input
            type="text"
            value={votingAs}
            onChange={(e) => setVotingAs(e.target.value)}
            className="w-64 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter investor name"
          />
          {votingAs && (
            <span className="ml-3 text-sm text-gray-500">
              {votesRemaining} votes remaining
            </span>
          )}
        </div>

        {projects.length === 0 ? (
          <p className="text-sm text-gray-500">No projects to vote on yet.</p>
        ) : (
          <div className="space-y-2">
            {projects.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <span className="font-medium">{p.name}</span>
                  <span className="text-sm text-gray-500 ml-2">{p.team}</span>
                  {p.investor_stars > 0 && (
                    <span className="ml-2 text-yellow-500">
                      {"*".repeat(p.investor_stars)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">ELO {p.elo}</span>
                  <button
                    onClick={() => handleVote(p.id)}
                    disabled={!votingAs || votesRemaining <= 0}
                    className="px-3 py-1 bg-yellow-500 text-white text-sm rounded-lg hover:bg-yellow-600 transition-colors disabled:opacity-50"
                  >
                    Vote
                  </button>
                  <button
                    onClick={() => handleDelete(p.id, p.name)}
                    className="px-3 py-1 bg-red-100 text-red-600 text-sm rounded-lg hover:bg-red-200 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
