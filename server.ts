import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { verifyFirebaseToken, db } from "./src/server/firebaseAdmin";
import { testGeminiConnection, testOpenRouterBackup, generateContentIdea, generateLiveResearch, generateGroundedContentIdea, generateDailyResearchBrief, generateDailyIdeasCollection, generateAlternativeDailyIdea, evaluateDailyIdeasCollection, improveSelectedIdea, generateLinkedInPost, adjustLinkedInPost, runCredibilityCheck, analyzeVisualStrategy, improveVisualPrompt, generateLinkedInVisual, generateCarouselPlan, generateAlternativeCover, rewriteCarouselSlide, qualityCheckCarousel, analyzeCarouselVisualNeeds, improveCarouselAssetPrompt } from "./src/server/gemini";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Parse JSON bodies
  app.use(express.json());

  // API Routes FIRST
  app.post("/api/gemini/test", async (req, res) => {
    try {
      const result = await testGeminiConnection();
      res.json(result);
    } catch (err) {
      console.error("Unhandled error in API route /api/gemini/test:", err);
      res.status(500).json({
        success: false,
        modelName: process.env.TEXT_MODEL || "gemini-3.5-flash",
        errorCategory: "failed",
        errorMessage: "An unexpected server error occurred. Please try again.",
        testedAt: new Date().toISOString()
      });
    }
  });

  app.post("/api/gemini/test-openrouter-backup", async (req, res) => {
    try {
      const result = await testOpenRouterBackup();
      res.json(result);
    } catch (err) {
      console.error("Unhandled error in API route /api/gemini/test-openrouter-backup:", err);
      res.status(500).json({
        success: false,
        modelName: "openrouter/free",
        errorCategory: "failed",
        errorMessage: "An unexpected server error occurred. Please try again.",
        testedAt: new Date().toISOString()
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
          errorMessage: "Creator profile is missing from the request. Go to Settings and make sure your profile is saved."
        });
      }
      const result = await generateContentIdea(profile);
      res.json(result);
    } catch (err) {
      console.error("Unhandled error in API route /api/gemini/generate-idea:", err);
      res.status(500).json({
        success: false,
        errorCategory: "failed",
        errorMessage: "An unexpected server error occurred. Please try again."
      });
    }
  });

  app.post("/api/gemini/research", async (req, res) => {
    try {
      const result = await generateLiveResearch();
      res.json(result);
    } catch (err) {
      console.error("Unhandled error in API route /api/gemini/research:", err);
      res.status(500).json({
        success: false,
        errorCategory: "failed",
        errorMessage: "Live research could not be completed. Please try again."
      });
    }
  });

  app.post("/api/gemini/research-brief", async (req, res) => {
    try {
      const result = await generateDailyResearchBrief();
      res.json(result);
    } catch (err) {
      console.error("Unhandled error in API route /api/gemini/research-brief:", err);
      res.status(500).json({
        success: false,
        errorCategory: "failed",
        errorMessage: "Daily research brief could not be completed. Please try again."
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
          errorMessage: "Creator profile is missing from the request. Go to Settings and make sure your profile is saved."
        });
      }
      if (!research) {
        return res.status(400).json({
          success: false,
          errorCategory: "failed",
          errorMessage: "Research result is missing from the request. Please run research first."
        });
      }
      const result = await generateGroundedContentIdea(profile, research, previousIdea);
      res.json(result);
    } catch (err) {
      console.error("Unhandled error in API route /api/gemini/grounded-idea:", err);
      res.status(500).json({
        success: false,
        errorCategory: "failed",
        errorMessage: "The grounded idea could not be verified. Please try again."
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
          errorMessage: "Creator profile is missing from the request. Go to Settings and make sure your profile is saved."
        });
      }
      if (!brief) {
        return res.status(400).json({
          success: false,
          errorCategory: "failed",
          errorMessage: "Daily research brief is missing from the request. Please run today's research brief first."
        });
      }
      const result = await generateDailyIdeasCollection(profile, brief, excludedCollection);
      res.json(result);
    } catch (err) {
      console.error("Unhandled error in API route /api/gemini/ideas-collection:", err);
      res.status(500).json({
        success: false,
        errorCategory: "failed",
        errorMessage: "An unexpected error occurred while generating daily content ideas. Please try again."
      });
    }
  });

  app.post("/api/gemini/idea-alternative", async (req, res) => {
    try {
      const { profile, brief, targetIdea, allExistingIdeas } = req.body;
      if (!profile || !brief || !targetIdea || !allExistingIdeas) {
        return res.status(400).json({
          success: false,
          errorCategory: "failed",
          errorMessage: "Missing required arguments for generating alternative idea."
        });
      }
      const result = await generateAlternativeDailyIdea(profile, brief, targetIdea, allExistingIdeas);
      res.json(result);
    } catch (err) {
      console.error("Unhandled error in API route /api/gemini/idea-alternative:", err);
      res.status(500).json({
        success: false,
        errorCategory: "failed",
        errorMessage: "An unexpected error occurred while generating alternative content idea. Please try again."
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
          errorMessage: "Creator profile is required for evaluation."
        });
      }
      if (!activeIdeas || activeIdeas.length < 7) {
        return res.status(400).json({
          success: false,
          errorCategory: "failed",
          errorMessage: "At least 7 active ideas are required for the stress test."
        });
      }
      const result = await evaluateDailyIdeasCollection(profile, activeIdeas, collectionId);
      res.json(result);
    } catch (err) {
      console.error("Unhandled error in API route /api/gemini/stress-test:", err);
      res.status(500).json({
        success: false,
        errorCategory: "failed",
        errorMessage: "The stress test did not pass validation. Please run it again."
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
          errorMessage: "Missing required parameters for idea improvement."
        });
      }
      const result = await improveSelectedIdea(profile, targetIdea, evaluation);
      res.json(result);
    } catch (err) {
      console.error("Unhandled error in API route /api/gemini/improve-idea:", err);
      res.status(500).json({
        success: false,
        errorCategory: "failed",
        errorMessage: "An unexpected error occurred during idea improvement. Please try again."
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
          errorMessage: "Missing required parameters for LinkedIn post generation."
        });
      }
      const result = await generateLinkedInPost(profile, winningIdea, evaluation);
      res.json(result);
    } catch (err) {
      console.error("Unhandled error in API route /api/gemini/generate-post:", err);
      res.status(500).json({
        success: false,
        errorCategory: "failed",
        errorMessage: "An unexpected error occurred during post generation. Please try again."
      });
    }
  });

  app.post("/api/gemini/adjust-post", async (req, res) => {
    try {
      const { profile, postContent, adjustmentType, winningIdea } = req.body;
      if (!profile || !postContent || !adjustmentType) {
        return res.status(400).json({
          success: false,
          errorCategory: "failed",
          errorMessage: "Missing required parameters for post adjustment."
        });
      }
      const result = await adjustLinkedInPost(profile, postContent, adjustmentType, winningIdea);
      res.json(result);
    } catch (err) {
      console.error("Unhandled error in API route /api/gemini/adjust-post:", err);
      res.status(500).json({
        success: false,
        errorCategory: "failed",
        errorMessage: "An unexpected error occurred during post adjustment. Please try again."
      });
    }
  });

  app.post("/api/gemini/credibility-check", async (req, res) => {
    try {
      const { profile, winningIdea, winnerId, hook, body, cta } = req.body;
      if (!profile || !winningIdea || !winnerId) {
        return res.status(400).json({
          success: false,
          errorCategory: "failed",
          errorMessage: "Missing required parameters for credibility check."
        });
      }
      const result = await runCredibilityCheck(profile, winningIdea, winnerId, hook || "", body || "", cta || "");
      res.json(result);
    } catch (err) {
      console.error("Unhandled error in API route /api/gemini/credibility-check:", err);
      res.status(500).json({
        success: false,
        errorCategory: "failed",
        errorMessage: "An unexpected error occurred during credibility check. Please try again."
      });
    }
  });

  app.post("/api/gemini/analyze-visual-strategy", async (req, res) => {
    try {
      const { profile, winningIdea, hook, bodyText, credibilityReport } = req.body;
      if (!profile || !winningIdea || !credibilityReport) {
        return res.status(400).json({
          success: false,
          errorCategory: "failed",
          errorMessage: "Missing required parameters for visual strategy analysis."
        });
      }
      const result = await analyzeVisualStrategy(profile, winningIdea, hook || "", bodyText || "", credibilityReport);
      res.json(result);
    } catch (err) {
      console.error("Unhandled error in API route /api/gemini/analyze-visual-strategy:", err);
      res.status(500).json({
        success: false,
        errorCategory: "failed",
        errorMessage: "An unexpected error occurred during visual format analysis. Please try again."
      });
    }
  });

  app.post("/api/gemini/improve-visual-prompt", async (req, res) => {
    try {
      const { userPrompt, style, aspectRatio, includeRohit, negativeInstructions } = req.body;
      if (!userPrompt || !style || !aspectRatio) {
        return res.status(400).json({
          success: false,
          errorCategory: "failed",
          errorMessage: "Missing required parameters for prompt improvement."
        });
      }
      const result = await improveVisualPrompt(userPrompt, style, aspectRatio, !!includeRohit, negativeInstructions || []);
      res.json(result);
    } catch (err) {
      console.error("Unhandled error in API route /api/gemini/improve-visual-prompt:", err);
      res.status(500).json({
        success: false,
        errorCategory: "failed",
        errorMessage: "An unexpected error occurred during prompt improvement. Please try again."
      });
    }
  });

  app.post("/api/gemini/generate-visual", async (req, res) => {
    try {
      const { prompt, style, aspectRatio, includeRohit, referenceImageBase64 } = req.body;
      if (!prompt || !style || !aspectRatio) {
        return res.status(400).json({
          success: false,
          errorCategory: "failed",
          errorMessage: "Missing required parameters for image generation."
        });
      }
      const result = await generateLinkedInVisual(prompt, style, aspectRatio, !!includeRohit, referenceImageBase64);
      res.json(result);
    } catch (err) {
      console.error("Unhandled error in API route /api/gemini/generate-visual:", err);
      res.status(500).json({
        success: false,
        errorCategory: "failed",
        errorMessage: "An unexpected error occurred during image generation. Please try again."
      });
    }
  });

  app.post("/api/gemini/generate-carousel", async (req, res) => {
    try {
      const { profile, postContent, winningIdea, credibilityReport, requestedSlideCount, postFingerprint } = req.body;
      if (!profile || !postContent || !winningIdea || !credibilityReport || !postFingerprint) {
        return res.status(400).json({
          success: false,
          errorCategory: "failed",
          errorMessage: "Missing required parameters for generating carousel plan."
        });
      }
      const result = await generateCarouselPlan(
        profile,
        postContent,
        winningIdea,
        credibilityReport,
        requestedSlideCount || 8,
        postFingerprint
      );
      res.json(result);
    } catch (err) {
      console.error("Unhandled error in API route /api/gemini/generate-carousel:", err);
      res.status(500).json({
        success: false,
        errorCategory: "failed",
        errorMessage: "An unexpected error occurred during carousel generation. Please try again."
      });
    }
  });

  app.post("/api/gemini/carousel-alternative-cover", async (req, res) => {
    try {
      const { carouselTitle, carouselObjective } = req.body;
      if (!carouselTitle || !carouselObjective) {
        return res.status(400).json({
          success: false,
          errorCategory: "failed",
          errorMessage: "Missing required parameters for alternative covers."
        });
      }
      const result = await generateAlternativeCover(carouselTitle, carouselObjective);
      res.json(result);
    } catch (err) {
      console.error("Unhandled error in API route /api/gemini/carousel-alternative-cover:", err);
      res.status(500).json({
        success: false,
        errorCategory: "failed",
        errorMessage: "An unexpected error occurred while generating alternative covers. Please try again."
      });
    }
  });

  app.post("/api/gemini/rewrite-carousel-slide", async (req, res) => {
    try {
      const { profile, slide, action, credibilityReport } = req.body;
      if (!profile || !slide || !action) {
        return res.status(400).json({
          success: false,
          errorCategory: "failed",
          errorMessage: "Missing required parameters for slide rewrite."
        });
      }
      const result = await rewriteCarouselSlide(profile, slide, action, credibilityReport);
      res.json(result);
    } catch (err) {
      console.error("Unhandled error in API route /api/gemini/rewrite-carousel-slide:", err);
      res.status(500).json({
        success: false,
        errorCategory: "failed",
        errorMessage: "An unexpected error occurred while rewriting slide. Please try again."
      });
    }
  });

  app.post("/api/gemini/quality-check-carousel", async (req, res) => {
    try {
      const { carouselTitle, slides, credibilityReport } = req.body;
      if (!carouselTitle || !slides || !credibilityReport) {
        return res.status(400).json({
          success: false,
          errorCategory: "failed",
          errorMessage: "Missing required parameters for carousel quality check."
        });
      }
      const result = await qualityCheckCarousel(carouselTitle, slides, credibilityReport);
      res.json(result);
    } catch (err) {
      console.error("Unhandled error in API route /api/gemini/quality-check-carousel:", err);
      res.status(500).json({
        success: false,
        errorCategory: "failed",
        errorMessage: "An unexpected error occurred during quality check. Please try again."
      });
    }
  });

  app.post("/api/gemini/analyze-carousel-visual-needs", async (req, res) => {
    try {
      const { profile, carouselTitle, carouselObjective, visualNarrative, designDirection, slides, credibilityReport, researchBriefText } = req.body;
      if (!profile || !carouselTitle || !carouselObjective || !slides || !credibilityReport) {
        return res.status(400).json({
          success: false,
          errorCategory: "failed",
          errorMessage: "Missing required parameters for visual strategy analysis."
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
        researchBriefText
      );
      res.json(result);
    } catch (err) {
      console.error("Unhandled error in API route /api/gemini/analyze-carousel-visual-needs:", err);
      res.status(500).json({
        success: false,
        errorCategory: "failed",
        errorMessage: "An unexpected error occurred during visual strategy analysis."
      });
    }
  });

  app.post("/api/gemini/improve-carousel-asset-prompt", async (req, res) => {
    try {
      const { slideTitle, slideBody, visualConcept, artworkType, textSafeArea, includeRohit, brandColors, userPrompt, negativeInstructions } = req.body;
      if (!userPrompt || !artworkType || !textSafeArea) {
        return res.status(400).json({
          success: false,
          errorCategory: "failed",
          errorMessage: "Missing required parameters for carousel asset prompt improvement."
        });
      }
      const result = await improveCarouselAssetPrompt(
        slideTitle || "",
        slideBody || "",
        visualConcept || "",
        artworkType,
        textSafeArea,
        !!includeRohit,
        brandColors || { primary: "#000000", accent: "#0000FF", background: "#FFFFFF" },
        userPrompt,
        negativeInstructions || []
      );
      res.json(result);
    } catch (err) {
      console.error("Unhandled error in API route /api/gemini/improve-carousel-asset-prompt:", err);
      res.status(500).json({
        success: false,
        errorCategory: "failed",
        errorMessage: "An unexpected error occurred during prompt improvement."
      });
    }
  });

  app.post("/api/gemini/generate-carousel-asset", async (req, res) => {
    try {
      const { prompt, style, aspectRatio, includeRohit, referenceImageBase64 } = req.body;
      if (!prompt || !aspectRatio) {
        return res.status(400).json({
          success: false,
          errorCategory: "failed",
          errorMessage: "Missing required parameters for carousel asset generation."
        });
      }
      
      // Map aspects safely if needed, e.g. "square" -> "1:1", "portrait" -> "4:5"
      let cleanAspectRatio: '1:1' | '4:5' | '16:9' = '1:1';
      if (aspectRatio === 'square' || aspectRatio === '1:1') {
        cleanAspectRatio = '1:1';
      } else if (aspectRatio === 'portrait' || aspectRatio === '4:5') {
        cleanAspectRatio = '4:5';
      }
      
      // Use Modern Bold as default visual style if none provided
      const cleanStyle: any = style || "Modern Bold";

      const result = await generateLinkedInVisual(
        prompt,
        cleanStyle,
        cleanAspectRatio,
        !!includeRohit,
        referenceImageBase64
      );
      res.json(result);
    } catch (err) {
      console.error("Unhandled error in API route /api/gemini/generate-carousel-asset:", err);
      res.status(500).json({
        success: false,
        errorCategory: "failed",
        errorMessage: "An unexpected error occurred during image asset generation."
      });
    }
  });

  // SECURE CLOUD SYNC ENDPOINTS
  app.post("/api/sync/upload", async (req, res) => {
    try {
      const { token, dataType, data } = req.body;
      if (!token) {
        return res.status(401).json({ success: false, errorMessage: "Unauthorized: Missing authentication token." });
      }
      const verified = await verifyFirebaseToken(token);
      const uid = verified.uid;

      if (!db) {
        return res.status(500).json({ success: false, errorMessage: "Firestore Admin is not available." });
      }

      const serverTimestamp = FieldValue.serverTimestamp();

      if (dataType === 'creatorProfile') {
        const docRef = db.collection('users').doc(uid).collection('settings').doc('creatorProfile');
        await docRef.set({
          ...data,
          updatedAt: serverTimestamp,
          schemaVersion: 'v1'
        });
      } else if (dataType === 'researchPreferences') {
        const docRef = db.collection('users').doc(uid).collection('settings').doc('researchPreferences');
        await docRef.set({
          ...data,
          updatedAt: serverTimestamp,
          schemaVersion: 'v1'
        });
      } else if (dataType === 'latestDailyBrief') {
        const docRef = db.collection('users').doc(uid).collection('research').doc('latestDailyBrief');
        await docRef.set({
          ...data,
          updatedAt: serverTimestamp,
          schemaVersion: 'v1'
        });
      } else {
        return res.status(400).json({ success: false, errorMessage: "Invalid data type." });
      }

      // Update syncState document too
      const syncRef = db.collection('users').doc(uid).collection('metadata').doc('syncState');
      await syncRef.set({
        lastSyncedAt: serverTimestamp,
        lastSyncedDataType: dataType
      }, { merge: true });

      res.json({ success: true, message: `${dataType} uploaded successfully.` });
    } catch (err: any) {
      console.error("Upload sync error:", err);
      res.status(500).json({ success: false, errorMessage: err.message || "Upload failed." });
    }
  });

  app.post("/api/sync/download", async (req, res) => {
    try {
      const { token, dataType } = req.body;
      if (!token) {
        return res.status(401).json({ success: false, errorMessage: "Unauthorized: Missing authentication token." });
      }
      const verified = await verifyFirebaseToken(token);
      const uid = verified.uid;

      if (!db) {
        return res.status(500).json({ success: false, errorMessage: "Firestore Admin is not available." });
      }

      let docRef;
      if (dataType === 'creatorProfile') {
        docRef = db.collection('users').doc(uid).collection('settings').doc('creatorProfile');
      } else if (dataType === 'researchPreferences') {
        docRef = db.collection('users').doc(uid).collection('settings').doc('researchPreferences');
      } else if (dataType === 'latestDailyBrief') {
        docRef = db.collection('users').doc(uid).collection('research').doc('latestDailyBrief');
      } else {
        return res.status(400).json({ success: false, errorMessage: "Invalid data type." });
      }

      const docSnap = await docRef.get();
      if (!docSnap.exists) {
        return res.json({ success: true, exists: false });
      }

      const rawData = docSnap.data();
      const data = { ...rawData };
      if (data.updatedAt && typeof data.updatedAt.toDate === 'function') {
        data.updatedAt = data.updatedAt.toDate().toISOString();
      }

      res.json({ success: true, exists: true, data });
    } catch (err: any) {
      console.error("Download sync error:", err);
      res.status(500).json({ success: false, errorMessage: err.message || "Download failed." });
    }
  });

  app.post("/api/sync/status", async (req, res) => {
    try {
      const { token } = req.body;
      if (!token) {
        return res.status(401).json({ success: false, errorMessage: "Unauthorized: Missing authentication token." });
      }
      const verified = await verifyFirebaseToken(token);
      const uid = verified.uid;

      if (!db) {
        return res.status(500).json({ success: false, errorMessage: "Firestore Admin is not available." });
      }

      const profileRef = db.collection('users').doc(uid).collection('settings').doc('creatorProfile');
      const prefsRef = db.collection('users').doc(uid).collection('settings').doc('researchPreferences');
      const briefRef = db.collection('users').doc(uid).collection('research').doc('latestDailyBrief');

      const [profileSnap, prefsSnap, briefSnap] = await Promise.all([
        profileRef.get(),
        prefsRef.get(),
        briefRef.get()
      ]);

      const getISOString = (timestamp: any) => {
        if (timestamp && typeof timestamp.toDate === 'function') {
          return timestamp.toDate().toISOString();
        }
        return null;
      };

      const cleanData = (snap: any) => {
        if (!snap.exists) return null;
        const raw = snap.data();
        const data = { ...raw };
        if (data.updatedAt && typeof data.updatedAt.toDate === 'function') {
          data.updatedAt = data.updatedAt.toDate().toISOString();
        }
        return data;
      };

      res.json({
        success: true,
        profile: profileSnap.exists ? {
          exists: true,
          updatedAt: getISOString(profileSnap.data()?.updatedAt),
          data: cleanData(profileSnap)
        } : { exists: false },
        preferences: prefsSnap.exists ? {
          exists: true,
          updatedAt: getISOString(prefsSnap.data()?.updatedAt),
          data: cleanData(prefsSnap)
        } : { exists: false },
        latestDailyBrief: briefSnap.exists ? {
          exists: true,
          updatedAt: getISOString(briefSnap.data()?.updatedAt),
          data: cleanData(briefSnap)
        } : { exists: false }
      });
    } catch (err: any) {
      console.error("Check status sync error:", err);
      res.status(500).json({ success: false, errorMessage: err.message || "Check status failed." });
    }
  });

  // Vite Dev / Prod static serving
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

    if (!process.env.VERCEL) {
    const runtimePort = Number(process.env.PORT) || PORT;

    app.listen(runtimePort, "0.0.0.0", () => {
      console.log(`Server running on port ${runtimePort}`);
    });
  }

  return app;
}

const appPromise = startServer();

export default async function handler(
  req: express.Request,
  res: express.Response
) {
  const app = await appPromise;

  await new Promise<void>((resolve, reject) => {
    res.once("finish", resolve);
    res.once("close", resolve);
    res.once("error", reject);

    app(req, res);
  });
}
