import { ReactNode } from 'react';

export type TabType = 'home' | 'ideas' | 'post-studio' | 'visual-studio' | 'settings' | 'carousel-builder';

export interface CardProps {
  id?: string;
  title: string;
  description?: string;
  icon?: ReactNode;
}

export interface CreatorProfile {
  fullName: string;
  linkedinUrl: string;
  linkedinHeadline: string;
  creatorPositioning: string;
  primaryAudience: string;
  secondaryAudiences: string[];
  contentPillars: string[];
  writingStyles: string[];
  promotionLevel: 'Low' | 'Balanced' | 'High';
  emotionalIntensity: 'Calm' | 'Balanced' | 'Strong';
  detailLevel: 'Concise' | 'Standard' | 'Detailed';
  phrasesToAvoid: string[];
  topicsToAvoid: string[];
}

export type GeminiConnectionStatus =
  | 'Not tested'
  | 'Testing'
  | 'Connected'
  | 'Configuration missing'
  | 'Connection failed'
  | 'Quota exceeded'
  | 'Model unavailable';

export type SafeGeminiError =
  | 'configuration_missing'
  | 'unauthorized'
  | 'quota_exceeded'
  | 'model_unavailable'
  | 'failed';

export interface GeminiConnectionResult {
  success: boolean;
  modelName: string;
  responseTimeMs?: number;
  errorCategory?: SafeGeminiError;
  errorMessage?: string;
  testedAt?: string;
}

export interface GeneratedContentIdea {
  title: string;
  primaryAudience: string;
  contentPillar: string;
  coreIdea: string;
  problemSolved: string;
  whyUseful: string;
  uniqueAngle: string;
  suggestedHook: string;
  recommendedFormat: 'Text post' | 'Single image' | 'Carousel' | 'Build-in-public post' | string;
  expectedGrowthMechanism: string;
  savedAt?: string;
  aiRelevance?: 'Direct' | 'Indirect' | 'Not relevant' | string;
}

export type ResearchStatus = 'idle' | 'searching' | 'success' | 'error';
export type ResearchFreshness = 'Within 72 hours' | 'Within 7 days';
export type ResearchSourceType = 'Official' | 'Research paper' | 'GitHub' | 'Publication' | 'Community';
export type SourceConfidence = 'High' | 'Medium' | 'Low';

export interface AIResearchSource {
  title: string;
  publisher: string;
  url: string;
  publishedDate: string;
  sourceType: ResearchSourceType | string;
}

export interface AIResearchResult {
  status: 'found' | 'no_reliable_result';
  headline?: string;
  developmentDate?: string;
  researchedAt?: string;
  freshness?: ResearchFreshness | string;
  category?: 'Model release' | 'Product update' | 'Research' | 'Open source' | 'Policy' | 'AI tool' | 'Other' | string;
  whatHappened?: string;
  whyItMatters?: string;
  whoIsAffected?: string[];
  practicalApplication?: string;
  limitationsOrUncertainty?: string;
  linkedInOpportunity?: string;
  sourceConfidence?: SourceConfidence | string;
  sources?: AIResearchSource[];
  savedAt?: string;
}

export interface AIResearchResponse {
  success: boolean;
  result?: AIResearchResult;
  errorCategory?: SafeGeminiError;
  errorMessage?: string;
}

export interface ContentIdeaResponse {
  success: boolean;
  idea?: GeneratedContentIdea;
  errorCategory?: SafeGeminiError;
  errorMessage?: string;
}

export type IdeaGenerationStatus =
  | 'idle'
  | 'generating'
  | 'success'
  | 'error';

export type GroundedPostFormat =
  | 'Text post'
  | 'Single image'
  | 'Carousel'
  | 'News analysis'
  | 'Practical workflow';

export type GrowthMechanism =
  | 'Save value'
  | 'Share value'
  | 'Discussion value'
  | 'Profile visit'
  | 'Follow value';

export interface GroundedSourceReference {
  title: string;
  publisher: string;
  url: string;
}

export interface GroundedLinkedInIdea {
  title: string;
  primaryAudience: string;
  contentPillar: string;
  researchHeadline: string;
  coreAngle: string;
  professionalProblem: string;
  readerTakeaway: string;
  practicalValue: string;
  uniqueAngle: string;
  suggestedHook: string;
  recommendedFormat: GroundedPostFormat | string;
  growthMechanism: GrowthMechanism | string;
  factBoundary: string;
  uncertaintyToMention: string;
  aiRelevance: 'Direct';
  sourceReferences: GroundedSourceReference[];
  generatedAt?: string;
  savedAt?: string;
  type?: 'grounded-research-idea';
}

export interface GroundedIdeaResponse {
  success: boolean;
  idea?: GroundedLinkedInIdea;
  errorCategory?: SafeGeminiError;
  errorMessage?: string;
}

export type GroundedIdeaStatus = 'idle' | 'generating' | 'success' | 'error';

export type ResearchCategory = 'Model release' | 'Product update' | 'Research' | 'Open source' | 'Workplace AI' | 'Policy' | 'AI tool' | 'Other';

export interface DailyResearchDevelopment {
  id: string;
  headline: string;
  developmentDate: string;
  category: ResearchCategory;
  whatHappened: string;
  whyItMatters: string;
  whoIsAffected: string[];
  practicalApplication: string;
  limitationsOrUncertainty: string;
  linkedInOpportunity: string;
  sourceConfidence: SourceConfidence | string;
  sources: AIResearchSource[];
}

export interface DailyResearchBrief {
  researchedAt: string;
  timeWindowUsed: '72 hours' | '7 days' | string;
  summary: string;
  developments: DailyResearchDevelopment[];
  savedAt?: string;
}

export type DailyResearchStatus = 'idle' | 'searching' | 'verifying' | 'duplicates' | 'preparing' | 'success' | 'error';

export interface SavedResearchDevelopment extends DailyResearchDevelopment {
  savedAt: string;
  researchedAt: string;
  timeWindowUsed: string;
}

export type DailyIdeaType = 'Research-grounded' | 'Evergreen practical' | 'AI career or recruitment' | 'Build in public' | 'Original opinion';

export type LinkedInPostFormat = 'Text post' | 'Single image' | 'Carousel' | 'News analysis' | 'Practical workflow' | 'Build-in-public post';

export type IdeaGrowthMechanism = 'Save value' | 'Share value' | 'Discussion value' | 'Profile visit' | 'Follow value' | 'Connection value';

export interface DailyContentIdeaSource {
  title: string;
  publisher: string;
  url: string;
}

export interface DailyContentIdea {
  id: string;
  rankOrder: number;
  ideaType: DailyIdeaType;
  title: string;
  primaryAudience: string;
  contentPillar: string;
  coreIdea: string;
  problemSolved: string;
  readerPayoff: string;
  uniqueAngle: string;
  suggestedHook: string;
  recommendedFormat: LinkedInPostFormat;
  growthMechanism: IdeaGrowthMechanism;
  whyItCouldWork: string;
  credibilityRequirement: string;
  actionRequiredFromRohit: string;
  factBoundary: string;
  uncertaintyToMention: string;
  aiRelevance: 'Direct';
  researchDevelopmentIds?: string[];
  sourceReferences?: DailyContentIdeaSource[];
}

export interface DailyIdeaCollection {
  generatedAt: string;
  researchBriefTimestamp: string;
  collectionSummary: string;
  ideas: DailyContentIdea[];
}

export type DailyIdeaGenerationStatus = 'idle' | 'reading_profile' | 'reviewing_research' | 'balancing_types' | 'removing_duplicates' | 'validating_collection' | 'success' | 'error';

export interface SavedDailyIdea extends DailyContentIdea {
  savedAt: string;
  generatedAt: string;
  researchBriefTimestamp: string;
}

export type IdeaRejectionState = Record<string, boolean>;

export type IdeaDecision = 'Winner' | 'Strong backup' | 'Needs improvement' | 'Reject';
export type IdeaRiskLevel = 'Low' | 'Medium' | 'High';
export type StressTestStatus = 'idle' | 'checking_audience' | 'testing_usefulness' | 'reviewing_credibility' | 'applying_penalties' | 'selecting_winners' | 'success' | 'error';

export interface IdeaCriterionScores {
  audienceRelevance: number;
  practicalUsefulness: number;
  originality: number;
  savePotential: number;
  sharePotential: number;
  discussionPotential: number;
  hookStrength: number;
  evidenceAndCredibility: number;
  followerConversionPotential: number;
  profileVisitPotential: number;
  connectionPotential: number;
  effortToImpactRatio: number;
  visualOrFormatPotential: number;
}

export interface IdeaPenaltyScores {
  saturation: number;
  genericContent: number;
  credibilityRisk: number;
  misinformationRisk: number;
  clickbaitGap: number;
  executionBurden: number;
  repetition: number;
}

export interface IdeaEvaluation {
  ideaId: string;
  title: string;
  scores: IdeaCriterionScores;
  penalties: IdeaPenaltyScores;
  weightedQualityScore: number;
  totalPenalty: number;
  finalScore: number;
  strongestQuality: string;
  mainWeakness: string;
  whyThisScore: string;
  improvementRecommendation: string;
  requiredProofOrAction: string;
  riskLevel: IdeaRiskLevel;
  decision: IdeaDecision;
}

export interface IdeaStressTest {
  evaluatedAt: string;
  collectionId: string;
  evaluationSummary: string;
  evaluations: IdeaEvaluation[];
  winnerIdeaIds: string[];
  winnerSelectionReason: string;
  isStale?: boolean;
}

export interface WinnerSelection {
  winnerId: string;
  winningIdea: DailyContentIdea;
  evaluation: IdeaEvaluation;
  selectedAt: string;
}

export const CRITERION_WEIGHTS: Record<keyof IdeaCriterionScores, number> = {
  audienceRelevance: 0.12,
  practicalUsefulness: 0.15,
  originality: 0.10,
  savePotential: 0.10,
  sharePotential: 0.07,
  discussionPotential: 0.05,
  hookStrength: 0.08,
  evidenceAndCredibility: 0.10,
  followerConversionPotential: 0.10,
  profileVisitPotential: 0.05,
  connectionPotential: 0.03,
  effortToImpactRatio: 0.03,
  visualOrFormatPotential: 0.02,
};

export interface GeneratedPost {
  hooks: {
    curiosity: string;
    practicalResult: string;
    contrarian: string;
  };
  body: string;
}

export interface GeneratedPostResponse {
  success: boolean;
  post?: GeneratedPost;
  errorCategory?: SafeGeminiError;
  errorMessage?: string;
}

export interface AdjustedPostResponse {
  success: boolean;
  adjustedText?: string;
  errorCategory?: SafeGeminiError;
  errorMessage?: string;
}

export type ClaimClassification =
  | 'Verified fact'
  | 'Supported interpretation'
  | 'Professional opinion'
  | 'Prediction'
  | 'Personal claim'
  | 'General advice'
  | 'Source required'
  | 'Unsupported claim'
  | 'Misleading or overstated'
  | 'Not a factual claim';

export type ClaimRiskLevel = 'Low' | 'Medium' | 'High';

export type ClaimRecommendedAction = 'Keep' | 'Clarify' | 'Add uncertainty' | 'Confirm personally' | 'Rewrite' | 'Remove';

export interface SourceReference {
  title: string;
  publisher?: string;
  url: string;
}

export interface PostClaimEvaluation {
  id: string;
  claimText: string;
  location: 'Hook' | 'Body' | 'CTA';
  classification: ClaimClassification;
  riskLevel: ClaimRiskLevel;
  explanation: string;
  supportedBySource: boolean;
  sourceReferences?: SourceReference[];
  requiresRohitConfirmation: boolean;
  recommendedAction: ClaimRecommendedAction;
  suggestedRewrite?: string;
}

export interface HookCredibilityAssessment {
  status: 'Pass' | 'Warning' | 'Fail';
  explanation: string;
  suggestedRewrite?: string;
}

export interface UncertaintyAssessment {
  status: 'Adequate' | 'Missing' | 'Not required';
  explanation: string;
  suggestedText?: string;
}

export interface SourceAssessment {
  status: 'Complete' | 'Partial' | 'Not required';
  explanation: string;
}

export type PublicationReadiness =
  | 'Draft not checked'
  | 'Credibility check outdated'
  | 'Changes required'
  | 'Ready with warnings'
  | 'Ready to publish';

export interface PersonalClaimConfirmation {
  claimId: string;
  confirmedAt: string;
}

export interface PostCredibilityReport {
  checkedAt: string;
  draftFingerprint: string;
  overallStatus: 'Pass' | 'Pass with warnings' | 'Fail';
  credibilityScore: number;
  summary: string;
  verifiedClaimCount: number;
  warningClaimCount: number;
  highRiskClaimCount: number;
  claims: PostClaimEvaluation[];
  hookAssessment: HookCredibilityAssessment;
  uncertaintyAssessment: UncertaintyAssessment;
  sourceAssessment: SourceAssessment;
  publicationRecommendation: string;
}

export interface CredibilityCheckResponse {
  success: boolean;
  report?: PostCredibilityReport;
  errorCategory?: SafeGeminiError;
  errorMessage?: string;
}

export type VisualFormat = 'Text only' | 'Single image' | 'Carousel';

export type LinkedInVisualStyle =
  | 'Professional portrait'
  | 'Editorial photography'
  | 'Product mockup'
  | 'Conceptual illustration'
  | 'Infographic'
  | 'Infographic background'
  | 'Minimal statement card'
  | 'Screenshot-led'
  | 'Screenshot-led composition';

export type VisualAspectRatio = '1:1' | '4:5' | '16:9';

export type HeadlineSafeArea = 'Top' | 'Centre' | 'Bottom' | 'Left' | 'Right';

export type VisualIntensity = 'Minimal' | 'Balanced' | 'Bold';

export interface VisualFormatRecommendation {
  analysedAt: string;
  recommendedFormat: VisualFormat;
  confidence: 'High' | 'Medium' | 'Low';
  reason: string;
  visualObjective: string;
  readerShouldUnderstand: string;
  visualConcept: string;
  primarySubject: 'Rohit' | 'Object or interface' | 'Diagram' | 'Abstract concept' | 'No subject';
  recommendedStyle: LinkedInVisualStyle;
  recommendedAspectRatio: VisualAspectRatio;
  headlineSuggestion: string;
  supportingTextSuggestion: string;
  includeRohitRecommendation: boolean;
  includeRohitReason: string;
  imagePromptDraft: string;
  negativeInstructions: string[];
  carouselReason: string;
}

export interface ImageGenerationRequest {
  visualStrategy: VisualFormatRecommendation;
  postSummary: {
    title: string;
    hook: string;
    primaryAudience: string;
    contentPillar: string;
    recommendedPostFormat: string;
    growthMechanism: string;
    credibilityScore: number;
    publicationReadiness: string;
    wordCount: number;
    verifiedResearchStatus: string;
  };
  visualConcept: string;
  userPrompt: string;
  style: LinkedInVisualStyle;
  aspectRatio: VisualAspectRatio;
  includeRohit: boolean;
  referenceImage?: string; // base64 encoded string
  credibilityBoundary?: string;
  researchContext?: string;
}

export interface GeneratedLinkedInVisual {
  mimeType: string;
  base64Data: string;
  modelName: string;
  timestamp: string;
  aspectRatio: VisualAspectRatio;
  promptSummary: string;
  referencePhotoUsed: boolean;
}

export interface VisualOverlaySettings {
  showOverlay: boolean;
  headlineText: string;
  supportingText: string;
  headlineSafeArea: HeadlineSafeArea | 'Top 1/3' | 'Center' | 'Bottom 1/3';
  overlayOpacity: number;
  textBgOpacity: number;
  headlineColor: string;
}

export interface SavedVisualDraft {
  draftId: string;
  winnerId: string;
  recommendation: VisualFormatRecommendation;
  visual: GeneratedLinkedInVisual;
  promptUsed: string;
  styleUsed: LinkedInVisualStyle;
  aspectRatioUsed: VisualAspectRatio;
  overlaySettings: VisualOverlaySettings;
  savedAt: string;
}

export type VisualGenerationStatus =
  | 'idle'
  | 'generating'
  | 'success'
  | 'error'
  | 'reviewing_direction'
  | 'preparing_composition'
  | 'applying_brand'
  | 'generating_image'
  | 'preparing_preview';

export interface ReferenceImageMetadata {
  name: string;
  size: number;
  type: string;
  resolution?: string;
  uploadedAt: string;
}

export type CarouselSlideRole =
  | 'Cover'
  | 'Problem'
  | 'Context'
  | 'Insight'
  | 'Framework'
  | 'Step'
  | 'Example'
  | 'Comparison'
  | 'Warning'
  | 'Limitation'
  | 'Checklist'
  | 'Summary'
  | 'CTA';

export type CarouselFactualType =
  | 'Verified fact'
  | 'Editorial interpretation'
  | 'General advice'
  | 'Creator-led concept';

export type CarouselLayoutTemplate =
  | 'Cover statement'
  | 'Big number or phrase'
  | 'Title and body'
  | 'Three-point list'
  | 'Comparison'
  | 'Process steps'
  | 'Quote-free insight'
  | 'Checklist'
  | 'Summary';

export type CarouselAspectRatio = '1:1' | '4:5';

export interface LinkedInCarouselSlide {
  id: string;
  slideNumber: number;
  role: CarouselSlideRole;
  title: string;
  body: string;
  bullets: string[];
  smallLabel: string;
  factualType: CarouselFactualType;
  sourceReferenceIds: string[];
  visualConcept: string;
  layoutTemplate: CarouselLayoutTemplate;
  emphasisText: string;
  speakerNote: string;
}

export interface LinkedInCarouselPlan {
  generatedAt: string;
  selectedWinnerId: string;
  postFingerprint: string;
  carouselTitle: string;
  carouselObjective: string;
  primaryAudience: string;
  contentPillar: string;
  recommendedSlideCount: number;
  visualNarrative: string;
  coverPromise: string;
  designDirection: string;
  sourcesRequired: boolean;
  slides: LinkedInCarouselSlide[];
  closingTakeaway: string;
  captionRelationship: string;
}

export interface CarouselDesignSettings {
  aspectRatio: CarouselAspectRatio;
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  fontScale: number;
  cornerRoundness: number;
  contentDensity: 'compact' | 'comfortable' | 'spacious';
  showPageNumber: boolean;
  showCreatorName: boolean;
  showProgressIndicator: boolean;
}

export interface CarouselQualityIssue {
  slideId: string;
  severity: 'Low' | 'Medium' | 'High';
  issue: string;
  recommendedFix: string;
}

export interface CarouselQualityReport {
  status: 'Pass' | 'Pass with warnings' | 'Fail';
  score: number;
  summary: string;
  issues: CarouselQualityIssue[];
}

export interface SavedCarouselDraft {
  winnerId: string;
  postFingerprint: string;
  carouselStrategy: LinkedInCarouselPlan;
  slideContent: LinkedInCarouselSlide[];
  slideOrder: string[];
  aspectRatio: CarouselAspectRatio;
  designSettings: CarouselDesignSettings;
  qualityReport: CarouselQualityReport | null;
  qualityCheckFingerprint: string | null;
  createdAt: string;
  updatedAt: string;
  draftStatus: 'draft' | 'ready';
  visualStrategy?: CarouselVisualStrategy | null;
  assetsMetadata?: Record<string, SavedCarouselAssetMetadata>;
}

export type CarouselGenerationStatus =
  | 'idle'
  | 'generating'
  | 'success'
  | 'error'
  | 'checking_quality'
  | 'rewriting_slide'
  | 'generating_cover'
  | 'analyzing_visual_needs'
  | 'improving_prompt'
  | 'generating_asset'
  | 'generating_all_assets';

// Carousel visual strategy and recommendations types
export type CarouselVisualNeed =
  | 'None'
  | 'Background only'
  | 'Illustration'
  | 'Editorial image'
  | 'Object composition'
  | 'Interface concept'
  | 'Diagram asset'
  | 'Rohit portrait';

export type CarouselVisualImportance =
  | 'Essential'
  | 'Helpful'
  | 'Optional'
  | 'Unnecessary';

export type CarouselArtworkType =
  | 'No generated artwork'
  | 'Background only'
  | 'Illustration'
  | 'Editorial image'
  | 'Object composition'
  | 'Interface concept'
  | 'Diagram asset'
  | 'Rohit portrait';

export interface CarouselSlideVisualRecommendation {
  slideId: string;
  visualNeed: CarouselVisualNeed;
  visualImportance: CarouselVisualImportance;
  reason: string;
  assetObjective: string;
  mainSubject: string;
  composition: string;
  textSafeArea: 'Top' | 'Centre' | 'Bottom' | 'Left' | 'Right';
  imagePrompt: string;
  negativeInstructions: string[];
  includeRohitRecommended: boolean;
}

export interface CarouselVisualStrategy {
  analysedAt: string;
  carouselVisualTheme: string;
  artDirection: string;
  consistencyRules: string[];
  lightingDirection: string;
  compositionDirection: string;
  textureDirection: string;
  identityUsageRecommendation: string;
  slides: CarouselSlideVisualRecommendation[];
}

export type CarouselArtworkPlacement =
  | 'Full background'
  | 'Left panel'
  | 'Right panel'
  | 'Top panel'
  | 'Bottom panel'
  | 'Contained card';

export interface CarouselArtworkSettings {
  artworkOpacity: number; // 0 to 100
  overlayDarkness: number; // 0 to 100
  scale: number; // 0.5 to 2.0
  horizontalPosition: number; // -100 to 100
  verticalPosition: number; // -100 to 100
  crop: 'cover' | 'contain' | 'fill';
  blur: number; // 0 to 20
  contrast: number; // 50 to 150
  saturation: number; // 0 to 200
}

export interface GeneratedCarouselAsset {
  mimeType: string;
  base64Data: string;
  modelName: string;
  timestamp: string;
  aspectRatio: CarouselAspectRatio;
  promptSummary: string;
  referencePhotoUsed: boolean;
}

export interface SavedCarouselAssetMetadata {
  slideId: string;
  indexedDBKey: string;
  prompt: string;
  model: string;
  generationTimestamp: string;
  artworkType: CarouselArtworkType;
  placement: CarouselArtworkPlacement;
  referencePhotoUsed: boolean;
  assetStatus: 'current' | 'outdated' | 'error';
  errorMessage?: string;
  settings: CarouselArtworkSettings;
  textSafeArea: 'Top' | 'Centre' | 'Bottom' | 'Left' | 'Right';
  artworkIntensity: 'Minimal' | 'Balanced' | 'Bold';
  
  // Cache fields for stale protection
  originalSlideTitle?: string;
  originalSlideBody?: string;
  originalSlideVisualConcept?: string;
  originalArtworkType?: CarouselArtworkType;
  originalTextSafeArea?: 'Top' | 'Centre' | 'Bottom' | 'Left' | 'Right';
  originalCarouselVisualTheme?: string;
  originalPostFingerprint?: string;
}

export type CarouselAssetGenerationStatus =
  | 'idle'
  | 'preparing'
  | 'generating'
  | 'saving'
  | 'success'
  | 'error'
  | 'cancelling';

export interface CarouselAssetError {
  slideId: string;
  error: string;
  timestamp: string;
}

export interface AuthenticatedUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

export type CloudSyncStatus =
  | 'Signed out'
  | 'Local only'
  | 'Checking cloud'
  | 'In sync'
  | 'Local changes pending'
  | 'Cloud changes available'
  | 'Sync conflict'
  | 'Sync failed';

export interface FirestoreRecordMetadata {
  createdAt: any;
  updatedAt: any;
  lastSyncedAt?: any;
}

export type DataSchemaVersion = 'v1';

export type SyncDirection = 'Upload' | 'Download';
export type SyncOutcome = 'Success' | 'Failure' | 'Conflict' | 'Cancelled';

export interface CloudSyncEvent {
  timestamp: string;
  dataType: 'creatorProfile' | 'researchPreferences' | 'latestDailyBrief' | 'all';
  direction: SyncDirection;
  outcome: SyncOutcome;
  summary: string;
}

export interface CloudSyncState {
  status: CloudSyncStatus;
  lastSuccessfulSync: string | null;
  pendingLocalChanges: boolean;
  lastSyncError: string | null;
  syncLog: CloudSyncEvent[];
}

export interface CloudCreatorProfile {
  fullName: string;
  linkedinUrl: string;
  linkedinHeadline: string;
  creatorPositioning: string;
  primaryAudience: string;
  secondaryAudiences: string[];
  contentPillars: string[];
  writingStyles: string[];
  promotionLevel: 'Low' | 'Balanced' | 'High';
  emotionalIntensity: 'Calm' | 'Balanced' | 'Strong';
  detailLevel: 'Concise' | 'Standard' | 'Detailed';
  phrasesToAvoid: string[];
  topicsToAvoid: string[];
  updatedAt: any;
  schemaVersion: DataSchemaVersion;
}

export interface CloudResearchPreferences {
  researchEnabled: boolean;
  timeZone: string;
  preferredResearchTime: string;
  primaryResearchWindow: '24 hours' | '72 hours' | '7 days' | string;
  fallbackResearchWindow: '72 hours' | '7 days' | '14 days' | string;
  minimumDevelopmentCount: number;
  maximumDevelopmentCount: number;
  updatedAt: any;
  schemaVersion: DataSchemaVersion;
}

export interface CloudDailyResearchBrief {
  briefId: string;
  researchTimestamp: string;
  timeWindowUsed: string;
  summary: string;
  verifiedDevelopments: DailyResearchDevelopment[];
  verifiedSourceReferences: GroundedSourceReference[];
  createdBy: 'Manual' | 'Scheduled';
  updatedAt: any;
  schemaVersion: DataSchemaVersion;
}

export interface CloudSyncConflict {
  dataType: 'creatorProfile' | 'researchPreferences' | 'latestDailyBrief';
  deviceVersion: any;
  cloudVersion: any;
  deviceTimestamp: string | null;
  cloudTimestamp: string | null;
  differences: string[];
}

