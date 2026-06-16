/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from "react";
import { 
  Sparkles, 
  Copy, 
  FileText, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  RefreshCw, 
  Send, 
  Bot, 
  User, 
  BrainCircuit, 
  Check, 
  CheckSquare, 
  Square,
  Trash2, 
  HelpCircle, 
  Briefcase, 
  MapPin, 
  Award,
  AlertTriangle,
  Info,
  ExternalLink,
  ChevronRight,
  Sparkle,
  BookmarkCheck
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { JobDescription, InterviewGuide, ChatMessage } from "./types";

// Standard template examples for testing
const SAMPLE_TEMPLATES = [
  {
    label: "Senior React Engineer",
    rawNotes: "We are looking for a Senior React Engineer with deep knowledge of React 19, Vite, and Tailwind. They must have built custom SaaS panels, worked on high-performance interactive interfaces, and understand server routing/SSR. 5+ years experience. Hybrid in Austin, Texas. Nice to have: experience with real-time web sockets for messaging.",
    tone: "Professional",
    experienceLevel: "Senior",
    workplaceMode: "Hybrid"
  },
  {
    label: "Customer Support Lead",
    rawNotes: "Need a leader for our customer success team. 3+ years managing customer support agents. Key responsibilities include creating customer playbooks and scaling the help center. Must know Zendesk, Intercom, and Slack inside out. Outstanding empathy and problem-solving. Remote role. Casual but reliable vibe. Great medical and learning stipends.",
    tone: "Inclusive",
    experienceLevel: "Lead",
    workplaceMode: "Remote"
  },
  {
    label: "Growth Marketer (Meta/Google Ads)",
    rawNotes: "Looking for an analytical growth specialist to run premium paid ads on Meta & Google campaigns. Creative skills in landing page copy, funnel conversions, and high-converting graphic ad copies. GA4 or Mixpanel analytics knowledge. A/B testing obsessed. 3 years track record. Bold tone. Core focus on SaaS user growth.",
    tone: "Bold",
    experienceLevel: "Mid",
    workplaceMode: "Remote"
  }
];

const LOADING_QUOTES = [
  "Structuring LinkedIn-optimized hook headlines...",
  "Formatting responsibilities with engaging professional layout...",
  "Mapping candidate profiles to target behavioral requirements...",
  "Drafting exactly 10 STAR behavioral interview questions...",
  "Integrating hard & soft skill response evaluation rubrics...",
  "Reviewing recruitment benchmarks for final optimization..."
];

export default function App() {
  // Campaign options state
  const [rawNotes, setRawNotes] = useState<string>(SAMPLE_TEMPLATES[0].rawNotes);
  const [tone, setTone] = useState<string>(SAMPLE_TEMPLATES[0].tone);
  const [experienceLevel, setExperienceLevel] = useState<string>(SAMPLE_TEMPLATES[0].experienceLevel);
  const [workplaceMode, setWorkplaceMode] = useState<string>(SAMPLE_TEMPLATES[0].workplaceMode);
  const [enableThinking, setEnableThinking] = useState<boolean>(false);

  // Output states
  const [jobDescription, setJobDescription] = useState<JobDescription | null>(null);
  const [interviewGuide, setInterviewGuide] = useState<InterviewGuide | null>(null);

  // App control states
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingQuoteIndex, setLoadingQuoteIndex] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"jd" | "interview" | "chat">("jd");
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  const [evaluationFeedback, setEvaluationFeedback] = useState<string>("");

  // Server health status state
  const [serverConnected, setServerConnected] = useState<boolean>(false);
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);

  // Interactive evaluation state for the 10 questions
  // Keeps star-ratings and response notes for candidate reviews
  const [questionEvaluations, setQuestionEvaluations] = useState<Record<number, { score: number; notes: string }>>({});
  // Expanded state for Accordion style questions
  const [expandedQuestionId, setExpandedQuestionId] = useState<number | null>(1);
  // Checklist for each question's evaluation rubric
  const [rubricCheckState, setRubricCheckState] = useState<Record<string, boolean>>({});

  // Chat interface state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "init",
      role: "model",
      text: "👋 Hello! I'm **Aura**, your strategic Talent Acquisition Coach. Type anything to review, tweak, or expand your LinkedIn job description and interview guide details. I can even live-update your records as we talk!",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [chatInput, setChatInput] = useState<string>("");
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Periodically change loading speech bubble for enhanced user feedback
  useEffect(() => {
    let interval: any;
    if (isLoading) {
      interval = setInterval(() => {
        setLoadingQuoteIndex((prev) => (prev + 1) % LOADING_QUOTES.length);
      }, 3500);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  // Check connection status/API keys on mount
  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((data) => {
        if (data.status === "ok") {
          setServerConnected(true);
          setHasApiKey(data.hasApiKey);
        }
      })
      .catch((err) => {
        console.error("Backend offline:", err);
        setServerConnected(false);
      });
  }, []);

  // Sync scroll for the chat companion thread
  useEffect(() => {
    chatScrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isChatLoading]);

  // Load template helper
  const handleApplyTemplate = (tpl: typeof SAMPLE_TEMPLATES[0]) => {
    setRawNotes(tpl.rawNotes);
    setTone(tpl.tone);
    setExperienceLevel(tpl.experienceLevel);
    setWorkplaceMode(tpl.workplaceMode);
  };

  // Main campaign generation action
  const handleGenerateCampaign = async () => {
    if (!rawNotes.trim()) {
      setErrorMessage("Please input raw thoughts, drafts, or ideas about your desired role first.");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");
    setLoadingQuoteIndex(0);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawNotes,
          tone,
          experienceLevel,
          workplaceMode,
          enableThinking
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.details || errData.error || "Generation unsuccessful");
      }

      const data = await response.json();
      setJobDescription(data.jobDescription);
      setInterviewGuide(data.interviewGuide);
      setActiveTab("jd");

      // Reset score evaluations & accordion state
      setQuestionEvaluations({});
      setRubricCheckState({});
      setExpandedQuestionId(data.interviewGuide?.questions?.[0]?.id || 1);

      // Add dynamic updates message from Coach Aura
      const updateMsg: ChatMessage = {
        id: `gen-${Date.now()}`,
        role: "model",
        text: `🚀 **Hooray!** I have generated a gorgeous LinkedIn Job Description for a **${data.jobDescription.title}** paired with a strategic 10-Question Behavioral Interview Guide. Let me know if you would like to edit or hone any of it!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages((prev) => [...prev, updateMsg]);

    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "An unexpected network error occurred while generating recruitment assets. Please verify your API key.");
    } finally {
      setIsLoading(false);
    }
  };

  // Refine Campaign via Chat Companion
  const handleSendChatMessage = async () => {
    if (!chatInput.trim()) return;

    const userMsgText = chatInput;
    const userMsgObj: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: "user",
      text: userMsgText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages((prev) => [...prev, userMsgObj]);
    setChatInput("");
    setIsChatLoading(true);

    try {
      // Build brief structural history for API
      const historyPayload = chatMessages
        .filter(m => !m.isSystem)
        .slice(-8) // Last 8 messages to keep token footprint low and compliant
        .concat(userMsgObj)
        .map(m => ({
          role: m.role,
          text: m.text
        }));

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: historyPayload,
          currentJobDescription: jobDescription,
          currentInterviewGuide: interviewGuide,
          enableThinking: enableThinking // match thinking state preference
        }),
      });

      if (!response.ok) {
        throw new Error("Chat companion service was unable to fulfill request");
      }

      const data = await response.json();

      // Append assistant model result
      const coachMsgObj: ChatMessage = {
        id: `cch-${Date.now()}`,
        role: "model",
        text: data.message,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages((prev) => [...prev, coachMsgObj]);

      // If Aura modified content, merge it live and trigger feedback animation!
      let noteAlerts = [];
      if (data.updatedJobDescription) {
        setJobDescription(data.updatedJobDescription);
        noteAlerts.push("LinkedIn Job Description updated! 📝");
      }
      if (data.updatedInterviewGuide) {
        setInterviewGuide(data.updatedInterviewGuide);
        noteAlerts.push("Interview Guide revised! 🎯");
      }

      if (noteAlerts.length > 0) {
        setEvaluationFeedback(noteAlerts.join(" \n"));
        setTimeout(() => setEvaluationFeedback(""), 4500);
      }

    } catch (err: any) {
      console.error(err);
      setChatMessages((prev) => [...prev, {
        id: `err-${Date.now()}`,
        role: "model",
        text: "⚠️ *Ah, I had a brief connection drop trying to refine that for you. Please confirm your API configuration is active and let us try once more.*",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Star-rating helper for the structured interview guide candidate reviews
  const handleSetScore = (qId: number, rating: number) => {
    setQuestionEvaluations((prev) => ({
      ...prev,
      [qId]: {
        score: rating,
        notes: prev[qId]?.notes || ""
      }
    }));
  };

  // Notes helper
  const handleSetNotes = (qId: number, text: string) => {
    setQuestionEvaluations((prev) => ({
      ...prev,
      [qId]: {
        score: prev[qId]?.score || 0,
        notes: text
      }
    }));
  };

  // Star metric calculator for general candidate review status
  const getScoringSummary = () => {
    const list = Object.values(questionEvaluations) as { score: number; notes: string }[];
    const scoredQuestions = list.filter((q) => q.score > 0);
    if (scoredQuestions.length === 0) return null;
    const sum = scoredQuestions.reduce((acc, q) => acc + q.score, 0);
    return {
      average: (sum / scoredQuestions.length).toFixed(1),
      count: scoredQuestions.length
    };
  };

  // Copy to clipboard helper
  const copyJdToClipboard = () => {
    if (!jobDescription) return;

    const formattedText = `
💼 ${jobDescription.title.toUpperCase()}
📍 Place: ${jobDescription.companyPlaceholder} | Remote Status: ${jobDescription.workplaceMode} (${jobDescription.locationPlaceholder})
🔥 Level: ${jobDescription.experienceLevel}

【 ROLE OVERVIEW 】
${jobDescription.overview}

【 KEY RESPONSIBILITIES 】
${jobDescription.responsibilities.map(r => `• ${r}`).join("\n")}

【 REQUIREMENTS / EXPERIENCE 】
${jobDescription.requirements.map(req => `• ${req}`).join("\n")}

【 BENEFITS & COMPENSATION 】
${jobDescription.benefits.map(b => `• ${b}`).join("\n")}

📌 Posting Advice / Tips:
${jobDescription.linkedinTips.join("\n")}
    `.trim();

    navigator.clipboard.writeText(formattedText);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2500);
  };

  // Clean formatting helper for rendering text with bullets
  const formatBulletValue = (text: string) => {
    if (text.startsWith("• ") || text.startsWith("- ")) return text.substring(2);
    return text;
  };

  // Calculate actual post length relative to LinkedIn 3000 chars limit
  const getJdCharacterCount = () => {
    if (!jobDescription) return 0;
    return (
      jobDescription.title.length +
      jobDescription.overview.length +
      jobDescription.responsibilities.join(" ").length +
      jobDescription.requirements.join(" ").length +
      jobDescription.benefits.join(" ").length
    );
  };

  const charCount = getJdCharacterCount();
  const scoreStats = getScoringSummary();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased">
      {/* Dynamic API Alerts/Pills */}
      <AnimatePresence>
        {evaluationFeedback && (
          <motion.div
            initial={{ opacity: 0, y: -45, scale: 0.95 }}
            animate={{ opacity: 1, y: 15, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-2 left-1/2 -translate-x-1/2 z-50 bg-indigo-600 text-white shadow-xl rounded-full px-6 py-2.5 flex items-center gap-2.5 border border-indigo-500 text-sm font-semibold tracking-wide"
          >
            <Sparkle className="w-4 h-4 text-amber-300 animate-spin" />
            <span className="whitespace-pre-line">{evaluationFeedback}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Elegant Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-100">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                Recruitment Sandbox
                <span className="text-xs font-mono font-normal text-slate-400">v2.1</span>
              </h1>
              <p className="text-xs text-slate-500">Transform chaotic design notes into LinkedIn job postings and custom STAR interview guides.</p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono self-stretch sm:self-auto justify-between sm:justify-start">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${
              serverConnected ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${serverConnected ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
              <span>{serverConnected ? "Proxy Host Running" : "Proxy Host Offline"}</span>
            </div>

            {serverConnected && (
              <div className={`px-3 py-1.5 rounded-full border ${
                hasApiKey ? "bg-indigo-50 text-indigo-700 border-indigo-200" : "bg-amber-50 text-amber-700 border-amber-200"
              }`}>
                <span>Gemini API Key: {hasApiKey ? "Injected & Active" : "Missing"}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column - Sandbox Input Panel (Span 5) */}
        <section id="sandbox-inputs" className="lg:col-span-5 flex flex-col gap-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col gap-5">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800 text-sm tracking-tight flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-slate-400" />
                 Hires &amp; Requirements Note
              </h2>
              <span className="text-xs text-slate-400">Step 1</span>
            </div>

            {/* Template presets */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-2">Populate instantly from sample scenarios:</label>
              <div className="flex flex-wrap gap-1.5">
                {SAMPLE_TEMPLATES.map((tpl, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleApplyTemplate(tpl)}
                    className="text-[11px] font-medium px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 transition-all cursor-pointer"
                  >
                    💡 {tpl.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Main Textarea Input */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-700 flex justify-between">
                <span>Core Thoughts, Requirements, or Raw Draft Notes:</span>
                <span className="text-slate-400 font-normal">{rawNotes.length} characters</span>
              </label>
              <textarea
                value={rawNotes}
                onChange={(e) => setRawNotes(e.target.value)}
                placeholder="What job role are we hiring? Describe the technical, leadership, and soft skill requirements. Mention remote guidelines, standard team tools, and nice-to-haves (e.g. Kotlin experience, GCP knowledge)..."
                rows={8}
                className="w-full text-sm p-3.5 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all placeholder:text-slate-400 font-sans"
              />
            </div>

            {/* Campaign Modifiers */}
            <div className="grid grid-cols-3 gap-3">
              {/* Tone selection */}
              <div className="flex flex-col gap-1.5 col-span-3 sm:col-span-1">
                <label className="text-xs font-medium text-slate-500">Post Tone</label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg outline-none text-slate-700"
                >
                  <option value="Professional & Compelling">💼 Professional</option>
                  <option value="Bold & Disruptive">⚡ Bold</option>
                  <option value="Creative & Visionary">🎨 Creative</option>
                  <option value="Warm & Inclusive">🌱 Inclusive</option>
                </select>
              </div>

              {/* Experience Level */}
              <div className="flex flex-col gap-1.5 col-span-3 sm:col-span-1">
                <label className="text-xs font-medium text-slate-500">Exp Level</label>
                <select
                  value={experienceLevel}
                  onChange={(e) => setExperienceLevel(e.target.value)}
                  className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg outline-none text-slate-700"
                >
                  <option value="Junior">Junior (1-3 yrs)</option>
                  <option value="Mid">Mid (3-5 yrs)</option>
                  <option value="Senior">Senior (5+ yrs)</option>
                  <option value="Lead">Lead / Staff</option>
                  <option value="Executive">Executive / VP</option>
                </select>
              </div>

              {/* Workplace Mode */}
              <div className="flex flex-col gap-1.5 col-span-3 sm:col-span-1">
                <label className="text-xs font-medium text-slate-500">Workplace Mode</label>
                <select
                  value={workplaceMode}
                  onChange={(e) => setWorkplaceMode(e.target.value)}
                  className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg outline-none text-slate-700"
                >
                  <option value="Onsite">Onsite</option>
                  <option value="Hybrid">Hybrid</option>
                  <option value="Remote">Remote</option>
                </select>
              </div>
            </div>

            {/* Deep Reasoning Switch - Features paid_model_flow activation capabilities */}
            <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/50 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BrainCircuit className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-bold text-indigo-900">Enable AI Thinking Mode</span>
                </div>
                <button
                  type="button"
                  onClick={() => setEnableThinking(!enableThinking)}
                  className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    enableThinking ? 'bg-indigo-600' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      enableThinking ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
              <p className="text-[11px] text-indigo-700 leading-relaxed">
                Uses **gemini-3.1-pro-preview** with **ThinkingLevel.HIGH** to outline intricate soft/hard skill matrices and map targeted response behaviors.
              </p>
            </div>

            {/* Action Trigger Button */}
            <button
              onClick={handleGenerateCampaign}
              disabled={isLoading}
              className={`w-full py-3 px-4 rounded-xl font-medium tracking-tight text-sm shadow-md transition-all flex items-center justify-center gap-2 text-white ${
                isLoading 
                  ? "bg-slate-400 cursor-not-allowed" 
                  : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100 cursor-pointer active:scale-[0.99]"
              }`}
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Processing notes...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Draft Post &amp; Interview Suite</span>
                </>
              )}
            </button>

            {/* Error notifications */}
            {errorMessage && (
              <div className="p-3 bg-rose-50 text-rose-700 rounded-xl border border-rose-200 text-xs flex gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <p>{errorMessage}</p>
              </div>
            )}
          </div>

          {/* Loading Animation Card */}
          {isLoading && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center text-center gap-4"
            >
              <div className="relative">
                <div className="w-12 h-12 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
                <BrainCircuit className="w-5 h-5 text-indigo-600 absolute top-3.5 left-3.5 animate-pulse" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold text-indigo-600 tracking-wider uppercase font-mono">Harnessing Gemini Engine</p>
                <p className="text-sm text-slate-600 italic font-medium">"{LOADING_QUOTES[loadingQuoteIndex]}"</p>
              </div>
            </motion.div>
          )}

          {/* Prompt Suggestions Box when no content is ready */}
          {!jobDescription && !isLoading && (
            <div className="bg-slate-100/70 rounded-2xl p-6 border border-slate-200/60 flex flex-col items-center justify-center text-center p-8 text-slate-500">
              <Briefcase className="w-8 h-8 text-slate-350 mb-3" />
              <h3 className="font-semibold text-slate-700 text-sm mb-1">Awaiting Generation Input</h3>
              <p className="text-xs text-slate-400 max-w-sm">Select one of our scenario prompt buttons above or type details about your next candidate selection to unlock recruitment assets.</p>
            </div>
          )}
        </section>

        {/* Right Column - Campaign Workspace & Co-pilot Chat (Span 7) */}
        <section id="campaign-workspace" className="lg:col-span-7 flex flex-col gap-6">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-full min-h-[580px]">
            {/* Tab switcher headers */}
            <div className="border-b border-indigo-50/80 bg-slate-50/50 flex items-center justify-between px-4 sm:px-6 py-2.5">
              <div className="flex gap-1.5 sm:gap-3">
                <button
                  onClick={() => setActiveTab("jd")}
                  disabled={!jobDescription}
                  className={`text-xs sm:text-sm font-medium px-4 py-2 rounded-xl transition-all flex items-center gap-2 relative cursor-pointer ${
                    activeTab === "jd" 
                      ? "text-indigo-700 bg-white shadow-sm border border-slate-100 font-semibold" 
                      : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                  } ${!jobDescription ? "opacity-40 cursor-not-allowed" : ""}`}
                >
                  <FileText className="w-4 h-4 shrink-0" />
                  <span>LinkedIn JD</span>
                  {jobDescription && (
                    <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full" />
                  )}
                </button>

                <button
                  onClick={() => setActiveTab("interview")}
                  disabled={!interviewGuide}
                  className={`text-xs sm:text-sm font-medium px-4 py-2 rounded-xl transition-all flex items-center gap-2 relative cursor-pointer ${
                    activeTab === "interview" 
                      ? "text-indigo-700 bg-white shadow-sm border border-slate-100 font-semibold" 
                      : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                  } ${!interviewGuide ? "opacity-30 cursor-not-allowed" : ""}`}
                >
                  <Award className="w-4 h-4 shrink-0" />
                  <span>Interview Guide</span>
                  {interviewGuide && (
                    <span className="text-[10px] bg-indigo-100 text-indigo-700 font-mono font-bold px-1.5 py-0.5 rounded-md">10</span>
                  )}
                </button>

                <button
                  onClick={() => setActiveTab("chat")}
                  className={`text-xs sm:text-sm font-medium px-4 py-2 rounded-xl transition-all flex items-center gap-2 relative cursor-pointer ${
                    activeTab === "chat" 
                      ? "text-indigo-700 bg-white shadow-sm border border-slate-100 font-semibold" 
                      : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <Bot className="w-4 h-4 shrink-0 text-indigo-600" />
                  <span>Recruit Co-pilot</span>
                  {chatMessages.length > 1 && (
                    <span className="text-[10px] bg-rose-100 text-rose-700 font-mono font-bold px-1.5 py-0.5 rounded-md">
                      {chatMessages.length - 1}
                    </span>
                  )}
                </button>
              </div>

              {/* Character check & average scores metrics */}
              {activeTab === "jd" && jobDescription && (
                <div className="hidden sm:flex items-center gap-2 bg-slate-100/50 px-3 py-1.5 rounded-lg border border-slate-200">
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-tight">Length:</span>
                  <span className={`text-[11px] font-mono font-bold ${charCount > 3000 ? "text-rose-600" : "text-emerald-700"}`}>
                    {charCount}/3000
                  </span>
                </div>
              )}

              {activeTab === "interview" && scoreStats && (
                <div className="hidden sm:flex items-center gap-2 bg-indigo-50/60 px-3 py-1.5 rounded-lg border border-indigo-100">
                  <span className="text-[10px] font-mono text-indigo-800 uppercase tracking-tight">Avg Score:</span>
                  <span className="text-[11px] font-mono font-bold text-indigo-900">{scoreStats.average} ★ ({scoreStats.count} rated)</span>
                </div>
              )}
            </div>

            {/* Campaign Output Workspace Body */}
            <div className="p-4 sm:p-6 flex-1 overflow-y-auto">
              {isLoading && !jobDescription ? (
                <div className="h-full min-h-[350px] flex flex-col items-center justify-center text-center p-12 text-slate-400">
                  <RefreshCw className="w-10 h-10 animate-spin text-slate-300 mb-4" />
                  <p className="text-sm font-medium">Assembling resources... Please stand by.</p>
                </div>
              ) : !jobDescription ? (
                /* Empty state when no campaign was generated */
                <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center p-10 text-slate-400">
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-4 border border-slate-200/50">
                    <Sparkles className="w-8 h-8" />
                  </div>
                  <h3 className="font-semibold text-slate-700 mb-1">Generate your campaign assets</h3>
                  <p className="text-sm max-w-sm mb-6 text-slate-500">Provide role description notes on the left panel to produce high-value recruitment components instantly.</p>
                  
                  <div className="grid grid-cols-2 gap-3 max-w-lg w-full text-left">
                    <div className="p-4 rounded-xl border border-dashed border-slate-300 bg-slate-50/50">
                      <h4 className="text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                        <FileText className="text-indigo-600 w-3.5 h-3.5" /> LinkedIn Job Description
                      </h4>
                      <p className="text-[11px] text-slate-400 leading-relaxed">Fully generated, formatted, and optimized and copy-to-clipboard compliant post.</p>
                    </div>
                    <div className="p-4 rounded-xl border border-dashed border-slate-300 bg-slate-50/50">
                      <h4 className="text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                        <Award className="text-indigo-600 w-3.5 h-3.5" /> 10-Question Interview Guide
                      </h4>
                      <p className="text-[11px] text-slate-400 leading-relaxed">STAR behavioral assessments mapped directly to the skills specified in your notes.</p>
                    </div>
                  </div>
                </div>
              ) : (
                /* Generated Content Renderers */
                <div className="h-full">
                  {/* Tab 1: LinkedIn Job Description */}
                  {activeTab === "jd" && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex flex-col gap-5 h-full"
                    >
                      {/* Copy Action Banner */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl gap-3">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                          <span className="text-xs text-slate-600">This job description has been polished &amp; formatted for LinkedIn compatibility.</span>
                        </div>
                        <button
                          onClick={copyJdToClipboard}
                          className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-[0.98]"
                        >
                          {copySuccess ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Copied to Clipboard!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy LinkedIn Post</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Character check card alert on small screens */}
                      {charCount > 3000 && (
                        <div className="p-3 bg-amber-50 text-amber-800 rounded-lg border border-amber-200 text-xs flex gap-2">
                          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                          <span>
                            **LinkedIn Advisory:** Your post length is **{charCount}** characters, which slightly exceeds LinkedIn's 3,000-character post limit. Consider having Coach Aura trim it in the sidebar chat.
                          </span>
                        </div>
                      )}

                      {/* LinkedIn Visual Mockup Box */}
                      <div className="border border-slate-200 rounded-xl bg-white shadow-sm overflow-hidden font-sans">
                        {/* Fake Poster Identity */}
                        <div className="bg-slate-50/60 p-4 border-b border-slate-200/60 flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-full bg-slate-250 flex items-center justify-center text-slate-500 font-mono font-bold text-xs ring-2 ring-slate-100">
                              🚀
                            </div>
                            <div>
                              <div className="text-xs font-bold text-slate-800 flex items-center gap-1">
                                Recruitment Campaign Sandbox
                                <span className="bg-slate-200/75 text-slate-600 font-mono scale-90 px-1.5 py-0.2 rounded-md font-normal">Poster</span>
                              </div>
                              <p className="text-[10px] text-slate-400">1m ago • Edited • 🌐 Public</p>
                            </div>
                          </div>
                          
                          <div className="hidden sm:flex gap-1">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight bg-slate-200 text-slate-700">{jobDescription.workplaceMode}</span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight bg-slate-200 text-slate-700">{jobDescription.experienceLevel}</span>
                          </div>
                        </div>

                        {/* LinkedIn Post Text body */}
                        <div className="p-5 text-sm text-slate-700 space-y-4 leading-relaxed select-all">
                          <div>
                            <p className="font-bold text-slate-900 text-lg">🔥 WE ARE HIRING: {jobDescription.title}</p>
                            <p className="text-xs text-indigo-700 font-semibold uppercase font-mono mt-0.5">
                              📍 Location: {jobDescription.locationPlaceholder} ({jobDescription.workplaceMode}) | Team: {jobDescription.companyPlaceholder}
                            </p>
                          </div>

                          <div className="space-y-1.5">
                            <p className="font-bold text-slate-800 text-xs uppercase tracking-wider font-mono">🌟 Role Overview</p>
                            <p className="text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 italic">
                              "{jobDescription.overview}"
                            </p>
                          </div>

                          <div className="space-y-1.5">
                            <p className="font-bold text-slate-800 text-xs uppercase tracking-wider font-mono">🎯 Key Responsibilities</p>
                            <ul className="list-none space-y-1">
                              {jobDescription.responsibilities.map((resp, i) => (
                                <li key={i} className="flex items-start gap-1.5 text-slate-600">
                                  <span className="text-md leading-none text-indigo-500 shrink-0">•</span>
                                  <span>{formatBulletValue(resp)}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div className="space-y-1.5">
                            <p className="font-bold text-slate-800 text-xs uppercase tracking-wider font-mono">⚡ Core Requirements (Hard &amp; Soft Skills)</p>
                            <ul className="list-none space-y-1">
                              {jobDescription.requirements.map((req, i) => (
                                <li key={i} className="flex items-start gap-1.5 text-slate-600">
                                  <span className="text-md leading-none text-emerald-500 shrink-0">•</span>
                                  <span>{formatBulletValue(req)}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div className="space-y-1.5">
                            <p className="font-bold text-slate-800 text-xs uppercase tracking-wider font-mono">🎁 What's in it for You (Benefits &amp; Perks)</p>
                            <ul className="list-none space-y-1">
                              {jobDescription.benefits.map((b, i) => (
                                <li key={i} className="flex items-start gap-1.5 text-slate-600">
                                  <span className="text-md leading-none text-pink-500 shrink-0">•</span>
                                  <span>{formatBulletValue(b)}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div className="pt-2 border-t border-slate-200">
                            <p className="text-slate-500 text-xs">#recruiting #career #${jobDescription.title.replace(/\s+/g, "")} #hiring</p>
                          </div>
                        </div>

                      </div>

                      {/* LinkedIn Posting Tips section provided by Gemini parameters */}
                      <div className="p-4 bg-indigo-50/40 border border-indigo-100 rounded-xl">
                        <h4 className="text-xs font-semibold text-indigo-800 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                          LinkedIn Algorithm Reach Tips:
                        </h4>
                        <ul className="space-y-1.5 select-none">
                          {jobDescription.linkedinTips.map((tip, i) => (
                            <li key={i} className="text-xs text-indigo-900 flex items-start gap-1.5 leading-relaxed">
                              <span className="text-indigo-400 shrink-0 font-bold">{i + 1}.</span>
                              <span>{tip}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </motion.div>
                  )}

                  {/* Tab 2: Interview Guide */}
                  {activeTab === "interview" && interviewGuide && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex flex-col gap-6"
                    >
                      {/* Targets skills metrics */}
                      <div>
                        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Target Skills covered in Assessment Checklist:</h3>
                        <div className="flex flex-wrap gap-2">
                          {interviewGuide.targetSkills.map((sk, i) => (
                            <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-semibold font-sans">
                              🎯 {sk}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                        <div className="p-4 bg-slate-50 flex justify-between items-center border-b border-slate-200">
                          <div>
                            <span className="text-xs font-bold text-slate-800">STAR Behavioral Interview Questions Suite</span>
                            <p className="text-[10px] text-slate-400">Expand questions to score candidates and log notes during mocks.</p>
                          </div>
                          
                          <button
                            onClick={() => {
                              // Reset current scorecard notes
                              setQuestionEvaluations({});
                              setRubricCheckState({});
                            }}
                            className="text-xs font-semibold hover:text-slate-900 hover:bg-slate-200 text-slate-500 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white transition-all cursor-pointer"
                          >
                            Reset Star Ratings
                          </button>
                        </div>

                        {/* Interactive Questions Listing */}
                        <div className="divide-y divide-slate-150">
                          {interviewGuide.questions.map((q) => {
                            const isExpanded = expandedQuestionId === q.id;
                            const currentEval = questionEvaluations[q.id] || { score: 0, notes: "" };

                            return (
                              <div key={q.id} className={`transition-colors ${isExpanded ? "bg-indigo-50/20" : "bg-white"}`}>
                                {/* Accordion Header */}
                                <div
                                  onClick={() => setExpandedQuestionId(isExpanded ? null : q.id)}
                                  className="p-4 sm:p-5 flex items-start justify-between gap-4 cursor-pointer hover:bg-slate-50 transition-all select-none"
                                >
                                  <div className="flex items-start gap-3">
                                    <span className="text-xs font-bold font-mono text-indigo-600 bg-indigo-50 outline-2 border border-indigo-200 py-1 px-2.5 rounded-md mt-0.5 shrink-0">
                                      {q.id}
                                    </span>
                                    <div>
                                      <h4 className="text-sm font-semibold text-slate-800 leading-snug">{q.question}</h4>
                                      <div className="flex flex-wrap items-center gap-2 mt-2">
                                        <span className={`text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded-md ${
                                          q.skillType === "hard" 
                                            ? "bg-amber-100 text-amber-800 border border-amber-200" 
                                            : "bg-teal-100 text-teal-850 border border-teal-250"
                                        }`}>
                                          ⚔️ {q.skillType} skill : {q.targetedSkill}
                                        </span>

                                        {currentEval.score > 0 && (
                                          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded-md font-mono flex items-center gap-0.5">
                                            Score: {currentEval.score} / 5 ★
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  <button className="text-slate-400 p-1 rounded-md hover:bg-slate-100">
                                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                  </button>
                                </div>

                                {/* Accordion Body */}
                                {isExpanded && (
                                  <motion.div
                                    initial={{ height: 0 }}
                                    animate={{ height: "auto" }}
                                    className="px-4 sm:px-5 pb-5 border-t border-slate-100 pt-4"
                                  >
                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-5 text-xs">
                                      
                                      {/* Left subcolumn - Question context and rubric requirements */}
                                      <div className="md:col-span-7 flex flex-col gap-3.5 pr-2">
                                        <div>
                                          <p className="font-bold text-slate-700 mb-1 tracking-wide">💡 Question Rationale / Intent:</p>
                                          <p className="text-slate-600 text-xs italic leading-relaxed">"{q.rationale}"</p>
                                        </div>

                                        <div>
                                          <p className="font-bold text-slate-700 mb-1.5 tracking-wide">⭐ Performance Rubric (Stellar response checklist):</p>
                                          <div className="space-y-1 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                                            {q.whatToLookFor.map((item, idx) => {
                                              const checkId = `${q.id}-${idx}`;
                                              const checked = !!rubricCheckState[checkId];
                                              return (
                                                <div
                                                  key={idx}
                                                  onClick={() => setRubricCheckState(prev => ({ ...prev, [checkId]: !prev[checkId] }))}
                                                  className="flex items-start gap-2.5 p-1.5 rounded hover:bg-slate-50 cursor-pointer select-none"
                                                >
                                                  {checked ? (
                                                    <CheckSquare className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                                                  ) : (
                                                    <Square className="w-4 h-4 text-slate-350 mt-0.5 shrink-0" />
                                                  )}
                                                  <span className={`text-[11px] ${checked ? "line-through text-slate-400" : "text-slate-600"}`}>
                                                    {item}
                                                  </span>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </div>

                                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                                          <p className="font-bold text-slate-700 mb-1 tracking-wide flex items-center gap-1">
                                            <ChevronRight className="w-3.5 h-3.5 text-indigo-500" /> Probing Follow-Up question:
                                          </p>
                                          <p className="text-slate-600 text-[11px] leading-relaxed">{q.followUpQuestion}</p>
                                        </div>
                                      </div>

                                      {/* Right subcolumn - Star Rating & Live Interview Notes Logger */}
                                      <div className="md:col-span-5 flex flex-col gap-3 p-3.5 rounded-xl border border-indigo-50 bg-indigo-50/10 shadow-inner">
                                        <div className="flex justify-between items-center">
                                          <span className="font-bold text-slate-700 tracking-wide">Star rating:</span>
                                          <div className="flex gap-1">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                              <button
                                                key={star}
                                                onClick={() => handleSetScore(q.id, star)}
                                                className="cursor-pointer transition-transform duration-100 active:scale-90"
                                              >
                                                <span className={`text-lg leading-none ${
                                                  star <= currentEval.score ? "text-amber-400" : "text-slate-200"
                                                }`}>
                                                  ★
                                                </span>
                                              </button>
                                            ))}
                                          </div>
                                        </div>

                                        <div className="flex flex-col gap-1.5 flex-1 justify-end min-h-[95px]">
                                          <label className="font-bold text-slate-700 tracking-wide flex items-center gap-1.5 justify-between">
                                            <span>Manager's Session Notes:</span>
                                            {currentEval.notes.length > 0 && (
                                              <span className="bg-emerald-50 text-emerald-700 px-1 py-0.2 rounded text-[9px] uppercase font-mono">Logged</span>
                                            )}
                                          </label>
                                          <textarea
                                            value={currentEval.notes}
                                            onChange={(e) => handleSetNotes(q.id, e.target.value)}
                                            placeholder="Write candidate notes during interviews..."
                                            className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg outline-none focus:border-indigo-500 max-h-[140px]"
                                            rows={3}
                                          />
                                        </div>
                                      </div>

                                    </div>
                                  </motion.div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Tab 3: Recruit Co-pilot Chat (Aura) */}
                  {activeTab === "chat" && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex flex-col justify-between h-full min-h-[460px] max-h-[640px]"
                    >
                      {/* Suggestions list top row */}
                      <div className="flex flex-col gap-1 w-full border-b border-slate-100 pb-3 mb-2.5">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-800">Quick Coaching prompts suggestions:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {[
                            "Make the JD tone more exciting and playful",
                            "Add a technical leadership question to interview",
                            "Explain what to look for in question #1",
                            "Draft advice for remote onboarding benefits"
                          ].map((suggestion, idx) => (
                            <button
                              key={idx}
                              onClick={() => {
                                setChatInput(suggestion);
                              }}
                              className="text-[11px] hover:bg-slate-100 border border-slate-200 hover:border-slate-300 text-slate-600 px-2.5 py-1.5 rounded-lg text-left truncate max-w-full cursor-pointer bg-white"
                            >
                              💬 {suggestion}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Chat scroll box */}
                      <div className="flex-1 overflow-y-auto space-y-4 px-1.5 max-h-[420px] min-h-[290px] py-1 border border-transparent">
                        {chatMessages.map((msg) => {
                          const isUser = msg.role === "user";
                          return (
                            <div key={msg.id} className={`flex gap-3 items-end ${isUser ? "flex-row-reverse" : ""}`}>
                              
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                                isUser ? "bg-slate-200 text-slate-700" : "bg-indigo-100 text-indigo-700"
                              }`}>
                                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                              </div>

                              <div className={`rounded-2xl px-4 py-2.5 max-w-[85%] text-xs shadow-sm leading-relaxed ${
                                isUser ? "bg-indigo-600 text-white" : "bg-slate-150 text-slate-800"
                              }`}>
                                <div className="prose prose-sm leading-relaxed whitespace-pre-wrap">
                                  {msg.text}
                                </div>
                                <span className={`block text-[9px] mt-1.5 text-right p-0 ${
                                  isUser ? "text-indigo-200" : "text-slate-400"
                                }`}>
                                  {msg.timestamp}
                                </span>
                              </div>

                            </div>
                          );
                        })}

                        {isChatLoading && (
                          <div className="flex gap-3 items-end">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center">
                              <Bot className="w-4 h-4 animate-bounce" />
                            </div>
                            <div className="rounded-2xl px-4 py-2 bg-slate-150 text-slate-400 text-xs shadow-sm flex items-center gap-2">
                              <span>Aura is typing suggestions...</span>
                              <div className="w-1.5 h-1.5 rounded-full bg-slate-350 animate-bounce" />
                              <div className="w-1.5 h-1.5 rounded-full bg-slate-350 animate-bounce delay-100" />
                              <div className="w-1.5 h-1.5 rounded-full bg-slate-350 animate-bounce delay-200" />
                            </div>
                          </div>
                        )}

                        <div ref={chatScrollRef} />
                      </div>

                      {/* Input Actions row */}
                      <div className="flex gap-2.5 pt-3.5 border-t border-slate-150 w-full bg-white select-none">
                        <input
                          type="text"
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSendChatMessage();
                          }}
                          placeholder="Ask Aura to modify the guide or the LinkedIn JD..."
                          className="flex-1 text-xs px-3.5 py-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 shadow-inner"
                        />
                        <button
                          onClick={handleSendChatMessage}
                          disabled={isChatLoading || !chatInput.trim()}
                          className={`p-3 rounded-xl shadow-md transition-all flex items-center justify-center ${
                            isChatLoading || !chatInput.trim()
                              ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                              : "bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer active:scale-95"
                          }`}
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </div>
              )}
            </div>

            {/* LinkedIn-specific character warnings footer under JD */}
            {activeTab === "jd" && jobDescription && (
              <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs text-slate-650">
                <div className="flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-slate-450 shrink-0" />
                  <span>Standard LinkedIn free posts look cleaner under 2,000 characters.</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="w-full sm:w-28 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className={`h-1.5 rounded-full ${charCount > 3000 ? "bg-rose-500" : "bg-emerald-500"}`} 
                      style={{ width: `${Math.min(100, (charCount / 3000) * 100)}%` }}
                    />
                  </div>
                  <span className="font-mono text-[10px] text-slate-400">Post Limit Ratio</span>
                </div>
              </div>
            )}

            {/* Candidate scoring evaluation status footer */}
            {activeTab === "interview" && interviewGuide && (
              <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs text-slate-600">
                <div className="flex items-center gap-1.5">
                  <BookmarkCheck className="w-4 h-4 text-indigo-500 shrink-0" />
                  <span>Mocks are processed &amp; saved locally in session variables.</span>
                </div>
                {scoreStats ? (
                  <span className="text-xs font-semibold text-indigo-800">
                    🏆 Evaluation Summary: Checked **{scoreStats.count}** with average rating of **{scoreStats.average}/5 ★**
                  </span>
                ) : (
                  <span className="text-xs font-medium text-slate-400">No questions scored yet inside candidate reviews.</span>
                )}
              </div>
            )}
          </div>
        </section>

      </main>

      {/* Humble Footer */}
      <footer className="bg-slate-100 border-t border-slate-200 text-center py-6 text-xs text-slate-400 font-mono mt-10 select-none">
        <p>© 2026 Recruitment Sandbox. Empowering Talent Architects globally with Gemini reasoning.</p>
      </footer>
    </div>
  );
}
