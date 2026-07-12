import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import { FieldValue } from "firebase-admin/firestore";

import {
  verifyFirebaseToken,
  db,
} from "./src/server/firebaseAdmin";

import {
  testGeminiConnection,
  testOpenRouterBackup,
  generateContentIdea,
  generateLiveResearch,
  generateGroundedContentIdea,
  generateDailyResearchBrief,
  generateDailyIdeasCollection,
  generateAlternativeDailyIdea,
  evaluateDailyIdeasCollection,
  improveSelectedIdea,
  generateLinkedInPost,
  adjustLinkedInPost,
  runCredibilityCheck,
  analyzeVisualStrategy,
  improveVisualPrompt,
  generateLinkedInVisual,
  generateCarouselPlan,
  generateAlternativeCover,
  rewriteCarouselSlide,
  qualityCheckCarousel,
  analyzeCarouselVisualNeeds,
  improveCarouselAssetPrompt,
} from "./src/server/gemini";

const app = express();

app.disable("x-powered-by");

app.use(
  express.json({
    limit: "20mb",
  }),
);

type RequestBody = Record<string, any>;

class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function requireFields(
  body: RequestBody,
  fields: string[],
  message: string,
): void {
  const missingField = fields.some((field) => {
    const value = body[field];

    return (
      value === undefined ||
      value === null ||
      value === ""
    );
  });

  if (missingField) {
    throw new HttpError(400, message);
  }
}

function registerPostRoute(
  path: string,
  handler: (
    body: RequestBody,
    request: Request,
  ) => Promise<unknown> | unknown,
): void {
  app.post(path, async (request, response) => {
    try {
      const result = await handler(
        request.body ?? {},
        request,
      );

      response.json(result);
    } catch (error) {
      console.error(
        `Unhandled error in ${path}:`,
        error,
      );

      if (error instanceof HttpError) {
        response.status(error.status).json({
          success: false,
          errorCategory: "failed",
          errorMessage: error.message,
        });

        return;
      }

      response.status(500).json({
        success: false,
        errorCategory: "failed",
        errorMessage:
          "An unexpected server error occurred. Please try again.",
      });
    }
  });
}

/* -------------------------------------------------------------------------- */
/* Health check                                                               */
/* -------------------------------------------------------------------------- */

app.get(
  "/api/health",
  (_request: Request, response: Response) => {
    response.json({
      success: true,
      status: "ready",
      environment: process.env.VERCEL
        ? "vercel"
        : "local",
      timestamp: new Date().toISOString(),
    });
  },
);

/* -------------------------------------------------------------------------- */
/* Provider connection tests                                                  */
/* -------------------------------------------------------------------------- */

registerPostRoute(
  "/api/gemini/test",
  async () => {
    return testGeminiConnection();
  },
);

registerPostRoute(
  "/api/gemini/test-openrouter-backup",
  async () => {
    return testOpenRouterBackup();
  },
);

/* -------------------------------------------------------------------------- */
/* AI idea and research routes                                                */
/* -------------------------------------------------------------------------- */

registerPostRoute(
  "/api/gemini/generate-idea",
  async ({ profile }) => {
    requireFields(
      { profile },
      ["profile"],
      "Creator profile is missing. Open Settings and save your profile first.",
    );

    return generateContentIdea(profile);
  },
);

registerPostRoute(
  "/api/gemini/research",
  async () => {
    return generateLiveResearch();
  },
);

registerPostRoute(
  "/api/gemini/research-brief",
  async () => {
    return generateDailyResearchBrief();
  },
);

registerPostRoute(
  "/api/gemini/grounded-idea",
  async ({
    profile,
    research,
    previousIdea,
  }) => {
    requireFields(
      {
        profile,
        research,
      },
      [
        "profile",
        "research",
      ],
      "Creator profile and verified research are required.",
    );

    return generateGroundedContentIdea(
      profile,
      research,
      previousIdea,
    );
  },
);

registerPostRoute(
  "/api/gemini/ideas-collection",
  async ({
    profile,
    brief,
    excludedCollection,
  }) => {
    requireFields(
      {
        profile,
        brief,
      },
      [
        "profile",
        "brief",
      ],
      "Creator profile and daily research brief are required.",
    );

    return generateDailyIdeasCollection(
      profile,
      brief,
      excludedCollection,
    );
  },
);

registerPostRoute(
  "/api/gemini/idea-alternative",
  async ({
    profile,
    brief,
    targetIdea,
    allExistingIdeas,
  }) => {
    requireFields(
      {
        profile,
        brief,
        targetIdea,
        allExistingIdeas,
      },
      [
        "profile",
        "brief",
        "targetIdea",
        "allExistingIdeas",
      ],
      "Missing required information for generating an alternative idea.",
    );

    return generateAlternativeDailyIdea(
      profile,
      brief,
      targetIdea,
      allExistingIdeas,
    );
  },
);

/* -------------------------------------------------------------------------- */
/* Idea evaluation routes                                                     */
/* -------------------------------------------------------------------------- */

registerPostRoute(
  "/api/gemini/stress-test",
  async ({
    profile,
    activeIdeas,
    collectionId,
  }) => {
    requireFields(
      {
        profile,
        activeIdeas,
      },
      [
        "profile",
        "activeIdeas",
      ],
      "Creator profile and active ideas are required.",
    );

    if (
      !Array.isArray(activeIdeas) ||
      activeIdeas.length < 7
    ) {
      throw new HttpError(
        400,
        "At least seven active ideas are required for the stress test.",
      );
    }

    return evaluateDailyIdeasCollection(
      profile,
      activeIdeas,
      collectionId,
    );
  },
);

registerPostRoute(
  "/api/gemini/improve-idea",
  async ({
    profile,
    targetIdea,
    evaluation,
  }) => {
    requireFields(
      {
        profile,
        targetIdea,
        evaluation,
      },
      [
        "profile",
        "targetIdea",
        "evaluation",
      ],
      "Missing required information for improving the idea.",
    );

    return improveSelectedIdea(
      profile,
      targetIdea,
      evaluation,
    );
  },
);

/* -------------------------------------------------------------------------- */
/* Post Studio routes                                                         */
/* -------------------------------------------------------------------------- */

registerPostRoute(
  "/api/gemini/generate-post",
  async ({
    profile,
    winningIdea,
    evaluation,
  }) => {
    requireFields(
      {
        profile,
        winningIdea,
        evaluation,
      },
      [
        "profile",
        "winningIdea",
        "evaluation",
      ],
      "Missing required information for LinkedIn post generation.",
    );

    return generateLinkedInPost(
      profile,
      winningIdea,
      evaluation,
    );
  },
);

registerPostRoute(
  "/api/gemini/adjust-post",
  async ({
    profile,
    postContent,
    adjustmentType,
    winningIdea,
  }) => {
    requireFields(
      {
        profile,
        postContent,
        adjustmentType,
      },
      [
        "profile",
        "postContent",
        "adjustmentType",
      ],
      "Missing required information for adjusting the post.",
    );

    return adjustLinkedInPost(
      profile,
      postContent,
      adjustmentType,
      winningIdea,
    );
  },
);

registerPostRoute(
  "/api/gemini/credibility-check",
  async ({
    profile,
    winningIdea,
    winnerId,
    hook,
    body,
    cta,
  }) => {
    requireFields(
      {
        profile,
        winningIdea,
        winnerId,
      },
      [
        "profile",
        "winningIdea",
        "winnerId",
      ],
      "Missing required information for the credibility check.",
    );

    return runCredibilityCheck(
      profile,
      winningIdea,
      winnerId,
      hook ?? "",
      body ?? "",
      cta ?? "",
    );
  },
);

/* -------------------------------------------------------------------------- */
/* Visual Studio routes                                                       */
/* -------------------------------------------------------------------------- */

registerPostRoute(
  "/api/gemini/analyze-visual-strategy",
  async ({
    profile,
    winningIdea,
    hook,
    bodyText,
    credibilityReport,
  }) => {
    requireFields(
      {
        profile,
        winningIdea,
        credibilityReport,
      },
      [
        "profile",
        "winningIdea",
        "credibilityReport",
      ],
      "Missing required information for visual strategy analysis.",
    );

    return analyzeVisualStrategy(
      profile,
      winningIdea,
      hook ?? "",
      bodyText ?? "",
      credibilityReport,
    );
  },
);

registerPostRoute(
  "/api/gemini/improve-visual-prompt",
  async ({
    userPrompt,
    style,
    aspectRatio,
    includeRohit,
    negativeInstructions,
  }) => {
    requireFields(
      {
        userPrompt,
        style,
        aspectRatio,
      },
      [
        "userPrompt",
        "style",
        "aspectRatio",
      ],
      "Missing required information for visual prompt improvement.",
    );

    return improveVisualPrompt(
      userPrompt,
      style,
      aspectRatio,
      Boolean(includeRohit),
      negativeInstructions ?? [],
    );
  },
);

registerPostRoute(
  "/api/gemini/generate-visual",
  async ({
    prompt,
    style,
    aspectRatio,
    includeRohit,
    referenceImageBase64,
  }) => {
    requireFields(
      {
        prompt,
        style,
        aspectRatio,
      },
      [
        "prompt",
        "style",
        "aspectRatio",
      ],
      "Missing required information for image generation.",
    );

    return generateLinkedInVisual(
      prompt,
      style,
      aspectRatio,
      Boolean(includeRohit),
      referenceImageBase64,
    );
  },
);

/* -------------------------------------------------------------------------- */
/* Carousel Builder routes                                                    */
/* -------------------------------------------------------------------------- */

registerPostRoute(
  "/api/gemini/generate-carousel",
  async ({
    profile,
    postContent,
    winningIdea,
    credibilityReport,
    requestedSlideCount,
    postFingerprint,
  }) => {
    requireFields(
      {
        profile,
        postContent,
        winningIdea,
        credibilityReport,
        postFingerprint,
      },
      [
        "profile",
        "postContent",
        "winningIdea",
        "credibilityReport",
        "postFingerprint",
      ],
      "Missing required information for carousel generation.",
    );

    return generateCarouselPlan(
      profile,
      postContent,
      winningIdea,
      credibilityReport,
      requestedSlideCount ?? 8,
      postFingerprint,
    );
  },
);

registerPostRoute(
  "/api/gemini/carousel-alternative-cover",
  async ({
    carouselTitle,
    carouselObjective,
  }) => {
    requireFields(
      {
        carouselTitle,
        carouselObjective,
      },
      [
        "carouselTitle",
        "carouselObjective",
      ],
      "Missing required information for alternative carousel covers.",
    );

    return generateAlternativeCover(
      carouselTitle,
      carouselObjective,
    );
  },
);

registerPostRoute(
  "/api/gemini/rewrite-carousel-slide",
  async ({
    profile,
    slide,
    action,
    credibilityReport,
  }) => {
    requireFields(
      {
        profile,
        slide,
        action,
      },
      [
        "profile",
        "slide",
        "action",
      ],
      "Missing required information for rewriting the carousel slide.",
    );

    return rewriteCarouselSlide(
      profile,
      slide,
      action,
      credibilityReport,
    );
  },
);

registerPostRoute(
  "/api/gemini/quality-check-carousel",
  async ({
    carouselTitle,
    slides,
    credibilityReport,
  }) => {
    requireFields(
      {
        carouselTitle,
        slides,
        credibilityReport,
      },
      [
        "carouselTitle",
        "slides",
        "credibilityReport",
      ],
      "Missing required information for the carousel quality check.",
    );

    return qualityCheckCarousel(
      carouselTitle,
      slides,
      credibilityReport,
    );
  },
);

registerPostRoute(
  "/api/gemini/analyze-carousel-visual-needs",
  async ({
    profile,
    carouselTitle,
    carouselObjective,
    visualNarrative,
    designDirection,
    slides,
    credibilityReport,
    researchBriefText,
  }) => {
    requireFields(
      {
        profile,
        carouselTitle,
        carouselObjective,
        slides,
        credibilityReport,
      },
      [
        "profile",
        "carouselTitle",
        "carouselObjective",
        "slides",
        "credibilityReport",
      ],
      "Missing required information for carousel visual analysis.",
    );

    return analyzeCarouselVisualNeeds(
      profile,
      carouselTitle,
      carouselObjective,
      visualNarrative ?? "",
      designDirection ?? "",
      slides,
      credibilityReport,
      researchBriefText,
    );
  },
);

registerPostRoute(
  "/api/gemini/improve-carousel-asset-prompt",
  async ({
    slideTitle,
    slideBody,
    visualConcept,
    artworkType,
    textSafeArea,
    includeRohit,
    brandColors,
    userPrompt,
    negativeInstructions,
  }) => {
    requireFields(
      {
        artworkType,
        textSafeArea,
        userPrompt,
      },
      [
        "artworkType",
        "textSafeArea",
        "userPrompt",
      ],
      "Missing required information for carousel prompt improvement.",
    );

    return improveCarouselAssetPrompt(
      slideTitle ?? "",
      slideBody ?? "",
      visualConcept ?? "",
      artworkType,
      textSafeArea,
      Boolean(includeRohit),
      brandColors ?? {
        primary: "#000000",
        accent: "#0000FF",
        background: "#FFFFFF",
      },
      userPrompt,
      negativeInstructions ?? [],
    );
  },
);

registerPostRoute(
  "/api/gemini/generate-carousel-asset",
  async ({
    prompt,
    style,
    aspectRatio,
    includeRohit,
    referenceImageBase64,
  }) => {
    requireFields(
      {
        prompt,
        aspectRatio,
      },
      [
        "prompt",
        "aspectRatio",
      ],
      "Missing required information for carousel asset generation.",
    );

    let cleanAspectRatio:
      | "1:1"
      | "4:5"
      | "16:9" = "1:1";

    if (
      aspectRatio === "portrait" ||
      aspectRatio === "4:5"
    ) {
      cleanAspectRatio = "4:5";
    } else if (
      aspectRatio === "landscape" ||
      aspectRatio === "16:9"
    ) {
      cleanAspectRatio = "16:9";
    }

    return generateLinkedInVisual(
      prompt,
      style ?? "Modern Bold",
      cleanAspectRatio,
      Boolean(includeRohit),
      referenceImageBase64,
    );
  },
);

/* -------------------------------------------------------------------------- */
/* Firebase cloud sync helpers                                                */
/* -------------------------------------------------------------------------- */

function getFirestoreDatabase() {
  if (!db) {
    throw new HttpError(
      500,
      "Firestore Admin is not available.",
    );
  }

  return db;
}

function getSyncDocument(
  uid: string,
  dataType: string,
) {
  const firestore = getFirestoreDatabase();

  if (dataType === "creatorProfile") {
    return firestore
      .collection("users")
      .doc(uid)
      .collection("settings")
      .doc("creatorProfile");
  }

  if (dataType === "researchPreferences") {
    return firestore
      .collection("users")
      .doc(uid)
      .collection("settings")
      .doc("researchPreferences");
  }

  if (dataType === "latestDailyBrief") {
    return firestore
      .collection("users")
      .doc(uid)
      .collection("research")
      .doc("latestDailyBrief");
  }

  throw new HttpError(
    400,
    "Invalid sync data type.",
  );
}

function cleanFirestoreDocument(
  snapshot: any,
) {
  if (!snapshot.exists) {
    return null;
  }

  const documentData = {
    ...snapshot.data(),
  };

  if (
    documentData.updatedAt &&
    typeof documentData.updatedAt.toDate ===
      "function"
  ) {
    documentData.updatedAt =
      documentData.updatedAt
        .toDate()
        .toISOString();
  }

  return documentData;
}

/* -------------------------------------------------------------------------- */
/* Firebase cloud sync routes                                                 */
/* -------------------------------------------------------------------------- */

registerPostRoute(
  "/api/sync/upload",
  async ({
    token,
    dataType,
    data,
  }) => {
    requireFields(
      {
        token,
        dataType,
        data,
      },
      [
        "token",
        "dataType",
        "data",
      ],
      "Missing authentication token or sync data.",
    );

    const verifiedUser =
      await verifyFirebaseToken(token);

    const uid = verifiedUser.uid;

    const documentReference =
      getSyncDocument(uid, dataType);

    await documentReference.set({
      ...data,
      updatedAt:
        FieldValue.serverTimestamp(),
      schemaVersion: "v1",
    });

    const syncStateReference =
      getFirestoreDatabase()
        .collection("users")
        .doc(uid)
        .collection("metadata")
        .doc("syncState");

    await syncStateReference.set(
      {
        lastSyncedAt:
          FieldValue.serverTimestamp(),
        lastSyncedDataType: dataType,
      },
      {
        merge: true,
      },
    );

    return {
      success: true,
      message: `${dataType} uploaded successfully.`,
    };
  },
);

registerPostRoute(
  "/api/sync/download",
  async ({
    token,
    dataType,
  }) => {
    requireFields(
      {
        token,
        dataType,
      },
      [
        "token",
        "dataType",
      ],
      "Missing authentication token or sync data type.",
    );

    const verifiedUser =
      await verifyFirebaseToken(token);

    const snapshot =
      await getSyncDocument(
        verifiedUser.uid,
        dataType,
      ).get();

    if (!snapshot.exists) {
      return {
        success: true,
        exists: false,
      };
    }

    return {
      success: true,
      exists: true,
      data: cleanFirestoreDocument(
        snapshot,
      ),
    };
  },
);

registerPostRoute(
  "/api/sync/status",
  async ({ token }) => {
    requireFields(
      { token },
      ["token"],
      "Missing authentication token.",
    );

    const verifiedUser =
      await verifyFirebaseToken(token);

    const uid = verifiedUser.uid;
    const firestore =
      getFirestoreDatabase();

    const profileReference = firestore
      .collection("users")
      .doc(uid)
      .collection("settings")
      .doc("creatorProfile");

    const preferencesReference =
      firestore
        .collection("users")
        .doc(uid)
        .collection("settings")
        .doc("researchPreferences");

    const briefReference = firestore
      .collection("users")
      .doc(uid)
      .collection("research")
      .doc("latestDailyBrief");

    const [
      profileSnapshot,
      preferencesSnapshot,
      briefSnapshot,
    ] = await Promise.all([
      profileReference.get(),
      preferencesReference.get(),
      
