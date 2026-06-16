/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Note, MusicGenre, ModelConfig } from './types';
import { TrainingVisualizer } from './components/TrainingVisualizer';
import { PianoRoll } from './components/PianoRoll';
import { Synth, SynthType } from './services/synth';
import { notesToMidiBlob } from './services/midi';
import { 
  Music, Sparkles, Download, Play, Square, ListRestart, 
  HelpCircle, Check, Loader2, RefreshCw, Layers 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Seeding standard classical Für Elise melody as default on load
const INITIAL_MELODY: Note[] = [
  { pitch: 76, startTime: 0.0, duration: 0.5, velocity: 95 }, // E5
  { pitch: 75, startTime: 0.5, duration: 0.5, velocity: 90 }, // D#5
  { pitch: 76, startTime: 1.0, duration: 0.5, velocity: 95 }, // E5
  { pitch: 75, startTime: 1.5, duration: 0.5, velocity: 90 }, // D#5
  { pitch: 76, startTime: 2.0, duration: 0.5, velocity: 95 }, // E5
  { pitch: 71, startTime: 2.5, duration: 0.5, velocity: 85 }, // B4
  { pitch: 74, startTime: 3.0, duration: 0.5, velocity: 85 }, // D5
  { pitch: 72, startTime: 3.5, duration: 0.5, velocity: 85 }, // C5
  { pitch: 69, startTime: 4.0, duration: 1.5, velocity: 95 }, // A4
];

export default function App() {
  // Primary Note Sequence in Canvas
  const [notes, setNotes] = useState<Note[]>(INITIAL_MELODY);
  const [synthType, setSynthType] = useState<SynthType>('triangle');
  
  // Audio state variables bound to micro-scheduler
  const [playbackBeat, setPlaybackBeat] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Step 1: Pre-processing values
  const [preprocessingGenre, setPreprocessingGenre] = useState<MusicGenre>('classical');
  const [isPreprocessing, setIsPreprocessing] = useState(false);
  const [preprocessedMatrix, setPreprocessedMatrix] = useState<{
    noteCount: number;
    integerMap: string[];
    quantizedStepsCount: number;
  } | null>(null);

  // Steps 2 & 3: Deep architecture configuration
  const [modelConfig, setModelConfig] = useState<ModelConfig>({
    type: 'lstm',
    hiddenLayers: 2,
    units: 128,
    learningRate: 0.001,
    epochs: 25,
    batchSize: 32,
    dropoutRate: 0.2
  });
  const [isTraining, setIsTraining] = useState(false);
  const [lossRate, setLossRate] = useState<number | null>(null);

  // Step 4: Music Generation Params
  const [generationEngine, setGenerationEngine] = useState<'gemini' | 'client_rnn' | 'markov'>('gemini');
  const [generationGenre, setGenerationGenre] = useState<MusicGenre>('classical');
  const [generationMood, setGenerationMood] = useState<string>('joyful');
  const [generationLength, setGenerationLength] = useState<number>(32);
  const [generationTemp, setGenerationTemp] = useState<number>(1.0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Subscribe to central synthesizer callback streams
  useEffect(() => {
    Synth.onProgressUpdate = (currentBeat) => {
      setPlaybackBeat(currentBeat);
    };
    Synth.onPlayStateChanged = (playing) => {
      setIsPlaying(playing);
    };
    return () => {
      Synth.onProgressUpdate = null;
      Synth.onPlayStateChanged = null;
    };
  }, []);

  useEffect(() => {
    Synth.setSynthType(synthType);
  }, [synthType]);

  // Expose pre-processing trigger mapping notes to matrices/tensors
  const handlePreprocess = () => {
    setIsPreprocessing(true);
    setPreprocessedMatrix(null);

    // Simulate quantization calculation workflows as on visual prompt
    setTimeout(() => {
      setIsPreprocessing(false);
      setPreprocessedMatrix({
        noteCount: notes.length,
        // Convert notes to customized token integer mappings normalized [0, 1]
        integerMap: notes.map(n => `P${n.pitch}:T${n.startTime.toFixed(2)}`),
        quantizedStepsCount: notes.length * 4
      });
    }, 1200);
  };

  // Triggers Gemini API endpoint or client-side generation mock
  const handleGenerateMelody = async () => {
    setIsGenerating(true);
    setApiError(null);
    Synth.stop();

    if (generationEngine === 'gemini') {
      try {
        // Send previous notes as seeding triggers
        const payload = {
          genre: generationGenre,
          mood: generationMood,
          notesCount: generationLength,
          temperature: generationTemp,
          seedNotes: notes.slice(-5).map(n => ({
            pitch: n.pitch,
            duration: n.duration,
            velocity: n.velocity,
            startTime: n.startTime
          }))
        };

        const res = await fetch('/api/gemini/generate-melody', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!data.success) {
          throw new Error(data.error || 'Gemini AI Compositions failed to compile.');
        }

        // Beautiful. Map results and update the grid
        const generatedNotes: Note[] = data.notes.map((n: any, idx: number) => ({
          pitch: Number(n.pitch),
          duration: Number(n.duration) || 1.0,
          velocity: Number(n.velocity) || 90,
          startTime: Number(n.startTime) || (idx * 1.0),
        }));

        setNotes(generatedNotes);
      } catch (err: any) {
        console.error(err);
        setApiError(err.message || 'Server timeout calling Gemini API. Please ensure your Secrets are loaded correctly.');
        
        // Fallback to client-side mathematical sequence generation so the user is never stuck
        triggerLocalFallbackGeneration();
      } finally {
        setIsGenerating(false);
      }
    } else {
      // Client RNN or Markov generation
      setTimeout(() => {
        triggerLocalFallbackGeneration();
        setIsGenerating(false);
      }, 1000);
    }
  };

  // High-fidelity fallback melody mathematical models (Markov/Sequence scale patterns)
  const triggerLocalFallbackGeneration = () => {
    const sequenceLength = generationLength;
    const generated: Note[] = [];
    let curTime = 0;
    
    // Pick starter scale pitch depending on selected genre
    let baseScale = [60, 62, 64, 65, 67, 69, 71, 72]; // C Major
    if (generationGenre === 'jazz') {
      baseScale = [57, 60, 62, 63, 64, 67, 69, 72]; // A Minor Pentatonic / Blues
    } else if (generationGenre === 'cyberpunk') {
      baseScale = [50, 52, 53, 55, 57, 58, 60, 62]; // D Minor Aeolian
    } else if (generationGenre === 'ambient') {
      baseScale = [64, 66, 68, 71, 73, 76, 78, 81]; // Pentatonic floating
    }

    let lastPitch = baseScale[Math.floor(Math.random() * baseScale.length)];

    for (let i = 0; i < sequenceLength; i++) {
      // Predict next state: stepwise interval jumps (standard Markov transition simulation)
      const intervalJump = [-3, -2, -1, 0, 1, 2, 3, 5, 7][Math.floor(Math.random() * 9)];
      let nextPitch = lastPitch + intervalJump;
      
      // Keep inside keyboard limits (C3-C6: 48-84)
      if (nextPitch < 48 || nextPitch > 84) {
        nextPitch = baseScale[Math.floor(Math.random() * baseScale.length)];
      }

      // Vary durations on genre
      const durOptions = generationGenre === 'cyberpunk' ? [0.5] : [0.5, 1.0, 2.0];
      const duration = durOptions[Math.floor(Math.random() * durOptions.length)];

      generated.push({
        pitch: nextPitch,
        duration,
        velocity: Math.floor(Math.max(60, 90 + (Math.random() * 20 - 10))),
        startTime: curTime
      });

      curTime += duration;
      lastPitch = nextPitch;
    }

    setNotes(generated);
  };

  // Convert current notes to standard MIDI binary format and download
  const handleExportMidi = () => {
    if (notes.length === 0) return;
    const blob = notesToMidiBlob(notes, `Generated_${generationGenre}`);
    const url = URL.createObjectURL(blob);
    
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `neuralmuse_melody_${generationGenre}.mid`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#FDFCFB] text-[#1A1A1A] flex flex-col font-sans antialiased border-4 border-[#1A1A1A] m-2 md:m-4 transition-all duration-300">
      
      {/* EDITORIAL RAIL OVERLAYS & EMBELLISHMENTS */}
      <div className="hidden lg:flex fixed left-8 bottom-8 z-50 pointer-events-none items-center gap-2 text-[10px] font-mono tracking-widest font-bold uppercase text-[#1A1A1A]/40 origin-left rotate-270">
        <span>ARCHIVE VOLUME 24</span>
      </div>
      <div className="hidden lg:flex fixed right-8 bottom-8 z-50 pointer-events-none items-center gap-2 text-[10px] font-mono tracking-widest font-bold uppercase text-[#1A1A1A]/40 origin-right -rotate-270">
        <span>ESTABLISHED MMXXIV</span>
      </div>

      {/* HEADER SECTION */}
      <header className="bg-[#FDFCFB] border-b-2 border-[#1A1A1A] sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 border-2 border-[#1A1A1A] bg-[#FDFCFB] flex items-center justify-center text-[#1A1A1A] shadow-[4px_4px_0px_#1A1A1A]">
              <Sparkles className="w-5.5 h-5.5 text-[#B8860B]" />
            </div>
            <div>
              <h1 className="text-3xl font-serif font-bold tracking-tight text-[#1A1A1A] uppercase leading-none">
                ORBIT • <span className="font-serif italic font-normal text-[#B8860B]">Acoustique</span>
              </h1>
              <p className="text-[10px] font-mono tracking-widest text-[#1A1A1A]/60 uppercase mt-1">
                LSTM & Gemini Deep Music Sequence Composition
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Indicator */}
            <div className="hidden md:flex items-center gap-2 bg-[#FDFCFB] p-1.5 px-3.5 border border-[#1A1A1A] text-[10px] font-mono text-[#1A1A1A] uppercase tracking-wider font-bold">
              <span className="w-2 h-2 rounded-full bg-[#B8860B]" />
              <span>Host 3000 online</span>
            </div>

            {/* Export MIDI */}
            <button
              onClick={handleExportMidi}
              disabled={notes.length === 0}
              id="export-midi-header"
              className="px-5 py-2.5 bg-[#1A1A1A] text-[#FDFCFB] hover:bg-[#B8860B] rounded-none text-xs font-mono uppercase tracking-wider transition-all duration-150 flex items-center gap-2 disabled:opacity-45 disabled:cursor-not-allowed shadow-[3px_3px_0px_rgba(26,26,26,0.2)] hover:shadow-none"
            >
              <Download className="w-4 h-4" />
              export midi
            </button>
          </div>
        </div>
      </header>

      {/* CONTAINER CONTENT */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-10 flex flex-col gap-10">
        
        {/* ROW 1: Step 1 (Preprocessing Panel) */}
        <section className="bg-white border-2 border-[#1A1A1A] rounded-none p-6 shadow-[6px_6px_0px_#1A1A1A] flex flex-col gap-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1A1A1A] pb-4">
            <div className="flex items-center gap-2.5">
              <Layers className="w-5 h-5 text-[#B8860B]" />
              <h3 className="font-serif font-bold text-lg text-[#1A1A1A] uppercase tracking-wide">
                <span className="p-1 px-2.5 text-[10px] bg-[#B8860B]/10 text-[#B8860B] border border-[#B8860B]/20 rounded-none font-mono mr-2.5">STEP 01</span>
                Preprocess Training Datasets
              </h3>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-[#1A1A1A] font-mono uppercase font-bold tracking-wider">MAPPED PROFILE:</span>
              <select
                value={preprocessingGenre}
                onChange={(e) => setPreprocessingGenre(e.target.value as MusicGenre)}
                className="bg-[#FDFCFB] border border-[#1A1A1A] text-[#1A1A1A] px-3 py-1.5 rounded-none text-xs focus:ring-1 focus:ring-[#B8860B] outline-none font-mono"
              >
                <option value="classical">Beethoven Fur Elise Base</option>
                <option value="jazz">Syncopated Walking Bass</option>
                <option value="cyberpunk">Digital Eighth Hard Electro</option>
                <option value="ambient">Ethereal Whole Pentatonic</option>
              </select>
            </div>
          </div>

          <p className="text-xs text-[#1A1A1A]/80 leading-relaxed max-w-3xl font-serif">
            Before neural net sequence generation, raw MIDI matrices must be tokenized and preprocessed matching temporal frames (e.g. using tools like <code className="font-mono bg-neutral-100 p-0.5 text-xs">music21</code>). Quantization snaps starttimes to strict fractional steps, and pitch vectors are rolled into sequential training pairs.
          </p>

          <div className="flex flex-col md:flex-row items-stretch gap-5 mt-2">
            
            {/* Compute and Preprocess button */}
            <div className="flex flex-col gap-2 justify-center">
              <button
                onClick={handlePreprocess}
                disabled={isPreprocessing}
                id="preprocess-btn"
                className="px-6 py-4.5 bg-[#FDFCFB] hover:bg-[#1A1A1A] text-[#1A1A1A] hover:text-[#FDFCFB] font-bold border-2 border-[#1A1A1A] rounded-none text-xs font-mono tracking-widest uppercase transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-[3px_3px_0px_#1A1A1A] active:translate-y-0.5"
              >
                {isPreprocessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-[#B8860B]" />
                    MAPPING NOTES...
                  </>
                ) : (
                  <>
                    <ListRestart className="w-4 h-4" />
                    RUN PREPROCESSING PIPELINE
                  </>
                )}
              </button>
            </div>

            {/* Matrix Visual Frame */}
            <div className="flex-1 bg-[#FDFCFB] border border-[#1A1A1A] p-4 rounded-none min-h-[50px] flex items-center justify-center">
              {preprocessedMatrix ? (
                <div className="w-full flex flex-col gap-2 font-mono text-[10px] text-[#1A1A1A] text-left">
                  <div className="flex items-center gap-2 text-[#B8860B] text-xs font-bold uppercase tracking-wider">
                    <Check className="w-4 h-4 flex-none" />
                    <span>MIDI Preprocessed Matrix successfully exported! Ready for training input tensors.</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                    <div className="bg-white p-2.5 border border-[#1A1A1A]/40">
                      <span className="text-slate-500 text-[8px] block uppercase font-bold tracking-wider">Pitches Vector size</span>
                      <span className="font-bold text-xs text-[#1A1A1A]">{preprocessedMatrix.noteCount} notes</span>
                    </div>
                    <div className="bg-white p-2.5 border border-[#1A1A1A]/40">
                      <span className="text-slate-500 text-[8px] block uppercase font-bold tracking-wider">Quantization Snaps</span>
                      <span className="font-bold text-xs text-[#1A1A1A]">1/16 Quantized Step (128 Ticks)</span>
                    </div>
                    <div className="bg-white p-2.5 border border-[#1A1A1A]/40">
                      <span className="text-slate-500 text-[8px] block uppercase font-bold tracking-wider">Dataset Window tensor</span>
                      <span className="font-bold text-[9px] text-[#B8860B] truncate font-mono select-all">[x_t-8, ..., x_t] &rarr; x_t+1</span>
                    </div>
                  </div>
                  <div className="bg-neutral-100 p-2 border border-[#1A1A1A]/20 select-all max-h-16 overflow-y-auto whitespace-normal break-all font-mono text-[9px] text-neutral-600">
                    <span className="font-bold text-[#1A1A1A]">Token Sequence:</span> {preprocessedMatrix.integerMap.join(' → ')}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-neutral-500 italic flex items-center gap-1.5 py-2.5">
                  <HelpCircle className="w-3.5 h-3.5 text-neutral-400" />
                  Select dataset profile and click "preprocess" to compile training vectors.
                </div>
              )}
            </div>

          </div>

        </section>

        {/* ROW 2: Step 2 & 3 (Network Architectures and Training Visualizer) */}
        <section className="flex flex-col gap-4">
          <TrainingVisualizer
            config={modelConfig}
            onChangeConfig={setModelConfig}
            onTrainingComplete={(finalLoss) => setLossRate(finalLoss)}
            isTraining={isTraining}
            setIsTraining={setIsTraining}
          />
        </section>

        {/* ROW 3: Step 4 (AI Sequence Generation Controller) */}
        <section className="bg-white border-2 border-[#1A1A1A] rounded-none p-6 shadow-[6px_6px_0px_#1A1A1A] flex flex-col gap-5">
          
          <div className="border-b border-[#1A1A1A] pb-3">
            <h3 className="font-serif font-bold text-lg text-[#1A1A1A] uppercase tracking-wide flex items-center gap-2">
              <span className="p-1 px-2 text-[10px] bg-[#B8860B]/10 text-[#B8860B] border border-[#B8860B]/20 rounded-none font-mono">STEP 04</span>
              Music Sequence Compiler & Generation Engine
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-mono">
            
            {/* Parameter Choice 1: Engine choice */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[#1A1A1A] font-bold uppercase text-[9px] tracking-wider">GENERATION RUNTIME</label>
              <select
                value={generationEngine}
                onChange={(e) => setGenerationEngine(e.target.value as any)}
                className="bg-[#FDFCFB] text-[#1A1A1A] border border-[#1A1A1A] rounded-none px-3 py-2 outline-none focus:border-[#B8860B]"
              >
                <option value="gemini">Gemini Deep AI Composer (Server)</option>
                <option value="client_rnn">Client-Side RNN Generator (Simulated)</option>
                <option value="markov">Markov Chain Probability (Instant)</option>
              </select>
            </div>

            {/* Parameter Choice 2: Style */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[#1A1A1A] font-bold uppercase text-[9px] tracking-wider">STYLE / COMPOSITION GENRE</label>
              <select
                value={generationGenre}
                onChange={(e) => setGenerationGenre(e.target.value as MusicGenre)}
                className="bg-[#FDFCFB] text-[#1A1A1A] border border-[#1A1A1A] rounded-none px-3 py-2 outline-none focus:border-[#B8860B]"
              >
                <option value="classical">Classical Chamber Piano</option>
                <option value="jazz">Syncopated Swing Trio</option>
                <option value="cyberpunk">Chiptune Industrial Groove</option>
                <option value="ambient">Atmospheric Minimal Echo</option>
              </select>
            </div>

            {/* Parameter Choice 3: Mood/Emotion */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[#1A1A1A] font-bold uppercase text-[9px] tracking-wider">COMPOSITION MOOD</label>
              <select
                value={generationMood}
                onChange={(e) => setGenerationMood(e.target.value)}
                className="bg-[#FDFCFB] text-[#1A1A1A] border border-[#1A1A1A] rounded-none px-3 py-2 outline-none focus:border-[#B8860B]"
              >
                <option value="joyful">Bright / Joyful / Major Scale</option>
                <option value="melancholic">Sorrowful / Melancholic / Minor Scale</option>
                <option value="energetic">Frenetic / High Tempo / Industrial</option>
                <option value="mystical">Shimmering / Ethereal / Whole-Tone</option>
              </select>
            </div>

            {/* Parameter Choice 4: Length */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[#1A1A1A] font-bold uppercase text-[9px] tracking-wider">SEQUENCE NOTE COUNT</label>
              <select
                value={generationLength}
                onChange={(e) => setGenerationLength(Number(e.target.value))}
                className="bg-[#FDFCFB] text-[#1A1A1A] border border-[#1A1A1A] rounded-none px-3 py-2 outline-none focus:border-[#B8860B]"
              >
                <option value="16">16 notes (Short riff)</option>
                <option value="32">32 notes (Complete theme)</option>
                <option value="48">48 notes (Extended piece)</option>
              </select>
            </div>
            
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 items-center gap-6 border-t border-[#1A1A1A] pt-5 text-xs">
            
            {/* Temperature slide */}
            <div className="md:col-span-5 flex flex-col gap-1.5 font-mono">
              <div className="flex justify-between font-bold">
                <span className="text-[#1A1A1A]/70 uppercase text-[10px]">Temperature Variance</span>
                <span className="text-[#B8860B]">{generationTemp.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="0.2"
                max="1.5"
                step="0.1"
                value={generationTemp}
                onChange={(e) => setGenerationTemp(Number(e.target.value))}
                className="w-full h-1 bg-[#1A1A1A] rounded-none appearance-none cursor-pointer accent-[#B8860B]"
              />
              <span className="text-[9px] text-[#1A1A1A]/60 italic font-sans block">
                {generationTemp <= 0.4 ? "Highly deterministic, conservative chords." : generationTemp >= 1.2 ? "Extreme entropy, microtonal boundaries." : "Standard harmonic structure."}
              </span>
            </div>

            {/* Run Button and errors */}
            <div className="md:col-span-7 flex flex-col items-end gap-1">
              <button
                onClick={handleGenerateMelody}
                disabled={isGenerating}
                id="generate-melody-btn"
                className="w-full md:w-auto px-8 py-4.5 bg-[#1A1A1A] hover:bg-[#B8860B] disabled:bg-neutral-200 disabled:text-neutral-500 text-[#FDFCFB] font-mono tracking-widest uppercase cursor-pointer rounded-none transition shadow-[4px_4px_0px_rgba(26,26,26,0.3)] hover:shadow-none duration-150 flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#FDFCFB]" />
                    COMPILING MELODIC STRUCTURES...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-[#B8860B]" />
                    COMPOSER COMPLIANCE GEN
                  </>
                )}
              </button>
            </div>

          </div>

          {/* Prompt Key Warning or Service Info banner */}
          <AnimatePresence>
            {apiError ? (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-4 bg-[#B8860B]/10 border border-[#B8860B] text-[#1A1A1A] rounded-none text-xs leading-relaxed font-serif text-left flex items-start gap-3 overflow-hidden"
              >
                <div className="flex-none p-1.5 bg-[#B8860B]/20 text-[#B8860B] border border-[#B8860B]/40">
                  <HelpCircle className="w-4.5 h-4.5" />
                </div>
                <div>
                  <span className="font-bold font-serif uppercase tracking-wider block mb-1">Server Composition Pipeline Intercepted</span>
                  {apiError}
                  <span className="block mt-1.5 italic text-[#1A1A1A]/70">
                    A local fallback mathematical transition array (Markov Chain model) was automatically generated matching your target profile notes.
                  </span>
                </div>
              </motion.div>
            ) : (
              <div className="p-3 bg-[#FDFCFB] border border-[#1A1A1A]/30 text-[10px] text-[#1A1A1A]/60 leading-relaxed font-sans text-left uppercase tracking-wider font-bold">
                * SYSTEM ADVISORY: Server-side Gemini AI model calls undergo end-to-end tokenization shielding secrets directly inside the sandboxed space runtime.
              </div>
            )}
          </AnimatePresence>

        </section>

        {/* ROW 4: Piano Roll Canvas (Step 5) */}
        <section className="flex flex-col gap-4 mb-4">
          <PianoRoll
            notes={notes}
            onChangeNotes={setNotes}
            playbackBeat={playbackBeat}
            isPlaying={isPlaying}
            synthType={synthType}
            onChangeSynthType={setSynthType}
          />
        </section>

      </main>

      {/* FOOTER COOPERATIONS */}
      <footer className="bg-white border-t-2 border-[#1A1A1A] mt-auto py-8 text-[11px] font-mono font-bold tracking-widest text-[#1A1A1A]/80 uppercase">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#B8860B]" />
            ORBIT ACOUSTIQUE PROJECT
          </span>
          <span>© MMXXIV COMPILATION PROTOCOL ALL SECURED</span>
        </div>
      </footer>

    </div>
  );
}
