/**
 * Build-time repair for the AI Growth Engine fallback workflow.
 * This file edits src/server/gemini.ts before Vite/esbuild compile it.
 * It is idempotent and safe to run on every Vercel deployment.
 */
const fs = require("node:fs");

const filePath = "src/server/gemini.ts";
let text = fs.readFileSync(filePath, "utf8");

const researchStartToken = "export async function generateOpenRouterResearch";
const researchEndToken = "export async function callModelWithFallback";
const researchStart = text.indexOf(researchStartToken);
const researchEnd = text.indexOf(researchEndToken, researchStart);

if (researchStart === -1 || researchEnd === -1) {
  throw new Error("Could not locate the OpenRouter research function.");
}

const researchReplacement = "export async function generateOpenRouterResearch(\n  systemInstruction: string,\n  userPrompt: string,\n  responseSchema: any\n): Promise<{ text: string; modelSelected: string }> {\n  const apiKey = process.env.OPENROUTER_API_KEY;\n  if (!apiKey) {\n    throw new Error(\"OpenRouter backup is not configured in Vercel Environment Variables.\");\n  }\n\n  type ResearchCandidate = {\n    title: string;\n    publisher: string;\n    url: string;\n    publishedDate: string;\n    sourceType: \"Official\" | \"Research paper\" | \"GitHub\" | \"Publication\" | \"Community\";\n    context: string;\n  };\n\n  const candidates: ResearchCandidate[] = [];\n  const seenUrls = new Set<string>();\n\n  const decodeXml = (value: string): string =>\n    value\n      .replace(/<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>/g, \"$1\")\n      .replace(/&amp;/g, \"&\")\n      .replace(/&lt;/g, \"<\")\n      .replace(/&gt;/g, \">\")\n      .replace(/&quot;/g, '\"')\n      .replace(/&#39;/g, \"'\")\n      .trim();\n\n  const addCandidate = (candidate: ResearchCandidate): void => {\n    if (!candidate.title || !candidate.url || !candidate.url.startsWith(\"https://\")) {\n      return;\n    }\n\n    const normalizedUrl = candidate.url.trim().replace(/\\/+$/, \"\");\n    if (seenUrls.has(normalizedUrl)) {\n      return;\n    }\n\n    seenUrls.add(normalizedUrl);\n    candidates.push({\n      ...candidate,\n      url: candidate.url.trim(),\n      title: candidate.title.trim(),\n      publisher: candidate.publisher.trim() || \"Unknown publisher\",\n      publishedDate: candidate.publishedDate.trim() || new Date().toISOString(),\n      context: candidate.context.trim().slice(0, 1200),\n    });\n  };\n\n  const fetchWithTimeout = async (\n    url: string,\n    init: RequestInit = {},\n    timeoutMs: number = 8000\n  ): Promise<Response> => {\n    const controller = new AbortController();\n    const timeout = setTimeout(() => controller.abort(), timeoutMs);\n\n    try {\n      return await fetch(url, {\n        ...init,\n        signal: controller.signal,\n        headers: {\n          \"User-Agent\": \"AI-LinkedIn-Growth-Engine/1.0\",\n          ...(init.headers || {}),\n        },\n      });\n    } finally {\n      clearTimeout(timeout);\n    }\n  };\n\n  const sinceUnix = Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000);\n  const sinceIso = new Date(sinceUnix * 1000).toISOString();\n\n  const googleNewsTask = async (): Promise<void> => {\n    const queries = [\n      \"artificial intelligence when:7d\",\n      \"OpenAI OR Anthropic OR Gemini OR Llama when:7d\",\n      \"AI tools OR AI agents OR large language model when:7d\",\n    ];\n\n    await Promise.allSettled(\n      queries.map(async (query) => {\n        const url =\n          \"https://news.google.com/rss/search?q=\" +\n          encodeURIComponent(query) +\n          \"&hl=en-US&gl=US&ceid=US:en\";\n\n        const response = await fetchWithTimeout(url);\n        if (!response.ok) {\n          throw new Error(`Google News RSS returned ${response.status}`);\n        }\n\n        const xml = await response.text();\n        const items = xml.match(/<item>[\\s\\S]*?<\\/item>/g) || [];\n\n        for (const item of items.slice(0, 15)) {\n          const title = decodeXml(item.match(/<title>([\\s\\S]*?)<\\/title>/)?.[1] || \"\");\n          const link = decodeXml(item.match(/<link>([\\s\\S]*?)<\\/link>/)?.[1] || \"\");\n          const pubDate = decodeXml(item.match(/<pubDate>([\\s\\S]*?)<\\/pubDate>/)?.[1] || \"\");\n          const sourceMatch = item.match(/<source[^>]*>([\\s\\S]*?)<\\/source>/);\n          const publisher = decodeXml(sourceMatch?.[1] || \"Google News\");\n\n          addCandidate({\n            title,\n            publisher,\n            url: link,\n            publishedDate: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),\n            sourceType: \"Publication\",\n            context: `Recent news result published by ${publisher}.`,\n          });\n        }\n      })\n    );\n  };\n\n  const hackerNewsTask = async (): Promise<void> => {\n    const url =\n      \"https://hn.algolia.com/api/v1/search_by_date?query=\" +\n      encodeURIComponent(\"AI OR LLM OR OpenAI OR Anthropic OR Gemini\") +\n      `&tags=story&numericFilters=created_at_i>${sinceUnix}&hitsPerPage=40`;\n\n    const response = await fetchWithTimeout(url);\n    if (!response.ok) {\n      throw new Error(`Hacker News API returned ${response.status}`);\n    }\n\n    const data = await response.json();\n    for (const hit of Array.isArray(data?.hits) ? data.hits : []) {\n      const urlValue = typeof hit?.url === \"string\" ? hit.url : \"\";\n      if (!urlValue.startsWith(\"https://\")) {\n        continue;\n      }\n\n      addCandidate({\n        title: String(hit?.title || hit?.story_title || \"\"),\n        publisher: \"Hacker News\",\n        url: urlValue,\n        publishedDate: String(hit?.created_at || sinceIso),\n        sourceType: \"Community\",\n        context: String(hit?.story_text || \"\").replace(/<[^>]+>/g, \" \"),\n      });\n    }\n  };\n\n  const githubReleasesTask = async (): Promise<void> => {\n    const repositories = [\n      \"ollama/ollama\",\n      \"huggingface/transformers\",\n      \"langchain-ai/langchain\",\n      \"open-webui/open-webui\",\n    ];\n\n    await Promise.allSettled(\n      repositories.map(async (repository) => {\n        const response = await fetchWithTimeout(\n          `https://api.github.com/repos/${repository}/releases?per_page=5`,\n          {\n            headers: {\n              Accept: \"application/vnd.github+json\",\n            },\n          }\n        );\n\n        if (!response.ok) {\n          throw new Error(`GitHub releases API returned ${response.status} for ${repository}`);\n        }\n\n        const releases = await response.json();\n        for (const release of Array.isArray(releases) ? releases : []) {\n          const publishedAt = String(release?.published_at || release?.created_at || \"\");\n          if (!publishedAt || new Date(publishedAt).getTime() < new Date(sinceIso).getTime()) {\n            continue;\n          }\n\n          addCandidate({\n            title: `${repository}: ${String(release?.name || release?.tag_name || \"New release\")}`,\n            publisher: repository,\n            url: String(release?.html_url || \"\"),\n            publishedDate: publishedAt,\n            sourceType: \"GitHub\",\n            context: String(release?.body || \"\").replace(/<[^>]+>/g, \" \"),\n          });\n        }\n      })\n    );\n  };\n\n  await Promise.allSettled([\n    googleNewsTask(),\n    hackerNewsTask(),\n    githubReleasesTask(),\n  ]);\n\n  const liveCandidates = candidates\n    .sort(\n      (a, b) =>\n        new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime()\n    )\n    .slice(0, 35);\n\n  if (liveCandidates.length < 3) {\n    throw new Error(\n      \"OpenRouter fallback could not collect enough current public sources for a reliable research brief.\"\n    );\n  }\n\n  const allowedSources = new Map(\n    liveCandidates.map((candidate) => [\n      candidate.url.trim().replace(/\\/+$/, \"\"),\n      candidate,\n    ])\n  );\n\n  const groundedSystemInstruction = `${systemInstruction}\n\nOPENROUTER FALLBACK RESEARCH MODE:\nGemini search is unavailable, so current source metadata has been collected directly from public RSS feeds and APIs before this model call.\n\nNon-negotiable rules:\n- Use only the supplied LIVE SOURCE CANDIDATES.\n- Never invent, reconstruct, alter or substitute a URL.\n- Copy source URLs exactly.\n- Do not claim to have opened or read a page beyond the supplied title, date, publisher and context.\n- Prefer official GitHub releases and reputable publications.\n- Treat community sources as supporting signals, not sole proof for major claims.\n- Clearly mention uncertainty where source context is limited.\n- Return valid JSON only, matching the requested schema.`;\n\n  const groundedUserPrompt = `${userPrompt}\n\nLIVE SOURCE CANDIDATES COLLECTED AT ${new Date().toISOString()}:\n${JSON.stringify(liveCandidates, null, 2)}\n\nBuild the requested research output exclusively from these candidates.`;\n\n  const result = await generateOpenRouterContent(\n    groundedSystemInstruction,\n    groundedUserPrompt,\n    responseSchema\n  );\n\n  let parsed: any;\n  try {\n    parsed = JSON.parse(result.text);\n  } catch {\n    throw new Error(\"OpenRouter fallback returned invalid JSON for the research stage.\");\n  }\n\n  const sanitizeSources = (sources: any): any[] => {\n    if (!Array.isArray(sources)) {\n      return [];\n    }\n\n    const sanitized: any[] = [];\n    const localSeen = new Set<string>();\n\n    for (const source of sources) {\n      const rawUrl = typeof source?.url === \"string\" ? source.url.trim() : \"\";\n      const normalizedUrl = rawUrl.replace(/\\/+$/, \"\");\n      const candidate = allowedSources.get(normalizedUrl);\n\n      if (!candidate || localSeen.has(normalizedUrl)) {\n        continue;\n      }\n\n      localSeen.add(normalizedUrl);\n      sanitized.push({\n        title: candidate.title,\n        publisher: candidate.publisher,\n        url: candidate.url,\n        publishedDate: candidate.publishedDate,\n        sourceType: candidate.sourceType,\n      });\n    }\n\n    return sanitized;\n  };\n\n  if (Array.isArray(parsed?.developments)) {\n    parsed.developments = parsed.developments\n      .map((development: any) => ({\n        ...development,\n        sources: sanitizeSources(development?.sources),\n      }))\n      .filter((development: any) => development.sources.length > 0);\n  }\n\n  if (parsed && Object.prototype.hasOwnProperty.call(parsed, \"sources\")) {\n    parsed.sources = sanitizeSources(parsed.sources);\n    if (parsed.status === \"found\" && parsed.sources.length === 0) {\n      parsed.status = \"no_reliable_result\";\n    }\n  }\n\n  return {\n    text: JSON.stringify(parsed),\n    modelSelected: result.modelSelected,\n  };\n}";
text =
  text.slice(0, researchStart) +
  researchReplacement +
  "\n\n" +
  text.slice(researchEnd);

const helperMarker = "export async function generateContentIdea";
if (!text.includes("function createResilientTextClient")) {
  const helperIndex = text.indexOf(helperMarker);
  if (helperIndex === -1) {
    throw new Error("Could not locate the text-workflow insertion point.");
  }
  const helper = "/**\n * A Gemini-compatible client for text-only workflow stages.\n * It automatically falls back to OpenRouter when Gemini is over quota,\n * rate-limited, overloaded or temporarily unavailable.\n */\nfunction createResilientTextClient(): any {\n  return {\n    models: {\n      generateContent: async (request: any): Promise<any> => {\n        const config = request?.config || {};\n        const contents = request?.contents;\n        const userPrompt =\n          typeof contents === \"string\"\n            ? contents\n            : JSON.stringify(contents ?? \"\");\n\n        const result = await callModelWithFallback({\n          systemInstruction:\n            typeof config.systemInstruction === \"string\"\n              ? config.systemInstruction\n              : \"\",\n          userPrompt,\n          responseSchema: config.responseSchema,\n          enableSearch:\n            Array.isArray(config.tools) &&\n            config.tools.some((tool: any) => Boolean(tool?.googleSearch)),\n        });\n\n        return {\n          text: result.text,\n          completedWithOpenRouterFallback:\n            result.completedWithOpenRouterFallback,\n          openRouterModel: result.openRouterModel,\n        };\n      },\n    },\n  };\n}";
  text = text.slice(0, helperIndex) + helper + "\n\n" + text.slice(helperIndex);
}

const targetFunctions = [
  "generateContentIdea",
  "generateGroundedContentIdea",
  "generateDailyIdeasCollection",
  "generateAlternativeDailyIdea",
  "evaluateDailyIdeasCollection",
  "improveSelectedIdea",
  "generateLinkedInPost",
  "adjustLinkedInPost",
  "runCredibilityCheck",
  "analyzeVisualStrategy",
  "improveVisualPrompt",
  "generateCarouselPlan",
  "generateAlternativeCover",
  "rewriteCarouselSlide",
  "qualityCheckCarousel",
  "analyzeCarouselVisualNeeds",
  "improveCarouselAssetPrompt"
];

const clientPattern =
  /const ai = new GoogleGenAI\(\{\s*apiKey:\s*apiKey,\s*httpOptions:\s*\{[\s\S]*?['"]User-Agent['"]:\s*['"]aistudio-build['"],?\s*\}\s*\}\s*\}\);/g;

let replacementCount = 0;

for (const functionName of targetFunctions) {
  const startToken = `export async function ${functionName}`;
  const start = text.indexOf(startToken);
  if (start === -1) {
    console.log(`Skipping missing function: ${functionName}`);
    continue;
  }

  const nextExport = text.indexOf("\nexport async function ", start + startToken.length);
  const end = nextExport === -1 ? text.length : nextExport;
  const block = text.slice(start, end);
  const matches = block.match(clientPattern);
  const updatedBlock = block.replace(
    clientPattern,
    "const ai = createResilientTextClient();"
  );

  if (matches) {
    replacementCount += matches.length;
    text = text.slice(0, start) + updatedBlock + text.slice(end);
  }
}

if (!text.includes("function createResilientTextClient")) {
  throw new Error("Resilient text client was not installed.");
}

if (!text.includes("LIVE SOURCE CANDIDATES")) {
  throw new Error("Free live-source OpenRouter research fallback was not installed.");
}

fs.writeFileSync(filePath, text, "utf8");
console.log(
  `Fallback repair applied. Upgraded ${replacementCount} direct Gemini text client(s).`
);


// Repair the Stress Test UI contract. The API returns IdeaStressTest using
// winnerIdeaIds, finalScore, scores, totalPenalty, mainWeakness and
// improvementRecommendation. The UI previously rendered obsolete property
// names, which caused React to throw and replace the whole app with a blank page.
const ideasViewPath = "src/components/IdeasView.tsx";
let ideasText = fs.readFileSync(ideasViewPath, "utf8");

const uiReplacements = [
  [
    "{stressTest.winners.map((winner, index) => {",
    "{(stressTest.winnerIdeaIds || []).slice(0, 3).map((winnerId, index) => {",
  ],
  [
    "stressTest.winners.some(w => w.ideaId === evalItem.ideaId)",
    "(stressTest.winnerIdeaIds || []).includes(evalItem.ideaId)",
  ],
  ["winner.ideaId", "winnerId"],
  ["evaluation.calculatedScore", "evaluation.finalScore"],
  ["matchedIdea.suggestedFormat", "matchedIdea.recommendedFormat"],
  ["evaluation.weakness", "evaluation.mainWeakness"],
  ["evaluation.recommendation", "evaluation.improvementRecommendation"],
  ["evalItem.calculatedScore", "evalItem.finalScore"],
  ["evalItem.penaltyScore", "evalItem.totalPenalty"],
  ["evalItem.criterionScores", "evalItem.scores"],
  ["evalItem.factPreserved", "evalItem.riskLevel !== 'High'"],
  ["evalItem.credibilityRiskDetails", "evalItem.requiredProofOrAction"],
  ["evalItem.weakness", "evalItem.mainWeakness"],
  ["evalItem.recommendation", "evalItem.improvementRecommendation"],
  ["stressTest.evaluations.map", "(stressTest.evaluations || []).map"],
  ["stressTest.evaluations.find", "(stressTest.evaluations || []).find"],
];

let uiReplacementCount = 0;
for (const [before, after] of uiReplacements) {
  if (ideasText.includes(before)) {
    const occurrences = ideasText.split(before).length - 1;
    ideasText = ideasText.split(before).join(after);
    uiReplacementCount += occurrences;
  }
}

const obsoleteUiTokens = [
  "stressTest.winners.map",
  "stressTest.winners.some",
  "evaluation.calculatedScore",
  "matchedIdea.suggestedFormat",
  "evaluation.weakness",
  "evaluation.recommendation",
  "evalItem.calculatedScore",
  "evalItem.penaltyScore",
  "evalItem.criterionScores",
  "evalItem.factPreserved",
  "evalItem.credibilityRiskDetails",
  "evalItem.weakness",
  "evalItem.recommendation",
];

const remainingObsoleteTokens = obsoleteUiTokens.filter((token) =>
  ideasText.includes(token)
);
if (remainingObsoleteTokens.length > 0) {
  throw new Error(
    `Stress Test UI repair incomplete. Remaining obsolete tokens: ${remainingObsoleteTokens.join(", ")}`
  );
}

if (!ideasText.includes("stressTest.winnerIdeaIds")) {
  throw new Error("Stress Test UI repair did not install winnerIdeaIds rendering.");
}

fs.writeFileSync(ideasViewPath, ideasText, "utf8");
console.log(
  `Stress Test UI repair applied. Updated ${uiReplacementCount} obsolete reference(s).`
);
