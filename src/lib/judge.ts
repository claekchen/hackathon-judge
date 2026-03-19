import { GoogleGenAI, createPartFromUri, Part } from "@google/genai";
import fs from "fs";
import path from "path";

export interface ProjectInfo {
  id: string;
  name: string;
  team: string;
  description: string;
  video_url: string;
  video_file: string;
  code_url: string;
  materials: string;
}

export interface ScoreReasoning {
  ai_breadth: string;
  ai_depth: string;
  work_fit: string;
  completeness: string;
  creativity: string;
}

export interface ScoreResult {
  ai_breadth: number;
  ai_depth: number;
  work_fit: number;
  completeness: number;
  creativity: number;
  weighted: number;
  summary: string;
  highlights: string;
  improvements: string;
  reasoning: ScoreReasoning;
}

export interface MatchResult {
  winner_id: string;
  reasoning: string;
  key_differentiator: string;
  scores_a: { ai_breadth: number; ai_depth: number; work_fit: number; completeness: number; creativity: number; weighted: number };
  scores_b: { ai_breadth: number; ai_depth: number; work_fit: number; completeness: number; creativity: number; weighted: number };
}

const SCORING_PROMPT = `你是一位资深的技术黑客松评审专家。你将根据项目的视频Demo、代码和项目介绍，进行严格、公正的评分。

## 评分维度与标准

### AI使用广度 (权重30%)
评估：团队中有多少人真正使用了AI工具？每个人的参与深度如何？
- 9-10分：全员深度使用AI，每个成员都有明确的AI协作痕迹
- 7-8分：大部分成员使用了AI，少数人参与较浅
- 5-6分：仅1-2人使用AI，其余成员传统开发
- 3-4分：仅有表面使用（如用ChatGPT写文案）
- 1-2分：几乎未使用AI

### AI工具深度 (权重25%)
评估：AI工具的应用是否深入？是否超越了简单的问答？
- 9-10分：深度使用Claude Code/Cursor/OpenClaw等进行架构设计、代码生成、调试、部署全流程
- 7-8分：多环节使用AI辅助，但部分环节仍为手动
- 5-6分：主要用AI做代码补全或简单问答
- 3-4分：仅用AI做文档/PPT等非核心工作
- 1-2分：几乎未用专业AI开发工具

### 工作场景契合度 (权重25%)
评估：项目是否真正解决了日常工作中的实际问题？
- 9-10分：直接对应真实工作痛点，有明确的使用场景和受益人群
- 7-8分：与工作相关，但场景略有延伸
- 5-6分：有一定关联，但更偏demo性质
- 3-4分：与实际工作关联较弱
- 1-2分：纯概念/玩具项目

### 完成度 (权重15%)
评估：是否有可运行的Demo？功能完整度如何？
- 9-10分：完整可用的产品，Demo流畅无bug
- 7-8分：核心功能完整，有少量粗糙之处
- 5-6分：基本能跑，但功能不完整
- 3-4分：只有部分功能或大量bug
- 1-2分：只有PPT/设计稿，无法运行

### 创意 (权重5%)
评估：在工作场景基础上，是否有创新的思路或方法？
- 9-10分：令人眼前一亮的创新应用方式
- 7-8分：有一些新颖的想法
- 5-6分：中规中矩
- 3-4分：常见方案的简单复制
- 1-2分：无任何创新

## 输出要求
请严格按以下JSON格式输出（不要markdown代码块）：
{
  "ai_breadth": <1-10>,
  "ai_depth": <1-10>,
  "work_fit": <1-10>,
  "completeness": <1-10>,
  "creativity": <1-10>,
  "reasoning": {
    "ai_breadth": "该维度的具体评价依据（引用视频/代码中的证据）",
    "ai_depth": "...",
    "work_fit": "...",
    "completeness": "...",
    "creativity": "..."
  },
  "summary": "一句话总评",
  "highlights": "项目最大亮点",
  "improvements": "最需要改进的地方"
}

## 重要原则
1. 所有评分必须基于可观察的证据（视频内容、代码结构、项目介绍），不要脑补
2. 评分要有区分度，不要都给6-8分的安全分
3. 如果信息不足以判断某个维度，明确说明并给5分（中性分）`;

const MATCH_PROMPT = `你将比较两个黑客松项目（项目A vs 项目B）。

请按以下步骤评判：
1. 逐维度比较（AI广度/深度/契合度/完成度/创意），每个维度给出A和B的分数
2. 计算加权总分（广度30%+深度25%+契合度25%+完成度15%+创意5%）
3. 基于总分和整体印象，选出胜者
4. 如果两者极为接近（差距<0.5分），可以判平局

输出JSON（不要markdown代码块）：
{
  "scores_a": {"ai_breadth":X, "ai_depth":X, "work_fit":X, "completeness":X, "creativity":X, "weighted":X},
  "scores_b": {"ai_breadth":X, "ai_depth":X, "work_fit":X, "completeness":X, "creativity":X, "weighted":X},
  "winner": "A" | "B" | "DRAW",
  "reasoning": "逐维度比较的简要分析",
  "key_differentiator": "决定胜负的关键因素"
}`;

function getClient() {
  return new GoogleGenAI({
    vertexai: true,
    apiKey: process.env.GEMINI_API_KEY || "",
  });
}

function buildVideoInlinePart(videoFile: string): Part | null {
  // Use frame extraction approach - look for pre-extracted frames
  const baseName = videoFile.replace('.mp4', '');
  const framesDir = path.join(process.cwd(), "public", "uploads", "frames");
  
  if (!fs.existsSync(framesDir)) return null;
  
  // Find all frames for this video
  const frames = fs.readdirSync(framesDir)
    .filter(f => f.startsWith(baseName) && f.endsWith('.jpg'))
    .sort();
  
  if (frames.length === 0) {
    // Fallback: try inline video
    const filePath = path.join(process.cwd(), "public", "uploads", videoFile);
    if (!fs.existsSync(filePath)) return null;
    const data = fs.readFileSync(filePath);
    return {
      inlineData: {
        mimeType: "video/mp4",
        data: data.toString("base64"),
      },
    };
  }
  
  return null; // We'll handle frames as multiple parts in the caller
}

function buildVideoFrameParts(videoFile: string): Part[] {
  const baseName = videoFile.replace('.mp4', '');
  const framesDir = path.join(process.cwd(), "public", "uploads", "frames");
  
  if (!fs.existsSync(framesDir)) return [];
  
  const frames = fs.readdirSync(framesDir)
    .filter(f => f.startsWith(baseName) && f.endsWith('.jpg'))
    .sort();
  
  if (frames.length === 0) return [];
  
  const parts: Part[] = [{ text: `[以下是视频Demo的${frames.length}张截帧，每30秒一帧]` }];
  for (const frame of frames) {
    const data = fs.readFileSync(path.join(framesDir, frame));
    parts.push({
      inlineData: {
        mimeType: "image/jpeg",
        data: data.toString("base64"),
      },
    });
  }
  return parts;
}

function buildAudioPart(videoFile: string): Part | null {
  const baseName = videoFile.replace('.mp4', '');
  const audioPath = path.join(process.cwd(), "public", "uploads", `audio_${baseName}.mp3`);
  if (!fs.existsSync(audioPath)) return null;
  const data = fs.readFileSync(audioPath);
  return {
    inlineData: {
      mimeType: "audio/mp3",
      data: data.toString("base64"),
    },
  };
}

async function transcribeAudio(videoFile: string): Promise<string> {
  const audioPart = buildAudioPart(videoFile);
  if (!audioPart) return "";
  
  // Check for cached transcript
  const baseName = videoFile.replace('.mp4', '');
  const transcriptPath = path.join(process.cwd(), "public", "uploads", `transcript_${baseName}.txt`);
  if (fs.existsSync(transcriptPath)) {
    return fs.readFileSync(transcriptPath, "utf-8");
  }
  
  try {
    const client = getClient();
    const result = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        audioPart,
        { text: "请将这段音频完整转录为文字。保留所有对话内容，标注不同说话人。如果有英文内容保留英文原文。只输出转录文本，不要其他内容。" },
      ],
    });
    const transcript = result.text || "";
    // Cache it
    fs.writeFileSync(transcriptPath, transcript);
    console.log(`  Transcribed ${videoFile}: ${transcript.length} chars`);
    return transcript;
  } catch (e) {
    console.error(`  Transcription failed for ${videoFile}:`, (e as Error).message);
    return "";
  }
}


function parseJsonResponse(text: string): any {
  // Strip markdown code blocks if present
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }
  return JSON.parse(cleaned.trim());
}

function buildProjectText(project: ProjectInfo): string {
  return `项目名: ${project.name}
团队: ${project.team}
描述: ${project.description}
视频链接: ${project.video_url || "无"}
代码链接: ${project.code_url || "无"}
其他材料: ${project.materials || "无"}`;
}

export async function scoreProject(project: ProjectInfo): Promise<ScoreResult> {
  const client = getClient();

  const parts: Part[] = [];

  // Add video frames if available
  if (project.video_file) {
    const frameParts = buildVideoFrameParts(project.video_file);
    parts.push(...frameParts);
    
    // Add audio transcript
    const transcript = await transcribeAudio(project.video_file);
    if (transcript) {
      parts.push({ text: `[视频Demo语音转录]\n${transcript}` });
    }
  }

  parts.push({ text: `${SCORING_PROMPT}\n\n${buildProjectText(project)}` });

  try {
    const result = await client.models.generateContent({
      model: "gemini-2.5-pro",
      contents: parts,
    });
    const text = result.text || "";
    const json = parseJsonResponse(text);

    const weighted =
      json.ai_breadth * 0.3 +
      json.ai_depth * 0.25 +
      json.work_fit * 0.25 +
      json.completeness * 0.15 +
      json.creativity * 0.05;

    return {
      ai_breadth: json.ai_breadth,
      ai_depth: json.ai_depth,
      work_fit: json.work_fit,
      completeness: json.completeness,
      creativity: json.creativity,
      weighted: Math.round(weighted * 100) / 100,
      summary: json.summary || "",
      highlights: json.highlights || "",
      improvements: json.improvements || "",
      reasoning: json.reasoning || {
        ai_breadth: "",
        ai_depth: "",
        work_fit: "",
        completeness: "",
        creativity: "",
      },
    };
  } catch (e) {
    console.error("Score error:", e);
    return {
      ai_breadth: 5,
      ai_depth: 5,
      work_fit: 5,
      completeness: 5,
      creativity: 5,
      weighted: 5,
      summary: "评分失败，使用默认分数",
      highlights: "",
      improvements: "",
      reasoning: {
        ai_breadth: "评分失败",
        ai_depth: "评分失败",
        work_fit: "评分失败",
        completeness: "评分失败",
        creativity: "评分失败",
      },
    };
  }
}

export async function compareProjects(
  a: ProjectInfo,
  b: ProjectInfo
): Promise<MatchResult> {
  const client = getClient();

  const parts: Part[] = [];

  // Add video A frames if available
  if (a.video_file) {
    const framesA = buildVideoFrameParts(a.video_file);
    if (framesA.length > 0) {
      parts.push({ text: "--- 项目A的视频Demo截帧 ---" });
      parts.push(...framesA);
    }
    const transcriptA = await transcribeAudio(a.video_file);
    if (transcriptA) {
      parts.push({ text: `--- 项目A的语音转录 ---\n${transcriptA}` });
    }
  }

  // Add video B frames if available
  if (b.video_file) {
    const framesB = buildVideoFrameParts(b.video_file);
    if (framesB.length > 0) {
      parts.push({ text: "--- 项目B的视频Demo截帧 ---" });
      parts.push(...framesB);
    }
    const transcriptB = await transcribeAudio(b.video_file);
    if (transcriptB) {
      parts.push({ text: `--- 项目B的语音转录 ---\n${transcriptB}` });
    }
  }

  const prompt = `${MATCH_PROMPT}

--- 项目A ---
${buildProjectText(a)}

--- 项目B ---
${buildProjectText(b)}`;

  parts.push({ text: prompt });

  try {
    const result = await client.models.generateContent({
      model: "gemini-2.5-pro",
      contents: parts,
    });
    const text = result.text || "";
    const json = parseJsonResponse(text);

    let winner_id: string;
    if (json.winner === "DRAW") {
      winner_id = Math.random() > 0.5 ? a.id : b.id;
    } else {
      winner_id = json.winner === "A" ? a.id : b.id;
    }

    return {
      winner_id,
      reasoning: json.reasoning,
      key_differentiator: json.key_differentiator || "",
      scores_a: json.scores_a || {},
      scores_b: json.scores_b || {},
    };
  } catch (e) {
    console.error("Compare error:", e);
    return {
      winner_id: Math.random() > 0.5 ? a.id : b.id,
      reasoning: "比较失败，随机选择",
      key_differentiator: "",
      scores_a: { ai_breadth: 5, ai_depth: 5, work_fit: 5, completeness: 5, creativity: 5, weighted: 5 },
      scores_b: { ai_breadth: 5, ai_depth: 5, work_fit: 5, completeness: 5, creativity: 5, weighted: 5 },
    };
  }
}
