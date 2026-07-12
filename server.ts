import express from "express";
import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { verifyFirebaseToken, db } from "./src/server/firebaseAdmin";
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

function createApp() {
  const app = express();

  app.use(
    express.json({
      limit: "20mb",
    }),
  );

  app.get("/api/health", (_req, res) => {
    res.json({
      success: true,
      status: "ready",
      environment: process.env.VERCEL ? "vercel" : "local",
      timestamp: new Date().toISOString(),
    });
  });

  app.post("/api/gemini/test", async (_req, res) => {
    try {
      const result = await testGeminiConnection();
      res.json(result);
    } catch (err) {
      console.error("Unhandled error in /api/gemini/test:", err);

      res.status(500).json({
        success: false,
        modelName: process.env.TEXT_MODEL || "gemini-3.5-flash",
        errorCategory: "failed",
        errorMessage:
          "An unexpected server error occurred. Please try again.",
        testedAt: new Date().toISOString(),
      });
    }
  });

  app.post("/api/gemini/test-openrouter-backup", async (_req, res) => {
    try {
      const result = await testOpenRouterBackup();
      res.json(result);
    } catch (err) {
      console.error(
        "Unhandled error in /api/gemini/test-openrouter-backup:",
        err,
      );

      res.status(500).json({
        success: false,
        modelName: "openrouter/free",
        errorCategory: "failed",
        errorMessage:
          "An unexpected server error occurred while testing OpenRouter.",
        testedAt: new Date().toISOString(),
      });
    }
  });

  app.post("/api/gemini/generate-idea", async (req, res) => {
    try {
      const profile = req.body.profile;

      if (!profile) {
        return res.status(400).json({
          success: false,
          errorCategory: "failed",
          errorMessage:
            "Creator profile is missing. Open Settings and save your profile first.",
        });
      }

      const result = await generateContentIdea(profile);
      res.json(result);
    } catch (err) {
      console.error("Unhandled error in /api/gemini/generate-idea:", err);

      res.status(500).json({
        success: false,
        errorCategory: "failed",
        errorMessage:
          "An unexpected server error occurred while generating the idea.",
      });
    }
  });

  app.post("/api/gemini/research", async (_req, res) => {
    try {
      const result = await generateLiveResearch();
      res.json(result);
    } catch (err) {
      console.error("Unhandled error in /api/gemini/research:", err);

      res.status(500).json({
        success: false,
        errorCategory: "failed",
        errorMessage:
          "Live research could not be completed. Please try again.",
      });
    }
  });

  app.post("/api/gemini/research-brief", async (_req, res) => {
    try {
      const result = await generateDailyResearchBrief();
      res.json(result);
    } catch (err) {
      console.error("Unhandled error in /api/gemini/research-brief:", err);

      res.status(500).json({
        success: false,
        errorCategory: "failed",
        errorMessage:
          "Daily research brief could not be completed. Please try again.",
      });
    }
  });

  app.post("/api/gemini/grounded-idea", async (req, res) => {
    try {
      const { profile, research, previousIdea } = req.body;

      if (!profile) {
        return res.status(400).json({
          success: false,
          errorCategory: "failed",
          errorMessage:
            "Creator profile is missing. Open Settings and save your profile first.",
        });
      }

      if (!research) {
        return res.status(400).json({
          success: false,
          errorCategory: "failed",
          errorMessage:
            "Research result is missing. Please run research first.",
        });
      }

      const result = await generateGroundedContentIdea(
        profile,
        research,
        previousIdea,
      );

      res.json(result);
    } catch (err) {
      console.error("Unhandled error in /api/gemini/grounded-idea:", err);

      res.status(500).json({
        success: false,
        errorCategory: "failed",
        errorMessage:
          "The grounded idea could not be verified. Please try again.",
      });
    }
  });

  app.post("/api/gemini/ideas-collection", async (req, res) => {
    try {
      const { profile, brief, excludedCollection } = req.body;

      if (!profile) {
        return res.status(400).json({
          success: false,
          errorCategory: "failed",
          errorMessage:
            "Creator profile is missing. Open Settings and save it first.",
        });
      }

      if (!brief) {
        return res.status(400).json({
          success: false,
          errorCategory: "failed",
          errorMessage:
            "Daily research brief is missing. Build or restore the brief first.",
        });
      }

      const result = await generateDailyIdeasCollection(
        profile,
        brief,
        excludedCollection,
      );

      res.json(result);
    } catch (err) {
      console.error("Unhandled error in /api/gemini/ideas-collection:", err);

      res.status(500).json({
        success: false,
        errorCategory: "failed",
        errorMessage:
          "An unexpected error occurred while generating content ideas.",
      });
    }
  });

  app.post("/api/gemini/idea-alternative", async (req, res) => {
    try {
      const {
        profile,
        brief,
        targetIdea,
        allExistingIdeas,
      } = req.body;

      if (
        !profile ||
        !brief ||
        !targetIdea ||
        !allExistingIdeas
      ) {
        return res.status(400).json({
          success: false,
          errorCategory: "failed",
          errorMessage:
            "Missing required information for generating an alternative idea.",
        });
      }

      const result = await generateAlternativeDailyIdea(
        profile,
        brief,
        targetIdea,
        allExistingIdeas,
      );

      res.json(result);
    } catch (err) {
      console.error("Unhandled error in /api/gemini/idea-alternative:", err);

      res.status(500).json({
        success: false,
        errorCategory: "failed",
        errorMessage:
          "An unexpected error occurred while generating the alternative idea.",
      });
    }
  });

  app.post("/api/gemini/stress-test", async (req, res) => {
    try {
      const { profile, activeIdeas, collectionId } = req.body;

      if (!profile) {
        return res.status(400).json({
          success: false,
          errorCategory: "failed",
          errorMessage:
            "Creator profile is required for the stress test.",
        });
      }

      if (!activeIdeas || activeIdeas.length < 7) {
        return res.status(400).json({
          success: false,
          errorCategory: "failed",
          errorMessage:
            "At least seven active ideas are required for the stress test.",
        });
      }

      const result = await evaluateDailyIdeasCollection(
        profile,
        activeIdeas,
        collectionId,
      );

      res.json(result);
    } catch (err) {
      console.error("Unhandled error in /api/gemini/stress-test:", err);

      res.status(500).json({
        success: false,
        errorCategory: "failed",
        errorMessage:
          "The stress test could not be completed. Please run it again.",
      });
    }
  });

  app.post("/api/gemini/improve-idea", async (req, res) => {
    try {
      const { profile, targetIdea, evaluation } = req.body;

      if (!profile || !targetIdea || !evaluation) {
        return res.status(400).json({
          success: false,
          errorCategory: "failed",
          errorMessage:
            "Missing required information for improving the idea.",
        });
      }

      const result = await improveSelectedIdea(
        profile,
        targetIdea,
        evaluation,
      );

      res.json(result);
    } catch (err) {
      console.error("Unhandled error in /api/gemini/improve-idea:", err);

      res.status(500).json({
        success: false,
        errorCategory: "failed",
        errorMessage:
          "An unexpected error occurred while improving the idea.",
      });
    }
  });

  app.post("/api/gemini/generate-post", async (req, res) => {
    try {
      const { profile, winningIdea, evaluation } = req.body;

      if (!profile || !winningIdea || !evaluation) {
        return res.status(400).json({
          success: false,
          errorCategory: "failed",
          errorMessage:
            "Missing required information for LinkedIn post generation.",
        });
      }

      const result = await generateLinkedInPost(
        profile,
        winningIdea,
        evaluation,
      );

      res.json(result);
    } catch (err) {
      console.error("Unhandled error in /api/gemini/generate-post:", err);

      res.status(500).json({
        success: false,
        errorCategory: "failed",
        errorMessage:
          "An unexpected error occurred during post generation.",
      });
    }
  });

  app.post("/api/gemini/adjust-post", async (req, res) => {
    try {
      const {
        profile,
        postContent,
        adjustmentType,
        winningIdea,
      } = req.body;

      if (!profile || !postContent || !adjustmentType) {
        return res.status(400).json({
          success: false,
          errorCategory: "failed",
          errorMessage:
            "Missing required information for adjusting the post.",
        });
      }

      const result = await adjustLinkedInPost(
        profile,
        postContent,
        adjustmentType,
        winningIdea,
      );

      res.json(result);
    } catch (err) {
      console.error("Unhandled error in /api/gemini/adjust-post:", err);

      res.status(500).json({
        success: false,
        errorCategory: "failed",
        errorMessage:
          "An unexpected error occurred while adjusting the post.",
      });
    }
  });

  app.post("/api/gemini/credibility-check", async (req, res) => {
    try {
      const {
        profile,
        winningIdea,
        winnerId,
        hook,
        body,
        cta,
      } = req.body;

      if (!profile || !winningIdea || !winnerId) {
        return res.status(400).json({
          success: false,
          errorCategory: "failed",
          errorMessage:
            "Missing required information for the credibility check.",
        });
      }

      const result = await runCredibilityCheck(
        profile,
        winningIdea,
        winnerId,
        hook || "",
        body || "",
        cta || "",
      );

      res.json(result);
    } catch (err) {
      console.error(
        "Unhandled error in /api/gemini/credibility-check:",
        err,
      );

      res.status(500).json({
        success: false,
        errorCategory: "failed",
        errorMessage:
          "An unexpected error occurred during the credibility check.",
      });
    }
  });

  app.post("/api/gemini/analyze-visual-strategy", async (req, res) => {
    try {
      const {
        profile,
        winningIdea,
        hook,
        bodyText,
        credibilityReport,
      } = req.body;

      if (!profile || !winningIdea || !credibilityReport) {
        return res.status(400).json({
          success: false,
          errorCategory: "failed",
          errorMessage:
            "Missing required information for visual strategy analysis.",
        });
      }

      const result = await analyzeVisualStrategy(
        profile,
        winningIdea,
        hook || "",
        bodyText || "",
        credibilityReport,
      );

      res.json(result);
    } catch (err) {
      console.error(
        "Unhandled error in /api/gemini/analyze-visual-strategy:",
        err,
      );

      res.status(500).json({
        success: false,
        errorCategory: "failed",
        errorMessage:
          "An unexpected error occurred during visual strategy analysis.",
      });
    }
  });

  app.post("/api/gemini/improve-visual-prompt", async (req, res) => {
    try {
      const {
        userPrompt,
        style,
        aspectRatio,
        includeRohit,
        negativeInstructions,
      } = req.body;

      if (!userPrompt || !style || !aspectRatio) {
        return res.status(400).json({
          success: false,
          errorCategory: "failed",
          errorMessage:
            "Missing required information for prompt improvement.",
        });
      }

      const result = await improveVisualPrompt(
        userPrompt,
        style,
        aspectRatio,
        Boolean(includeRohit),
        negativeInstructions || [],
      );

      res.json(result);
    } catch (err) {
      console.error(
        "Unhandled error in /api/gemini/improve-visual-prompt:",
        err,
      );

      res.status(500).json({
        success: false,
        errorCategory: "failed",
        errorMessage:
          "An unexpected error occurred during visual prompt improvement.",
      });
    }
  });

  app.post("/api/gemini/generate-visual", async (req, res) => {
    try {
      const {
        prompt,
        style,
        aspectRatio,
        includeRohit,
        referenceImageBase64,
      } = req.body;

      if (!prompt || !style || !aspectRatio) {
        return res.status(400).json({
          success: false,
          errorCategory: "failed",
          errorMessage:
            "Missing required information for image generation.",
        });
      }

      const result = await generateLinkedInVisual(
        prompt,
        style,
        aspectRatio,
        Boolean(includeRohit),
        referenceImageBase64,
      );

      res.json(result);
    } catch (err) {
      console.error("Unhandled error in /api/gemini/generate-visual:", err);

      res.status(500).json({
        success: false,
        errorCategory: "failed",
        errorMessage:
          "An unexpected error occurred during image generation.",
      });
    }
  });

  app.post("/api/gemini/generate-carousel", async (req, res) => {
    try {
      const {
        profile,
        postContent,
        winningIdea,
        credibilityReport,
        requestedSlideCount,
        postFingerprint,
      } = req.body;

      if (
        !profile ||
        !postContent ||
        !winningIdea ||
        !credibilityReport ||
        !postFingerprint
      ) {
        return res.status(400).json({
          success: false,
          errorCategory: "failed",
          errorMessage:
            "Missing required information for carousel generation.",
        });
      }

      const result = await generateCarouselPlan(
        profile,
        postContent,
        winningIdea,
        credibilityReport,
        requestedSlideCount || 8,
        postFingerprint,
      );

      res.json(result);
    } catch (err) {
      console.error(
        "Unhandled error in /api/gemini/generate-carousel:",
        err,
      );

      res.status(500).json({
        success: false,
        errorCategory: "failed",
        errorMessage:
          "An unexpected error occurred during carousel generation.",
      });
    }
  });

  app.post(
    "/api/gemini/carousel-alternative-cover",
    async (req, res) => {
      try {
        const { carouselTitle, carouselObjective } = req.body;

        if (!carouselTitle || !carouselObjective) {
          return res.status(400).json({
            success: false,
            errorCategory: "failed",
            errorMessage:
              "Missing required information for alternative carousel covers.",
          });
        }

        const result = await generateAlternativeCover(
          carouselTitle,
          carouselObjective,
        );

        res.json(result);
      } catch (err) {
        console.error(
          "Unhandled error in /api/gemini/carousel-alternative-cover:",
          err,
        );

        res.status(500).json({
          success: false,
          errorCategory: "failed",
          errorMessage:
            "An unexpected error occurred while generating alternative covers.",
        });
      }
    },
  );

  app.post("/api/gemini/rewrite-carousel-slide", async (req, res) => {
    try {
      const {
        profile,
        slide,
        action,
        credibilityReport,
      } = req.body;

      if (!profile || !slide || !action) {
        return res.status(400).json({
          success: false,
          errorCategory: "failed",
          errorMessage:
            "Missing required information for rewriting the slide.",
        });
      }

      const result = await rewriteCarouselSlide(
        profile,
        slide,
        action,
        credibilityReport,
      );

      res.json(result);
    } catch (err) {
      console.error(
        "Unhandled error in /api/gemini/rewrite-carousel-slide:",
        err,
      );

      res.status(500).json({
        success: false,
        errorCategory: "failed",
        errorMessage:
          "An unexpected error occurred while rewriting the slide.",
      });
    }
  });

  app.post("/api/gemini/quality-check-carousel", async (req, res) => {
    try {
      const {
        carouselTitle,
        slides,
        credibilityReport,
      } = req.body;

      if (!carouselTitle || !slides || !credibilityReport) {
        return res.status(400).json({
          success: false,
          errorCategory: "failed",
          errorMessage:
            "Missing required information for the carousel quality check.",
        });
      }

      const result = await qualityCheckCarousel(
        carouselTitle,
        slides,
        credibilityReport,
      );

      res.json(result);
    } catch (err) {
      console.error(
        "Unhandled error in /api/gemini/quality-check-carousel:",
        err,
      );

      res.status(500).json({
        success: false,
        errorCategory: "failed",
        errorMessage:
          "An unexpected error occurred during the carousel quality check.",
      });
    }
  });

  app.post(
    "/api/gemini/analyze-carousel-visual-needs",
    async (req, res) => {
      try {
        const {
          profile,
          carouselTitle,
          carouselObjective,
          visualNarrative,
          designDirection,
          slides,
          credibilityReport,
          researchBriefText,
        } = req.body;

        if (
          !profile ||
          !carouselTitle ||
          !carouselObjective ||
          !slides ||
          !credibilityReport
        ) {
          return res.status(400).json({
            success: false,
            errorCategory: "failed",
            errorMessage:
              "Missing required information for carousel visual analysis.",
          });
        }

        const result = await analyzeCarouselVisualNeeds(
          profile,
          carouselTitle,
          carouselObjective,
          visualNarrative || "",
          designDirection || "",
          slides,
          credibilityReport,
          researchBriefText,
        );

        res.json(result);
      } catch (err) {
        console.error(
          "Unhandled error in /api/gemini/analyze-carousel-visual-needs:",
          err,
        );

        res.status(500).json({
          success: false,
          e
