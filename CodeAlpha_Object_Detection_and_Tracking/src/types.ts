/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface JobDescription {
  title: string;
  companyPlaceholder: string;
  locationPlaceholder: string;
  workplaceMode: "Onsite" | "Hybrid" | "Remote";
  experienceLevel: "Junior" | "Mid" | "Senior" | "Lead" | "Executive";
  overview: string;
  responsibilities: string[];
  requirements: string[]; // Combines hard and soft skills requested
  benefits: string[];
  linkedinTips: string[]; // Specific tips on how to post this on LinkedIn for maximum reach
}

export interface InterviewQuestion {
  id: number;
  question: string;
  targetedSkill: string;
  skillType: "hard" | "soft";
  rationale: string; // why this question is asked for this skill
  whatToLookFor: string[]; // rubric / bullet points of a stellar answer
  followUpQuestion: string; // follow-up probing question
}

export interface InterviewGuide {
  targetSkills: string[];
  questions: InterviewQuestion[];
}

export interface RecruitmentCampaign {
  id: string;
  name: string;
  rawNotes: string;
  tone: string;
  experienceLevel: string;
  workplaceMode: string;
  jobDescription: JobDescription | null;
  interviewGuide: InterviewGuide | null;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp: string;
  isSystem?: boolean;
}
