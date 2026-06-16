/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

// Load environment variables from .env
dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini SDK with User-Agent telemetry headers for AI Studio Build
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// API endpoints
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// AI Composer Generation Endpoint
app.post('/api/gemini/generate-melody', async (req, res) => {
  try {
    const { genre, mood, notesCount, temperature, seedNotes } = req.body;

    const targetGenre = genre || 'classical';
    const targetMood = mood || 'happy';
    const targetCount = Number(notesCount) || 32;
    const targetTemp = Number(temperature) || 1.0;

    const systemPrompt = `You are a state-of-the-art Deep Learning Recurrent Neural Network (LSTM/Transformer-hybrid) music composition model.
Your task is to generate a beautiful, highly coherent, single-voice melody tracking MIDI representations.
Match the genre/style: '${targetGenre}' and the emotional tone/mood: '${targetMood}'.

The timing must be perfectly structured:
- 'startTime' should start at 0.0 for the first note or continue after seed notes.
- Each successive 'startTime' should be equal to (or slightly overlapping for polyphony/legato) the prior note's 'startTime' + previous 'duration'.
- Avoid massive random leaps in pitch. Most notes should flow stepwise (intervals of 1, 2, 3, 4, 5 semitones) with occasional larger leaps (7, 12 semitones) for dramatic melodic resolution.
- Keep the notes grouped strictly on the key signature associated with '${targetGenre}' and '${targetMood}' (e.g., C minor for melancholic classic, blues scale for swing jazz).`;

    let seedContext = "";
    if (seedNotes && Array.isArray(seedNotes) && seedNotes.length > 0) {
      seedContext = `Use these initial seed notes to prompt the generation (continue the musical phrase in the same motif/rhythm):\n${JSON.stringify(seedNotes)}`;
    }

    const prompt = `Generate a music note sequence of exactly ${targetCount} sequential notes in JSON. ${seedContext}
The output must perfectly conform to the requested JSON array schema.`;

    // Guidelines request: use ai.models.generateContent with 'gemini-3.5-flash'
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        systemInstruction: systemPrompt,
        temperature: targetTemp,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              pitch: {
                type: Type.INTEGER,
                description: 'MIDI pitch number (36 to 84). E.g., 60 is Middle C. 57 is A3, 62 is D4.',
              },
              duration: {
                type: Type.NUMBER,
                description: 'Duration of note in beats (quarter note = 1.0, eighth note = 0.5, sixteenth = 0.25, half note = 2.0).',
              },
              velocity: {
                type: Type.INTEGER,
                description: 'Volume/velocity of the note stroke. Ranges from 50 (soft) to 110 (accentuated).',
              },
              startTime: {
                type: Type.NUMBER,
                description: 'The exact beat timestamp when the note starts. Must dynamically accumulate and grow.',
              },
            },
            required: ['pitch', 'duration', 'velocity', 'startTime'],
          },
        },
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error('No response text retrieved from Gemini AI models.');
    }

    // Parse output JSON safely
    const melodyNotes = JSON.parse(text.trim());
    res.json({
      success: true,
      notes: melodyNotes,
      parameters: { genre: targetGenre, mood: targetMood, temperature: targetTemp },
    });
  } catch (error: any) {
    console.error('Error in MIDI Generation via Gemini API:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to compose melody via Gemini.',
    });
  }
});

// Configure Vite or Static Servers
async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Express dev server running on port ${PORT}`);
  });
}

start();
