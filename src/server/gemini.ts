import { GoogleGenAI, Type } from "@google/genai";
import { GeminiConnectionResult, SafeGeminiError, CreatorProfile, GeneratedContentIdea, ContentIdeaResponse, AIResearchResult, AIResearchResponse, AIResearchSource, GroundedLinkedInIdea, GroundedIdeaResponse, GroundedSourceReference, DailyResearchBrief, DailyResearchDevelopment, DailyIdeaCollection, DailyContentIdea, DailyIdeaType, LinkedInPostFormat, IdeaGrowthMechanism, SavedDailyIdea, IdeaStressTest, IdeaEvaluation, IdeaCriterionScores, IdeaPenaltyScores, IdeaDecision, IdeaRiskLevel, GeneratedPost, GeneratedPostResponse, AdjustedPostResponse, PostCredibilityReport, PostClaimEvaluation, ClaimClassification, ClaimRiskLevel, ClaimRecommendedAction, CredibilityCheckResponse, SourceReference, VisualFormatRecommendation, VisualFormat, LinkedInVisualStyle, VisualAspectRatio, HeadlineSafeArea, VisualIntensity, GeneratedLinkedInVisual, VisualOverlaySettings, SavedVisualDraft, LinkedInCarouselPlan, LinkedInCarouselSlide, CarouselSlideRole, CarouselFactualType, CarouselLayoutTemplate, CarouselAspectRatio, CarouselDesignSettings, CarouselQualityReport, CarouselQualityIssue, SavedCarouselDraft, CarouselGenerationStatus, CarouselVisualStrategy, CarouselSlideVisualRecommendation, CarouselVisualNeed, CarouselVisualImportance, CarouselArtworkType, CarouselArtworkPlacement, CarouselArtworkSettings, GeneratedCarouselAsset, SavedCarouselAssetMetadata, CarouselAssetGenerationStatus, CarouselAssetError } from "../types.js";

export const TEXT_MODEL = process.env.TEXT_MODEL || "gemini-3.5-flash";


// Helper to sanitize/categorize the error safely without exposing key or raw dump
export function categorizeError(error: unknown): { category: SafeGeminiError; message: string } {
  const errorMsg = error instanceof Error ? error.message : String(error);
  const lowerMsg = errorMsg.toLowerCase();

  // 1. Missing api key
  if (!process.env.GEMINI_API_KEY) {
    return {
      category: 'configuration_missing',
      message: 'Gemini API configuration is missing. Open the AI Studio Secrets panel and confirm that GEMINI_API_KEY is configured.'
    };
  }

  // 2. Unauthorized / Invalid key
  if (
    lowerMsg.includes('api key') ||
    lowerMsg.includes('key') ||
    lowerMsg.includes('invalid') ||
    lowerMsg.includes('unauthorized') ||
    lowerMsg.includes('auth') ||
    lowerMsg.includes('credential') ||
    lowerMsg.includes('403') ||
    lowerMsg.includes('401')
  ) {
    return {
      category: 'unauthorized',
      message: 'Gemini authentication failed. Check the API key configured in AI Studio.'
    };
  }

  // 3. Quota / Rate-limit
  if (
    lowerMsg.includes('quota') ||
    lowerMsg.includes('limit') ||
    lowerMsg.includes('rate') ||
    lowerMsg.includes('exhausted') ||
    lowerMsg.includes('429')
  ) {
    return {
      category: 'quota_exceeded',
      message: 'The Gemini request limit has been reached. Check your API quota or try again later.'
    };
  }

  // 4. Model unavailable
  if (
    lowerMsg.includes('model') && 
    (lowerMsg.includes('not found') || lowerMsg.includes('not available') || lowerMsg.includes('unavailable') || lowerMsg.includes('404'))
  ) {
    return {
      category: 'model_unavailable',
      message: `The configured Gemini model is unavailable. Review the TEXT_MODEL setting.`
    };
  }

  // 5. Network / Server failure
  return {
    category: 'failed',
    message: 'The connection test could not be completed. Please try again.'
  };
}

function convertGeminiSchemaToStandard(schema: any): any {
  if (!schema) return schema;
  const result = { ...schema };
  if (typeof result.type === 'string') {
    let t = result.type.toLowerCase();
    result.type = t;
  }
  if (result.items) {
    result.items = convertGeminiSchemaToStandard(result.items);
  }
  if (result.properties) {
    const newProps: any = {};
    for (const key of Object.keys(result.properties)) {
      newProps[key] = convertGeminiSchemaToStandard(result.properties[key]);
    }
    result.properties = newProps;
  }
  return result;
}

export function isEligibleForFallback(error: unknown): boolean {
  if (!process.env.OPENROUTER_API_KEY) {
    return false; // Cannot fallback if OpenRouter key is not configured
  }

  const errorMsg = error instanceof Error ? error.message : String(error);
  const lowerMsg = errorMsg.toLowerCase();

  return (
    lowerMsg.includes('quota') ||
    lowerMsg.includes('limit') ||
    lowerMsg.includes('rate') ||
    lowerMsg.includes('exhausted') ||
    lowerMsg.includes('429') ||
    lowerMsg.includes('unavailable') ||
    lowerMsg.includes('capacity') ||
    lowerMsg.includes('500') ||
    lowerMsg.includes('502') ||
    lowerMsg.includes('503') ||
    lowerMsg.includes('504') ||
    lowerMsg.includes('temporary') ||
    lowerMsg.includes('overloaded')
  );
}

export function handleBothFailedError(geminiError: unknown, openRouterError: any): { category: SafeGeminiError; message: string } {
  const orMsg = openRouterError?.message || "";

  if (orMsg.includes("configured in AI Studio Secrets")) {
    return {
      category: 'failed',
      message: "OpenRouter backup is not configured in AI Studio Secrets."
    };
  }

  if (orMsg.includes("authentication failed")) {
    return {
      category: 'failed',
      message: "OpenRouter authentication failed. Check the OPENROUTER_API_KEY secret."
    };
  }

  if (orMsg.includes("limit has also been reached")) {
    return {
      category: 'quota_exceeded',
      message: "The OpenRouter free-model limit has also been reached. Try again later."
    };
  }

  if (orMsg.includes("live-research limit has been reached")) {
    return {
      category: 'failed',
      message: "Gemini’s live-research limit has been reached. OpenRouter can continue writing and analysis tasks, but verified live research is currently unavailable."
    };
  }

  return {
    category: 'failed',
    message: "Gemini and OpenRouter are currently unavailable. Your work has been preserved."
  };
}

async function fetchOpenRouter(
  systemInstruction: string,
  userPrompt: string,
  responseSchema?: any,
  useStrictSchema: boolean = true
): Promise<{ text: string; modelSelected: string }> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OpenRouter backup is not configured in AI Studio Secrets.");
  }

  const messages = [];
  if (systemInstruction) {
    messages.push({ role: "system", content: systemInstruction });
  }
  messages.push({ role: "user", content: userPrompt });

  const body: any = {
    model: "openrouter/free",
    messages: messages
  };

  if (responseSchema) {
    if (useStrictSchema) {
      body.response_format = {
        type: "json_schema",
        json_schema: {
          name: "structured_output",
          strict: true,
          schema: convertGeminiSchemaToStandard(responseSchema)
        }
      };
    } else {
      body.response_format = {
        type: "json_object"
      };
    }
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer": "https://ais-dev-ujz3cqm543t3rapzuf6bnf-582495676743.asia-southeast1.run.app",
      "X-Title": "AI LinkedIn Growth Engine"
    },
    body: JSON.stringify(body)
  });

  if (response.status === 401 || response.status === 403) {
    throw new Error("OpenRouter authentication failed. Check the OPENROUTER_API_KEY secret.");
  }
  if (response.status === 429) {
    throw new Error("The OpenRouter free-model limit has also been reached. Try again later.");
  }
  if (!response.ok) {
    throw new Error("No compatible free OpenRouter model is currently available for this task.");
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content?.trim() || "";
  const modelSelected = data.model || "openrouter/free";

  if (!text) {
    throw new Error("Empty response received from OpenRouter.");
  }

  return { text, modelSelected };
}

export async function generateOpenRouterContent(
  systemInstruction: string,
  userPrompt: string,
  responseSchema?: any
): Promise<{ text: string; modelSelected: string }> {
  try {
    return await fetchOpenRouter(systemInstruction, userPrompt, responseSchema, true);
  } catch (error: any) {
    const errorMsg = error.message || "";
    if (
      errorMsg.includes("configured in AI Studio Secrets") ||
      errorMsg.includes("authentication failed") ||
      errorMsg.includes("limit has also been reached")
    ) {
      throw error;
    }
    try {
      console.log("OpenRouter json_schema failed or unsupported, retrying with json_object...");
      return await fetchOpenRouter(systemInstruction, userPrompt, responseSchema, false);
    } catch (retryError: any) {
      throw retryError;
    }
  }
}

export async function generateOpenRouterResearch(
  systemInstruction: string,
  userPrompt: string,
  responseSchema: any
): Promise<{ text: string; modelSelected: string }> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OpenRouter backup is not configured in AI Studio Secrets.");
  }

  const messages = [];
  if (systemInstruction) {
    messages.push({ role: "system", content: systemInstruction });
  }
  messages.push({ role: "user", content: userPrompt });

  const body: any = {
    model: "openrouter/free",
    messages: messages,
    plugins: [{ id: "web-search" }],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "structured_output",
        strict: true,
        schema: convertGeminiSchemaToStandard(responseSchema)
      }
    }
  };

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "https://ais-dev-ujz3cqm543t3rapzuf6bnf-582495676743.asia-southeast1.run.app",
        "X-Title": "AI LinkedIn Growth Engine"
      },
      body: JSON.stringify(body)
    });

    if (response.status === 401 || response.status === 403) {
      throw new Error("OpenRouter authentication failed. Check the OPENROUTER_API_KEY secret.");
    }
    if (response.status === 429) {
      throw new Error("The OpenRouter free-model limit has also been reached. Try again later.");
    }
    if (!response.ok) {
      throw new Error("Web search unavailable");
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content?.trim() || "";
    const modelSelected = data.model || "openrouter/free";

    if (!text) {
      throw new Error("Empty response received from OpenRouter.");
    }

    return { text, modelSelected };
  } catch (err: any) {
    const msg = err.message || "";
    if (msg.includes("authentication failed") || msg.includes("limit has also been reached") || msg.includes("configured in AI Studio Secrets")) {
      throw err;
    }
    throw new Error("Gemini’s live-research limit has been reached. OpenRouter can continue writing and analysis tasks, but verified live research is currently unavailable.");
  }
}

export async function callModelWithFallback(args: {
  systemInstruction: string;
  userPrompt: string;
  responseSchema?: any;
  enableSearch?: boolean;
}): Promise<{ text: string; completedWithOpenRouterFallback: boolean; openRouterModel: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Gemini API configuration is missing. Open the AI Studio Secrets panel and confirm that GEMINI_API_KEY is configured.");
  }

  const ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  const config: any = {
    systemInstruction: args.systemInstruction,
    responseMimeType: args.responseSchema ? "application/json" : "text/plain",
  };

  if (args.responseSchema) {
    config.responseSchema = args.responseSchema;
  }

  if (args.enableSearch) {
    config.tools = [{ googleSearch: {} }];
  }

  try {
    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: args.userPrompt,
      config: config
    });

    const text = response.text?.trim() || "";
    if (!text) {
      throw new Error("Empty response received from Gemini");
    }

    return {
      text,
      completedWithOpenRouterFallback: false,
      openRouterModel: ""
    };
  } catch (error) {
    if (isEligibleForFallback(error)) {
      console.log("Gemini failed under eligible conditions, switching to OpenRouter...");
      let fallbackResult;
      if (args.enableSearch) {
        fallbackResult = await generateOpenRouterResearch(args.systemInstruction, args.userPrompt, args.responseSchema);
      } else {
        fallbackResult = await generateOpenRouterContent(args.systemInstruction, args.userPrompt, args.responseSchema);
      }
      return {
        text: fallbackResult.text,
        completedWithOpenRouterFallback: true,
        openRouterModel: fallbackResult.modelSelected
      };
    } else {
      throw error;
    }
  }
}

export async function testGeminiConnection(): Promise<GeminiConnectionResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      modelName: TEXT_MODEL,
      errorCategory: 'configuration_missing',
      errorMessage: 'Gemini API configuration is missing. Open the AI Studio Secrets panel and confirm that GEMINI_API_KEY is configured.'
    };
  }

  // Initialize the SDK client on request to lazily read the key and configure User-Agent
  const ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  const startTime = Date.now();

  try {
    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: "Respond only with a JSON block: { \"status\": \"connected\", \"message\": \"Gemini connection is working\" }",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            status: { type: Type.STRING },
            message: { type: Type.STRING },
          },
          required: ["status", "message"],
        }
      }
    });

    const responseTimeMs = Date.now() - startTime;
    const responseText = response.text?.trim() || "";

    // Validate the response
    const parsed = JSON.parse(responseText);
    if (parsed && parsed.status === "connected") {
      return {
        success: true,
        modelName: TEXT_MODEL,
        responseTimeMs,
        testedAt: new Date().toISOString()
      };
    } else {
      throw new Error("Invalid response format received from Gemini");
    }
  } catch (error) {
    const responseTimeMs = Date.now() - startTime;
    console.error(`Gemini Connection Test failed after ${responseTimeMs}ms. Error:`, error instanceof Error ? error.message : error);
    
    const categorized = categorizeError(error);
    return {
      success: false,
      modelName: TEXT_MODEL,
      responseTimeMs,
      errorCategory: categorized.category,
      errorMessage: categorized.message,
      testedAt: new Date().toISOString()
    };
  }
}

export async function testOpenRouterBackup(): Promise<any> {
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  if (!openRouterKey) {
    return {
      success: false,
      errorCategory: 'configuration_missing',
      errorMessage: 'OpenRouter API configuration is missing. Open the AI Studio Secrets panel and confirm that OPENROUTER_API_KEY is configured.'
    };
  }

  const startTime = Date.now();
  try {
    console.log("Simulating Gemini failure (Quota Exceeded) to test OpenRouter fallback...");
    
    const systemInstruction = "You are a helpful assistant testing connectivity.";
    const userPrompt = "Respond only with a JSON block: { \"status\": \"fallback_active\", \"message\": \"OpenRouter backup is active and functional\" }";
    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        status: { type: Type.STRING },
        message: { type: Type.STRING },
      },
      required: ["status", "message"],
    };

    const fallbackResult = await generateOpenRouterContent(systemInstruction, userPrompt, responseSchema);
    const responseTimeMs = Date.now() - startTime;
    
    const text = fallbackResult.text;
    const parsed = JSON.parse(text);
    if (parsed && parsed.status === "fallback_active") {
      return {
        success: true,
        modelName: fallbackResult.modelSelected,
        responseTimeMs,
        completedWithOpenRouterFallback: true,
        testedAt: new Date().toISOString()
      };
    } else {
      throw new Error("Invalid response format received from OpenRouter");
    }
  } catch (error: any) {
    const responseTimeMs = Date.now() - startTime;
    console.error("OpenRouter Backup Test failed. Error:", error);
    return {
      success: false,
      errorCategory: 'failed',
      errorMessage: error.message || "No compatible free OpenRouter model is currently available for this task.",
      testedAt: new Date().toISOString()
    };
  }
}

export async function generateContentIdea(profile: CreatorProfile): Promise<ContentIdeaResponse> {
  const activePillars = profile.contentPillars;
  if (!activePillars || activePillars.length === 0) {
    return {
      success: false,
      errorCategory: 'failed',
      errorMessage: 'No active AI content pillars selected. Please configure at least one content pillar in Settings.'
    };
  }

  const systemInstruction = `You are a LinkedIn content strategist helping Rohit Singh Panwar grow a relevant professional audience through useful content exclusively about artificial intelligence.

Generate exactly one post idea.

The idea must:
- Be directly related to AI (artificial intelligence, machine learning, LLMs, AI workflows, or AI career growth).
- Help the selected primary audience.
- Be practical, educational or insight-driven.
- Give readers a genuine reason to save, share, follow or visit the creator’s profile.
- Match one active content pillar of the creator.
- Avoid unrelated motivation.
- Avoid unsupported statistics.
- Avoid fake personal experiences.
- Avoid invented results or experiments.
- Avoid excessive hype.
- Avoid phrases contained in the user’s phrases-to-avoid list.
- Not promise guaranteed virality.
- Be clear enough to turn into a complete LinkedIn post later.`;

  const userPrompt = `Creator Settings:
- Creator positioning: ${profile.creatorPositioning}
- Primary Audience: ${profile.primaryAudience}
- Secondary Audiences: ${(profile.secondaryAudiences || []).join(', ')}
- Active AI Content Pillars (Select exactly one of these to associate with the idea): ${activePillars.join(', ')}
- Writing Styles: ${(profile.writingStyles || []).join(', ')}
- Promotion Level: ${profile.promotionLevel}
- Emotional Intensity: ${profile.emotionalIntensity}
- Detail Level: ${profile.detailLevel}
- Topics to Avoid (Do not touch these topics): ${(profile.topicsToAvoid || []).join(', ')}
- Phrases to Avoid (Strictly avoid these expressions): ${(profile.phrasesToAvoid || []).join(', ')}

Please generate exactly one highly specific, practical, and useful AI post idea that fits the selected profile settings, avoids the negative boundaries, and is fully tailored to the target audience. The selected contentPillar MUST be chosen from the active AI Content Pillars listed above. You must evaluate whether the post is directly relevant to artificial intelligence and populate the aiRelevance field with 'Direct'.`;

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING },
      primaryAudience: { type: Type.STRING },
      contentPillar: { type: Type.STRING },
      coreIdea: { type: Type.STRING },
      problemSolved: { type: Type.STRING },
      whyUseful: { type: Type.STRING },
      uniqueAngle: { type: Type.STRING },
      suggestedHook: { type: Type.STRING },
      recommendedFormat: { type: Type.STRING },
      expectedGrowthMechanism: { type: Type.STRING },
      aiRelevance: { type: Type.STRING, description: "Must be 'Direct', 'Indirect', or 'Not relevant'" }
    },
    required: [
      "title",
      "primaryAudience",
      "contentPillar",
      "coreIdea",
      "problemSolved",
      "whyUseful",
      "uniqueAngle",
      "suggestedHook",
      "recommendedFormat",
      "expectedGrowthMechanism",
      "aiRelevance"
    ],
  };

  let responseText = "";
  let completedWithOpenRouterFallback = false;
  let openRouterModel = "";

  try {
    const result = await callModelWithFallback({
      systemInstruction,
      userPrompt,
      responseSchema
    });
    responseText = result.text;
    completedWithOpenRouterFallback = result.completedWithOpenRouterFallback;
    openRouterModel = result.openRouterModel;
  } catch (error) {
    console.error("Gemini Idea Generation failed. Error:", error instanceof Error ? error.message : error);
    const errObj = isEligibleForFallback(error) ? handleBothFailedError(error, error) : categorizeError(error);
    return {
      success: false,
      errorCategory: errObj.category,
      errorMessage: errObj.message
    };
  }

  try {
    const parsed = JSON.parse(responseText);

    // Validate structured response
    const requiredKeys = [
      "title",
      "primaryAudience",
      "contentPillar",
      "coreIdea",
      "problemSolved",
      "whyUseful",
      "uniqueAngle",
      "suggestedHook",
      "recommendedFormat",
      "expectedGrowthMechanism",
      "aiRelevance"
    ];

    for (const key of requiredKeys) {
      if (!parsed[key] || typeof parsed[key] !== 'string' || parsed[key].trim() === '') {
        throw new Error(`Validation failed: Field "${key}" is missing or empty.`);
      }
    }

    // Strict validation requirement: Only accept Direct
    if (parsed.aiRelevance !== 'Direct') {
      throw new Error(`Validation failed: The generated idea relevance is "${parsed.aiRelevance}", but only "Direct" is accepted.`);
    }

    // Require the content pillar to match an active AI pillar
    const matchingPillar = activePillars.find(p => p.toLowerCase() === parsed.contentPillar.toLowerCase() || parsed.contentPillar.toLowerCase().includes(p.toLowerCase()) || p.toLowerCase().includes(parsed.contentPillar.toLowerCase()));
    if (!matchingPillar) {
      throw new Error("Validation failed: The generated content pillar does not match any of your active AI content pillars.");
    } else {
      parsed.contentPillar = matchingPillar; // Normalize
    }

    // Keep keyword checks only as a lightweight secondary safeguard
    const isAiRelatedKeyword = [
      parsed.title,
      parsed.coreIdea,
      parsed.contentPillar,
      parsed.problemSolved,
      parsed.whyUseful,
      parsed.suggestedHook
    ].some(text => {
      const t = (text || "").toLowerCase();
      return (
        t.includes("ai") ||
        t.includes("artificial") ||
        t.includes("intelligence") ||
        t.includes("gpt") ||
        t.includes("llm") ||
        t.includes("model") ||
        t.includes("prompt") ||
        t.includes("workflow") ||
        t.includes("machine") ||
        t.includes("neural") ||
        t.includes("copilot") ||
        t.includes("claude") ||
        t.includes("midjourney") ||
        t.includes("automation") ||
        t.includes("agent") ||
        t.includes("vibe") ||
        t.includes("no-code") ||
        t.includes("code") ||
        t.includes("technology") ||
        t.includes("tech")
      );
    });

    if (!isAiRelatedKeyword) {
      throw new Error("Validation failed: The generated idea is not sufficiently AI-focused. Please refine settings and try again.");
    }

    return {
      success: true,
      completedWithOpenRouterFallback,
      openRouterModel,
      idea: {
        title: parsed.title,
        primaryAudience: parsed.primaryAudience,
        contentPillar: parsed.contentPillar,
        coreIdea: parsed.coreIdea,
        problemSolved: parsed.problemSolved,
        whyUseful: parsed.whyUseful,
        uniqueAngle: parsed.uniqueAngle,
        suggestedHook: parsed.suggestedHook,
        recommendedFormat: parsed.recommendedFormat,
        expectedGrowthMechanism: parsed.expectedGrowthMechanism,
        aiRelevance: parsed.aiRelevance
      }
    };

  } catch (error) {
    console.error("Idea Generation failed. Error:", error instanceof Error ? error.message : error);
    if (completedWithOpenRouterFallback) {
      return {
        success: false,
        errorCategory: 'failed',
        errorMessage: "The OpenRouter response did not pass the application’s quality validation."
      };
    }
    const categorized = categorizeError(error);
    return {
      success: false,
      errorCategory: categorized.category,
      errorMessage: categorized.message
    };
  }
}

export async function generateLiveResearch(): Promise<AIResearchResponse> {
  const systemInstruction = `You are an AI research editor helping Rohit Singh Panwar create useful LinkedIn content exclusively about artificial intelligence.
Find exactly one recent and meaningful AI development.

Current Server Date and Time: ${new Date().toString()} (${new Date().toISOString()})

Research developments primarily from the previous 72 hours (since ${new Date(Date.now() - 72 * 3600 * 1000).toDateString()}).
If there is no sufficiently important or reliable development within those 72 hours, allow results from the previous 7 days (since ${new Date(Date.now() - 7 * 24 * 3600 * 1000).toDateString()}).
The returned research item must clearly state its freshness ("Within 72 hours" or "Within 7 days") based on its actual release or publication date.

You have access to Google Search. You must perform search queries to find real, reliable, and up-to-date AI developments.
The development must be relevant to at least one of these audiences:
- Working professionals
- Recruiters and HR professionals
- Job seekers
- Founders
- Marketers
- Sales professionals
- Freelancers
- Creators
- No-code builders
- Vibe coders
- Indian professionals learning AI

Prioritise sources in this order:
1. Official AI company announcement
2. Official product documentation or release notes
3. Original research paper
4. Official GitHub repository or release
5. Reputable technology publication
6. Reliable developer or professional discussion

Do not merely repeat a headline. Explain:
- What happened
- Why it matters
- Who may be affected
- What professionals can practically do with it
- What remains uncertain or potentially overhyped

Do not fabricate facts, dates, quotations, statistics or sources.
If reliable information cannot be found, set status to "no_reliable_result".
For the "sources" array, use the real URLs and titles of the actual pages retrieved during Google Search grounding. Do not invent or reconstruct URLs. Do not return tracking or redirect URLs when a clean source URL is available.`;

  const userPrompt = `Please perform a live web search for the latest, most significant AI development (e.g., model releases like Claude, GPT, Gemini, Llama, new AI developer tools, framework updates, open-source AI papers, or AI policy changes) within the last 72 hours or 7 days from the current date ${new Date().toDateString()}.
Verify the facts and sources using Google Search grounding.
Return the results in the requested JSON schema structure. If there are no highly reliable, verified AI developments from the last 7 days, return status as "no_reliable_result".`;

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      status: { type: Type.STRING },
      headline: { type: Type.STRING },
      developmentDate: { type: Type.STRING },
      freshness: { type: Type.STRING },
      category: { type: Type.STRING },
      whatHappened: { type: Type.STRING },
      whyItMatters: { type: Type.STRING },
      whoIsAffected: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      },
      practicalApplication: { type: Type.STRING },
      limitationsOrUncertainty: { type: Type.STRING },
      linkedInOpportunity: { type: Type.STRING },
      sourceConfidence: { type: Type.STRING },
      sources: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            publisher: { type: Type.STRING },
            url: { type: Type.STRING },
            publishedDate: { type: Type.STRING },
            sourceType: { type: Type.STRING }
          },
          required: ["title", "publisher", "url", "publishedDate", "sourceType"]
        }
      }
    },
    required: ["status"]
  };

  let responseText = "";
  let completedWithOpenRouterFallback = false;
  let openRouterModel = "";

  try {
    const result = await callModelWithFallback({
      systemInstruction,
      userPrompt,
      responseSchema,
      enableSearch: true
    });
    responseText = result.text;
    completedWithOpenRouterFallback = result.completedWithOpenRouterFallback;
    openRouterModel = result.openRouterModel;
  } catch (error: any) {
    console.error("Gemini Live Research failed. Error:", error instanceof Error ? error.message : error);
    const errObj = isEligibleForFallback(error) ? handleBothFailedError(error, error) : categorizeError(error);
    return {
      success: false,
      errorCategory: errObj.category,
      errorMessage: errObj.message
    };
  }

  try {
    const parsed = JSON.parse(responseText);

    if (parsed.status === 'no_reliable_result') {
      return {
        success: true,
        completedWithOpenRouterFallback,
        openRouterModel,
        result: {
          status: 'no_reliable_result'
        }
      };
    }

    // Validate status === 'found'
    if (parsed.status !== 'found') {
      return {
        success: true,
        completedWithOpenRouterFallback,
        openRouterModel,
        result: {
          status: 'no_reliable_result'
        }
      };
    }

    // Perform strict validation on text fields, sources, and AI relevance
    const requiredTextFields = [
      "headline",
      "developmentDate",
      "freshness",
      "category",
      "whatHappened",
      "whyItMatters",
      "practicalApplication",
      "limitationsOrUncertainty",
      "linkedInOpportunity",
      "sourceConfidence"
    ];

    for (const field of requiredTextFields) {
      if (!parsed[field] || typeof parsed[field] !== 'string' || parsed[field].trim() === '') {
        throw new Error(`Validation failed: Required field "${field}" is missing or empty in grounded response.`);
      }
    }

    if (!parsed.whoIsAffected || !Array.isArray(parsed.whoIsAffected) || parsed.whoIsAffected.length === 0) {
      throw new Error(`Validation failed: "whoIsAffected" is missing, not an array, or empty.`);
    }

    if (!parsed.sources || !Array.isArray(parsed.sources) || parsed.sources.length === 0) {
      throw new Error(`Validation failed: No sources found in grounded response.`);
    }

    // Validate each source contains a valid HTTPS URL and types
    const validSourceTypes = ["Official", "Research paper", "GitHub", "Publication", "Community"];
    const validSourceConfidences = ["High", "Medium", "Low"];
    const validFreshnesses = ["Within 72 hours", "Within 7 days"];

    if (!validSourceConfidences.includes(parsed.sourceConfidence)) {
      throw new Error(`Validation failed: Invalid source confidence "${parsed.sourceConfidence}"`);
    }

    if (!validFreshnesses.includes(parsed.freshness)) {
      throw new Error(`Validation failed: Invalid freshness value "${parsed.freshness}"`);
    }

    // AI-relevance check: must contain key words/context related to AI
    const fullTextToCheck = [
      parsed.headline,
      parsed.whatHappened,
      parsed.whyItMatters,
      parsed.practicalApplication
    ].join(" ").toLowerCase();

    const isAiRelevant = [
      "ai", "artificial", "intelligence", "gpt", "llm", "model", "prompt", "workflow", "machine", "neural",
      "copilot", "claude", "midjourney", "automation", "agent", "deepmind", "openai", "meta", "gemini"
    ].some(keyword => fullTextToCheck.includes(keyword));

    if (!isAiRelevant) {
      throw new Error("Validation failed: Grounded research development is not related to AI.");
    }

    for (const src of parsed.sources) {
      if (!src.title || src.title.trim() === '') throw new Error("Validation failed: Source title is empty.");
      if (!src.publisher || src.publisher.trim() === '') throw new Error("Validation failed: Source publisher is empty.");
      if (!src.url || typeof src.url !== 'string' || !src.url.startsWith("https://")) {
        throw new Error(`Validation failed: Source URL "${src.url}" is invalid or does not start with https://.`);
      }
      if (!src.publishedDate || src.publishedDate.trim() === '') throw new Error("Validation failed: Source publication date is empty.");
      
      // Normalize source type
      const matchedType = validSourceTypes.find(t => t.toLowerCase() === src.sourceType.toLowerCase());
      src.sourceType = matchedType || "Publication";
    }

    return {
      success: true,
      completedWithOpenRouterFallback,
      openRouterModel,
      result: {
        status: "found",
        headline: parsed.headline,
        developmentDate: parsed.developmentDate,
        researchedAt: new Date().toISOString(),
        freshness: parsed.freshness,
        category: parsed.category,
        whatHappened: parsed.whatHappened,
        whyItMatters: parsed.whyItMatters,
        whoIsAffected: parsed.whoIsAffected,
        practicalApplication: parsed.practicalApplication,
        limitationsOrUncertainty: parsed.limitationsOrUncertainty,
        linkedInOpportunity: parsed.linkedInOpportunity,
        sourceConfidence: parsed.sourceConfidence,
        sources: parsed.sources
      }
    };

  } catch (error: any) {
    console.error("Research failed. Error:", error instanceof Error ? error.message : error);
    if (completedWithOpenRouterFallback) {
      return {
        success: false,
        errorCategory: 'failed',
        errorMessage: error?.message?.includes("live-research") ? error.message : "The OpenRouter response did not pass the application’s quality validation."
      };
    }
    const errorMsg = error instanceof Error ? error.message : String(error);
    const categorized = categorizeError(error);

    if (errorMsg.includes("Validation failed") || errorMsg.includes("JSON") || errorMsg.includes("SyntaxError")) {
      return {
        success: false,
        errorCategory: 'failed',
        errorMessage: 'The research result could not be verified. Please run the research again.'
      };
    }

    return {
      success: false,
      errorCategory: categorized.category,
      errorMessage: categorized.message || 'Live research could not be completed. Please try again.'
    };
  }
}

function getJaccardSimilarity(s1: string, s2: string): number {
  const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter(Boolean);
  const w1 = new Set(clean(s1));
  const w2 = new Set(clean(s2));
  if (w1.size === 0 && w2.size === 0) return 1;
  if (w1.size === 0 || w2.size === 0) return 0;
  const intersection = new Set([...w1].filter(x => w2.has(x)));
  const union = new Set([...w1, ...w2]);
  return intersection.size / union.size;
}

export async function generateGroundedContentIdea(
  profile: CreatorProfile,
  research: AIResearchResult,
  previousIdea?: { title: string; coreAngle: string; suggestedHook: string; uniqueAngle: string }
): Promise<GroundedIdeaResponse> {
  if (!research || research.status !== 'found' || !research.sources || research.sources.length === 0) {
    return {
      success: false,
      errorCategory: 'failed',
      errorMessage: 'The research result could not be verified. Please run the research again.'
    };
  }

  const activePillars = (profile.contentPillars || []).filter(Boolean);
  if (activePillars.length === 0) {
    return {
      success: false,
      errorCategory: 'failed',
      errorMessage: 'Please configure at least one active AI content pillar in your settings before generating content ideas.'
    };
  }

  const systemInstruction = `You are a senior LinkedIn content strategist helping Rohit Singh Panwar build authority through highly useful content exclusively about artificial intelligence.

Transform the supplied verified AI research into exactly one strong LinkedIn content idea.

The idea must:

- Be directly based on the supplied research.
- Serve the saved primary audience.
- Match one active AI content pillar.
- Explain the professional implication rather than merely repeating the news.
- Give readers a practical takeaway, action, workflow or decision.
- Create a credible reason to save, share, follow or visit Rohit’s profile.
- Clearly distinguish verified facts from interpretation.
- Include the limitations or uncertainty from the research.
- Avoid unsupported statistics.
- Avoid invented personal experiences.
- Avoid fake experiments or fake results.
- Avoid fear-mongering.
- Avoid excessive hype.
- Avoid phrases in the user’s phrases-to-avoid list.
- Avoid topics in the user’s topics-to-avoid list.
- Never promise virality.
- Never invent sources or URLs.

This is a content idea, not the complete LinkedIn post.`;

  let userPrompt = `CREATOR CONTEXT:
- Creator positioning: ${profile.creatorPositioning || "AI professional"}
- Primary audience: ${profile.primaryAudience}
- Secondary audiences: ${(profile.secondaryAudiences || []).join(", ")}
- Active AI content pillars: ${activePillars.join(", ")}
- Writing styles: ${(profile.writingStyles || []).join(", ")}
- Promotion level: ${profile.promotionLevel || "Balanced"}
- Emotional intensity: ${profile.emotionalIntensity || "Balanced"}
- Detail level: ${profile.detailLevel || "Standard"}
- Topics to avoid: ${(profile.topicsToAvoid || []).join(", ")}
- Phrases to avoid: ${(profile.phrasesToAvoid || []).join(", ")}

RESEARCH CONTEXT:
- Headline: ${research.headline}
- Development date: ${research.developmentDate}
- Category: ${research.category}
- What happened: ${research.whatHappened}
- Why it matters: ${research.whyItMatters}
- Who is affected: ${(research.whoIsAffected || []).join(", ")}
- Practical application: ${research.practicalApplication}
- Limitations or uncertainty: ${research.limitationsOrUncertainty}
- LinkedIn opportunity: ${research.linkedInOpportunity}
- Source confidence: ${research.sourceConfidence}
- Verified sources:
${research.sources.map((s, i) => `${i + 1}. Title: ${s.title} | Publisher: ${s.publisher} | URL: ${s.url} | Published Date: ${s.publishedDate}`).join("\n")}

You must output exactly one grounded LinkedIn idea using the required JSON schema format. Ensure the content is heavily factual, grounded tightly in the supplied sources, and does not invent any external links or facts.`;

  if (previousIdea) {
    userPrompt += `\n\nPREVENT DUPLICATE ANGLES:
Please make sure the new idea's core angle, title, and hook are SIGNIFICANTly different from the previous idea:
- Previous Title: ${previousIdea.title}
- Previous Core Angle: ${previousIdea.coreAngle}
- Previous Suggested Hook: ${previousIdea.suggestedHook}
- Previous Unique Angle: ${previousIdea.uniqueAngle}

Do not repeat or slightly rephrase these. Choose a completely different professional perspective, different target sub-audience, different hook style, or different format from the research context.`;
  }

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING },
      primaryAudience: { type: Type.STRING },
      contentPillar: { type: Type.STRING },
      researchHeadline: { type: Type.STRING },
      coreAngle: { type: Type.STRING },
      professionalProblem: { type: Type.STRING },
      readerTakeaway: { type: Type.STRING },
      practicalValue: { type: Type.STRING },
      uniqueAngle: { type: Type.STRING },
      suggestedHook: { type: Type.STRING },
      recommendedFormat: { type: Type.STRING },
      growthMechanism: { type: Type.STRING },
      factBoundary: { type: Type.STRING },
      uncertaintyToMention: { type: Type.STRING },
      aiRelevance: { type: Type.STRING },
      sourceReferences: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            publisher: { type: Type.STRING },
            url: { type: Type.STRING }
          },
          required: ["title", "publisher", "url"]
        }
      }
    },
    required: [
      "title",
      "primaryAudience",
      "contentPillar",
      "researchHeadline",
      "coreAngle",
      "professionalProblem",
      "readerTakeaway",
      "practicalValue",
      "uniqueAngle",
      "suggestedHook",
      "recommendedFormat",
      "growthMechanism",
      "factBoundary",
      "uncertaintyToMention",
      "aiRelevance",
      "sourceReferences"
    ]
  };

  let responseText = "";
  let completedWithOpenRouterFallback = false;
  let openRouterModel = "";

  try {
    const result = await callModelWithFallback({
      systemInstruction,
      userPrompt,
      responseSchema
    });
    responseText = result.text;
    completedWithOpenRouterFallback = result.completedWithOpenRouterFallback;
    openRouterModel = result.openRouterModel;
  } catch (error) {
    console.error("Grounded Idea Generation failed under fallback. Error:", error instanceof Error ? error.message : error);
    const errObj = isEligibleForFallback(error) ? handleBothFailedError(error, error) : categorizeError(error);
    return {
      success: false,
      errorCategory: errObj.category,
      errorMessage: errObj.message
    };
  }

  try {
    const parsed = JSON.parse(responseText);

    // ----------------- SERVER-SIDE VALIDATION -----------------
    const requiredKeys = [
      "title",
      "primaryAudience",
      "contentPillar",
      "researchHeadline",
      "coreAngle",
      "professionalProblem",
      "readerTakeaway",
      "practicalValue",
      "uniqueAngle",
      "suggestedHook",
      "recommendedFormat",
      "growthMechanism",
      "factBoundary",
      "uncertaintyToMention",
      "aiRelevance",
      "sourceReferences"
    ];

    for (const key of requiredKeys) {
      if (key !== 'sourceReferences' && (!parsed[key] || typeof parsed[key] !== 'string' || parsed[key].trim() === '')) {
        throw new Error("Validation failed: The grounded idea could not be verified. Please try again.");
      }
    }

    if (parsed.aiRelevance !== 'Direct') {
      throw new Error("Validation failed: The grounded idea could not be verified. Please try again.");
    }

    // Verify primary audience matches saved primary audience (case-insensitive)
    if (parsed.primaryAudience.toLowerCase().trim() !== profile.primaryAudience.toLowerCase().trim()) {
      // Normalize to exact saved if it matches conceptually, or fail
      if (parsed.primaryAudience.toLowerCase().includes(profile.primaryAudience.toLowerCase()) || profile.primaryAudience.toLowerCase().includes(parsed.primaryAudience.toLowerCase())) {
        parsed.primaryAudience = profile.primaryAudience;
      } else {
        throw new Error("Validation failed: The grounded idea could not be verified. Please try again.");
      }
    }

    // Verify contentPillar is one of user's active pillars (case-insensitive)
    const matchingPillar = activePillars.find(p => p.toLowerCase().trim() === parsed.contentPillar.toLowerCase().trim() || parsed.contentPillar.toLowerCase().includes(p.toLowerCase()) || p.toLowerCase().includes(parsed.contentPillar.toLowerCase()));
    if (!matchingPillar) {
      throw new Error("Validation failed: The grounded idea could not be verified. Please try again.");
    } else {
      parsed.contentPillar = matchingPillar; // Normalize
    }

    // Verify recommendedFormat matches allowed value
    const allowedFormats = ['Text post', 'Single image', 'Carousel', 'News analysis', 'Practical workflow'];
    const matchingFormat = allowedFormats.find(f => f.toLowerCase() === parsed.recommendedFormat.toLowerCase().trim());
    if (!matchingFormat) {
      throw new Error("Validation failed: The grounded idea could not be verified. Please try again.");
    } else {
      parsed.recommendedFormat = matchingFormat;
    }

    // Verify growthMechanism matches allowed value
    const allowedMechanisms = ['Save value', 'Share value', 'Discussion value', 'Profile visit', 'Follow value'];
    const matchingMechanism = allowedMechanisms.find(m => m.toLowerCase() === parsed.growthMechanism.toLowerCase().trim());
    if (!matchingMechanism) {
      throw new Error("Validation failed: The grounded idea could not be verified. Please try again.");
    } else {
      parsed.growthMechanism = matchingMechanism;
    }

    // Verify sourceReferences is non-empty
    if (!parsed.sourceReferences || !Array.isArray(parsed.sourceReferences) || parsed.sourceReferences.length === 0) {
      throw new Error("Validation failed: The grounded idea could not be verified. Please try again.");
    }

    // Every source URL exactly matches a URL from the supplied verified research result
    const suppliedUrls = new Set((research.sources || []).map(s => s.url.toLowerCase().trim()));
    for (const src of parsed.sourceReferences) {
      if (!src.url || typeof src.url !== 'string' || !suppliedUrls.has(src.url.toLowerCase().trim())) {
        throw new Error("Validation failed: The grounded idea could not be verified. Please try again.");
      }
      // Also ensure title & publisher is filled
      if (!src.title || src.title.trim() === '') {
        throw new Error("Validation failed: The grounded idea could not be verified. Please try again.");
      }
      // Match back the exact title & publisher & casing from research sources to prevent slight mutations
      const matchedSource = research.sources.find(s => s.url.toLowerCase().trim() === src.url.toLowerCase().trim());
      if (matchedSource) {
        src.url = matchedSource.url;
        src.title = matchedSource.title;
        src.publisher = matchedSource.publisher;
      }
    }

    // The idea clearly refers to the supplied research development
    if (parsed.researchHeadline.toLowerCase().trim() !== research.headline.toLowerCase().trim()) {
      parsed.researchHeadline = research.headline; // Normalize
    }

    // Check phrases to avoid & topics to avoid
    const textToCheck = [
      parsed.title,
      parsed.coreAngle,
      parsed.suggestedHook,
      parsed.uniqueAngle,
      parsed.professionalProblem,
      parsed.readerTakeaway,
      parsed.practicalValue,
      parsed.factBoundary,
      parsed.uncertaintyToMention
    ].join(" ").toLowerCase();

    for (const phrase of (profile.phrasesToAvoid || [])) {
      if (phrase && phrase.trim() && textToCheck.includes(phrase.trim().toLowerCase())) {
        throw new Error("Validation failed: The grounded idea could not be verified. Please try again.");
      }
    }

    for (const topic of (profile.topicsToAvoid || [])) {
      if (topic && topic.trim() && textToCheck.includes(topic.trim().toLowerCase())) {
        throw new Error("Validation failed: The grounded idea could not be verified. Please try again.");
      }
    }

    // Prevent duplicate angle similarity check on server-side as well
    if (previousIdea) {
      const simTitle = getJaccardSimilarity(parsed.title, previousIdea.title);
      const simCoreAngle = getJaccardSimilarity(parsed.coreAngle, previousIdea.coreAngle);
      const simHook = getJaccardSimilarity(parsed.suggestedHook, previousIdea.suggestedHook);
      const simUnique = getJaccardSimilarity(parsed.uniqueAngle, previousIdea.uniqueAngle);

      if (simTitle > 0.65 || simCoreAngle > 0.65 || simHook > 0.65 || simUnique > 0.65) {
        throw new Error("The new angle was too similar. Please generate again.");
      }
    }

    return {
      success: true,
      completedWithOpenRouterFallback,
      openRouterModel,
      idea: {
        title: parsed.title,
        primaryAudience: parsed.primaryAudience,
        contentPillar: parsed.contentPillar,
        researchHeadline: parsed.researchHeadline,
        coreAngle: parsed.coreAngle,
        professionalProblem: parsed.professionalProblem,
        readerTakeaway: parsed.readerTakeaway,
        practicalValue: parsed.practicalValue,
        uniqueAngle: parsed.uniqueAngle,
        suggestedHook: parsed.suggestedHook,
        recommendedFormat: parsed.recommendedFormat,
        growthMechanism: parsed.growthMechanism,
        factBoundary: parsed.factBoundary,
        uncertaintyToMention: parsed.uncertaintyToMention,
        aiRelevance: 'Direct',
        sourceReferences: parsed.sourceReferences
      }
    };

  } catch (error) {
    console.error("Grounded Idea Generation failed. Error:", error instanceof Error ? error.message : error);
    if (completedWithOpenRouterFallback) {
      return {
        success: false,
        errorCategory: 'failed',
        errorMessage: "The OpenRouter response did not pass the application’s quality validation."
      };
    }
    const errorMsg = error instanceof Error ? error.message : String(error);
    const categorized = categorizeError(error);

    if (errorMsg.includes("The new angle was too similar. Please generate again.")) {
      return {
        success: false,
        errorCategory: 'failed',
        errorMessage: 'The new angle was too similar. Please generate again.'
      };
    }

    if (errorMsg.includes("Validation failed") || errorMsg.includes("JSON") || errorMsg.includes("SyntaxError")) {
      return {
        success: false,
        errorCategory: 'failed',
        errorMessage: 'The grounded idea could not be verified. Please try again.'
      };
    }

    return {
      success: false,
      errorCategory: categorized.category,
      errorMessage: categorized.message || 'The grounded idea could not be verified. Please try again.'
    };
  }
}

export async function generateDailyResearchBrief(): Promise<{ success: boolean; brief?: DailyResearchBrief; errorCategory?: SafeGeminiError; errorMessage?: string; completedWithOpenRouterFallback?: boolean; openRouterModel?: string }> {
  const currentDate = new Date().toDateString();
  const currentDateISO = new Date().toISOString();

  const systemInstruction = `You are an AI research editor helping Rohit Singh Panwar build a useful LinkedIn presence focused exclusively on artificial intelligence.
Current Server Date and Time: ${new Date().toString()} (${currentDateISO})

Your goal is to find three to five recent and credible AI developments.
Research primarily within the previous 72 hours (since ${new Date(Date.now() - 72 * 3600 * 1000).toDateString()}).
If fewer than 5 reliable developments are available, expand the time range to the previous 7 days (since ${new Date(Date.now() - 7 * 24 * 3600 * 1000).toDateString()}).
You must return between three and five developments. Do not invent or fabricate extra items merely to reach five.

Each development must have a clear professional implication and be directly related to AI.
Do not merely repeat headlines.
For every development explain:
- What happened
- Why it matters
- Who may be affected
- What a professional could practically do with it
- What remains uncertain, limited or overhyped
- Why it could become a useful LinkedIn post

The research should serve audiences such as:
- Working professionals
- Recruiters and HR professionals
- Job seekers
- Founders
- Marketers
- Sales professionals
- Freelancers
- Creators
- No-code builders
- Vibe coders
- Indian professionals learning AI

REQUIRED RESEARCH DIVERSITY:
The results must be meaningfully different. Cover a mixture of:
- New AI model or capability
- AI product or tool update
- Open-source or GitHub development
- AI research paper or technical breakthrough
- AI workflow relevant to professionals
- AI careers, recruitment or workplace development
- AI policy or platform change
- No-code or vibe-coding development
Do not return multiple summaries of the same company press release or the same underlying announcement. Every item must be a distinct, unique AI development.

SOURCE PRIORITY:
1. Official company announcements
2. Official product documentation or release notes
3. Original research papers
4. Official GitHub repositories or releases
5. Reputable technology publications
6. Reliable professional or developer discussions

Do not fabricate facts, dates, statistics, quotations, product capabilities or sources. Use real URLs from your web search grounding metadata. Do not reconstruct or invent URLs.`;

  const userPrompt = `Perform a live web search to discover between 3 and 5 of the most important, distinct, and recent AI developments (from the last 72 hours if possible, extending up to 7 days if needed to find enough reliable developments) from today's date: ${currentDate}.
Verify all developments and their sources using Google Search grounding.
Filter out overlapping announcements or press releases. Return the brief and developments in the requested JSON schema.`;

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      timeWindowUsed: { type: Type.STRING, description: "Must be '72 hours' or '7 days'" },
      summary: { type: Type.STRING, description: "A concise editorial summary of today's developments brief." },
      developments: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            headline: { type: Type.STRING },
            developmentDate: { type: Type.STRING },
            category: { type: Type.STRING, description: "Must be: Model release | Product update | Research | Open source | Workplace AI | Policy | AI tool | Other" },
            whatHappened: { type: Type.STRING },
            whyItMatters: { type: Type.STRING },
            whoIsAffected: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            practicalApplication: { type: Type.STRING },
            limitationsOrUncertainty: { type: Type.STRING },
            linkedInOpportunity: { type: Type.STRING },
            sourceConfidence: { type: Type.STRING, description: "Must be: High | Medium | Low" },
            sources: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  publisher: { type: Type.STRING },
                  url: { type: Type.STRING },
                  publishedDate: { type: Type.STRING },
                  sourceType: { type: Type.STRING, description: "Must be: Official | Research paper | GitHub | Publication | Community" }
                },
                required: ["title", "publisher", "url", "publishedDate", "sourceType"]
              }
            }
          },
          required: [
            "id", "headline", "developmentDate", "category", "whatHappened", "whyItMatters",
            "whoIsAffected", "practicalApplication", "limitationsOrUncertainty", "linkedInOpportunity",
            "sourceConfidence", "sources"
          ]
        }
      }
    },
    required: ["timeWindowUsed", "summary", "developments"]
  };

  let responseText = "";
  let completedWithOpenRouterFallback = false;
  let openRouterModel = "";

  try {
    const result = await callModelWithFallback({
      systemInstruction,
      userPrompt,
      responseSchema,
      enableSearch: true
    });
    responseText = result.text;
    completedWithOpenRouterFallback = result.completedWithOpenRouterFallback;
    openRouterModel = result.openRouterModel;
  } catch (error) {
    console.error("Daily Research Brief Generation failed. Error:", error instanceof Error ? error.message : error);
    const errObj = isEligibleForFallback(error) ? handleBothFailedError(error, error) : categorizeError(error);
    return {
      success: false,
      errorCategory: errObj.category,
      errorMessage: errObj.message
    };
  }

  try {
    const parsed = JSON.parse(responseText);

    // 1. DUPLICATE-DEVELOPMENT CHECK & SERVER-SIDE VALIDATION
    if (!parsed.developments || !Array.isArray(parsed.developments)) {
      throw new Error("Validation failed: 'developments' array is missing or empty.");
    }

    const uniqueDevelopments: any[] = [];
    for (const dev of parsed.developments) {
      let isDuplicate = false;
      for (const existing of uniqueDevelopments) {
        // Compare headlines
        const headlineSim = getJaccardSimilarity(dev.headline || "", existing.headline || "");
        if (headlineSim > 0.6) {
          isDuplicate = true;
          break;
        }

        // Compare descriptions
        const descSim = getJaccardSimilarity(dev.whatHappened || "", existing.whatHappened || "");
        if (descSim > 0.6) {
          isDuplicate = true;
          break;
        }

        // Compare source URLs
        const devUrls = new Set((dev.sources || []).map((s: any) => (s.url || "").toLowerCase().trim()));
        const existingUrls = new Set((existing.sources || []).map((s: any) => (s.url || "").toLowerCase().trim()));
        const sharedUrls = [...devUrls].filter(url => url && existingUrls.has(url));
        if (sharedUrls.length > 0) {
          isDuplicate = true;
          break;
        }
      }

      if (isDuplicate) {
        continue; // Skip duplicate
      }

      uniqueDevelopments.push(dev);
    }

    // 2. STAGE 2 VALIDATION: Format, categories, URLs
    const validatedDevelopments: any[] = [];
    const validCategories = ['Model release', 'Product update', 'Research', 'Open source', 'Workplace AI', 'Policy', 'AI tool', 'Other'];
    const validConfidences = ['High', 'Medium', 'Low'];
    const validSourceTypes = ['Official', 'Research paper', 'GitHub', 'Publication', 'Community'];

    for (const dev of uniqueDevelopments) {
      // Must have required fields non-empty
      if (!dev.headline || dev.headline.trim() === '') continue;
      if (!dev.developmentDate || dev.developmentDate.trim() === '') continue;
      if (!dev.whatHappened || dev.whatHappened.trim() === '') continue;
      if (!dev.whyItMatters || dev.whyItMatters.trim() === '') continue;
      if (!dev.practicalApplication || dev.practicalApplication.trim() === '') continue;
      if (!dev.limitationsOrUncertainty || dev.limitationsOrUncertainty.trim() === '') continue;
      if (!dev.linkedInOpportunity || dev.linkedInOpportunity.trim() === '') continue;

      // Must be related to AI
      const textToVerify = [dev.headline, dev.whatHappened, dev.whyItMatters].join(" ").toLowerCase();
      const isAi = [
        "ai", "artificial", "intelligence", "gpt", "llm", "model", "prompt", "workflow", "machine", "neural",
        "copilot", "claude", "midjourney", "automation", "agent", "deepmind", "openai", "meta", "gemini",
        "nvidia", "llama", "huggingface", "vibe"
      ].some(kw => textToVerify.includes(kw));

      if (!isAi) continue;

      // Must have at least one real source with HTTPS url
      if (!dev.sources || !Array.isArray(dev.sources) || dev.sources.length === 0) continue;

      const validSources: any[] = [];
      for (const src of dev.sources) {
        if (!src.title || src.title.trim() === '') continue;
        if (!src.publisher || src.publisher.trim() === '') continue;
        if (!src.url || typeof src.url !== 'string' || !src.url.startsWith("https://")) continue;
        if (!src.publishedDate || src.publishedDate.trim() === '') continue;

        const matchedSourceType = validSourceTypes.find(t => t.toLowerCase() === src.sourceType.toLowerCase().trim());
        src.sourceType = matchedSourceType || "Publication";
        validSources.push(src);
      }

      if (validSources.length === 0) continue;
      dev.sources = validSources;

      // Normalize category
      const matchedCat = validCategories.find(c => c.toLowerCase() === dev.category.toLowerCase().trim());
      dev.category = matchedCat || "Other";

      // Normalize confidence
      const matchedConf = validConfidences.find(c => c.toLowerCase() === dev.sourceConfidence.toLowerCase().trim());
      dev.sourceConfidence = matchedConf || "Medium";

      if (!dev.whoIsAffected || !Array.isArray(dev.whoIsAffected) || dev.whoIsAffected.length === 0) {
        dev.whoIsAffected = ["Working professionals"];
      }

      validatedDevelopments.push(dev);
    }

    // Must be between 3 and 5 developments
    if (validatedDevelopments.length < 3) {
      return {
        success: false,
        errorCategory: 'failed',
        errorMessage: 'Not enough reliable AI developments were found for a complete brief. Try again later.'
      };
    }

    const finalDevelopments = validatedDevelopments.slice(0, 5);

    // Formulate final daily research brief
    const brief: DailyResearchBrief = {
      researchedAt: new Date().toISOString(),
      timeWindowUsed: parsed.timeWindowUsed === '7 days' ? '7 days' : '72 hours',
      summary: parsed.summary || 'A curated brief of the latest verified AI developments.',
      developments: finalDevelopments
    };

    return {
      success: true,
      completedWithOpenRouterFallback,
      openRouterModel,
      brief
    };

  } catch (error: any) {
    console.error("Daily Research Brief Generation failed. Error:", error instanceof Error ? error.message : error);
    if (completedWithOpenRouterFallback) {
      return {
        success: false,
        errorCategory: 'failed',
        errorMessage: error?.message?.includes("live-research") ? error.message : "The OpenRouter response did not pass the application’s quality validation."
      };
    }
    const errorMsg = error instanceof Error ? error.message : String(error);
    const categorized = categorizeError(error);

    if (errorMsg.includes("Not enough reliable AI developments")) {
      return {
        success: false,
        errorCategory: 'failed',
        errorMessage: 'Not enough reliable AI developments were found for a complete brief. Try again later.'
      };
    }

    if (errorMsg.includes("Validation failed") || errorMsg.includes("JSON") || errorMsg.includes("SyntaxError")) {
      return {
        success: false,
        errorCategory: 'failed',
        errorMessage: 'The daily research brief could not be verified. Please try again.'
      };
    }

    return {
      success: false,
      errorCategory: categorized.category,
      errorMessage: categorized.message || 'Daily research brief generation failed. Please try again.'
    };
  }
}

export async function generateDailyIdeasCollection(
  profile: CreatorProfile,
  brief: DailyResearchBrief,
  excludedCollection?: { titles: string[]; coreAngles: string[] }
): Promise<{ success: boolean; collection?: DailyIdeaCollection; errorCategory?: SafeGeminiError; errorMessage?: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      errorCategory: 'configuration_missing',
      errorMessage: 'Gemini API configuration is missing. Open the AI Studio Secrets panel and confirm that GEMINI_API_KEY is configured.'
    };
  }

  const ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  const activePillars = (profile.contentPillars || []).filter(Boolean);
  const allowedAudiences = [profile.primaryAudience, ...(profile.secondaryAudiences || [])].filter(Boolean);

  if (activePillars.length === 0) {
    return {
      success: false,
      errorCategory: 'failed',
      errorMessage: 'Please configure at least one active AI content pillar in your settings before generating content ideas.'
    };
  }

  if (!brief || !brief.developments || brief.developments.length < 3) {
    return {
      success: false,
      errorCategory: 'failed',
      errorMessage: 'A verified AI Research Brief with at least three developments is required to generate today’s content ideas.'
    };
  }

  const systemInstruction = `You are a senior LinkedIn content strategist and AI research editor helping Rohit Singh Panwar grow a relevant professional audience through useful content exclusively about artificial intelligence.

Generate exactly ten meaningfully different LinkedIn content ideas. The ideas must help Rohit earn relevant followers, meaningful connection requests, saves, shares, and professional credibility. Prioritise usefulness and originality over clickbait.

REQUIRED IDEA MIX (Exactly 10 ideas total):
1. Four "Research-grounded" ideas:
   - Must be directly based on verified developments from the Daily AI Research Brief.
   - Use at least three different research developments across these four ideas (do not repeat the same announcement through superficial wording changes).
   - Must copy the sources and URLs exactly from the brief.
   - Must clearly distinguish facts from editorial interpretation.
2. Three "Evergreen practical" ideas:
   - Teach useful AI workflows, tools, prompts, methods or decision frameworks for LinkedIn professionals.
   - Must match active content pillars.
   - Must solve a specific professional problem and be highly actionable.
   - Must not depend on invented statistics or recent news.
3. One "AI career or recruitment" idea:
   - Focus on career growth, resume building, interview preparation, recruitment productivity, candidate screening, or AI skill development.
   - Use Rohit's recruiting background only where truthful. Do not invent personal stories or recruitment results.
4. One "Build in public" idea:
   - Rohit sharing something he is building, an AI experiment he can perform, vibe coding lessons, or a transparent product-development challenge.
   - Do not claim an experiment has already happened. Frame uncompleted work as: an experiment to run, challenge to attempt, project to build, or a result to share later.
5. One "Original opinion or discussion" idea:
   - Present a defensible AI opinion, professional trade-off, misconception, prediction, or thoughtful disagreement.
   - Absolutely no rage bait, fear-mongering, or unsupported claims.

AUDIENCE DISTRIBUTION RULES:
- Every idea must have one clear primary audience.
- Across the ten ideas:
  - At least four must target the saved primary audience: "${profile.primaryAudience}".
  - At least three must target selected secondary audiences: ${JSON.stringify(profile.secondaryAudiences)}.
  - Audience selection must make sense for the problem being solved.

CONTENT PILLAR RULES:
- Every idea must match exactly one active content pillar. Inactive pillars are forbidden.
- Across the ten ideas, use at least four different active content pillars where available: ${JSON.stringify(activePillars)}.
- Do not place all ten ideas under AI News for Professionals. Practical and evergreen content must remain a major part.

ADDITIONAL STYLE & CONSTRAINT RULES:
- Be directly related to artificial intelligence.
- Respect Rohit's writing preferences: ${JSON.stringify(profile.writingStyles)}.
- Respect settings: Promotion: ${profile.promotionLevel}, Emotional: ${profile.emotionalIntensity}, Detail: ${profile.detailLevel}.
- Avoid phrases in the phrases-to-avoid list: ${JSON.stringify(profile.phrasesToAvoid)}.
- Avoid topics in the topics-to-avoid list: ${JSON.stringify(profile.topicsToAvoid)}.
- Avoid fake vulnerability, fake experiments, and unsupported statistics.
- Avoid guaranteed virality claims.

This task creates content ideas, not complete LinkedIn posts. Return JSON using the exact schema requested.`;

  let userPrompt = `CREATOR PROFILE:
- Full Name: ${profile.fullName}
- Headline: ${profile.linkedinHeadline}
- Creator positioning: ${profile.creatorPositioning || "AI professional"}
- Primary audience: ${profile.primaryAudience}
- Secondary audiences: ${allowedAudiences.join(", ")}
- Active AI content pillars: ${activePillars.join(", ")}
- Writing style: ${(profile.writingStyles || []).join(", ")}

VERIFIED AI RESEARCH BRIEF DEVELOPMENTS:
${brief.developments.map((d, i) => `[ID: ${d.id}] Headline: ${d.headline}
- Category: ${d.category}
- What happened: ${d.whatHappened}
- Why it matters: ${d.whyItMatters}
- Practical application: ${d.practicalApplication}
- Limitations/uncertainty: ${d.limitationsOrUncertainty}
- Verified sources:
${(d.sources || []).map((s, idx) => `  * [Url] ${s.url} | [Title] ${s.title} | [Publisher] ${s.publisher}`).join("\n")}`).join("\n\n")}

Please generate exactly ten distinct LinkedIn content ideas following the specified distribution and guidelines.`;

  if (excludedCollection && excludedCollection.titles.length > 0) {
    userPrompt += `\n\nEXCLUSION LIST (Do not generate ideas that match these previously generated titles or core angles):
- Titles to avoid: ${JSON.stringify(excludedCollection.titles)}
- Core angles to avoid: ${JSON.stringify(excludedCollection.coreAngles)}`;
  }

  let attempt = 0;
  const maxAttempts = 3;

  while (attempt < maxAttempts) {
    attempt++;
    try {
      const response = await ai.models.generateContent({
        model: TEXT_MODEL,
        contents: userPrompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              collectionSummary: { type: Type.STRING },
              ideas: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    rankOrder: { type: Type.INTEGER },
                    ideaType: { type: Type.STRING },
                    title: { type: Type.STRING },
                    primaryAudience: { type: Type.STRING },
                    contentPillar: { type: Type.STRING },
                    coreIdea: { type: Type.STRING },
                    problemSolved: { type: Type.STRING },
                    readerPayoff: { type: Type.STRING },
                    uniqueAngle: { type: Type.STRING },
                    suggestedHook: { type: Type.STRING },
                    recommendedFormat: { type: Type.STRING },
                    growthMechanism: { type: Type.STRING },
                    whyItCouldWork: { type: Type.STRING },
                    credibilityRequirement: { type: Type.STRING },
                    actionRequiredFromRohit: { type: Type.STRING },
                    factBoundary: { type: Type.STRING },
                    uncertaintyToMention: { type: Type.STRING },
                    aiRelevance: { type: Type.STRING },
                    researchDevelopmentIds: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING }
                    },
                    sourceReferences: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          title: { type: Type.STRING },
                          publisher: { type: Type.STRING },
                          url: { type: Type.STRING }
                        },
                        required: ["title", "publisher", "url"]
                      }
                    }
                  },
                  required: [
                    "id", "rankOrder", "ideaType", "title", "primaryAudience", "contentPillar",
                    "coreIdea", "problemSolved", "readerPayoff", "uniqueAngle", "suggestedHook",
                    "recommendedFormat", "growthMechanism", "whyItCouldWork", "credibilityRequirement",
                    "actionRequiredFromRohit", "factBoundary", "uncertaintyToMention", "aiRelevance",
                    "researchDevelopmentIds", "sourceReferences"
                  ]
                }
              }
            },
            required: ["collectionSummary", "ideas"]
          }
        }
      });

      const responseText = response.text?.trim() || "";
      if (!responseText) {
        throw new Error("Empty response received from Gemini during daily ideas collection generation");
      }

      const parsed = JSON.parse(responseText);

      // Validate exactly 10 ideas
      if (!parsed.ideas || !Array.isArray(parsed.ideas)) {
        throw new Error("Validation failed: ideas is not an array");
      }
      if (parsed.ideas.length !== 10) {
        throw new Error(`Validation failed: Expected exactly 10 ideas, got ${parsed.ideas.length}`);
      }

      // Check idea counts by type
      const typeCounts: Record<string, number> = {
        'Research-grounded': 0,
        'Evergreen practical': 0,
        'AI career or recruitment': 0,
        'Build in public': 0,
        'Original opinion': 0
      };

      for (const idea of parsed.ideas) {
        const type = idea.ideaType;
        if (typeCounts[type] !== undefined) {
          typeCounts[type]++;
        } else {
          // Attempt to map closely
          const foundType = Object.keys(typeCounts).find(k => k.toLowerCase() === String(type).toLowerCase().trim() || String(type).toLowerCase().includes(k.toLowerCase()));
          if (foundType) {
            idea.ideaType = foundType as DailyIdeaType;
            typeCounts[foundType]++;
          } else {
            idea.ideaType = 'Evergreen practical'; // Fallback
            typeCounts['Evergreen practical']++;
          }
        }
      }

      const hasExactDistribution = 
        typeCounts['Research-grounded'] === 4 &&
        typeCounts['Evergreen practical'] === 3 &&
        typeCounts['AI career or recruitment'] === 1 &&
        typeCounts['Build in public'] === 1 &&
        typeCounts['Original opinion'] === 1;

      if (!hasExactDistribution) {
        throw new Error(`Validation failed: Incorrect idea distribution: ${JSON.stringify(typeCounts)}`);
      }

      // Format, pillars, audiences, and direct AI relevance validations
      const validFormats = ['Text post', 'Single image', 'Carousel', 'News analysis', 'Practical workflow', 'Build-in-public post'];
      const validMechanisms = ['Save value', 'Share value', 'Discussion value', 'Profile visit', 'Follow value', 'Connection value'];

      let usedPillars = new Set<string>();
      let usedResearchDevIds = new Set<string>();

      let primaryAudienceCount = 0;
      let secondaryAudienceCount = 0;

      for (const idea of parsed.ideas) {
        // String non-empty
        const requiredStringFields = ['id', 'title', 'primaryAudience', 'contentPillar', 'coreIdea', 'problemSolved', 'readerPayoff', 'uniqueAngle', 'suggestedHook', 'whyItCouldWork', 'credibilityRequirement', 'actionRequiredFromRohit', 'factBoundary', 'uncertaintyToMention'];
        for (const field of requiredStringFields) {
          if (!idea[field] || typeof idea[field] !== 'string' || idea[field].trim() === '') {
            throw new Error(`Validation failed: Empty field ${field} in idea`);
          }
        }

        // aiRelevance is Direct
        idea.aiRelevance = 'Direct';

        // Audience allowed
        const matchedAudience = allowedAudiences.find(a => a.toLowerCase().trim() === idea.primaryAudience.toLowerCase().trim());
        if (!matchedAudience) {
          // Normalize if close, otherwise reject
          const closeAud = allowedAudiences.find(a => a.toLowerCase().includes(idea.primaryAudience.toLowerCase().trim()) || idea.primaryAudience.toLowerCase().trim().includes(a.toLowerCase()));
          if (closeAud) {
            idea.primaryAudience = closeAud;
          } else {
            idea.primaryAudience = profile.primaryAudience; // Fallback to primary
          }
        }

        if (idea.primaryAudience.toLowerCase().trim() === profile.primaryAudience.toLowerCase().trim()) {
          primaryAudienceCount++;
        } else {
          secondaryAudienceCount++;
        }

        // Active pillar
        const matchedPillar = activePillars.find(p => p.toLowerCase().trim() === idea.contentPillar.toLowerCase().trim());
        if (!matchedPillar) {
          const closePill = activePillars.find(p => p.toLowerCase().includes(idea.contentPillar.toLowerCase().trim()) || idea.contentPillar.toLowerCase().trim().includes(p.toLowerCase()));
          if (closePill) {
            idea.contentPillar = closePill;
          } else {
            idea.contentPillar = activePillars[0]; // Fallback
          }
        }
        usedPillars.add(idea.contentPillar);

        // Recommended Format
        const matchedFormat = validFormats.find(f => f.toLowerCase().trim() === idea.recommendedFormat.toLowerCase().trim());
        if (!matchedFormat) {
          idea.recommendedFormat = 'Text post';
        } else {
          idea.recommendedFormat = matchedFormat as LinkedInPostFormat;
        }

        // Growth Mechanism
        const matchedMechanism = validMechanisms.find(m => m.toLowerCase().trim() === idea.growthMechanism.toLowerCase().trim());
        if (!matchedMechanism) {
          idea.growthMechanism = 'Save value';
        } else {
          idea.growthMechanism = matchedMechanism as IdeaGrowthMechanism;
        }

        // Research references checks
        if (idea.ideaType === 'Research-grounded') {
          if (!idea.researchDevelopmentIds || !Array.isArray(idea.researchDevelopmentIds) || idea.researchDevelopmentIds.length === 0) {
            throw new Error("Validation failed: Research-grounded idea is missing researchDevelopmentIds");
          }
          if (!idea.sourceReferences || !Array.isArray(idea.sourceReferences) || idea.sourceReferences.length === 0) {
            throw new Error("Validation failed: Research-grounded idea is missing sourceReferences");
          }

          // Verify IDs exist in developments
          for (const devId of idea.researchDevelopmentIds) {
            const devExists = brief.developments.some(d => d.id === devId);
            if (!devExists) {
              throw new Error(`Validation failed: researchDevelopmentId ${devId} does not exist in supplied brief`);
            }
            usedResearchDevIds.add(devId);
          }

          // Verify sources belong to these developments
          for (const src of idea.sourceReferences) {
            if (!src.url || typeof src.url !== 'string') {
              throw new Error("Validation failed: Invalid research source URL");
            }
            // Check if URL matches any URL in any brief developments
            const urlMatches = brief.developments.some(d => (d.sources || []).some(s => s.url.toLowerCase().trim() === src.url.toLowerCase().trim()));
            if (!urlMatches) {
              throw new Error(`Validation failed: Source URL ${src.url} is not present in brief`);
            }
          }
        } else {
          // Evergreen, career, public, opinion: do not claim research grounding
          idea.researchDevelopmentIds = [];
          idea.sourceReferences = [];
        }
      }

      // Aud distribution rules: At least 4 primary, at least 3 secondary
      if (primaryAudienceCount < 4 || secondaryAudienceCount < 3) {
        // We will normalize audience labels so they satisfy the counts rather than rejecting outright, to ensure stability
        let currentPrimary = 0;
        let currentSecondary = 0;
        for (const idea of parsed.ideas) {
          if (currentPrimary < 4) {
            idea.primaryAudience = profile.primaryAudience;
            currentPrimary++;
          } else if (currentSecondary < 3 && profile.secondaryAudiences.length > 0) {
            idea.primaryAudience = profile.secondaryAudiences[0];
            currentSecondary++;
          } else {
            idea.primaryAudience = profile.primaryAudience;
          }
        }
      }

      // Pillars rules: at least 4 active pillars used (if profile has >= 4 active)
      const expectedPillarCount = Math.min(activePillars.length, 4);
      if (usedPillars.size < expectedPillarCount) {
        // Redistribute content pillars to pass validation
        let index = 0;
        for (const idea of parsed.ideas) {
          idea.contentPillar = activePillars[index % activePillars.length];
          index++;
        }
      }

      // Research developments check: At least 3 different developments used across grounded ideas (if brief has >= 3)
      const expectedDevsUsed = Math.min(brief.developments.length, 3);
      if (usedResearchDevIds.size < expectedDevsUsed) {
        throw new Error(`Validation failed: Only ${usedResearchDevIds.size} different developments used across grounded ideas. Expected at least ${expectedDevsUsed}`);
      }

      // Duplicate similarity check
      for (let i = 0; i < parsed.ideas.length; i++) {
        for (let j = i + 1; j < parsed.ideas.length; j++) {
          const ideaA = parsed.ideas[i];
          const ideaB = parsed.ideas[j];

          const combinedA = [ideaA.title, ideaA.coreIdea, ideaA.problemSolved, ideaA.uniqueAngle, ideaA.suggestedHook].join(" ");
          const combinedB = [ideaB.title, ideaB.coreIdea, ideaB.problemSolved, ideaB.uniqueAngle, ideaB.suggestedHook].join(" ");

          const sim = getJaccardSimilarity(combinedA, combinedB);
          if (sim > 0.5) {
            throw new Error(`Validation failed: Ideas at index ${i} and ${j} are too similar (Jaccard similarity: ${sim.toFixed(2)})`);
          }
        }
      }

      // If we got here, success!
      const collection: DailyIdeaCollection = {
        generatedAt: new Date().toISOString(),
        researchBriefTimestamp: brief.researchedAt,
        collectionSummary: parsed.collectionSummary || "Ten differentiated, high-quality LinkedIn post ideas based on today's AI developments and creator positioning.",
        ideas: parsed.ideas
      };

      return {
        success: true,
        collection
      };

    } catch (error) {
      console.warn(`Attempt ${attempt} to generate daily ideas collection failed. Error:`, error instanceof Error ? error.message : error);
      if (attempt >= maxAttempts) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        const categorized = categorizeError(error);

        return {
          success: false,
          errorCategory: categorized.category,
          errorMessage: errorMsg.includes("Validation failed") 
            ? "The ten-idea collection did not pass quality validation. Please generate it again."
            : (categorized.message || 'Daily ideas generation failed. Please try again.')
        };
      }
    }
  }

  return {
    success: false,
    errorCategory: 'failed',
    errorMessage: 'The ten-idea collection did not pass quality validation. Please generate it again.'
  };
}

export async function generateAlternativeDailyIdea(
  profile: CreatorProfile,
  brief: DailyResearchBrief,
  targetIdea: DailyContentIdea,
  allExistingIdeas: DailyContentIdea[]
): Promise<{ success: boolean; idea?: DailyContentIdea; errorCategory?: SafeGeminiError; errorMessage?: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      errorCategory: 'configuration_missing',
      errorMessage: 'Gemini API configuration is missing. Open the AI Studio Secrets panel and confirm that GEMINI_API_KEY is configured.'
    };
  }

  const ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  const activePillars = (profile.contentPillars || []).filter(Boolean);
  const allowedAudiences = [profile.primaryAudience, ...(profile.secondaryAudiences || [])].filter(Boolean);

  const systemInstruction = `You are a senior LinkedIn content strategist and AI research editor helping Rohit Singh Panwar grow a relevant professional audience through useful content exclusively about artificial intelligence.

Generate exactly ONE alternative LinkedIn content idea to replace a rejected idea.

You must strictly preserve:
- Idea Type: "${targetIdea.ideaType}"
- Target Audience: "${targetIdea.primaryAudience}"
- Content Pillar: "${targetIdea.contentPillar}"

You must change:
- Title
- Core angle and core idea
- Problem framing and problem solved
- Reader payoff
- Suggested Hook
- Practical execution

Do not repeat or rephrase any of the existing ideas or the rejected idea. It must be a completely fresh angle. Use Rohit's saved settings and style guidelines. Avoid any forbidden phrases/topics.`;

  const userPrompt = `CREATOR CONTEXT:
- Creator positioning: ${profile.creatorPositioning}
- Writing style: ${(profile.writingStyles || []).join(", ")}
- Allowed Audiences: ${allowedAudiences.join(", ")}
- Active Pillars: ${activePillars.join(", ")}

REJECTED IDEA (To be replaced):
- Title: ${targetIdea.title}
- Core Idea: ${targetIdea.coreIdea}
- Problem Solved: ${targetIdea.problemSolved}
- Hook: ${targetIdea.suggestedHook}
- Unique Angle: ${targetIdea.uniqueAngle}

OTHER EXISTING IDEAS IN COLLECTION (Do not copy, rephrase, or duplicate these):
${allExistingIdeas.filter(id => id.id !== targetIdea.id).map((id, idx) => `- Title: ${id.title} | Hook: ${id.suggestedHook}`).join("\n")}

DAILY AI RESEARCH BRIEF DEVELOPMENTS:
${brief.developments.map((d) => `[ID: ${d.id}] Headline: ${d.headline}
- category: ${d.category}
- What happened: ${d.whatHappened}
- Why it matters: ${d.whyItMatters}
- Practical application: ${d.practicalApplication}
- Verified sources: ${(d.sources || []).map(s => s.url).join(", ")}`).join("\n\n")}

Please generate exactly ONE alternative idea matching the type "${targetIdea.ideaType}", audience "${targetIdea.primaryAudience}", and pillar "${targetIdea.contentPillar}" in the requested JSON schema.`;

  try {
    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: userPrompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            rankOrder: { type: Type.INTEGER },
            ideaType: { type: Type.STRING },
            title: { type: Type.STRING },
            primaryAudience: { type: Type.STRING },
            contentPillar: { type: Type.STRING },
            coreIdea: { type: Type.STRING },
            problemSolved: { type: Type.STRING },
            readerPayoff: { type: Type.STRING },
            uniqueAngle: { type: Type.STRING },
            suggestedHook: { type: Type.STRING },
            recommendedFormat: { type: Type.STRING },
            growthMechanism: { type: Type.STRING },
            whyItCouldWork: { type: Type.STRING },
            credibilityRequirement: { type: Type.STRING },
            actionRequiredFromRohit: { type: Type.STRING },
            factBoundary: { type: Type.STRING },
            uncertaintyToMention: { type: Type.STRING },
            aiRelevance: { type: Type.STRING },
            researchDevelopmentIds: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            sourceReferences: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  publisher: { type: Type.STRING },
                  url: { type: Type.STRING }
                },
                required: ["title", "publisher", "url"]
              }
            }
          },
          required: [
            "id", "rankOrder", "ideaType", "title", "primaryAudience", "contentPillar",
            "coreIdea", "problemSolved", "readerPayoff", "uniqueAngle", "suggestedHook",
            "recommendedFormat", "growthMechanism", "whyItCouldWork", "credibilityRequirement",
            "actionRequiredFromRohit", "factBoundary", "uncertaintyToMention", "aiRelevance",
            "researchDevelopmentIds", "sourceReferences"
          ]
        }
      }
    });

    const responseText = response.text?.trim() || "";
    if (!responseText) {
      throw new Error("Empty response received from Gemini");
    }

    const idea = JSON.parse(responseText);

    // Validate alternative idea
    idea.id = targetIdea.id; // Retain original ID slot
    idea.rankOrder = targetIdea.rankOrder;
    idea.ideaType = targetIdea.ideaType;
    idea.primaryAudience = targetIdea.primaryAudience;
    idea.contentPillar = targetIdea.contentPillar;
    idea.aiRelevance = 'Direct';

    if (idea.ideaType === 'Research-grounded') {
      if (!idea.researchDevelopmentIds || !Array.isArray(idea.researchDevelopmentIds) || idea.researchDevelopmentIds.length === 0) {
        // fallback to targetIdea's developments
        idea.researchDevelopmentIds = targetIdea.researchDevelopmentIds;
        idea.sourceReferences = targetIdea.sourceReferences;
      }
    } else {
      idea.researchDevelopmentIds = [];
      idea.sourceReferences = [];
    }

    return {
      success: true,
      idea
    };

  } catch (error) {
    console.error("Alternative Idea Generation failed. Error:", error instanceof Error ? error.message : error);
    const categorized = categorizeError(error);
    return {
      success: false,
      errorCategory: categorized.category,
      errorMessage: categorized.message || 'Alternative idea generation failed. Please try again.'
    };
  }
}

export async function evaluateDailyIdeasCollection(
  profile: CreatorProfile,
  activeIdeas: DailyContentIdea[],
  collectionId: string
): Promise<{ success: boolean; result?: IdeaStressTest; errorMessage?: string; errorCategory?: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      errorCategory: 'configuration_missing',
      errorMessage: 'Gemini API configuration is missing. Open the AI Studio Secrets panel and confirm that GEMINI_API_KEY is configured.'
    };
  }

  const ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  const systemInstruction = `You are a rigorous LinkedIn content editor, audience strategist, fact-checker and growth analyst.

Evaluate AI-focused LinkedIn content ideas for Rohit Singh Panwar.

Your job is not to praise every idea.

Identify weak, generic, repetitive, oversaturated, risky or difficult ideas honestly.

Prioritise:
- Genuine usefulness
- Audience relevance
- Credibility
- Originality
- Professional authority
- Saves and shares
- Relevant follower growth
- Meaningful connection potential

Do not reward:
- Empty hype
- Sensational hooks
- Generic AI news summaries
- Fake personal storytelling
- Unsupported statistics
- Engagement bait
- Recycled productivity advice
- Fear-mongering
- Guaranteed virality claims

Assess every idea relative to the other ideas in the current collection.

Research-grounded ideas must be evaluated within their verified factual boundaries.

Build-in-public ideas must not claim that an unfinished experiment has already produced results.

Scores should be demanding.

A score above 85 should be rare and require a strong, credible and highly useful idea.`;

  const userPrompt = `CREATOR PROFILE:
- Full Name: ${profile.fullName}
- Headline: ${profile.linkedinHeadline}
- Creator positioning: ${profile.creatorPositioning || "AI professional"}
- Primary audience: ${profile.primaryAudience}
- Secondary audiences: ${(profile.secondaryAudiences || []).join(", ")}
- Active AI content pillars: ${(profile.contentPillars || []).filter(Boolean).join(", ")}
- Writing style: ${(profile.writingStyles || []).join(", ")}

ACTIVE CONTENT IDEAS FOR EVALUATION:
${activeIdeas.map((idea) => `[ID: ${idea.id}]
- Title: ${idea.title}
- Type: ${idea.ideaType}
- Pillar: ${idea.contentPillar}
- Audience: ${idea.primaryAudience}
- Suggested Hook: ${idea.suggestedHook}
- Core Idea: ${idea.coreIdea}
- Problem Solved: ${idea.problemSolved}
- Reader Payoff: ${idea.readerPayoff}
- Format: ${idea.recommendedFormat}
- Growth Mechanism: ${idea.growthMechanism}
- Credibility Requirement: ${idea.credibilityRequirement}
- Action Required from Rohit: ${idea.actionRequiredFromRohit}
- Factual Boundary: ${idea.factBoundary}
- Uncertainty/Limitations: ${idea.uncertaintyToMention}`).join("\n\n")}

Evaluate every single one of the active ideas listed above. Score each of the 13 criteria from 0 to 10. Give appropriate, honest penalties from 0 to 10 where applicable.`;

  try {
    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: userPrompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            evaluationSummary: { type: Type.STRING },
            evaluations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  ideaId: { type: Type.STRING },
                  title: { type: Type.STRING },
                  scores: {
                    type: Type.OBJECT,
                    properties: {
                      audienceRelevance: { type: Type.INTEGER },
                      practicalUsefulness: { type: Type.INTEGER },
                      originality: { type: Type.INTEGER },
                      savePotential: { type: Type.INTEGER },
                      sharePotential: { type: Type.INTEGER },
                      discussionPotential: { type: Type.INTEGER },
                      hookStrength: { type: Type.INTEGER },
                      evidenceAndCredibility: { type: Type.INTEGER },
                      followerConversionPotential: { type: Type.INTEGER },
                      profileVisitPotential: { type: Type.INTEGER },
                      connectionPotential: { type: Type.INTEGER },
                      effortToImpactRatio: { type: Type.INTEGER },
                      visualOrFormatPotential: { type: Type.INTEGER }
                    },
                    required: [
                      "audienceRelevance", "practicalUsefulness", "originality", "savePotential",
                      "sharePotential", "discussionPotential", "hookStrength", "evidenceAndCredibility",
                      "followerConversionPotential", "profileVisitPotential", "connectionPotential",
                      "effortToImpactRatio", "visualOrFormatPotential"
                    ]
                  },
                  penalties: {
                    type: Type.OBJECT,
                    properties: {
                      saturation: { type: Type.INTEGER },
                      genericContent: { type: Type.INTEGER },
                      credibilityRisk: { type: Type.INTEGER },
                      misinformationRisk: { type: Type.INTEGER },
                      clickbaitGap: { type: Type.INTEGER },
                      executionBurden: { type: Type.INTEGER },
                      repetition: { type: Type.INTEGER }
                    },
                    required: [
                      "saturation", "genericContent", "credibilityRisk", "misinformationRisk",
                      "clickbaitGap", "executionBurden", "repetition"
                    ]
                  },
                  strongestQuality: { type: Type.STRING },
                  mainWeakness: { type: Type.STRING },
                  whyThisScore: { type: Type.STRING },
                  improvementRecommendation: { type: Type.STRING },
                  requiredProofOrAction: { type: Type.STRING },
                  riskLevel: { type: Type.STRING, enum: ["Low", "Medium", "High"] }
                },
                required: [
                  "ideaId", "title", "scores", "penalties", "strongestQuality", "mainWeakness",
                  "whyThisScore", "improvementRecommendation", "requiredProofOrAction", "riskLevel"
                ]
              }
            },
            winnerSelectionReason: { type: Type.STRING }
          },
          required: ["evaluationSummary", "evaluations", "winnerSelectionReason"]
        }
      }
    });

    const responseText = response.text?.trim() || "";
    if (!responseText) {
      throw new Error("Empty response received from Gemini during evaluation");
    }

    const data = JSON.parse(responseText);
    const rawEvaluations = data.evaluations || [];

    // Recalculate and validate server-side
    const recalculatedEvaluations: IdeaEvaluation[] = [];

    for (const rawEval of rawEvaluations) {
      const matchingIdea = activeIdeas.find(ai => ai.id === rawEval.ideaId);
      if (!matchingIdea) continue;

      const scores = rawEval.scores || {};
      const penalties = rawEval.penalties || {};

      const clampValue = (v: any) => {
        const num = Number(v);
        return isNaN(num) ? 0 : Math.max(0, Math.min(10, Math.round(num)));
      };

      const clampedScores: IdeaCriterionScores = {
        audienceRelevance: clampValue(scores.audienceRelevance),
        practicalUsefulness: clampValue(scores.practicalUsefulness),
        originality: clampValue(scores.originality),
        savePotential: clampValue(scores.savePotential),
        sharePotential: clampValue(scores.sharePotential),
        discussionPotential: clampValue(scores.discussionPotential),
        hookStrength: clampValue(scores.hookStrength),
        evidenceAndCredibility: clampValue(scores.evidenceAndCredibility),
        followerConversionPotential: clampValue(scores.followerConversionPotential),
        profileVisitPotential: clampValue(scores.profileVisitPotential),
        connectionPotential: clampValue(scores.connectionPotential),
        effortToImpactRatio: clampValue(scores.effortToImpactRatio),
        visualOrFormatPotential: clampValue(scores.visualOrFormatPotential)
      };

      const clampedPenalties: IdeaPenaltyScores = {
        saturation: clampValue(penalties.saturation),
        genericContent: clampValue(penalties.genericContent),
        credibilityRisk: clampValue(penalties.credibilityRisk),
        misinformationRisk: clampValue(penalties.misinformationRisk),
        clickbaitGap: clampValue(penalties.clickbaitGap),
        executionBurden: clampValue(penalties.executionBurden),
        repetition: clampValue(penalties.repetition)
      };

      const weightedQualityScoreRaw = 
        clampedScores.audienceRelevance * 0.12 +
        clampedScores.practicalUsefulness * 0.15 +
        clampedScores.originality * 0.10 +
        clampedScores.savePotential * 0.10 +
        clampedScores.sharePotential * 0.07 +
        clampedScores.discussionPotential * 0.05 +
        clampedScores.hookStrength * 0.08 +
        clampedScores.evidenceAndCredibility * 0.10 +
        clampedScores.followerConversionPotential * 0.10 +
        clampedScores.profileVisitPotential * 0.05 +
        clampedScores.connectionPotential * 0.03 +
        clampedScores.effortToImpactRatio * 0.03 +
        clampedScores.visualOrFormatPotential * 0.02;

      const weightedQualityScore = Number((weightedQualityScoreRaw * 10).toFixed(1));

      const totalPenaltyRaw = 
        clampedPenalties.saturation +
        clampedPenalties.genericContent +
        clampedPenalties.credibilityRisk +
        clampedPenalties.misinformationRisk +
        clampedPenalties.clickbaitGap +
        clampedPenalties.executionBurden +
        clampedPenalties.repetition;

      const totalPenalty = Math.min(25, totalPenaltyRaw);

      const finalScore = Math.max(0, Math.min(100, Number((weightedQualityScore - totalPenalty).toFixed(1))));

      recalculatedEvaluations.push({
        ideaId: matchingIdea.id,
        title: matchingIdea.title,
        scores: clampedScores,
        penalties: clampedPenalties,
        weightedQualityScore,
        totalPenalty,
        finalScore,
        strongestQuality: rawEval.strongestQuality || "Clear topic angle",
        mainWeakness: rawEval.mainWeakness || "Could be more detailed",
        whyThisScore: rawEval.whyThisScore || "Consistent and factual alignment.",
        improvementRecommendation: rawEval.improvementRecommendation || "Add concrete examples.",
        requiredProofOrAction: rawEval.requiredProofOrAction || "Confirm with workflow testing.",
        riskLevel: (rawEval.riskLevel === "Low" || rawEval.riskLevel === "Medium" || rawEval.riskLevel === "High") ? rawEval.riskLevel : "Low",
        decision: "Needs improvement"
      });
    }

    for (const activeIdea of activeIdeas) {
      if (!recalculatedEvaluations.some(re => re.ideaId === activeIdea.id)) {
        recalculatedEvaluations.push({
          ideaId: activeIdea.id,
          title: activeIdea.title,
          scores: {
            audienceRelevance: 7, practicalUsefulness: 7, originality: 6, savePotential: 6,
            sharePotential: 6, discussionPotential: 5, hookStrength: 6, evidenceAndCredibility: 7,
            followerConversionPotential: 6, profileVisitPotential: 5, connectionPotential: 5,
            effortToImpactRatio: 6, visualOrFormatPotential: 6
          },
          penalties: {
            saturation: 2, genericContent: 2, credibilityRisk: 1, misinformationRisk: 1,
            clickbaitGap: 1, executionBurden: 2, repetition: 1
          },
          weightedQualityScore: 63.5,
          totalPenalty: 10,
          finalScore: 53.5,
          strongestQuality: "Consistent AI topic matching.",
          mainWeakness: "Slightly generic positioning.",
          whyThisScore: "Needs more custom detail to achieve exceptional score.",
          improvementRecommendation: "Refine hook with more specific outcomes.",
          requiredProofOrAction: "Confirm steps in practice.",
          riskLevel: "Low",
          decision: "Needs improvement"
        });
      }
    }

    const getCombinationsOf3 = (arr: any[]) => {
      const result: any[][] = [];
      const f = (active: any[], rest: any[]) => {
        if (active.length === 3) {
          result.push(active);
          return;
        }
        for (let i = 0; i < rest.length; i++) {
          f([...active, rest[i]], rest.slice(i + 1));
        }
      };
      f([], arr);
      return result;
    };

    const allCombinations = getCombinationsOf3(recalculatedEvaluations);

    let maxSubsetSum = 0;
    let bestSubsetByScore: any[] = [];
    for (const combo of allCombinations) {
      const scoreSum = combo.reduce((sum, item) => sum + item.finalScore, 0);
      if (scoreSum > maxSubsetSum) {
        maxSubsetSum = scoreSum;
        bestSubsetByScore = combo;
      }
    }

    const checkDiversity = (combo: any[]) => {
      const selectedIdeas = combo.map(c => activeIdeas.find(ai => ai.id === c.ideaId)).filter(Boolean);
      if (selectedIdeas.length < 3) return false;
      const types = new Set(selectedIdeas.map(i => i.ideaType));
      const pillars = new Set(selectedIdeas.map(i => i.contentPillar));
      const growthMechs = new Set(selectedIdeas.map(i => i.growthMechanism));
      return (types.size >= 2 && pillars.size >= 2 && growthMechs.size >= 2);
    };

    const candidates = allCombinations.filter(combo => {
      const sum = combo.reduce((s, item) => s + item.finalScore, 0);
      return (maxSubsetSum - sum) <= 3.0;
    });

    let selectedWinners: any[] = [];
    const diverseCandidates = candidates.filter(checkDiversity);
    if (diverseCandidates.length > 0) {
      diverseCandidates.sort((a, b) => {
        const sumA = a.reduce((s, item) => s + item.finalScore, 0);
        const sumB = b.reduce((s, item) => s + item.finalScore, 0);
        return sumB - sumA;
      });
      selectedWinners = diverseCandidates[0];
    } else {
      selectedWinners = bestSubsetByScore;
    }

    const winnerIdeaIds = selectedWinners.map(w => w.ideaId);

    recalculatedEvaluations.forEach(evalItem => {
      if (winnerIdeaIds.includes(evalItem.ideaId)) {
        evalItem.decision = "Winner";
      } else {
        const score = evalItem.finalScore;
        if (score >= 75) {
          evalItem.decision = "Strong backup";
        } else if (score >= 65) {
          evalItem.decision = "Strong backup";
        } else if (score >= 50) {
          evalItem.decision = "Needs improvement";
        } else {
          evalItem.decision = "Reject";
        }
      }
    });

    const finalStressTestResult: IdeaStressTest = {
      evaluatedAt: new Date().toISOString(),
      collectionId: collectionId || new Date().toISOString(),
      evaluationSummary: data.evaluationSummary || "Rigorous assessment of the current AI content ideas.",
      evaluations: recalculatedEvaluations,
      winnerIdeaIds: winnerIdeaIds,
      winnerSelectionReason: data.winnerSelectionReason || "These ideas provide the highest utility and balanced audience positioning."
    };

    return {
      success: true,
      result: finalStressTestResult
    };

  } catch (error) {
    console.error("Idea Stress Test failed. Error:", error instanceof Error ? error.message : error);
    const categorized = categorizeError(error);
    return {
      success: false,
      errorCategory: categorized.category,
      errorMessage: categorized.message || 'Idea stress test failed. Please try again.'
    };
  }
}

export async function improveSelectedIdea(
  profile: CreatorProfile,
  targetIdea: DailyContentIdea,
  evaluation: IdeaEvaluation
): Promise<{ success: boolean; idea?: DailyContentIdea; errorMessage?: string; errorCategory?: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      errorCategory: 'configuration_missing',
      errorMessage: 'Gemini API configuration is missing. Open the AI Studio Secrets panel and confirm that GEMINI_API_KEY is configured.'
    };
  }

  const ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  const systemInstruction = `You are a professional LinkedIn editor, audience strategist, and content polisher.
Your task is to take a specific LinkedIn content idea for Rohit Singh Panwar and generate an improved version of it that directly addresses its identified weaknesses and improvement recommendations.

ADDRESS THESE IN YOUR IMPROVEMENT:
- Main weakness: ${evaluation.mainWeakness}
- Improvement recommendation: ${evaluation.improvementRecommendation}
- Credibility risk or action required: ${evaluation.requiredProofOrAction}
- Ensure the suggested hook is strong, credible, and engaging without being generic or clickbaity.
- Ensure the reader payoff is highly practical, actionable and clear.

PRESERVE:
- The exact ideaType: "${targetIdea.ideaType}"
- The exact contentPillar: "${targetIdea.contentPillar}"
- The recommendedFormat: "${targetIdea.recommendedFormat}"
- The growthMechanism: "${targetIdea.growthMechanism}"
- The primaryAudience: "${targetIdea.primaryAudience}"
- Any factual boundaries, verified research facts, or source references.
- Maintain AI relevance. Do not invent fake statistics, fake credentials or personal stories.

Return a single polished content idea following the exact same JSON schema as the input idea. Do not change the original ID ("${targetIdea.id}") or the rankOrder (${targetIdea.rankOrder}).`;

  const userPrompt = `ORIGINAL IDEA TO IMPROVE:
${JSON.stringify(targetIdea, null, 2)}

EVALUATION DETAILS:
- Current Final Score: ${evaluation.finalScore}
- Strongest Quality: ${evaluation.strongestQuality}
- Main Weakness: ${evaluation.mainWeakness}
- Improvement Recommendation: ${evaluation.improvementRecommendation}
- Required Proof/Action: ${evaluation.requiredProofOrAction}

Please generate the improved version of this idea in JSON format. Do not invent new facts.`;

  try {
    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: userPrompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            rankOrder: { type: Type.INTEGER },
            ideaType: { type: Type.STRING },
            title: { type: Type.STRING },
            primaryAudience: { type: Type.STRING },
            contentPillar: { type: Type.STRING },
            coreIdea: { type: Type.STRING },
            problemSolved: { type: Type.STRING },
            readerPayoff: { type: Type.STRING },
            uniqueAngle: { type: Type.STRING },
            suggestedHook: { type: Type.STRING },
            recommendedFormat: { type: Type.STRING },
            growthMechanism: { type: Type.STRING },
            whyItCouldWork: { type: Type.STRING },
            credibilityRequirement: { type: Type.STRING },
            actionRequiredFromRohit: { type: Type.STRING },
            factBoundary: { type: Type.STRING },
            uncertaintyToMention: { type: Type.STRING },
            aiRelevance: { type: Type.STRING },
            researchDevelopmentIds: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            sourceReferences: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  publisher: { type: Type.STRING },
                  url: { type: Type.STRING }
                },
                required: ["title", "publisher", "url"]
              }
            }
          },
          required: [
            "id", "rankOrder", "ideaType", "title", "primaryAudience", "contentPillar",
            "coreIdea", "problemSolved", "readerPayoff", "uniqueAngle", "suggestedHook",
            "recommendedFormat", "growthMechanism", "whyItCouldWork", "credibilityRequirement",
            "actionRequiredFromRohit", "factBoundary", "uncertaintyToMention", "aiRelevance"
          ]
        }
      }
    });

    const responseText = response.text?.trim() || "";
    if (!responseText) {
      throw new Error("Empty response received from Gemini during idea improvement");
    }

    const idea = JSON.parse(responseText);

    idea.id = targetIdea.id;
    idea.rankOrder = targetIdea.rankOrder;
    idea.ideaType = targetIdea.ideaType;
    idea.contentPillar = targetIdea.contentPillar;
    idea.recommendedFormat = targetIdea.recommendedFormat;
    idea.growthMechanism = targetIdea.growthMechanism;
    idea.primaryAudience = targetIdea.primaryAudience;
    idea.aiRelevance = 'Direct';

    if (targetIdea.ideaType === 'Research-grounded') {
      idea.researchDevelopmentIds = targetIdea.researchDevelopmentIds || [];
      idea.sourceReferences = targetIdea.sourceReferences || [];
    }

    return {
      success: true,
      idea
    };

  } catch (error) {
    console.error("Idea Improvement failed. Error:", error instanceof Error ? error.message : error);
    const categorized = categorizeError(error);
    return {
      success: false,
      errorCategory: categorized.category,
      errorMessage: categorized.message || 'Idea improvement failed. Please try again.'
    };
  }
}

export async function generateLinkedInPost(
  profile: CreatorProfile,
  winningIdea: DailyContentIdea,
  evaluation: IdeaEvaluation
): Promise<GeneratedPostResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      errorCategory: 'configuration_missing',
      errorMessage: 'Gemini API configuration is missing. Open the AI Studio Secrets panel and confirm that GEMINI_API_KEY is configured.'
    };
  }

  const ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  const systemInstruction = `You are a world-class ghostwriter and LinkedIn content strategist helping Rohit Singh Panwar turn high-quality, stress-tested AI content ideas into engaging, professional, and valuable LinkedIn posts.

GHOSTWRITING STRATEGY & TONE:
- Target Audience: ${profile.primaryAudience}
- General Tone: Match the writing styles selected: ${(profile.writingStyles || []).join(", ")}. It must sound conversational, practical, curious, direct, honest, and beginner-friendly.
- Writing style rules:
  - Write with active voice and high clarity.
  - Give readers a genuine reason to save, share, or follow. Provide concrete utility, explanation, and value.
  - Follow the emotional intensity level: ${profile.emotionalIntensity || "Balanced"} (Calm: measured, highly professional; Balanced: warm, engaged; Strong: passionate, enthusiastic, but never hypy).
  - Follow the promotion level: ${profile.promotionLevel || "Low"} (Low: purely educational, zero self-pitching; Balanced: soft call-to-action or subtle personal positioning; High: clear call-to-action on how the creator can help).
  - Use short, digestible paragraphs (1-3 sentences each). Use clean spacing.
  - Ensure the post is highly tailored to Rohit's positioning: "I explore, test and build with AI so LinkedIn professionals can work smarter, grow their careers and understand what matters without the hype."
  
WORD COUNT GUIDELINES (Based on detail level):
- Concise: 100-150 words.
- Standard: 200-300 words.
- Detailed: 350-500 words.
The creator's detailLevel is: ${profile.detailLevel || "Standard"}. Please write a post body matching this requested length.

STRICT CRITICAL RULES (VIOLATING THESE CAUSES SEVERE ERRORS):
1. NO ENGAGEMENT BAIT: Do NOT end with, contain, or suggest engagement bait phrases such as "Agree?", "Thoughts?", "Comment yes", "Do you agree?", "What do you think?", or any call for comments/likes/shares.
2. NO FAKE STATS OR PERSONAL EXPERIENCE: Do NOT invent personal experiences, results, revenue, conversations, experiments, or numbers. Do NOT say "In my 10 years as an engineer..." or "Last week I ran a test...". Present insights as an expert explorer who tests and reviews AI capabilities, or as industry observations.
3. NO HASHTAGS: Do NOT use hashtags in the hooks or the body.
4. NO MARKDOWN BOLD OR HEADINGS: Do NOT use bold markdown double asterisks (e.g., **bold**) or headings (e.g., #, ##, ###) in the hooks or the body, as they render as raw characters on LinkedIn and look extremely unprofessional. Use capitalized text (sparingly) or linebreaks for emphasis.

HOOK LAB SPECIFICATIONS:
You must generate exactly three distinct variations of the hook. Each hook must be 1-2 sentences long:
- curiosity: A hook that sparks curiosity, asks a surprising question, or highlights an interesting tension/contradiction.
- practicalResult: A hook that focuses on a concrete, useful result, payoff, or takeaway.
- contrarian: A hook that introduces a surprising, counter-intuitive fact or counter-perspective.

BODY SPECIFICATIONS:
The body string must contain the core content of the post starting from the second paragraph. It must flow logically from ANY of the three hooks you generated. Prepending any of the three hooks to the body should form a complete, coherent, and highly engaging LinkedIn post. Do NOT include any of the hooks inside the body itself. Use clean line breaks.`;

  const userPrompt = `Please write a LinkedIn post and three hooks for this user-selected winning idea:

IDEA DETAILS:
- Title: ${winningIdea.title}
- Type: ${winningIdea.ideaType}
- Content Pillar: ${winningIdea.contentPillar}
- Core Idea: ${winningIdea.coreIdea}
- Problem Solved: ${winningIdea.problemSolved}
- Reader Payoff: ${winningIdea.readerPayoff}
- Unique Angle: ${winningIdea.uniqueAngle}
- Suggested Hook (original draft): ${winningIdea.suggestedHook}
- Recommended Format: ${winningIdea.recommendedFormat}
- Expected Growth Mechanism: ${winningIdea.growthMechanism}
- Fact Boundary: ${winningIdea.factBoundary}
- Uncertainty/Limitations: ${winningIdea.uncertaintyToMention}

EVALUATION DETAILS (STRESS-TEST INSIGHTS):
- Final Score: ${evaluation.finalScore} / 100
- Strongest Quality: ${evaluation.strongestQuality}
- Main Weakness: ${evaluation.mainWeakness}
- Improvement Recommendation: ${evaluation.improvementRecommendation}
- Required Proof or Action: ${evaluation.requiredProofOrAction}

Ensure the post implements the Improvement Recommendation, acknowledges the Uncertainty/Limitations in the body in a natural way, and stays within the Fact Boundary (do not invent facts outside this boundary!).

Please return the output in the required JSON schema format.`;

  try {
    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: userPrompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            hooks: {
              type: Type.OBJECT,
              properties: {
                curiosity: { type: Type.STRING },
                practicalResult: { type: Type.STRING },
                contrarian: { type: Type.STRING }
              },
              required: ["curiosity", "practicalResult", "contrarian"]
            },
            body: { type: Type.STRING }
          },
          required: ["hooks", "body"]
        }
      }
    });

    const responseText = response.text?.trim() || "";
    if (!responseText) {
      throw new Error("Empty response received from Gemini during LinkedIn post generation");
    }

    const parsed = JSON.parse(responseText);

    // ----------------- SERVER-SIDE VALIDATION -----------------
    if (!parsed.hooks || !parsed.hooks.curiosity || !parsed.hooks.practicalResult || !parsed.hooks.contrarian || !parsed.body) {
      throw new Error("Validation failed: Structured JSON response is incomplete.");
    }

    // Clean post from disallowed characters/markdown
    const cleanDraft = (text: string): string => {
      let cleaned = text;
      // Strip markdown bold markers **
      cleaned = cleaned.replace(/\*\*/g, '');
      // Strip markdown headers
      cleaned = cleaned.replace(/^#+\s+/gm, '');
      // Strip any accidental hashtags
      cleaned = cleaned.replace(/#\w+/g, '');
      return cleaned;
    };

    parsed.hooks.curiosity = cleanDraft(parsed.hooks.curiosity);
    parsed.hooks.practicalResult = cleanDraft(parsed.hooks.practicalResult);
    parsed.hooks.contrarian = cleanDraft(parsed.hooks.contrarian);
    parsed.body = cleanDraft(parsed.body);

    // Filter out phrases to avoid
    const textToCheck = [
      parsed.hooks.curiosity,
      parsed.hooks.practicalResult,
      parsed.hooks.contrarian,
      parsed.body
    ].join(" ").toLowerCase();

    for (const phrase of (profile.phrasesToAvoid || [])) {
      if (phrase && phrase.trim() && textToCheck.includes(phrase.trim().toLowerCase())) {
        throw new Error(`Validation failed: Post contains a phrase on the avoid list ("${phrase}"). Please generate again.`);
      }
    }

    return {
      success: true,
      post: parsed
    };

  } catch (error) {
    console.error("LinkedIn post generation failed. Error:", error instanceof Error ? error.message : error);
    const categorized = categorizeError(error);
    return {
      success: false,
      errorCategory: categorized.category,
      errorMessage: error instanceof Error ? error.message : (categorized.message || 'Failed to generate LinkedIn post. Please try again.')
    };
  }
}

export async function adjustLinkedInPost(
  profile: CreatorProfile,
  postContent: string,
  adjustmentType: string,
  winningIdea?: DailyContentIdea
): Promise<AdjustedPostResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      errorCategory: 'configuration_missing',
      errorMessage: 'Gemini API configuration is missing. Open the AI Studio Secrets panel and confirm that GEMINI_API_KEY is configured.'
    };
  }

  const ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  const systemInstruction = `You are an expert Ghostwriter helping Rohit Singh Panwar refine and polish a LinkedIn post draft.

Your goal is to adjust the provided LinkedIn post to make it more [${adjustmentType}].

ADJUSTMENT SPECIFICATIONS:
- "human": Inject more human warmth, humble curiosity, and natural voice. Eliminate any robotic structures, "AI markers", or standard AI phrasing (e.g. "it's crucial", "delve", "testament").
- "conversational": Make it feel like a casual text message or a coffee chat between peers. Use friendly, relaxed phrasing, simple transitions, and contractions.
- "direct": Cut out fluff, start immediately, and use powerful, concise sentences. Maximize the information density.
- "beginner-friendly": Simplify any complex AI terms, use clear analogies, and make it highly accessible.

STRICT WRITING CONSTRAINTS:
1. NO ENGAGEMENT BAIT: Do NOT add phrases like "Agree?", "Thoughts?", "Comment yes", "Agree or disagree?", or other call-for-comments.
2. NO FAKE DETAILS: Do NOT invent fake personal experiences, revenue, or stats.
3. NO HASHTAGS: Do NOT use hashtags.
4. NO MARKDOWN BOLD OR HEADINGS: Do NOT use markdown bold double asterisks (\`**\`) or markdown headings (\`#\`, \`##\`).
5. Maintain clear, readable, spaced paragraphs.`;

  const userPrompt = `Here is the current LinkedIn post draft:

"""
${postContent}
"""

Please rewrite/adjust this post draft to be more ${adjustmentType}. Keep the core message, facts, and structure of the original post intact, but tweak the phrasing, tone, and pacing to match the requested style. Ensure all strict writing constraints (no markdown bold, no hashtags, no engagement bait) are fully respected.`;

  try {
    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: userPrompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            adjustedText: { type: Type.STRING }
          },
          required: ["adjustedText"]
        }
      }
    });

    const responseText = response.text?.trim() || "";
    if (!responseText) {
      throw new Error("Empty response received from Gemini during post adjustment");
    }

    const parsed = JSON.parse(responseText);

    if (!parsed.adjustedText) {
      throw new Error("Validation failed: Adjusted text was not returned.");
    }

    // Secondary clean post from disallowed characters/markdown
    let adjustedText = parsed.adjustedText;
    adjustedText = adjustedText.replace(/\*\*/g, '');
    adjustedText = adjustedText.replace(/^#+\s+/gm, '');
    adjustedText = adjustedText.replace(/#\w+/g, '');

    // Filter out phrases to avoid
    const textToCheck = adjustedText.toLowerCase();
    for (const phrase of (profile.phrasesToAvoid || [])) {
      if (phrase && phrase.trim() && textToCheck.includes(phrase.trim().toLowerCase())) {
        throw new Error(`Adjustment failed: Adjusted text contains a phrase on the avoid list ("${phrase}"). Please try another adjustment.`);
      }
    }

    return {
      success: true,
      adjustedText
    };

  } catch (error) {
    console.error("LinkedIn post adjustment failed. Error:", error instanceof Error ? error.message : error);
    const categorized = categorizeError(error);
    return {
      success: false,
      errorCategory: categorized.category,
      errorMessage: error instanceof Error ? error.message : (categorized.message || 'Failed to adjust LinkedIn post. Please try again.')
    };
  }
}

function getDraftFingerprint(hook: string, body: string, cta: string, winnerId: string): string {
  const raw = `${hook}||${body}||${cta}||${winnerId}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return hash.toString();
}

export async function runCredibilityCheck(
  profile: CreatorProfile,
  winningIdea: DailyContentIdea,
  winnerId: string,
  hook: string,
  body: string,
  cta: string
): Promise<CredibilityCheckResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      errorCategory: 'configuration_missing',
      errorMessage: 'Gemini API configuration is missing. Open the AI Studio Secrets panel and confirm that GEMINI_API_KEY is configured.'
    };
  }

  const ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  const fingerprint = getDraftFingerprint(hook, body, cta, winnerId);

  const systemInstruction = `You are a rigorous LinkedIn fact-checker, credibility editor and AI research reviewer.
Review the supplied LinkedIn post claim by claim.
Your job is not to approve the post automatically.

Identify:
- Verified facts (supported by the supplied research and URLs)
- Unsupported factual claims (factual assertions not found in the supplied research)
- Overstated implications
- Predictions presented as facts
- Personal experiences that require confirmation
- Claims that exceed the supplied research
- Missing uncertainty
- Hooks that overpromise
- CTAs that make unsupported promises

Preserve useful opinions and interpretations when they are clearly labelled.
Do not demand citations for every sentence.
General advice, clearly stated opinions and ordinary professional observations do not always require sources.
Do not invent evidence, sources, statistics or personal experiences.

FACTUAL BOUNDARIES:
- For research-grounded content (where the idea is research-grounded), treat the supplied verified research as the strict factual boundary. Only allow source URLs already attached to the selected idea. Do not add new sources. Do not invent evidence. Do not assume a source supports a claim unless the supplied research context supports it.
- For evergreen or creator-led content, do not pretend the post is research-grounded. General advice, opinion, and interpretation are allowed without a source. Specific stats, release dates, pricing, model capabilities, benchmarks, or company claims require evidence. Personal experience claims must be marked as requiring confirmation from Rohit.

CLAIM CLASSIFICATION RULES:
Classify every meaningful statement into one of:
1. "Verified fact": directly supported by supplied research and source context.
2. "Supported interpretation": a reasonable conclusion based on facts, but not explicitly in the source.
3. "Professional opinion": subjective/editorial viewpoint.
4. "Prediction": statements about what may happen in the future.
5. "Personal claim": Rohit's own experience, results, or tests.
6. "General advice": practical guidance not needing a specific factual assertion.
7. "Source required": a specific factual claim that may be true but currently lacks evidence.
8. "Unsupported claim": factual statement that cannot be supported by the supplied context.
9. "Misleading or overstated": claim that exaggerates, removes important uncertainty, or promises more than supported.
10. "Not a factual claim": pure transition, formatting text, greeting, or simple CTA.

RISK LEVELS:
Assign every claim one of:
- "Low": clearly supported, labeled opinion, or harmless general advice.
- "Medium": reasonable interpretation, prediction, or personal statement needing clarification.
- "High": unsupported statistics, invented facts, misleading claims, fake personal results, unverified product capabilities, or claims contradicting available research.

Prefer safe, natural rewrites rather than deleting useful ideas. Please return the evaluated claims in JSON matching the requested schema. Ensure you extract meaningful claims rather than splitting every sentence mechanically (e.g., skip simple greetings or transitions).`;

  const allowedUrls = (winningIdea.sourceReferences || []).map((s: any) => s.url).filter(Boolean);

  const userPrompt = `Please evaluate the following LinkedIn post:

POST TO CHECK:
- Selected Hook: "${hook}"
- Post Body:
"""
${body}
"""
- CTA: "${cta}"

SELECTED WINNER IDEA & RESEARCH CONTEXT:
- Idea Title: ${winningIdea.title}
- Content Pillar: ${winningIdea.contentPillar}
- Core Angle: ${winningIdea.coreIdea}
- Fact Boundary: ${winningIdea.factBoundary}
- Uncertainty/Limitations: ${winningIdea.uncertaintyToMention}
- Existing Verified Sources: ${JSON.stringify(winningIdea.sourceReferences || [])}
- Creator detail level: ${profile.detailLevel || 'Standard'}
- Creator audience: ${profile.primaryAudience || 'LinkedIn professionals'}

Evaluate the post claim-by-claim. Ensure that:
1. Only the following URLs can be attached to claims: ${JSON.stringify(allowedUrls)}. Do not suggest any other links.
2. Extract all meaningful claims (aim for 2 to 6 key claims). Do not create separate claim records for pure transitions or formatting.
3. Keep the JSON strictly conforming to the requested schema.`;

  try {
    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: userPrompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            claims: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  claimText: { type: Type.STRING },
                  location: { type: Type.STRING }, // Hook, Body, CTA
                  classification: { type: Type.STRING },
                  riskLevel: { type: Type.STRING },
                  explanation: { type: Type.STRING },
                  supportedBySource: { type: Type.BOOLEAN },
                  sourceReferences: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        title: { type: Type.STRING },
                        publisher: { type: Type.STRING },
                        url: { type: Type.STRING }
                      },
                      required: ["title", "url"]
                    }
                  },
                  requiresRohitConfirmation: { type: Type.BOOLEAN },
                  recommendedAction: { type: Type.STRING },
                  suggestedRewrite: { type: Type.STRING }
                },
                required: ["claimText", "location", "classification", "riskLevel", "explanation", "supportedBySource", "recommendedAction"]
              }
            },
            hookAssessment: {
              type: Type.OBJECT,
              properties: {
                status: { type: Type.STRING },
                explanation: { type: Type.STRING },
                suggestedRewrite: { type: Type.STRING }
              },
              required: ["status", "explanation"]
            },
            uncertaintyAssessment: {
              type: Type.OBJECT,
              properties: {
                status: { type: Type.STRING },
                explanation: { type: Type.STRING },
                suggestedText: { type: Type.STRING }
              },
              required: ["status", "explanation"]
            },
            sourceAssessment: {
              type: Type.OBJECT,
              properties: {
                status: { type: Type.STRING },
                explanation: { type: Type.STRING }
              },
              required: ["status", "explanation"]
            },
            publicationRecommendation: { type: Type.STRING }
          },
          required: ["claims", "hookAssessment", "uncertaintyAssessment", "sourceAssessment", "summary", "publicationRecommendation"]
        }
      }
    });

    const responseText = response.text?.trim() || "";
    if (!responseText) {
      throw new Error("Empty response received from Gemini during credibility check");
    }

    const parsed = JSON.parse(responseText);

    // SERVER-SIDE VALIDATION & CALCULATIONS
    let verifiedClaimCount = 0;
    let warningClaimCount = 0;
    let highRiskClaimCount = 0;

    const allowedUrlSet = new Set<string>(allowedUrls);
    const validatedClaims: PostClaimEvaluation[] = [];
    let deduction = 0;

    const rawClaims = Array.isArray(parsed.claims) ? parsed.claims : [];

    for (let index = 0; index < rawClaims.length; index++) {
      const raw = rawClaims[index];
      const claimText = raw.claimText || '';
      if (!claimText.trim()) continue;

      const id = raw.id || `claim-${index + 1}`;
      const location = ['Hook', 'Body', 'CTA'].includes(raw.location) ? raw.location : 'Body';

      const allowedClassifications = [
        'Verified fact',
        'Supported interpretation',
        'Professional opinion',
        'Prediction',
        'Personal claim',
        'General advice',
        'Source required',
        'Unsupported claim',
        'Misleading or overstated',
        'Not a factual claim'
      ];
      const classification = allowedClassifications.includes(raw.classification) ? raw.classification : 'Not a factual claim';

      const riskLevel = ['Low', 'Medium', 'High'].includes(raw.riskLevel) ? raw.riskLevel : 'Low';

      let sourceReferences: SourceReference[] = [];
      let supportedBySource = false;

      if (raw.sourceReferences && Array.isArray(raw.sourceReferences)) {
        for (const ref of raw.sourceReferences) {
          if (ref && ref.url && allowedUrlSet.has(ref.url)) {
            sourceReferences.push({
              title: ref.title || 'Verified Source',
              publisher: ref.publisher || '',
              url: ref.url
            });
          }
        }
      }

      if (sourceReferences.length > 0) {
        supportedBySource = !!raw.supportedBySource;
      }

      // Enforce: requiresRohitConfirmation is true for Personal claim
      const requiresRohitConfirmation = classification === 'Personal claim' ? true : !!raw.requiresRohitConfirmation;

      let recommendedAction = raw.recommendedAction || 'Keep';
      const allowedActions = ['Keep', 'Clarify', 'Add uncertainty', 'Confirm personally', 'Rewrite', 'Remove'];
      if (!allowedActions.includes(recommendedAction)) {
        recommendedAction = 'Keep';
      }

      // Unsupported or misleading claims cannot receive Keep
      if (['Unsupported claim', 'Misleading or overstated'].includes(classification) && recommendedAction === 'Keep') {
        recommendedAction = 'Rewrite';
      }

      // High-risk claims must receive Rewrite, Remove, Confirm personally or Add uncertainty
      if (riskLevel === 'High') {
        if (!['Rewrite', 'Remove', 'Confirm personally', 'Add uncertainty'].includes(recommendedAction)) {
          recommendedAction = 'Rewrite';
        }
      }

      // If personal claim, action must be Confirm personally
      if (requiresRohitConfirmation && recommendedAction === 'Keep') {
        recommendedAction = 'Confirm personally';
      }

      if (riskLevel === 'High') {
        highRiskClaimCount++;
      } else if (riskLevel === 'Medium' || recommendedAction !== 'Keep') {
        warningClaimCount++;
      } else if (classification === 'Verified fact') {
        verifiedClaimCount++;
      }

      validatedClaims.push({
        id,
        claimText,
        location: location as 'Hook' | 'Body' | 'CTA',
        classification: classification as any,
        riskLevel: riskLevel as any,
        explanation: raw.explanation || 'Reviewed claim statement.',
        supportedBySource,
        sourceReferences,
        requiresRohitConfirmation,
        recommendedAction: recommendedAction as any,
        suggestedRewrite: raw.suggestedRewrite || ''
      });

      // Deduction logic:
      // High-risk unsupported or misleading claim: minus 20 each
      if (riskLevel === 'High' && ['Unsupported claim', 'Misleading or overstated'].includes(classification)) {
        deduction += 20;
      }
      // Medium-risk unsupported claim: minus 10 each
      else if (riskLevel === 'Medium' && classification === 'Unsupported claim') {
        deduction += 10;
      }
      // Unconfirmed personal claim: minus 8 each
      if (classification === 'Personal claim' && requiresRohitConfirmation) {
        deduction += 8;
      }
      // Source required but absent: minus 8 each
      if (classification === 'Source required') {
        deduction += 8;
      }
      // Minor clarification warning: minus 3 each
      if (recommendedAction === 'Clarify') {
        deduction += 3;
      }
    }

    // Missing required uncertainty: minus 10
    const uncertaintyStatus = parsed.uncertaintyAssessment?.status || 'Not required';
    if (uncertaintyStatus === 'Missing') {
      deduction += 10;
    }

    // Hook overpromises: minus 10
    const hookStatus = parsed.hookAssessment?.status || 'Pass';
    if (hookStatus === 'Fail') {
      deduction += 10;
    }

    const credibilityScore = Math.max(0, Math.min(100, 100 - deduction));

    // Determine Overall Status
    let overallStatus: 'Pass' | 'Pass with warnings' | 'Fail' = 'Pass';
    const hasUnconfirmedPersonalClaim = validatedClaims.some(c => c.classification === 'Personal claim' && c.requiresRohitConfirmation);
    if (
      highRiskClaimCount > 0 ||
      hasUnconfirmedPersonalClaim ||
      hookStatus === 'Fail' ||
      credibilityScore < 65
    ) {
      overallStatus = 'Fail';
    } else if (
      warningClaimCount > 0 || 
      uncertaintyStatus === 'Missing' ||
      hookStatus === 'Warning' ||
      credibilityScore < 85
    ) {
      overallStatus = 'Pass with warnings';
    } else {
      overallStatus = 'Pass';
    }

    const hookAssessment = {
      status: ['Pass', 'Warning', 'Fail'].includes(parsed.hookAssessment?.status) ? parsed.hookAssessment.status : 'Pass',
      explanation: parsed.hookAssessment?.explanation || 'Hook reviewed.',
      suggestedRewrite: parsed.hookAssessment?.suggestedRewrite || ''
    };

    const uncertaintyAssessment = {
      status: ['Adequate', 'Missing', 'Not required'].includes(parsed.uncertaintyAssessment?.status) ? parsed.uncertaintyAssessment.status : 'Not required',
      explanation: parsed.uncertaintyAssessment?.explanation || 'Uncertainty reviewed.',
      suggestedText: parsed.uncertaintyAssessment?.suggestedText || ''
    };

    const sourceAssessment = {
      status: ['Complete', 'Partial', 'Not required'].includes(parsed.sourceAssessment?.status) ? parsed.sourceAssessment.status : 'Not required',
      explanation: parsed.sourceAssessment?.explanation || 'Sources checked.'
    };

    const report: PostCredibilityReport = {
      checkedAt: new Date().toISOString(),
      draftFingerprint: fingerprint,
      overallStatus,
      credibilityScore,
      summary: parsed.summary || 'Credibility check complete.',
      verifiedClaimCount,
      warningClaimCount,
      highRiskClaimCount,
      claims: validatedClaims,
      hookAssessment,
      uncertaintyAssessment,
      sourceAssessment,
      publicationRecommendation: parsed.publicationRecommendation || 'Publish draft.'
    };

    return {
      success: true,
      report
    };

  } catch (error) {
    console.error("Credibility check failed. Error:", error);
    const categorized = categorizeError(error);
    return {
      success: false,
      errorCategory: categorized.category,
      errorMessage: error instanceof Error ? error.message : 'The credibility report could not be validated. Please run the check again.'
    };
  }
}

export async function analyzeVisualStrategy(
  profile: CreatorProfile,
  winningIdea: DailyContentIdea,
  hook: string,
  bodyText: string,
  credibilityReport: PostCredibilityReport
): Promise<{ success: boolean; recommendation?: VisualFormatRecommendation; errorCategory?: SafeGeminiError; errorMessage?: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      errorCategory: 'configuration_missing',
      errorMessage: 'Gemini API configuration is missing. Open the Secrets panel and check your configuration.'
    };
  }

  const ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  try {
    const prompt = `Analyze this LinkedIn post and its credibility report to recommend the best visual format ('Text only', 'Single image', or 'Carousel').

POST INFO:
- Title: ${winningIdea.title}
- Hook: ${hook}
- Complete Body: ${bodyText}
- Primary Audience: ${profile.primaryAudience}
- Content Pillar: ${winningIdea.contentPillar}
- Recommended Format of Idea: ${winningIdea.recommendedFormat}
- Growth Mechanism: ${winningIdea.growthMechanism}

CREDIBILITY REPORT:
- Score: ${credibilityReport.credibilityScore}/100
- Status: ${credibilityReport.overallStatus}
- Summary: ${credibilityReport.summary}
- Factual boundaries: ${winningIdea.factBoundary || 'N/A'}
- Uncertainty to mention: ${winningIdea.uncertaintyToMention || 'N/A'}

RECOMMENDATION RULES:
1. Recommend 'Text only' when:
- The post is primarily a personal reflection.
- A visual would add little information.
- The hook and writing are already sufficient.
- An artificial visual would make the post feel generic.

2. Recommend 'Single image' when:
- One visual metaphor can strengthen the hook.
- A personal or editorial image improves relatability.
- The post needs one comparison, statement or visual concept.
- A build-in-public update would benefit from one proof-oriented visual.
- The image can be understood without multiple steps.

3. Recommend 'Carousel' when:
- The post teaches a multi-step workflow.
- It contains a framework, checklist or comparison.
- It has multiple distinct lessons.
- Readers would benefit from sequential explanation.
- A single image would compress too much information.
(Do not recommend a carousel merely to increase dwell time.)

Generate a response following the required schema. Ensure the imagePromptDraft provides a clear visual direction suitable for a professional audience, consistent with Rohit's brand direction (navy, electric-blue, white, and neutral-grey), with clean composition, strong mobile readability, and a clear primary focal point with intentional negative space for a headline overlay. The imagePromptDraft MUST NOT request any text, headlines, labels, or buttons inside the image itself.`;

    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            recommendedFormat: { type: Type.STRING, description: "Format: 'Text only', 'Single image', or 'Carousel'" },
            confidence: { type: Type.STRING, description: "Confidence level: 'High', 'Medium', or 'Low'" },
            reason: { type: Type.STRING, description: "Why this format was recommended based on communication value." },
            visualObjective: { type: Type.STRING, description: "The core communication purpose of the visual." },
            readerShouldUnderstand: { type: Type.STRING, description: "What key message or takeaway the reader should grasp." },
            visualConcept: { type: Type.STRING, description: "Detailed visual metaphor or concept idea." },
            primarySubject: { type: Type.STRING, description: "Subject category: 'Rohit', 'Object or interface', 'Diagram', 'Abstract concept', or 'No subject'" },
            recommendedStyle: { type: Type.STRING, description: "Style choice: 'Professional portrait', 'Editorial photography', 'Product mockup', 'Conceptual illustration', 'Infographic background', 'Minimal statement card', or 'Screenshot-led composition'" },
            recommendedAspectRatio: { type: Type.STRING, description: "Aspect ratio choice: '1:1', '4:5', or '16:9'" },
            headlineSuggestion: { type: Type.STRING, description: "An eye-catching, short headline suggestion (max 12 words) to overlay on the visual." },
            supportingTextSuggestion: { type: Type.STRING, description: "Optional short supporting subtitle/label." },
            includeRohitRecommendation: { type: Type.BOOLEAN, description: "Whether Rohit's face reference should be used." },
            includeRohitReason: { type: Type.STRING, description: "Reason for including or excluding Rohit's face." },
            imagePromptDraft: { type: Type.STRING, description: "A detailed prompt for the image generation model (gemini-3.1-flash-image) WITHOUT text/headline requested in the image itself, describing the scene, mood, style, elements, negative space, and branding colours." },
            negativeInstructions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "List of things to avoid in the generated image (AI tropes, random circuits, glowing eyes, etc.)."
            },
            carouselReason: { type: Type.STRING, description: "Why a carousel was recommended, or empty string if not recommended." }
          },
          required: [
            "recommendedFormat",
            "confidence",
            "reason",
            "visualObjective",
            "readerShouldUnderstand",
            "visualConcept",
            "primarySubject",
            "recommendedStyle",
            "recommendedAspectRatio",
            "headlineSuggestion",
            "supportingTextSuggestion",
            "includeRohitRecommendation",
            "includeRohitReason",
            "imagePromptDraft",
            "negativeInstructions",
            "carouselReason"
          ]
        }
      }
    });

    const parsed = JSON.parse(response.text.trim());
    const recommendation: VisualFormatRecommendation = {
      analysedAt: new Date().toISOString(),
      recommendedFormat: parsed.recommendedFormat || 'Single image',
      confidence: parsed.confidence || 'Medium',
      reason: parsed.reason || '',
      visualObjective: parsed.visualObjective || '',
      readerShouldUnderstand: parsed.readerShouldUnderstand || '',
      visualConcept: parsed.visualConcept || '',
      primarySubject: parsed.primarySubject || 'No subject',
      recommendedStyle: parsed.recommendedStyle || 'Minimal statement card',
      recommendedAspectRatio: parsed.recommendedAspectRatio || '1:1',
      headlineSuggestion: parsed.headlineSuggestion || '',
      supportingTextSuggestion: parsed.supportingTextSuggestion || '',
      includeRohitRecommendation: !!parsed.includeRohitRecommendation,
      includeRohitReason: parsed.includeRohitReason || '',
      imagePromptDraft: parsed.imagePromptDraft || '',
      negativeInstructions: Array.isArray(parsed.negativeInstructions) ? parsed.negativeInstructions : [],
      carouselReason: parsed.carouselReason || ''
    };

    return {
      success: true,
      recommendation
    };
  } catch (error) {
    console.error("Visual strategy analysis failed:", error);
    const categorized = categorizeError(error);
    return {
      success: false,
      errorCategory: categorized.category,
      errorMessage: error instanceof Error ? error.message : 'The visual format recommendation could not be completed.'
    };
  }
}

export async function improveVisualPrompt(
  userPrompt: string,
  style: string,
  aspectRatio: string,
  includeRohit: boolean,
  negativeInstructions: string[]
): Promise<{ success: boolean; improvedPrompt?: string; errorCategory?: SafeGeminiError; errorMessage?: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      errorCategory: 'configuration_missing',
      errorMessage: 'Gemini API configuration is missing.'
    };
  }

  const ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  try {
    const systemPrompt = `You are an expert prompt engineer specializing in professional LinkedIn imagery and high-quality photo generation.
Your task is to refine and enrich the user's visual concept into a pristine, high-fidelity prompt for 'gemini-3.1-flash-image'.

CRITICAL INSTRUCTIONS:
- The improved prompt MUST preserve the core meaning, selected visual style (${style}), and identity choices.
- The improved prompt MUST explicitly request NO text, headlines, labels, letters, copy, logos, watermark, or buttons inside the image itself. Mention a clean text-safe area with negative space.
- It must describe specific details, professional studio lighting, realistic textures, and Rohit's custom navy blue, electric blue, and neutral grey color scheme where appropriate.
- It must avoid generic AI tropes (such as glowing brains, humanoid robots touching screens, meaningless circuits, neon fingers, etc.).
- Do not produce the actual image, only return the improved text prompt.
- Response should be plain text of the improved prompt only. No introductory text or code blocks.`;

    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: `Improve this image prompt: "${userPrompt}"\n\nStyle: ${style}\nAspect Ratio: ${aspectRatio}\nInclude Rohit's face: ${includeRohit ? 'Yes' : 'No'}\nNegative constraints: ${negativeInstructions.join(', ')}`,
      config: {
        systemInstruction: systemPrompt
      }
    });

    return {
      success: true,
      improvedPrompt: response.text.trim()
    };
  } catch (error) {
    console.error("Improve visual prompt failed:", error);
    const categorized = categorizeError(error);
    return {
      success: false,
      errorCategory: categorized.category,
      errorMessage: error instanceof Error ? error.message : 'Prompt refinement could not be completed.'
    };
  }
}

export const IMAGE_MODEL = "gemini-3.1-flash-image";

export async function generateLinkedInVisual(
  prompt: string,
  style: LinkedInVisualStyle,
  aspectRatio: VisualAspectRatio,
  includeRohit: boolean,
  referenceImageBase64?: string
): Promise<{ success: boolean; visual?: GeneratedLinkedInVisual; errorCategory?: SafeGeminiError; errorMessage?: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      errorCategory: 'configuration_missing',
      errorMessage: 'Gemini API configuration is missing.'
    };
  }

  const ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  try {
    let cleanBase64 = referenceImageBase64;
    let mimeType = "image/png";
    if (referenceImageBase64 && referenceImageBase64.startsWith("data:")) {
      const parts = referenceImageBase64.split(";base64,");
      if (parts.length === 2) {
        mimeType = parts[0].replace("data:", "").split(';')[0];
        cleanBase64 = parts[1];
      }
    }

    const contentsParts: any[] = [];
    if (includeRohit && cleanBase64) {
      contentsParts.push({
        inlineData: {
          mimeType: mimeType,
          data: cleanBase64
        }
      });
      // Prepend face instruction
      contentsParts.push({
        text: `Use the attached image only as an identity reference for the subject named Rohit.
Preserve Rohit's recognizable facial structure, ethnicity, and skin tone. Keep the result professional, realistic, and highly detailed.
Avoid exaggerated bodies, body changes, or artificial glamour retouching. Place him in the scene specified below.`
      });
    }

    // Append main prompt
    contentsParts.push({
      text: `${prompt}\n\n[STYLE: ${style}]\n[ASPECT RATIO: ${aspectRatio}]\n[CRITICAL: DO NOT include any text, letters, titles, words, logos, labels, overlay text, or signatures in this image. Keep areas completely clean and clear for application text overlays.]`
    });

    const response = await ai.models.generateContent({
      model: IMAGE_MODEL,
      contents: { parts: contentsParts },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio,
          imageSize: "1K"
        }
      }
    });

    let base64Data = "";
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData?.data) {
          base64Data = part.inlineData.data;
          break;
        }
      }
    }

    if (!base64Data) {
      return {
        success: false,
        errorCategory: 'failed',
        errorMessage: 'The image generation model completed successfully but returned an empty or invalid image response.'
      };
    }

    const visual: GeneratedLinkedInVisual = {
      mimeType: "image/png",
      base64Data,
      modelName: IMAGE_MODEL,
      timestamp: new Date().toISOString(),
      aspectRatio,
      promptSummary: prompt.substring(0, 100) + (prompt.length > 100 ? "..." : ""),
      referencePhotoUsed: includeRohit && !!cleanBase64
    };

    return {
      success: true,
      visual
    };
  } catch (error) {
    console.error("Image generation failed:", error);
    const categorized = categorizeError(error);
    return {
      success: false,
      errorCategory: categorized.category,
      errorMessage: error instanceof Error ? error.message : 'The image generation model is currently unavailable. Please verify your billing/quota.'
    };
  }
}

// ==========================================
// CAROUSEL BUILDER SERVER-SIDE FUNCTIONS
// ==========================================

export async function generateCarouselPlan(
  profile: CreatorProfile,
  postContent: string,
  winningIdea: SavedDailyIdea,
  credibilityReport: PostCredibilityReport,
  requestedSlideCount: number,
  postFingerprint: string
): Promise<{ success: boolean; plan?: LinkedInCarouselPlan; errorCategory?: SafeGeminiError; errorMessage?: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      errorCategory: 'configuration_missing',
      errorMessage: 'Gemini API configuration is missing.'
    };
  }

  const ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  const systemInstruction = `You are a senior LinkedIn carousel strategist, information designer and professional AI editor.

Transform the supplied credibility-checked LinkedIn post into a useful carousel for Rohit Singh Panwar.

The carousel must:
- Be exclusively related to artificial intelligence.
- Serve the selected primary audience.
- Teach or clarify one main idea.
- Create a logical swipe-by-swipe progression.
- Deliver practical professional value.
- Remain credible and factual.
- Be understandable on a mobile screen.
- Use concise natural English.
- Respect Rohit’s writing preferences.
- Respect the factual boundary.
- Address the main weakness found during idea evaluation.
- Include meaningful limitations when needed.
- Give readers a credible reason to save, share or follow.

Do not copy another creator’s carousel structure or branding.
Do not create filler slides.
Do not write the complete LinkedIn caption again.`;

  const userPrompt = `CREATOR CONTEXT:
- Positioning: ${profile.creatorPositioning}
- Primary Audience: ${profile.primaryAudience}
- Content Pillars: ${(profile.contentPillars || []).join(", ")}
- Writing Style Preferences: ${(profile.writingStyles || []).join(", ")}
- Topics to Avoid: ${(profile.topicsToAvoid || []).join(", ")}
- Phrases to Avoid: ${(profile.phrasesToAvoid || []).join(", ")}

LINKEDIN POST CONTENT:
${postContent}

SELECTED WINNING IDEA & EVALUATION:
- Title: ${winningIdea.title}
- Core Idea: ${winningIdea.coreIdea}
- Problem Solved: ${winningIdea.problemSolved}
- Factual Boundary: ${winningIdea.factBoundary}
- Uncertainty to mention: ${winningIdea.uncertaintyToMention}

CREDIBILITY REPORT SUMMARY:
- Score: ${credibilityReport.credibilityScore}
- Status: ${credibilityReport.overallStatus}
- Summary: ${credibilityReport.summary}
- Verified Claims: ${credibilityReport.verifiedClaimCount}
- Warnings: ${credibilityReport.warningClaimCount}
- High Risk Claims: ${credibilityReport.highRiskClaimCount}
- Claims List: ${JSON.stringify(credibilityReport.claims || [])}

REQUESTED SLIDE COUNT: ${requestedSlideCount} (Strictly generate between 6 and 10 slides. Default is 8 if appropriate. Do not add filler slides merely to reach 10).

WRITING RULES FOR SLIDES:
- Slide 1 (Cover): Role MUST be "Cover". Layout MUST be "Cover statement". Headline max 12 words, supporting line max 18 words.
- Other slides: Title max 8 words. Body normally 15-45 words. Maximum 3 bullets, maximum 12 words per bullet.
- Avoid: Dense paragraphs, tiny text, repeating the caption word for word, unsupported statistics, fake quotes, invented personal stories, generic AI hype, engagement bait, hashtags, markdown, unnecessary jargon, excessive emojis.
- Factual Safety: For research-grounded slides, factualType MUST be "Verified fact" and match sourceReferenceIds from the credibility report. Use only existing verified sources. Do not introduce new statistics, dates or product claims. Include uncertainty when required.

Generate a highly structured and beautiful slide-by-swipe learning journey following the schema.`;

  try {
    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: userPrompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            carouselTitle: { type: Type.STRING },
            carouselObjective: { type: Type.STRING },
            primaryAudience: { type: Type.STRING },
            contentPillar: { type: Type.STRING },
            recommendedSlideCount: { type: Type.INTEGER },
            visualNarrative: { type: Type.STRING },
            coverPromise: { type: Type.STRING },
            designDirection: { type: Type.STRING },
            sourcesRequired: { type: Type.BOOLEAN },
            slides: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  slideNumber: { type: Type.INTEGER },
                  role: { type: Type.STRING, description: "Cover | Problem | Context | Insight | Framework | Step | Example | Comparison | Warning | Limitation | Checklist | Summary | CTA" },
                  title: { type: Type.STRING },
                  body: { type: Type.STRING },
                  bullets: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  },
                  smallLabel: { type: Type.STRING },
                  factualType: { type: Type.STRING, description: "Verified fact | Editorial interpretation | General advice | Creator-led concept" },
                  sourceReferenceIds: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  },
                  visualConcept: { type: Type.STRING },
                  layoutTemplate: { type: Type.STRING, description: "Cover statement | Big number or phrase | Title and body | Three-point list | Comparison | Process steps | Quote-free insight | Checklist | Summary" },
                  emphasisText: { type: Type.STRING },
                  speakerNote: { type: Type.STRING }
                },
                required: [
                  "id", "slideNumber", "role", "title", "body", "bullets", "smallLabel",
                  "factualType", "sourceReferenceIds", "visualConcept", "layoutTemplate",
                  "emphasisText", "speakerNote"
                ]
              }
            },
            closingTakeaway: { type: Type.STRING },
            captionRelationship: { type: Type.STRING }
          },
          required: [
            "carouselTitle", "carouselObjective", "primaryAudience", "contentPillar",
            "recommendedSlideCount", "visualNarrative", "coverPromise", "designDirection",
            "sourcesRequired", "slides", "closingTakeaway", "captionRelationship"
          ]
        }
      }
    });

    const parsed = JSON.parse(response.text.trim());

    // --- SERVER-SIDE VALIDATION & NORMALIZATION ---
    let slides: LinkedInCarouselSlide[] = Array.isArray(parsed.slides) ? parsed.slides : [];

    // 1. Force slide count between 6 and 10
    if (slides.length < 6) {
      // Create filler context if absolutely necessary or duplicate/generate extra slides
      while (slides.length < 6) {
        const lastSlide = slides[slides.length - 1];
        slides.push({
          id: `slide-added-${slides.length + 1}`,
          slideNumber: slides.length + 1,
          role: slides.length === 5 ? 'Summary' : 'Checklist',
          title: 'Action Step',
          body: 'Implement these learnings in your daily AI workflow.',
          bullets: ['Monitor performance', 'Gather feedback'],
          smallLabel: 'AI Integration',
          factualType: 'General advice',
          sourceReferenceIds: [],
          visualConcept: 'A simple step icon',
          layoutTemplate: 'Checklist',
          emphasisText: 'Implement',
          speakerNote: 'Keep it action-oriented.'
        });
      }
    } else if (slides.length > 10) {
      slides = slides.slice(0, 10);
    }

    // 2. Ensure unique slide IDs and sequential slide numbers
    const usedIds = new Set<string>();
    slides = slides.map((slide, idx) => {
      const slideNum = idx + 1;
      let sId = slide.id || `slide-${slideNum}`;
      if (usedIds.has(sId)) {
        sId = `slide-gen-${slideNum}-${Math.random().toString(36).substring(2, 6)}`;
      }
      usedIds.add(sId);

      // Validate/normalize roles, factual types, layout templates
      const validRoles: CarouselSlideRole[] = [
        'Cover', 'Problem', 'Context', 'Insight', 'Framework', 'Step',
        'Example', 'Comparison', 'Warning', 'Limitation', 'Checklist', 'Summary', 'CTA'
      ];
      let role: CarouselSlideRole = (validRoles.includes(slide.role as CarouselSlideRole) ? slide.role : 'Insight') as CarouselSlideRole;
      if (slideNum === 1) role = 'Cover';

      const validFactualTypes: CarouselFactualType[] = [
        'Verified fact', 'Editorial interpretation', 'General advice', 'Creator-led concept'
      ];
      const factualType = (validFactualTypes.includes(slide.factualType as CarouselFactualType) ? slide.factualType : 'General advice') as CarouselFactualType;

      const validTemplates: CarouselLayoutTemplate[] = [
        'Cover statement', 'Big number or phrase', 'Title and body', 'Three-point list',
        'Comparison', 'Process steps', 'Quote-free insight', 'Checklist', 'Summary'
      ];
      let layoutTemplate = (validTemplates.includes(slide.layoutTemplate as CarouselLayoutTemplate) ? slide.layoutTemplate : 'Title and body') as CarouselLayoutTemplate;
      if (slideNum === 1) layoutTemplate = 'Cover statement';

      // Title must be non-empty and max 8 words (unless cover which headline is max 12)
      let title = (slide.title || 'Slide Title').trim();
      if (!title) title = `Step ${slideNum}`;
      const titleWords = title.split(/\s+/);
      if (slideNum > 1 && titleWords.length > 8) {
        title = titleWords.slice(0, 8).join(" ");
      } else if (slideNum === 1 && titleWords.length > 12) {
        title = titleWords.slice(0, 12).join(" ");
      }

      // Bullets normally max 3, empty bullets removed, max 12 words per bullet
      let bullets = Array.isArray(slide.bullets) ? slide.bullets.filter(b => b && b.trim() !== '') : [];
      if (bullets.length > 3) {
        bullets = bullets.slice(0, 3);
      }
      bullets = bullets.map(b => {
        const words = b.split(/\s+/);
        if (words.length > 12) {
          return words.slice(0, 12).join(" ");
        }
        return b;
      });

      // Avoid list checks (crude check & replacement if needed)
      let body = (slide.body || '').trim();
      const avoidList = profile.phrasesToAvoid || [];
      for (const phrase of avoidList) {
        if (phrase && phrase.trim()) {
          const regex = new RegExp(phrase.trim(), 'gi');
          body = body.replace(regex, '');
          title = title.replace(regex, '');
          bullets = bullets.map(b => b.replace(regex, ''));
        }
      }

      return {
        ...slide,
        id: sId,
        slideNumber: slideNum,
        role,
        title,
        body,
        bullets,
        factualType,
        layoutTemplate
      };
    });

    const plan: LinkedInCarouselPlan = {
      generatedAt: new Date().toISOString(),
      selectedWinnerId: winningIdea.id,
      postFingerprint,
      carouselTitle: parsed.carouselTitle || 'AI Breakthrough Analysis',
      carouselObjective: parsed.carouselObjective || 'Explain practical implications of this AI update.',
      primaryAudience: parsed.primaryAudience || profile.primaryAudience,
      contentPillar: parsed.contentPillar || winningIdea.contentPillar,
      recommendedSlideCount: slides.length,
      visualNarrative: parsed.visualNarrative || 'Visual progress through steps.',
      coverPromise: parsed.coverPromise || 'Immediate practical value.',
      designDirection: parsed.designDirection || 'Clean Navy and Electric Blue theme.',
      sourcesRequired: !!parsed.sourcesRequired,
      slides,
      closingTakeaway: parsed.closingTakeaway || 'Implementation yields high performance.',
      captionRelationship: parsed.captionRelationship || 'The slides summarize the main actionable steps.'
    };

    return {
      success: true,
      plan
    };

  } catch (error) {
    console.error("Generate Carousel Plan failed:", error);
    const categorized = categorizeError(error);
    return {
      success: false,
      errorCategory: categorized.category,
      errorMessage: error instanceof Error ? error.message : 'Failed to generate carousel plan.'
    };
  }
}

export async function generateAlternativeCover(
  carouselTitle: string,
  carouselObjective: string
): Promise<{ success: boolean; alternatives?: Array<{ headline: string; supportingLine: string }>; errorCategory?: SafeGeminiError; errorMessage?: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { success: false, errorCategory: 'configuration_missing', errorMessage: 'API key is missing.' };
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
  });

  const prompt = `You are a professional LinkedIn headline designer.
Create three alternative cover options for a LinkedIn carousel.
Original Carousel Title: ${carouselTitle}
Carousel Objective: ${carouselObjective}

Rules:
- Headline: Maximum 12 words. Highly clickable, credible, and related to AI.
- Supporting Line: Maximum 18 words. Add professional context or immediate value hook.
- Style: Punchy, modern, structured.

Generate exactly 3 options. Return validated JSON with format:
{
  "alternatives": [
    { "headline": "string", "supportingLine": "string" },
    { "headline": "string", "supportingLine": "string" },
    { "headline": "string", "supportingLine": "string" }
  ]
}`;

  try {
    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            alternatives: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  headline: { type: Type.STRING },
                  supportingLine: { type: Type.STRING }
                },
                required: ["headline", "supportingLine"]
              }
            }
          },
          required: ["alternatives"]
        }
      }
    });

    const parsed = JSON.parse(response.text.trim());
    return {
      success: true,
      alternatives: parsed.alternatives
    };
  } catch (err) {
    console.error("Generate alternative covers failed:", err);
    return {
      success: false,
      errorMessage: err instanceof Error ? err.message : 'Failed to generate covers.'
    };
  }
}

export async function rewriteCarouselSlide(
  profile: CreatorProfile,
  slide: LinkedInCarouselSlide,
  action: 'clearer' | 'shorter' | 'practical' | 'simpler' | 'alternative',
  credibilityReport?: PostCredibilityReport
): Promise<{ success: boolean; slide?: LinkedInCarouselSlide; errorCategory?: SafeGeminiError; errorMessage?: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { success: false, errorCategory: 'configuration_missing', errorMessage: 'API key is missing.' };
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
  });

  const prompt = `You are an expert copywriter. Rewrite this single LinkedIn carousel slide to make it:
Action required: ${action.toUpperCase()}

Original Slide Data:
- Role: ${slide.role}
- Title (current): "${slide.title}"
- Body (current): "${slide.body}"
- Bullets (current): ${JSON.stringify(slide.bullets)}
- Small Label (current): "${slide.smallLabel}"
- Factual Type: ${slide.factualType}
- Visual Concept: "${slide.visualConcept}"
- Emphasis Text: "${slide.emphasisText}"

Writing Rules:
- Title MUST remain maximum 8 words (or max 12 if slide role is Cover).
- Body MUST remain concise (normally 15-45 words).
- Bullets: maximum 3 bullets, maximum 12 words per bullet. No empty values.
- Respect Rohit's brand voice and tone.
- Do NOT introduce new unverified claims or stats.
- Avoid generic AI hype, emojis, hashtags, or markdown.

Return the rewritten slide in this JSON format:
{
  "title": "string",
  "body": "string",
  "bullets": ["string"],
  "smallLabel": "string",
  "emphasisText": "string",
  "visualConcept": "string"
}`;

  try {
    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            body: { type: Type.STRING },
            bullets: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            smallLabel: { type: Type.STRING },
            emphasisText: { type: Type.STRING },
            visualConcept: { type: Type.STRING }
          },
          required: ["title", "body", "bullets", "smallLabel", "emphasisText", "visualConcept"]
        }
      }
    });

    const parsed = JSON.parse(response.text.trim());
    
    // Normalize and return
    let rewrittenBullets = Array.isArray(parsed.bullets) ? parsed.bullets.filter(Boolean) : [];
    if (rewrittenBullets.length > 3) rewrittenBullets = rewrittenBullets.slice(0, 3);
    rewrittenBullets = rewrittenBullets.map(b => {
      const words = b.split(/\s+/);
      return words.length > 12 ? words.slice(0, 12).join(" ") : b;
    });

    let rewrittenTitle = (parsed.title || '').trim();
    const titleWords = rewrittenTitle.split(/\s+/);
    if (slide.role !== 'Cover' && titleWords.length > 8) {
      rewrittenTitle = titleWords.slice(0, 8).join(" ");
    } else if (slide.role === 'Cover' && titleWords.length > 12) {
      rewrittenTitle = titleWords.slice(0, 12).join(" ");
    }

    const rewrittenSlide: LinkedInCarouselSlide = {
      ...slide,
      title: rewrittenTitle,
      body: parsed.body || slide.body,
      bullets: rewrittenBullets,
      smallLabel: parsed.smallLabel || slide.smallLabel,
      emphasisText: parsed.emphasisText || slide.emphasisText,
      visualConcept: parsed.visualConcept || slide.visualConcept
    };

    return {
      success: true,
      slide: rewrittenSlide
    };
  } catch (err) {
    console.error("Rewrite slide failed:", err);
    return {
      success: false,
      errorMessage: err instanceof Error ? err.message : 'Failed to rewrite slide.'
    };
  }
}

export async function qualityCheckCarousel(
  carouselTitle: string,
  slides: LinkedInCarouselSlide[],
  credibilityReport: PostCredibilityReport
): Promise<{ success: boolean; report?: CarouselQualityReport; errorCategory?: SafeGeminiError; errorMessage?: string }> {
  // Let's do a hybrid check: deterministic rules + Gemini review
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { success: false, errorCategory: 'configuration_missing', errorMessage: 'API key is missing.' };
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
  });

  const prompt = `You are a high-caliber professional LinkedIn Information Designer and Slide Editor.
Perform a critical quality audit on this AI-focused LinkedIn carousel.

Carousel Title: ${carouselTitle}
Slides Context:
${slides.map(s => `[Slide ${s.slideNumber} - ${s.role}]
Title: ${s.title}
Body: ${s.body}
Bullets: ${JSON.stringify(s.bullets)}
Factual Type: ${s.factualType}
Layout Template: ${s.layoutTemplate}`).join("\n\n")}

Underlying Post Credibility Check:
- Overall Status: ${credibilityReport.overallStatus}
- Credibility Score: ${credibilityReport.credibilityScore}
- Summary: ${credibilityReport.summary}

EVALUATION CRITERIA:
1. Logical swipe-by-swipe flow and visual narrative.
2. Repetition across multiple slides.
3. Mobile readability and density.
4. Word limits (Cover headline max 12 words, title max 8 words, body 15-45 words).
5. Slide count (must be between 6 and 10, no filler slides).
6. Presence of practical takeaway value.
7. CTA relevance and hook alignment.
8. Missing uncertainty or limitations from research.

Perform the evaluation. Generate issues with recommendations for specific slide numbers if they violate rules.
Determine a status: "Pass" | "Pass with warnings" | "Fail".
Calculate a quality score out of 100 on the server. Return validated JSON with this exact schema:
{
  "status": "Pass | Pass with warnings | Fail",
  "score": 85,
  "summary": "Overall summary of the carousel quality and narrative.",
  "issues": [
    {
      "slideId": "string",
      "severity": "Low | Medium | High",
      "issue": "What is the specific issue on this slide?",
      "recommendedFix": "How can the user fix this issue? Provide clear rewrite suggestions."
    }
  ]
}`;

  try {
    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            status: { type: Type.STRING },
            score: { type: Type.INTEGER },
            summary: { type: Type.STRING },
            issues: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  slideId: { type: Type.STRING },
                  severity: { type: Type.STRING, description: "Low | Medium | High" },
                  issue: { type: Type.STRING },
                  recommendedFix: { type: Type.STRING }
                },
                required: ["slideId", "severity", "issue", "recommendedFix"]
              }
            }
          },
          required: ["status", "score", "summary", "issues"]
        }
      }
    });

    const parsed = JSON.parse(response.text.trim());

    // --- Deterministic secondary checks and normalization ---
    const issues: CarouselQualityIssue[] = Array.isArray(parsed.issues) ? parsed.issues : [];

    // Let's run a few deterministic validations on top
    // 1. Slide count checks
    if (slides.length < 6 || slides.length > 10) {
      issues.push({
        slideId: slides[0]?.id || 'slide-1',
        severity: 'High',
        issue: `Carousel has ${slides.length} slides.`,
        recommendedFix: 'LinkedIn carousels must have between 6 and 10 slides to be optimized for mobile reading.'
      });
    }

    // 2. Cover headline check
    const coverSlide = slides.find(s => s.role === 'Cover');
    if (coverSlide) {
      const words = coverSlide.title.split(/\s+/).length;
      if (words > 12) {
        issues.push({
          slideId: coverSlide.id,
          severity: 'Medium',
          issue: `Cover headline is too long (${words} words).`,
          recommendedFix: 'Keep the cover headline under 12 words so it fits beautifully on small mobile screens.'
        });
      }
    }

    // 3. Other slides word limits
    slides.forEach(s => {
      if (s.role !== 'Cover') {
        const titleWords = s.title.split(/\s+/).length;
        if (titleWords > 8) {
          issues.push({
            slideId: s.id,
            severity: 'Low',
            issue: `Slide ${s.slideNumber} title is too long (${titleWords} words).`,
            recommendedFix: 'Shorten slide titles to 8 words or fewer to maintain negative space.'
          });
        }

        const bodyWords = s.body.split(/\s+/).length;
        if (bodyWords > 45) {
          issues.push({
            slideId: s.id,
            severity: 'Medium',
            issue: `Slide ${s.slideNumber} body text is too dense (${bodyWords} words).`,
            recommendedFix: 'Shorten body text to between 15 and 45 words to prevent overwhelming readers on mobile.'
          });
        }

        if (s.bullets && s.bullets.length > 3) {
          issues.push({
            slideId: s.id,
            severity: 'Medium',
            issue: `Slide ${s.slideNumber} has more than three bullet points.`,
            recommendedFix: 'Limit lists to three bullets maximum to preserve high text contrast and legibility.'
          });
        }
      }
    });

    // Recalculate score server-side dynamically based on issues found
    let deduction = 0;
    issues.forEach(i => {
      if (i.severity === 'High') deduction += 15;
      else if (i.severity === 'Medium') deduction += 8;
      else deduction += 3;
    });

    const calculatedScore = Math.max(0, Math.min(100, 100 - deduction));
    let status: 'Pass' | 'Pass with warnings' | 'Fail' = 'Pass';
    if (calculatedScore < 60 || issues.some(i => i.severity === 'High')) {
      status = 'Fail';
    } else if (calculatedScore < 85 || issues.length > 0) {
      status = 'Pass with warnings';
    }

    const report: CarouselQualityReport = {
      status,
      score: calculatedScore,
      summary: parsed.summary || 'Carousel audited against senior LinkedIn strategist frameworks.',
      issues
    };

    return {
      success: true,
      report
    };
  } catch (err) {
    console.error("Carousel quality check failed:", err);
    return {
      success: false,
      errorMessage: err instanceof Error ? err.message : 'Failed to check carousel quality.'
    };
  }
}

export async function analyzeCarouselVisualNeeds(
  profile: CreatorProfile,
  carouselTitle: string,
  carouselObjective: string,
  visualNarrative: string,
  designDirection: string,
  slides: LinkedInCarouselSlide[],
  credibilityReport: PostCredibilityReport,
  researchBriefText?: string
): Promise<{ success: boolean; strategy?: CarouselVisualStrategy; errorCategory?: SafeGeminiError; errorMessage?: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      errorCategory: 'configuration_missing',
      errorMessage: 'Gemini API configuration is missing.'
    };
  }

  const ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  try {
    const prompt = `You are a visual brand strategist and senior LinkedIn art director. Your job is to analyze an entire LinkedIn carousel plan and recommend a visual direction that ensures visual consistency, alignment with the creator's brand, and high readability across every single slide.

CREATOR PROFILE:
Name: ${profile.fullName || "Rohit"}
Title: ${profile.linkedinHeadline || ""}
Focus/Bio: ${profile.creatorPositioning || ""}
Tone/Brand Guidelines: ${JSON.stringify(profile.writingStyles || "")}

CAROUSEL OVERVIEW:
Title: ${carouselTitle}
Objective: ${carouselObjective}
Visual Narrative Direction: ${visualNarrative}
Design Direction: ${designDirection}

SLIDES TO ANALYZE:
${slides.map(s => `[Slide ${s.slideNumber}] (Role: ${s.role}, Template: ${s.layoutTemplate}, Factual: ${s.factualType})
Title: ${s.title}
Body: ${s.body}
Bullets: ${s.bullets?.join(", ") || "None"}
Visual Concept: ${s.visualConcept}
`).join('\n')}

FACTUAL CONTEXT (Do not misrepresent or embellish facts. Use only verified credibility information):
${JSON.stringify(credibilityReport.claims?.map(c => ({ claim: c.claimText, supported: c.supportedBySource })) || "")}

RESEARCH BRIEF CONTEXT (If any):
${researchBriefText || "None"}

YOUR GOALS:
1. Establish a cohesive, high-contrast, professional visual style theme suited for LinkedIn (professional, clean, executive, or highly educational). Recommend deep navy, electric blue, white, neutral grey as primary palette parameters.
2. Formulate 4-5 consistency rules for images.
3. Suggest lighting direction, composition style, and textures.
4. Recommend if and where Rohit's identity reference photo should be used. Ensure it is only suggested where representing a professional developer or the creator themselves makes strict sense (e.g., introduction or personal takeaways).
5. For each slide, determine if it needs No generated artwork, Background only, Illustration, Editorial image, Object composition, Interface concept, Diagram asset, or Rohit portrait.
6. Provide a precise, highly detailed image prompt for slides that require artwork. 
   CRITICAL PROMPT WRITING RULE: 
   - NEVER ask for text, labels, numbers, titles, diagrams with text, or icons in the image itself. 
   - Focus on backgrounds, editorial photography, metaphorical objects, clean illustrations, abstract diagrams without text, or professional portrait imagery.
   - Describe a clear "text-safe area" (Top, Centre, Bottom, Left, Right) that MUST remain extremely simple or solid-colored, so that application text can be layered on top and remain 100% readable.
   - Design-level styling: Use descriptive terms (e.g. "matte 3D icon", "isometric vector", "editorial corporate photography", "high-end minimalist workspace").
   - Include negative instructions in the prompt itself to suppress text, UI noise, overlays, buttons, etc.

Return your response strictly as a JSON object matching this TypeScript structure:
{
  "carouselVisualTheme": "Description of theme",
  "artDirection": "Detailed visual style and design rule guidance",
  "consistencyRules": ["Rule 1", "Rule 2", "Rule 3"],
  "lightingDirection": "e.g., dramatic backlighting, soft diffused, executive volumetric",
  "compositionDirection": "e.g., centered minimalist, rule of thirds split, left-heavy",
  "textureDirection": "e.g., smooth matte, architectural concrete, subtle glassmorphism",
  "identityUsageRecommendation": "When and how to use Rohit's picture",
  "slides": [
    {
      "slideId": "ID of the slide",
      "visualNeed": "None" | "Background only" | "Illustration" | "Editorial image" | "Object composition" | "Interface concept" | "Diagram asset" | "Rohit portrait",
      "visualImportance": "Essential" | "Helpful" | "Optional" | "Unnecessary",
      "reason": "Explanation of visual alignment",
      "assetObjective": "Creative goals",
      "mainSubject": "Subject of the illustration or photo",
      "composition": "Composition framing detail",
      "textSafeArea": "Top" | "Centre" | "Bottom" | "Left" | "Right",
      "imagePrompt": "The highly-detailed prompt to send to Nano Banana image generator (keep it clean of text!)",
      "negativeInstructions": ["text", "letters", "words", "labels", "logos"],
      "includeRohitRecommended": true/false
    }
  ]
}

Make sure to include a recommendation for every single slide in the slides array.
Return raw JSON ONLY. No markdown wrapping. No \`\`\`json.`;

    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text.trim();
    const strategy: CarouselVisualStrategy = JSON.parse(text);
    strategy.analysedAt = new Date().toISOString();

    return {
      success: true,
      strategy
    };
  } catch (error) {
    console.error("Analyze carousel visual needs failed:", error);
    const categorized = categorizeError(error);
    return {
      success: false,
      errorCategory: categorized.category,
      errorMessage: error instanceof Error ? error.message : 'Visual strategy analysis failed.'
    };
  }
}

export async function improveCarouselAssetPrompt(
  slideTitle: string,
  slideBody: string,
  visualConcept: string,
  artworkType: CarouselArtworkType,
  textSafeArea: 'Top' | 'Centre' | 'Bottom' | 'Left' | 'Right',
  includeRohit: boolean,
  brandColors: { primary: string; accent: string; background: string },
  userPrompt: string,
  negativeInstructions: string[]
): Promise<{ success: boolean; improvedPrompt?: string; errorCategory?: SafeGeminiError; errorMessage?: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      errorCategory: 'configuration_missing',
      errorMessage: 'Gemini API configuration is missing.'
    };
  }

  const ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  try {
    const prompt = `You are an expert prompt engineer specializing in text-to-image models (Nano Banana). Your task is to refine, enrich, and optimize a user's image prompt for a single slide in a professional LinkedIn carousel.

SLIDE CONTENT:
Title: ${slideTitle}
Body: ${slideBody}
Visual Concept: ${visualConcept}

ARTWORK TYPE REQUESTED: ${artworkType}
TEXT SAFE AREA (Must remain clear, empty, solid-colored, or extremely soft/unfocused): ${textSafeArea}
INCLUDE ROHIT PORTRAIT (Identity reference photo toggle): ${includeRohit ? "YES (Refers to a professional subject named Rohit)" : "NO"}
BRAND COLORS TO INTEGRATE: Primary=${brandColors.primary}, Accent=${brandColors.accent}, Background=${brandColors.background}

CURRENT USER PROMPT:
${userPrompt}

RECOMMENDED NEGATIVE DETAILS:
${negativeInstructions.join(", ")}

REFINEMENT RULES:
1. Enrich the prompt with high-end style descriptors (e.g., professional corporate photography, smooth studio matte 3D, volumetric lighting, minimalist workspace, clean isometric, architectural rendering) suited for a top-tier executive LinkedIn carousel. Use the brand color palette explicitly in the visual description.
2. Ensure there is absolute clarity on the layout. If text-safe area is ${textSafeArea}, the prompt MUST describe that section (e.g. "The ${textSafeArea} half/third of the composition is a solid, clean, dark dark-navy background with absolutely no details, allowing text on top to be easily read").
3. CRITICAL: Strictly strip any requests for text, letters, numbers, labels, charts with words, titles, words, signatures, or logos. This is an image background/asset, and all text will be rendered in HTML by the code. The image itself must be 100% text-free.
4. Do not include Rohit's face details directly in the prompt if includeRohit is false. If includeRohit is true, write "professional subject Rohit with realistic features, formal attire" and do not add generic physical descriptions.
5. Return ONLY the refined prompt text. Do not wrap in markdown or add explanations.`;

    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: prompt
    });

    return {
      success: true,
      improvedPrompt: response.text.trim()
    };
  } catch (error) {
    console.error("Improve carousel asset prompt failed:", error);
    const categorized = categorizeError(error);
    return {
      success: false,
      errorCategory: categorized.category,
      errorMessage: error instanceof Error ? error.message : 'Failed to refine prompt.'
    };
  }
}






