/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// Lazy initialization helper for GoogleGenAI to ensure robust server starts
let aiInstance: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not configured. Please configure it in your Secrets panel.");
    }
    aiInstance = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiInstance;
}

// JSON Schema definition for Job Description and Interview Guide generation
const CampaignSchema = {
  type: "OBJECT",
  properties: {
    jobDescription: {
      type: "OBJECT",
      properties: {
        title: { type: "STRING" },
        companyPlaceholder: { type: "STRING" },
        locationPlaceholder: { type: "STRING" },
        workplaceMode: { type: "STRING" },
        experienceLevel: { type: "STRING" },
        overview: { type: "STRING" },
        responsibilities: { type: "ARRAY", items: { type: "STRING" } },
        requirements: { type: "ARRAY", items: { type: "STRING" } },
        benefits: { type: "ARRAY", items: { type: "STRING" } },
        linkedinTips: { type: "ARRAY", items: { type: "STRING" } },
      },
      required: [
        "title",
        "companyPlaceholder",
        "locationPlaceholder",
        "workplaceMode",
        "experienceLevel",
        "overview",
        "responsibilities",
        "requirements",
        "benefits",
        "linkedinTips",
      ],
    },
    interviewGuide: {
      type: "OBJECT",
      properties: {
        targetSkills: { type: "ARRAY", items: { type: "STRING" } },
        questions: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              id: { type: "INTEGER" },
              question: { type: "STRING" },
              targetedSkill: { type: "STRING" },
              skillType: { type: "STRING" },
              rationale: { type: "STRING" },
              whatToLookFor: { type: "ARRAY", items: { type: "STRING" } },
              followUpQuestion: { type: "STRING" },
            },
            required: [
              "id",
              "question",
              "targetedSkill",
              "skillType",
              "rationale",
              "whatToLookFor",
              "followUpQuestion",
            ],
          },
        },
      },
      required: ["targetSkills", "questions"],
    },
  },
  required: ["jobDescription", "interviewGuide"],
};

// JSON Schema for Recruiter Coach chatbot (with support to live-update Campaign outputs)
const CoachChatSchema = {
  type: "OBJECT",
  properties: {
    message: {
      type: "STRING",
      description: "Dialogue answer text from the recruiter coach. Can use standard markdown formatting for emphasis.",
    },
    updatedJobDescription: {
      type: "OBJECT",
      description: "The fully modified Job Description object, supplied if the user requested any modifications. Otherwise omit or keep null.",
      properties: {
        title: { type: "STRING" },
        companyPlaceholder: { type: "STRING" },
        locationPlaceholder: { type: "STRING" },
        workplaceMode: { type: "STRING" },
        experienceLevel: { type: "STRING" },
        overview: { type: "STRING" },
        responsibilities: { type: "ARRAY", items: { type: "STRING" } },
        requirements: { type: "ARRAY", items: { type: "STRING" } },
        benefits: { type: "ARRAY", items: { type: "STRING" } },
        linkedinTips: { type: "ARRAY", items: { type: "STRING" } },
      },
    },
    updatedInterviewGuide: {
      type: "OBJECT",
      description: "The fully modified Interview Guide object, supplied if the user requested modifications to the questions or targeted skills. Otherwise omit or keep null.",
      properties: {
        targetSkills: { type: "ARRAY", items: { type: "STRING" } },
        questions: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              id: { type: "INTEGER" },
              question: { type: "STRING" },
              targetedSkill: { type: "STRING" },
              skillType: { type: "STRING" },
              rationale: { type: "STRING" },
              whatToLookFor: { type: "ARRAY", items: { type: "STRING" } },
              followUpQuestion: { type: "STRING" },
            },
            required: [
              "id",
              "question",
              "targetedSkill",
              "skillType",
              "rationale",
              "whatToLookFor",
              "followUpQuestion",
            ],
          },
        },
      },
    },
  },
  required: ["message"],
};

// API Endpoint to check server health and API Key presence
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    hasApiKey: !!process.env.GEMINI_API_KEY,
  });
});

// Campaign generator POST handler
app.post("/api/generate", async (req, res) => {
  try {
    const { rawNotes, tone, experienceLevel, workplaceMode, enableThinking } = req.body;

    if (!rawNotes || rawNotes.trim() === "") {
       res.status(400).json({ error: "Missing required rawNotes parameter" });
       return;
    }

    // Determine model based on the "Enable High Thinking" mode
    // gemini-3.1-pro-preview is used for complex thinking tasks, gemini-3.5-flash for general fast generation
    const modelToUse = enableThinking ? "gemini-3.1-pro-preview" : "gemini-3.5-flash";

    const promptText = `
You are an expert Talent Partner and Creative Copywriter.
Given the following raw thoughts and bullet points about a desired job role, generate:
1. A polished, SEO-optimized, highly engaging LinkedIn Job Description following best professional practices.
2. A customized Recruitment Interview Guide containing exactly 10 behavioral interview questions targeting the specific soft and hard skills mentioned or required by this role.

User Raw Thoughts / Notes:
"""
${rawNotes}
"""

Parameters requested by the user:
- Profile Tone: ${tone || "Professional and Compelling"}
- Experience Level Required: ${experienceLevel || "Mid-Senior"}
- Workplace Type: ${workplaceMode || "Hybrid"}

Instructions for the LinkedIn Job Description:
- Craft an inspiring and punchy post title and overview.
- Tailor the formatting with clean paragraph breaks and appropriate professional emojis.
- Include clearly labeled bulleted sections: Role Overview, Key Responsibilities, Must-Have Requirements, Nice-to-Have Skills, and Benefits.
- Provide 3-5 structured 'linkedinTips' on how to leverage this post for maximum reach.

Instructions for the Interview Guide (10 behavioral questions):
- Design exactly 10 high-impact, behavioral-style questions (e.g., STAR method) that probe specific skills mentioned in the JD.
- Define a realistic split between hard/technical skills and soft skills.
- For EACH question, determine the 'targetedSkill', whether it is 'hard' or 'soft', a strong 'rationale', a clear list of what to look for in candidate responses, and a valuable probing 'followUpQuestion'.
`;

    // Config setup
    const config: any = {
      responseMimeType: "application/json",
      responseSchema: CampaignSchema,
      systemInstruction: "You are an elite Talent Partner, Recruitment Architect, and executive coach. You output strictly conforming recruitment Campaign JSON payloads containing LinkedIn job descriptions and rigorous interview guides.",
    };

    if (enableThinking) {
      // Set thinking mode to HIGH as requested by the "Enable High Thinking" spec
      config.thinkingConfig = {
        thinkingLevel: "HIGH",
      };
    }

    const response = await getGeminiClient().models.generateContent({
      model: modelToUse,
      contents: promptText,
      config,
    });

    const bodyText = response.text?.trim();
    if (!bodyText) {
      throw new Error("Empty response received from Gemini engine");
    }

    // Return the parsed JSON
    const parsedData = JSON.parse(bodyText);
    res.json(parsedData);
  } catch (error: any) {
    console.error("Error in /api/generate:", error);
    res.status(500).json({
      error: "Campaign generation failed.",
      details: error.message || error,
    });
  }
});

// Recruiter Companion Chatbot endpoint to refine JDs and guides through friendly conversation
app.post("/api/chat", async (req, res) => {
  try {
    const { messages, currentJobDescription, currentInterviewGuide, enableThinking } = req.body;

    if (!messages || !Array.isArray(messages)) {
       res.status(400).json({ error: "Missing or invalid messages array" });
       return;
    }

    const modelToUse = enableThinking ? "gemini-3.1-pro-preview" : "gemini-3.5-flash";

    // Build the query conversation string and current context for the LLM
    const contextPrompt = `
You are "Aura", a world-class strategic Technical Recruiter and Talent Acquisition Companion Coach.
You are helping a hiring manager or recruiter design a recruitment campaign.

Here is the CURRENT state of their Job Description and Interview Guide inside their Recruitment Sandbox.

--- CURRENT JOB DESCRIPTION (JSON) ---
${currentJobDescription ? JSON.stringify(currentJobDescription, null, 2) : "None yet generated"}

--- CURRENT INTERVIEW GUIDE (JSON) ---
${currentInterviewGuide ? JSON.stringify(currentInterviewGuide, null, 2) : "None yet generated"}

Instructions:
1. Respond to the user's feedback, ideas, or comments standardly inside the 'message' text field using elegant markdown formatting. Be collaborative, helpful, professional, and clear.
2. If the user asks you to modify, rewrite, tweak, add, or subtract sections of the Job Description (e.g. "change the benefit list", "add unlimited PTO", "emphasize leadership skills", "make the tone playful"), update the whole Job Description structure and return the completed object inside 'updatedJobDescription'. Otherwise, return nothing or null for 'updatedJobDescription'.
3. If the user asks you to modify the interview guide (e.g. "add a question about conflict", "make it more junior-level", "include TypeScript focus as question #4"), update the guide with exactly 10 high-quality questions and return the completed object inside 'updatedInterviewGuide'. Otherwise, return nothing or null for 'updatedInterviewGuide'.
4. Ensure any updated fields are fully compatible with their respective schema structures.

Let's maintain extreme professional and helpful dialogue!
`;

    // Map conversation messages to format required by contents
    // To facilitate easy single-turn instructions with history, we list the conversation history in the prompt contents.
    const historyString = messages.map((m: any) => `${m.role === "user" ? "Client Recruiter" : "Aura (Talent Coach)"}: ${m.text}`).join("\n");
    const contents = `${contextPrompt}\n\nConversation History:\n${historyString}\n\nNow, generate the updated structural response:`;

    const config: any = {
      responseMimeType: "application/json",
      responseSchema: CoachChatSchema,
      systemInstruction: "You are Aura, an elite talent partner coach. You chat with users and can live-update their sandboxed recruitment records.",
    };

    if (enableThinking) {
      config.thinkingConfig = {
        thinkingLevel: "HIGH",
      };
    }

    const response = await getGeminiClient().models.generateContent({
      model: modelToUse,
      contents,
      config,
    });

    const bodyText = response.text?.trim();
    if (!bodyText) {
      throw new Error("Empty response received from chat companion engine");
    }

    const parsedData = JSON.parse(bodyText);
    res.json(parsedData);
  } catch (error: any) {
    console.error("Error in /api/chat:", error);
    res.status(500).json({
      error: "Recruiter Assistant chat failed.",
      details: error.message || error,
    });
  }
});

// Configure Vite or Static delivery depending on environment
async function setupServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting in Development mode...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting in Production mode...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Recruitment Sandbox server initialized at http://localhost:${PORT}`);
  });
}

setupServer();
