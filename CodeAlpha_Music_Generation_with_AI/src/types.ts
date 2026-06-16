/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Note {
  pitch: number;       // MIDI pitch number (e.g., 60 = C4)
  duration: number;    // Duration in beats (e.g., 1 = quarter note, 0.5 = eighth note)
  velocity: number;    // Velocity (1-127)
  startTime: number;   // Cumulative start time in beats
  step?: number;       // Position on a 16/32 step grid for visualizer
}

export type MusicGenre = 'classical' | 'jazz' | 'cyberpunk' | 'ambient';
export type ModelType = 'lstm' | 'gan' | 'markov';

export interface ModelConfig {
  type: ModelType;
  hiddenLayers: number;     // e.g., 2 for simple LSTM, 3 for deep
  units: number;            // LSTM state unit size (e.g., 64, 128, 256)
  learningRate: number;      // e.g., 0.001
  epochs: number;           // e.g., 30
  batchSize: number;        // e.g., 16, 32
  dropoutRate: number;      // e.g., 0.2
}

export interface TrainingLog {
  epoch: number;
  loss: number;
  accuracy: number;
  generatedText: string;    // Interactive live outputs
}

export interface MusicTrack {
  id: string;
  name: string;
  notes: Note[];
  genre: MusicGenre;
  createdVia: 'gemini' | 'lstm' | 'gan' | 'markov' | 'seed';
  createdAt: string;
}

export interface SampleMelody {
  id: string;
  name: string;
  notes: Note[];
  genre: MusicGenre;
}
