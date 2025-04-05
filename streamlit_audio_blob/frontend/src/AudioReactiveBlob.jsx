import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Box, Paper, ThemeProvider, createTheme, CssBaseline, Typography, Slider, Button, IconButton } from '@mui/material';
import { blue, grey } from '@mui/material/colors';
import MicIcon from '@mui/icons-material/Mic';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import SettingsIcon from '@mui/icons-material/Settings';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

// --- Material-UI Theme with Accessibility Enhancements for Elderly Users ---
const theme = createTheme({
  palette: { 
    mode: 'light', 
    primary: blue,
    background: { 
      default: '#f8f8f8', 
      paper: '#ffffff', 
    }, 
    text: { 
      primary: grey[900], 
      secondary: grey[700], 
    }, 
    error: { 
      main: '#d32f2f', 
    },
  },
  typography: {
    // Larger font sizes for better readability
    fontSize: 16,
    h5: {
      fontWeight: 600,
      fontSize: '1.5rem',
    },
    body1: {
      fontSize: '1.1rem',
    },
  },
  components: { 
    MuiPaper: { 
      styleOverrides: { 
        root: { 
          borderRadius: '16px', 
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)', 
          border: `1px solid ${grey[200]}`, 
          position: 'relative', 
          overflow: 'hidden',
        } 
      } 
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          padding: '10px 16px',
          fontSize: '1rem',
          textTransform: 'none',
        }
      }
    },
    MuiSlider: {
      styleOverrides: {
        root: {
          height: 8,
        },
        thumb: {
          height: 24,
          width: 24,
        },
        track: {
          height: 8,
          borderRadius: 4,
        },
        rail: {
          height: 8,
          borderRadius: 4,
        },
      }
    },
  },
});

// --- p5.js Sketch Definition ---
const sketch = (p) => {
  // --- Audio Analysis Setup ---
  let audioContext; let analyser; let microphone; let micStream; let frequencyData;
  let audioReady = false; let sampleRate = 44100;
  const audioThreshold = 0.09;
  const fftSize = 512;
  let nyquist;

  // --- State Management (within p5) ---
  let isP5StateActive = false;
  let activeStateIntensity = 0; const activeStateLerpFactor = 0.07;

  // --- Blob Geometry & Core Properties ---
  let baseRadius = 100;
  const numVertices = 140; let vertices = [];

  // --- Core "Breathing" & Pause Effects ---
  let breathingTime = Math.random() * 500;
  const breathingSpeed = 0.0008; const breathingAmount = 0.025;
  let isBreathing = false; let silenceFrames = 0;
  const silenceThreshold = 0.03; const framesForBreathing = 90;
  const framesForPause = 20;
  let pauseEnded = false;
  let pauseEffectTimer = 0; const pauseEffectDuration = 12;
  let pauseEffectIntensity = 0; const pauseEffectDecay = 0.06;
  let inhaleAmount = 0;
  const inhaleSpeed = 0.15;
  const maxInhaleFactor = 0.08;

  // --- Noise Parameters ---
  // Passive - Gentle, slow-moving baseline effects
  let passiveNoiseTime = Math.random() * 1000; const basePassiveNoiseSpeed = 0.0004; // Slower for calmer motion
  const passiveNoisePosScale = 0.7;
  let currentPassiveDeformationAmount = 0.04; // Very subtle deformation for stability
  const basePassiveDeformationAmount = 0.04; // Very subtle deformation for stability
  const maxPassiveDeformationBoost = 0.02; // Minimal boost for gentle response
  const passiveDeformationLerpFactor = 0.008; // Slower transitions for smoother animation
  
  // Active - Shape (core form) - very subtle, slow changes
  let activeShapeNoiseTime = Math.random() * 2000; const baseActiveShapeNoiseSpeed = 0.0006; // Much slower for stability
  const baseActiveShapeNoiseScale = 0.9; // Subtle shape variation
  let currentActiveShapeNoiseScale = baseActiveShapeNoiseScale;
  const shapeScaleLerpFactor = 0.008; // Slower transitions
  const shapeScaleSpreadFactor = 0.08; // Minimal variation
  
  // Active - Texture (fine details) - very subtle
  let activeTextureNoiseTime = Math.random() * 3000; const baseActiveTextureNoiseSpeed = 0.0010; // Slower for stability
  const activeTextureNoiseScale = 8.0; let currentActiveTextureIntensity = 0.04; // Very subtle texture
  const baseTextureIntensity = 0.02; const maxTextureIntensity = 0.08; // Limited intensity
  const textureIntensityLerpFactor = 0.012; // Slower transitions
  
  // Active - Waviness (speaking motion) - gentle, controlled response
  let activeWavinessNoiseTime = Math.random() * 4000; const baseActiveWavinessNoiseSpeed = 0.0006; // Slower for stability
  let currentWavinessNoiseScale = 3.5; // Lower scale for smoother shapes
  const baseWavinessNoiseScale = 3.5; // Lower scale for smoother shapes
  const wavinessScalePitchFactor = 0.5; // Reduced pitch influence for consistency
  const wavinessScaleLerpFactor = 0.01; // Very slow transitions for elderly-friendly visuals
  let currentWavinessInfluence = 0.0;
  const maxWavinessInfluence = 0.15; // Limited influence for controlled movement
  const wavinessInfluenceLerpFactor = 0.012; // Slower transitions
  // Active - Angular Offset
  let activeNoiseAngularOffset = Math.random() * p.TWO_PI;
  const baseActiveNoiseOffsetSpeed = 0.0003;

  // --- Speed Modulation by Volume --- (slower, more deliberate for CSM speaking style)
  const maxSlowSpeedMultiplier = 1.8; // Much lower for calmer motion
  const maxFastSpeedMultiplier = 1.4; // Much lower for calmer motion

  // Peak extension control - gentle, smooth response
  let activePeakMultiplier = 1.0; const activeMultiplierLerpFactor = 0.08; // Slower transitions
  const maxPeakExtensionFactor = 1.1; // Very limited extension for stability

  // --- Internal Complexity Texture ---
  let internalTextureTime = Math.random() * 6000; const internalTextureSpeed = 0.0003;
  const internalTextureScale = 0.5; const internalTextureComplexityScale = 2.5;
  let internalTextureAlpha = 0; const maxInternalTextureAlpha = 18;
  const internalAlphaLerpFactor = 0.015;

  // --- Edge Sharpness / Certainty Proxy ---
  let edgeSharpness = 1.0; const edgeSharpnessLerpFactor = 0.015;

  // --- Inferred Speech Mode Factors ---
  let focusFactor = 0.0; const focusFactorLerp = 0.02;
  let melodyFactor = 0.0; const melodyFactorLerp = 0.025;
  let emphasisFactor = 0.0; const emphasisFactorLerp = 0.05;

  // --- Audio Reactivity Parameters ---
  let smoothedOverallLevel = 0; let smoothedMidLevel = 0; let smoothedTrebleLevel = 0;
  const audioLerpFactor = 0.1;
  let frequencySpread = 0; const freqSpreadLerpFactor = 0.03;
  const binActivationThreshold = 10;
  let pitchProxy = 0.5; const pitchProxyLerpFactor = 0.06;
  let lastPitchProxy = 0.5;
  let pitchChangeRate = 0; const pitchChangeLerpFactor = 0.05;
  const pitchMinFreq = 80; const pitchMaxFreq = 500;
  let pitchMinIndex, pitchMaxIndex;
  let midHistory = []; const midHistoryLength = 30;
  let sustainedMidLevel = 0;

  // --- Volume Dynamics (Aha! detection) ---
  let volumeHistory = []; const volumeHistoryLength = 60;
  let averageVolume = 0; const ahaThresholdMultiplier = 1.4;
  const ahaMinimumLevel = 0.30; let isAhaMoment = false;
  let ahaTimer = 0; const ahaDuration = 15;

  // --- Color Properties --- (calm, soothing colors for elderly audience)
  const baseHue = 210; let hueShiftRange = 15; // Blue is calming, less shift for stability
  let targetHue = baseHue; let currentHue = baseHue; const hueLerpFactor = 0.01; // Slower color transitions
  const baseSaturation = 60; const baseBrightness = 95; // Slightly less saturated, gentle colors
  let saturationBoost = 0; const maxSaturationBoost = 10; // Limited saturation change
  let brightnessBoost = 0; const maxBrightnessBoost = 2; // Very subtle brightness changes
  let currentCenterColor; let currentEdgeColor; // Assigned in updateColor
  let flashIntensity = 0; const flashDecay = 0.10; // Slower decay for gentler transitions

  // --- p5.js Setup ---
  p.setup = () => {
    const container = document.getElementById('canvas-container'); 
    if (!container) {
      console.error("Canvas container not found");
      return;
    }
    
    // Create canvas with integer dimensions to avoid sub-pixel rendering issues
    const canvasWidth = Math.floor(container.offsetWidth);
    const canvasHeight = Math.floor(container.offsetHeight);
    
    // Create and position the canvas
    const canvas = p.createCanvas(canvasWidth, canvasHeight);
    canvas.parent('canvas-container');
    
    // Remove any default margins/padding that might cause positioning issues
    const canvasElement = document.querySelector('#canvas-container canvas');
    if (canvasElement) {
      canvasElement.style.display = 'block';
      canvasElement.style.margin = '0';
      canvasElement.style.padding = '0';
    }
    
    p.colorMode(p.HSB, 360, 100, 100, 100); 
    p.angleMode(p.RADIANS); 
    p.frameRate(60);
    
    baseRadius = p.min(p.width, p.height) / 5.0;
    nyquist = sampleRate / 2;
    const binWidth = nyquist / (fftSize / 2);
    pitchMinIndex = Math.max(1, Math.floor(pitchMinFreq / binWidth));
    pitchMaxIndex = Math.min(fftSize / 2 - 1, Math.ceil(pitchMaxFreq / binWidth));
    
    // Initialize vertices and history arrays
    for (let i = 0; i < numVertices; i++) { 
      vertices.push(p.createVector(0, 0)); 
    }
    for(let i=0; i<volumeHistoryLength; i++) volumeHistory.push(0);
    for(let i=0; i<midHistoryLength; i++) midHistory.push(0);
    
    // Initialize core variables to their base values
    currentActiveShapeNoiseScale = baseActiveShapeNoiseScale;
    currentPassiveDeformationAmount = basePassiveDeformationAmount;
    currentWavinessNoiseScale = baseWavinessNoiseScale;
    
    // Initial calculations
    updateColor(); 
    calculateBlobShape(); 
    
    // Force a complete redraw once on setup
    p.clear();
    p.background(p.color(theme.palette.background.default));
    
    console.log(`p5 Setup Complete. Canvas: ${p.width}x${p.height}, BaseRadius: ${baseRadius}, Pitch Range Indices: ${pitchMinIndex}-${pitchMaxIndex}`);
  };

  // --- p5.js Draw Loop ---
  p.draw = () => {
    let timeDelta = p.deltaTime / (1000 / 60);
    
    // Clear the entire canvas with background color to prevent artifacts
    p.clear();
    p.background(p.color(theme.palette.background.default));
    
    // Ensure everything is perfectly centered
    p.push();
    // Use integer values to avoid sub-pixel rendering issues
    const centerX = Math.floor(p.width / 2);
    const centerY = Math.floor(p.height / 2);
    p.translate(centerX, centerY);
    
    updateAudio();
    updateStateAndMotion(timeDelta);
    updateColor();
    calculateBlobShape();
    drawInternalTexture();
    drawBlob();
    drawMicrophoneIcon();
    if(pauseEffectTimer > 0) drawPauseEffect();
    
    p.pop();
  };
  
  // --- Draw Microphone Icon ---
  const drawMicrophoneIcon = () => {
    // Use the same scaling factor for all elements to keep them in sync
    // Ensure the scaling factor can never become negative
    const smoothedLevel = Math.max(0, smoothedOverallLevel); // Prevent negative audio levels
    const peakMult = Math.max(0, activePeakMultiplier); // Prevent negative multipliers
    const scaleFactor = 1 + smoothedLevel * peakMult * 0.6;
    
    // Draw scaling circle around microphone - MUCH larger now
    const minCircleRadius = Math.max(0.1, baseRadius * 0.75); // Close to blob border
    const maxCircleRadius = Math.max(minCircleRadius + 0.1, baseRadius * 0.92); // Almost touching the blob
    // Ensure level is between 0-1 for lerp
    const safeLevel = p.constrain(smoothedLevel, 0, 1);
    const circleRadius = p.lerp(minCircleRadius, maxCircleRadius, safeLevel);
    p.push();
    p.noFill();
    p.stroke(255);
    p.strokeWeight(2); // Slightly thicker for better visibility
    p.circle(0, 0, circleRadius * 2);
    p.pop();
    
    // Draw a simple, iconic podcast microphone
    p.push();
    p.fill(255);
    p.noStroke();
    
    // Base size for microphone that scales with audio
    const baseMicSize = Math.max(0.1, baseRadius * 0.28); // Ensure base size is never too small
    // Ensure scaleFactor is always positive (at least 0.1) to prevent negative dimensions
    const safeScaleFactor = Math.max(0.1, scaleFactor); 
    const currentMicSize = baseMicSize * safeScaleFactor;
    
    // Simple classic microphone - just the essential elements
    
    // Main mic head - simple rounded rectangle
    p.rectMode(p.CENTER);
    // Ensure the corner radius is always positive
    const cornerRadius = Math.max(0.001, currentMicSize * 0.2);
    p.rect(0, -currentMicSize * 0.3, currentMicSize * 0.55, currentMicSize * 0.8, cornerRadius);
    
    // Simple mic stand - no corner radius to avoid errors
    p.rect(0, currentMicSize * 0.5, Math.max(0.001, currentMicSize * 0.12), Math.max(0.001, currentMicSize * 1.0));
    
    // Base - ellipse doesn't need radius protection as p5.js handles it
    p.ellipse(0, currentMicSize * 1.0, Math.max(0.001, currentMicSize * 0.7), Math.max(0.001, currentMicSize * 0.18));
    
    // Mic grille pattern - subtle circles 
    p.fill(0, 0, 0, 30); // Semitransparent dark
    
    // Three small circles to suggest mic grille
    const grilleDiameter = Math.max(0.001, currentMicSize * 0.12);
    
    // Only draw grille details if microphone is large enough to avoid artifacts
    if (currentMicSize > 0.1) {
      p.ellipse(-currentMicSize * 0.15, -currentMicSize * 0.4, grilleDiameter);
      p.ellipse(0, -currentMicSize * 0.4, grilleDiameter);
      p.ellipse(currentMicSize * 0.15, -currentMicSize * 0.4, grilleDiameter);
      
      p.ellipse(-currentMicSize * 0.15, -currentMicSize * 0.2, grilleDiameter);
      p.ellipse(0, -currentMicSize * 0.2, grilleDiameter);
      p.ellipse(currentMicSize * 0.15, -currentMicSize * 0.2, grilleDiameter);
    }
    
    p.pop();
  };

  // --- Audio Setup Function ---
  const setupAudio = async () => { 
    if (audioContext && audioContext.state === 'running') { 
      if (!micStream || !micStream.active) { 
        try { 
          micStream = await navigator.mediaDevices.getUserMedia({ 
            audio: { 
              echoCancellation: true, 
              noiseSuppression: true 
            } 
          }); 
          if (microphone) microphone.disconnect(); 
          microphone = audioContext.createMediaStreamSource(micStream); 
          microphone.connect(analyser); 
          console.log("Reconnected mic stream."); 
        } catch (err) { 
          console.error("Error reconnecting mic:", err); 
          audioReady = false; 
          isP5StateActive = false; 
          return false; 
        } 
      } 
      audioReady = true; 
      console.log("Audio already running or reconnected."); 
      return true; 
    } 
    
    if (audioContext && audioContext.state !== 'closed') { 
      console.log("Closing existing audio context before creating new one."); 
      await audioContext.close().catch(e => console.error("Error closing previous context:", e)); 
      audioContext = null; 
    } 
    
    try { 
      audioContext = new (window.AudioContext || window.webkitAudioContext)(); 
      sampleRate = audioContext.sampleRate; 
      nyquist = sampleRate / 2; 
      const binWidth = nyquist / (fftSize / 2); 
      pitchMinIndex = Math.max(1, Math.floor(pitchMinFreq / binWidth)); 
      pitchMaxIndex = Math.min(fftSize / 2 - 1, Math.ceil(pitchMaxFreq / binWidth)); 
      
      if (audioContext.state === 'suspended') { 
        await audioContext.resume(); 
      } 
      
      micStream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: true, 
          noiseSuppression: true 
        } 
      }); 
      
      microphone = audioContext.createMediaStreamSource(micStream); 
      analyser = audioContext.createAnalyser(); 
      analyser.fftSize = fftSize; 
      analyser.smoothingTimeConstant = 0.75; 
      frequencyData = new Uint8Array(analyser.frequencyBinCount); 
      microphone.connect(analyser); 
      
      console.log('Audio setup successful. Context state:', audioContext.state); 
      audioReady = true; 
      return true; 
    } catch (err) { 
      console.error('Audio Setup Error:', err); 
      audioReady = false; 
      isP5StateActive = false; 
      
      if (micStream) micStream.getTracks().forEach(track => track.stop()); 
      micStream = null; 
      microphone = null; 
      analyser = null; 
      frequencyData = null; 
      
      if (audioContext && audioContext.state !== 'closed') { 
        await audioContext.close().catch(e => console.error("Error closing context on failure:", e)); 
      } 
      
      audioContext = null; 
      return false; 
    } 
  };

  // --- Stop Audio Processing ---
  const stopAudioProcessing = () => { 
    console.log("Stopping audio processing and mic tracks."); 
    
    if (micStream) { 
      micStream.getTracks().forEach(track => track.stop()); 
      micStream = null; 
    } 
    
    if (microphone) { 
      microphone.disconnect(); 
      microphone = null; 
    } 
    
    audioReady = false; 
    
    const stopLerpFactor = audioLerpFactor * 4; 
    smoothedOverallLevel = p.lerp(smoothedOverallLevel, 0, stopLerpFactor); 
    smoothedMidLevel = p.lerp(smoothedMidLevel, 0, stopLerpFactor); 
    smoothedTrebleLevel = p.lerp(smoothedTrebleLevel, 0, stopLerpFactor); 
    frequencySpread = p.lerp(frequencySpread, 0, stopLerpFactor); 
    
    averageVolume = 0; 
    volumeHistory = volumeHistory.map(() => 0); 
    midHistory = midHistory.map(() => 0); 
    sustainedMidLevel = 0; 
    pitchProxy = 0.5; 
    lastPitchProxy = 0.5; 
    pitchChangeRate = 0; 
    focusFactor = 0; 
    melodyFactor = 0; 
    emphasisFactor = 0;
  };

  // --- Update Audio Analysis ---
  const updateAudio = () => { 
    lastPitchProxy = pitchProxy; 
    
    if (!isP5StateActive || !audioReady || !analyser || !frequencyData) { 
      const idleLerpFactor = audioLerpFactor * 0.3; 
      smoothedOverallLevel = p.lerp(smoothedOverallLevel, 0, idleLerpFactor); 
      smoothedMidLevel = p.lerp(smoothedMidLevel, 0, idleLerpFactor); 
      smoothedTrebleLevel = p.lerp(smoothedTrebleLevel, 0, idleLerpFactor); 
      frequencySpread = p.lerp(frequencySpread, 0, freqSpreadLerpFactor); 
      
      volumeHistory.push(0); 
      if(volumeHistory.length > volumeHistoryLength) volumeHistory.shift(); 
      averageVolume = volumeHistory.reduce((a, b) => a + b, 0) / volumeHistory.length; 
      
      midHistory.push(0); 
      if(midHistory.length > midHistoryLength) midHistory.shift(); 
      sustainedMidLevel = midHistory.reduce((a,b) => a+b, 0) / midHistory.length; 
      
      pitchProxy = p.lerp(pitchProxy, 0.5, pitchProxyLerpFactor); 
      pitchChangeRate = p.lerp(pitchChangeRate, 0, pitchChangeLerpFactor); 
      return; 
    } 
    
    analyser.getByteFrequencyData(frequencyData); 
    
    let oSum = 0, mSum = 0, tSum = 0, activeBinCount = 0; 
    const fbc = frequencyData.length; 
    const midEndFreq = 4000, trebleStartFreq = 4000; 
    const midEndIndex = Math.min(fbc-1, Math.ceil(midEndFreq/(nyquist/fbc))); 
    const trebleStartIndex = Math.min(fbc-1, Math.floor(trebleStartFreq/(nyquist/fbc))); 
    
    let maxAmp = 0; 
    let peakIndex = -1; 
    
    for (let i = pitchMinIndex; i <= pitchMaxIndex; i++) { 
      if (frequencyData[i] > maxAmp) { 
        maxAmp = frequencyData[i]; 
        peakIndex = i; 
      } 
    } 
    
    let targetPitchProxy = 0.5; 
    if (peakIndex !== -1 && maxAmp > binActivationThreshold * 1.5) { 
      targetPitchProxy = p.map(peakIndex, pitchMinIndex, pitchMaxIndex, 0, 1, true); 
    } 
    pitchProxy = p.lerp(pitchProxy, targetPitchProxy, pitchProxyLerpFactor); 
    
    for(let i = 0; i < fbc; i++) { 
      let l = frequencyData[i]; 
      oSum += l; 
      
      if(i <= midEndIndex) mSum += l; 
      else if(i >= trebleStartIndex) tSum += l; 
      
      if(l > binActivationThreshold) activeBinCount++; 
    } 
    
    let nO = fbc > 0 ? oSum / fbc : 0; 
    let numMidBins = midEndIndex + 1; 
    let numTrebleBins = fbc - trebleStartIndex; 
    let nM = numMidBins > 0 ? mSum / numMidBins : 0; 
    let nT = numTrebleBins > 0 ? tSum / numTrebleBins : 0; 
    
    let normO = p.map(nO, 0, 160, 0, 1, true); 
    let normM = p.map(nM, 0, 160, 0, 1, true); 
    let normT = p.map(nT, 0, 160, 0, 1, true); 
    
    smoothedOverallLevel = p.lerp(smoothedOverallLevel, normO, audioLerpFactor); 
    smoothedMidLevel = p.lerp(smoothedMidLevel, normM, audioLerpFactor); 
    smoothedTrebleLevel = p.lerp(smoothedTrebleLevel, normT, audioLerpFactor); 
    
    let targetSpread = fbc > 0 ? activeBinCount / fbc : 0; 
    frequencySpread = p.lerp(frequencySpread, targetSpread, freqSpreadLerpFactor); 
    
    volumeHistory.push(smoothedOverallLevel); 
    if(volumeHistory.length > volumeHistoryLength) volumeHistory.shift(); 
    averageVolume = volumeHistory.reduce((a, b) => a + b, 0) / volumeHistory.length; 
    
    midHistory.push(smoothedMidLevel); 
    if(midHistory.length > midHistoryLength) midHistory.shift(); 
    sustainedMidLevel = midHistory.reduce((a,b) => a+b, 0) / midHistory.length; 
    
    let currentPitchChange = Math.abs(pitchProxy - lastPitchProxy); 
    pitchChangeRate = p.lerp(pitchChangeRate, currentPitchChange, pitchChangeLerpFactor); 
    
    if (!isAhaMoment && smoothedOverallLevel > ahaMinimumLevel && 
        averageVolume > 0.01 && smoothedOverallLevel > averageVolume * ahaThresholdMultiplier) { 
      isAhaMoment = true; 
      ahaTimer = ahaDuration; 
      flashIntensity = 1.0; 
      console.log("Aha! Detected"); 
    } 
  };

  // --- Update State & Motion ---
  const updateStateAndMotion = (timeDelta) => {
    let targetActiveStateIntensity = isP5StateActive ? 1.0 : 0.0; 
    activeStateIntensity = p.lerp(activeStateIntensity, targetActiveStateIntensity, activeStateLerpFactor * timeDelta);
    
    pauseEnded = false; 
    if (isP5StateActive && smoothedOverallLevel < silenceThreshold) { 
      silenceFrames++; 
    } else { 
      if (silenceFrames >= framesForPause) { 
        pauseEnded = true; 
        pauseEffectTimer = pauseEffectDuration; 
        pauseEffectIntensity = 1.0; 
        inhaleAmount = -1.0; 
      } 
      silenceFrames = 0; 
      isBreathing = false; 
    } 
    
    if (silenceFrames >= framesForBreathing) { 
      isBreathing = true; 
      breathingTime += breathingSpeed * timeDelta; 
    }
    
    if (pauseEffectTimer > 0) pauseEffectTimer--; 
    pauseEffectIntensity = p.lerp(pauseEffectIntensity, 0, pauseEffectDecay); 
    
    if (pauseEnded || inhaleAmount !== 0) { 
      inhaleAmount = p.lerp(inhaleAmount, 1.0, inhaleSpeed);
    } 
    
    if (Math.abs(inhaleAmount - 1.0) < 0.01) inhaleAmount = 0;
    
    let currentSlowSpeedMultiplier = 1.0; 
    let currentFastSpeedMultiplier = 1.0; 
    
    if (isP5StateActive && smoothedOverallLevel > audioThreshold) { 
      const mapStartLevel = audioThreshold + 0.02; 
      const mapEndLevel = 0.85; 
      currentSlowSpeedMultiplier = p.map(smoothedOverallLevel, mapStartLevel, mapEndLevel, 1.0, maxSlowSpeedMultiplier, true); 
      currentFastSpeedMultiplier = p.map(smoothedOverallLevel, mapStartLevel, mapEndLevel, 1.0, maxFastSpeedMultiplier, true); 
    }
    
    let targetFocusFactor = 0.0, targetMelodyFactor = 0.0, targetEmphasisFactor = 0.0; 
    
    if (isP5StateActive && smoothedOverallLevel > audioThreshold) { 
      targetFocusFactor = p.map(frequencySpread, 0.3, 0.7, 0, 1, true) * p.map(pitchChangeRate, 0.05, 0.005, 0, 1, true); 
      targetMelodyFactor = p.map(pitchChangeRate, 0.01, 0.1, 0, 1, true); 
      targetEmphasisFactor = p.map(smoothedOverallLevel, 0.5, 0.9, 0, 1, true); 
      
      if (isAhaMoment) targetEmphasisFactor = 1.0; 
    } 
    
    focusFactor = p.lerp(focusFactor, targetFocusFactor, focusFactorLerp); 
    melodyFactor = p.lerp(melodyFactor, targetMelodyFactor, melodyFactorLerp); 
    emphasisFactor = p.lerp(emphasisFactor, targetEmphasisFactor, emphasisFactorLerp);
    
    let rotationSpeedModifier = p.lerp(1.0, 0.8, focusFactor) * p.lerp(1.0, 1.2, melodyFactor); 
    let finalSlowMultiplier = currentSlowSpeedMultiplier * p.lerp(1.0, 1.1, emphasisFactor); 
    let finalFastMultiplier = currentFastSpeedMultiplier * p.lerp(1.0, 1.1, emphasisFactor); 
    let finalOffsetMultiplier = currentFastSpeedMultiplier * rotationSpeedModifier * p.lerp(1.0, 1.1, emphasisFactor);
    
    let wavinessSpeedBoost = p.map(pitchChangeRate, 0.01, 0.1, 1.0, 2.5, true);
    
    passiveNoiseTime      += basePassiveNoiseSpeed      * (isP5StateActive ? finalSlowMultiplier : 1.0) * timeDelta;
    activeShapeNoiseTime    += baseActiveShapeNoiseSpeed    * finalFastMultiplier * timeDelta;
    activeTextureNoiseTime  += baseActiveTextureNoiseSpeed  * finalFastMultiplier * timeDelta;
    activeWavinessNoiseTime += baseActiveWavinessNoiseSpeed * finalSlowMultiplier * wavinessSpeedBoost * timeDelta;
    internalTextureTime += internalTextureSpeed * timeDelta;
    activeNoiseAngularOffset += baseActiveNoiseOffsetSpeed * finalOffsetMultiplier * timeDelta; 
    activeNoiseAngularOffset %= p.TWO_PI;
    
    // Aha moment handling
    if (isAhaMoment) {
      ahaTimer--;
      if (ahaTimer <= 0) {
        isAhaMoment = false;
      }
    }
    
    // Flash intensity decay
    if (flashIntensity > 0) {
      flashIntensity = p.max(0, flashIntensity - flashDecay * timeDelta);
    }
    
    // Update color hue based on pitch and volume
    if (isP5StateActive && smoothedOverallLevel > audioThreshold) {
      // Pitch influences hue - higher pitch = warmer colors
      let pitchHueShift = p.map(pitchProxy, 0, 1, -hueShiftRange, hueShiftRange, true);
      
      // Volume influences saturation and brightness
      saturationBoost = p.map(smoothedOverallLevel, audioThreshold, 0.8, 0, maxSaturationBoost, true);
      brightnessBoost = p.map(smoothedOverallLevel, audioThreshold, 0.8, 0, maxBrightnessBoost, true);
      
      // Set target hue with pitch influence
      targetHue = baseHue + pitchHueShift;
    } else {
      // Return to base color when not active
      targetHue = baseHue;
      saturationBoost = p.lerp(saturationBoost, 0, 0.05);
      brightnessBoost = p.lerp(brightnessBoost, 0, 0.05);
    }
    
    // Smooth hue transitions
    currentHue = p.lerp(currentHue, targetHue, hueLerpFactor);
    
    // Update edge sharpness based on focus factor
    let targetEdgeSharpness = p.map(focusFactor, 0, 1, 0.7, 1.0, true);
    edgeSharpness = p.lerp(edgeSharpness, targetEdgeSharpness, edgeSharpnessLerpFactor);
    
    // Update internal texture alpha based on frequency spread
    let targetInternalAlpha = p.map(frequencySpread, 0.1, 0.5, 0, maxInternalTextureAlpha, true);
    internalTextureAlpha = p.lerp(internalTextureAlpha, targetInternalAlpha, internalAlphaLerpFactor);
    
    // Update active peak multiplier based on volume and emphasis
    let targetPeakMultiplier = 1.0;
    if (isP5StateActive && smoothedOverallLevel > audioThreshold) {
      targetPeakMultiplier = p.map(smoothedOverallLevel, audioThreshold, 0.8, 1.0, maxPeakExtensionFactor, true);
      targetPeakMultiplier = p.lerp(targetPeakMultiplier, maxPeakExtensionFactor, emphasisFactor * 0.5);
    }
    activePeakMultiplier = p.lerp(activePeakMultiplier, targetPeakMultiplier, activeMultiplierLerpFactor);
    
    // Update passive deformation amount based on volume
    let targetPassiveDeformation = basePassiveDeformationAmount;
    if (isP5StateActive && smoothedOverallLevel > audioThreshold) {
      let volumeBoost = p.map(smoothedOverallLevel, audioThreshold, 0.8, 0, maxPassiveDeformationBoost, true);
      targetPassiveDeformation = basePassiveDeformationAmount + volumeBoost;
    }
    currentPassiveDeformationAmount = p.lerp(currentPassiveDeformationAmount, targetPassiveDeformation, passiveDeformationLerpFactor);
    
    // Update active shape noise scale based on frequency spread
    let targetShapeNoiseScale = baseActiveShapeNoiseScale;
    if (isP5StateActive && frequencySpread > 0.1) {
      let spreadFactor = p.map(frequencySpread, 0.1, 0.6, 0, shapeScaleSpreadFactor, true);
      targetShapeNoiseScale = baseActiveShapeNoiseScale * (1.0 + spreadFactor);
    }
    currentActiveShapeNoiseScale = p.lerp(currentActiveShapeNoiseScale, targetShapeNoiseScale, shapeScaleLerpFactor);
    
    // Update active texture intensity based on treble level
    let targetTextureIntensity = baseTextureIntensity;
    if (isP5StateActive && smoothedTrebleLevel > 0.1) {
      targetTextureIntensity = p.map(smoothedTrebleLevel, 0.1, 0.8, baseTextureIntensity, maxTextureIntensity, true);
    }
    currentActiveTextureIntensity = p.lerp(currentActiveTextureIntensity, targetTextureIntensity, textureIntensityLerpFactor);
    
    // Update waviness influence based on mid level
    let targetWavinessInfluence = 0;
    if (isP5StateActive && smoothedMidLevel > 0.1) {
      targetWavinessInfluence = p.map(smoothedMidLevel, 0.1, 0.8, 0, maxWavinessInfluence, true);
    }
    currentWavinessInfluence = p.lerp(currentWavinessInfluence, targetWavinessInfluence, wavinessInfluenceLerpFactor);
    
    // Update waviness noise scale based on pitch
    let pitchScaleFactor = p.map(pitchProxy, 0, 1, -wavinessScalePitchFactor, wavinessScalePitchFactor, true);
    let targetWavinessScale = baseWavinessNoiseScale * (1.0 + pitchScaleFactor);
    currentWavinessNoiseScale = p.lerp(currentWavinessNoiseScale, targetWavinessScale, wavinessScaleLerpFactor);
  };

  // --- Update Color ---
  const updateColor = () => {
    // Apply flash effect to brightness if active
    let flashBrightnessBoost = flashIntensity * 5;
    
    // Calculate current color values with constraints
    let currentSaturationValue = p.constrain(baseSaturation + saturationBoost, 60, 95);
    let currentBrightnessValue = p.constrain(baseBrightness + brightnessBoost + flashBrightnessBoost, 92, 100);
    
    // Create center and edge colors
    currentCenterColor = p.color(currentHue, currentSaturationValue * 0.8, currentBrightnessValue);
    currentEdgeColor = p.color(currentHue, currentSaturationValue, currentBrightnessValue * 0.97);
    
    // Add slight transparency to edge for softer look
    currentEdgeColor.setAlpha(95);
  };

  // --- Calculate Blob Shape ---
  const calculateBlobShape = () => {
    // Calculate current base radius with breathing and inhale effects
    let breathingOffset = isBreathing ? Math.sin(breathingTime) * breathingAmount * baseRadius : 0;
    let inhaleOffset = inhaleAmount * maxInhaleFactor * baseRadius;
    let currentBaseRadius = baseRadius * (1.0 + breathingOffset + inhaleOffset);
    
    // Factors for volume-based waviness
    const volumeWavinessBoost = 2.5;
    const highFreqWavinessBoost = 1.2;
    const freqSpreadWaviness = 1.0 + frequencySpread * 0.5;
    
    // Wave time for oscillation effects
    const waveTime = p.millis() / 1000;
    const waveSpeed = 3.0;
    const waveAmplitude = 0.015;
    
    // Calculate each vertex position
    for (let i = 0; i < numVertices; i++) {
      let angle = p.map(i, 0, numVertices, 0, p.TWO_PI);
      let cosAnglePassive = p.cos(angle);
      let sinAnglePassive = p.sin(angle);
      
      // Passive noise (always present)
      let passiveNoiseX = p.map(cosAnglePassive, -1, 1, 0, passiveNoisePosScale);
      let passiveNoiseY = p.map(sinAnglePassive, -1, 1, 0, passiveNoisePosScale);
      let passiveNoiseVal = p.noise(passiveNoiseX, passiveNoiseY, passiveNoiseTime);
      
      // Apply volume-based modulation to passive noise
      let volumeModulatedAmount = currentPassiveDeformationAmount;
      if (smoothedOverallLevel > 0.3) {
        volumeModulatedAmount = p.lerp(
          currentPassiveDeformationAmount,
          currentPassiveDeformationAmount * volumeWavinessBoost,
          p.map(smoothedOverallLevel, 0.3, 0.9, 0, 1, true)
        );
      }
      
      let passiveOffset = p.map(passiveNoiseVal, 0, 1, -volumeModulatedAmount, volumeModulatedAmount) * currentBaseRadius;
      let coreRadius = currentBaseRadius + passiveOffset;
      
      // Add very subtle high-frequency ripples for speech articulation cues
      // For elderly users, we want minimal fast motion but still some indication of speech
      if (smoothedTrebleLevel > 0.25) { // Higher threshold to prevent constant rippling
        // Limit number of ripples to avoid visual complexity
        const trebleRippleCount = Math.floor(2 + smoothedTrebleLevel * 6); // Much fewer ripples
        
        // Very small amplitude for gentle effects
        const rippleAmplitude = currentBaseRadius * 0.004 * smoothedTrebleLevel * highFreqWavinessBoost;
        
        // Slower phase change for more gradual motion
        const ripplePhase = waveTime * waveSpeed * 1.2;
        
        // Gentle ripple offset
        const rippleOffset = Math.sin(angle * trebleRippleCount + ripplePhase) * rippleAmplitude;
        coreRadius += rippleOffset;
      }
      
      let peakExtensionOffset = 0;
      
      // Active state deformations (audio responsive)
      if (activeStateIntensity > 0.01 && isP5StateActive) {
        // Add very subtle angle shift for natural-sounding speech simulation
        // For CSM speaking visualization, we want small, deliberate movements
        const volumeDrivenAngleShift = smoothedOverallLevel > 0.3 ?
            p.sin(waveTime * waveSpeed * 0.6) * p.TWO_PI * 0.02 * p.map(smoothedOverallLevel, 0.3, 0.9, 0, 1, true) : 0;
        
        let activeAngle = (angle + activeNoiseAngularOffset + volumeDrivenAngleShift) % p.TWO_PI;
        let cosAngleActive = p.cos(activeAngle);
        let sinAngleActive = p.sin(activeAngle);
        
        // Shape noise (core form)
        let shapeNoiseX = p.map(cosAngleActive, -1, 1, 0, currentActiveShapeNoiseScale);
        let shapeNoiseY = p.map(sinAngleActive, -1, 1, 0, currentActiveShapeNoiseScale);
        let shapeNoiseVal = p.noise(shapeNoiseX, shapeNoiseY, activeShapeNoiseTime);
        
        // Texture noise (small details)
        let textureNoiseX = p.map(cosAngleActive, -1, 1, 0, activeTextureNoiseScale);
        let textureNoiseY = p.map(sinAngleActive, -1, 1, 0, activeTextureNoiseScale);
        let textureNoiseVal = p.noise(textureNoiseX, textureNoiseY, activeTextureNoiseTime);
        let textureOffset = p.map(textureNoiseVal, 0, 1, -currentActiveTextureIntensity, currentActiveTextureIntensity);
        
        // Enhanced waviness response to volume
        // Scale waviness noise by volume and frequency spread for more dramatic effects
        let enhancedWavinessScale = currentWavinessNoiseScale * freqSpreadWaviness;
        let wavinessNoiseX = p.map(cosAngleActive, -1, 1, 0, enhancedWavinessScale);
        let wavinessNoiseY = p.map(sinAngleActive, -1, 1, 0, enhancedWavinessScale);
        
        // Add a frequency component to waviness noise time for more variation
        const freqTimeModifier = p.map(frequencySpread, 0, 1, 0, 0.5, true) * activeWavinessNoiseTime;
        let wavinessNoiseVal = p.noise(wavinessNoiseX, wavinessNoiseY, activeWavinessNoiseTime + freqTimeModifier);
        
        // Amplify waviness based on volume
        let amplifiedWavinessInfluence = currentWavinessInfluence;
        if (smoothedOverallLevel > 0.2) {
          // Dramatically increase waviness with volume
          amplifiedWavinessInfluence = p.lerp(
            currentWavinessInfluence,
            currentWavinessInfluence * volumeWavinessBoost * 1.5,
            p.map(smoothedOverallLevel, 0.2, 0.8, 0, 1, true)
          );
        }
        
        let wavinessOffset = p.map(wavinessNoiseVal, 0, 1, -1.0, 1.0) * amplifiedWavinessInfluence;
        
        // Add gentle, speech-like subtle mouth movements for CSM visualization
        // For elderly users, these patterns are slowed down and made more predictable
        if (smoothedOverallLevel > 0.3) {
          // Much gentler wave pattern with reduced angle influence for predictability
          const wavePhase = waveTime * waveSpeed * 0.6 + angle * 1.5; // Slower, less angular variation
          
          // Very small amplitude changes for subtle movement cues
          const volumeWave = Math.sin(wavePhase) * waveAmplitude * 0.6 * currentBaseRadius *
            p.map(smoothedOverallLevel, 0.3, 0.8, 0, 1, true);
            
          wavinessOffset += volumeWave;
        }
        
        // Combine all noise effects
        let combinedActiveNoiseShape = p.map(shapeNoiseVal, 0, 1, 0, 1) + textureOffset + wavinessOffset;
        let peakMagnitude = baseRadius * p.max(0, combinedActiveNoiseShape) * p.max(0, activePeakMultiplier - 1.0);
        peakExtensionOffset = peakMagnitude * activeStateIntensity;
      }
      
      // Calculate final radius and constrain within limits
      let totalRadius = coreRadius + peakExtensionOffset;
      const minRadiusClamp = baseRadius * 0.2 * (1 - maxInhaleFactor);
      const maxCoreDeformation = baseRadius * (1 + basePassiveDeformationAmount + maxPassiveDeformationBoost + breathingAmount + maxInhaleFactor);
      const maxPeak = baseRadius * maxPeakExtensionFactor;
      
      // Allow slightly more deformation at higher volumes
      const volumeDeformationFactor = 1.0 + smoothedOverallLevel * 0.3;
      const maxRadiusClamp = (maxCoreDeformation + maxPeak * 1.2) * volumeDeformationFactor;
      
      totalRadius = p.constrain(totalRadius, minRadiusClamp, maxRadiusClamp);
      
      // Set vertex position
      let x = totalRadius * p.cos(angle);
      let y = totalRadius * p.sin(angle);
      vertices[i].set(x, y);
    }
  };

  // --- Internal Texture Rendering ---
  const drawInternalTexture = () => {
    if (internalTextureAlpha <= 1) return;
    
    p.push();
    p.noFill();
    const textureColor = p.color(currentHue, baseSaturation * 0.5, baseBrightness * 1.1, internalTextureAlpha);
    p.stroke(textureColor);
    p.strokeWeight(0.75);
    
    const steps = 10;
    const maxOffset = baseRadius * 0.15;
    
    for (let step = 0; step < steps; step++) {
      let ratio = p.map(step, 0, steps, 0.2, 0.8);
      
      p.beginShape();
      for (let i = 0; i < numVertices; i++) {
        let angle = p.map(i, 0, numVertices, 0, p.TWO_PI);
        let cosA = p.cos(angle);
        let sinA = p.sin(angle);
        
        let noiseVal1 = p.noise(cosA * internalTextureScale + 10, sinA * internalTextureScale + 20, internalTextureTime + step * 0.1);
        let noiseVal2 = p.noise(cosA * internalTextureComplexityScale + 30, sinA * internalTextureComplexityScale + 40, internalTextureTime * 0.5 + step * 0.05);
        
        let offset = p.map(noiseVal1 + noiseVal2, 0, 2, -maxOffset, maxOffset);
        let r = baseRadius * ratio + offset;
        r = p.max(baseRadius * 0.1, r);
        
        p.vertex(r * cosA, r * sinA);
      }
      p.endShape(p.CLOSE);
    }
    
    p.pop();
  };

  // --- Blob Rendering ---
  const drawBlob = () => {
    // Base parameters for blob layers
    const baseLayers = 8;
    const maxLayersBoost = 10;
    const baseAlphaStep = 2;
    const maxAlphaStepBoost = 6;
    
    // Make edge sharpness and layers more reactive to volume
    // Combine edgeSharpness with volume for more dynamic border
    const volumeReactivity = p.map(smoothedOverallLevel, 0.1, 0.8, 0, 1, true);
    const volumeInfluencedEdgeSharpness = p.lerp(edgeSharpness, 1.0, volumeReactivity * 0.8);
    
    // Add pulsing effect to layer count based on audio
    const layerPulse = p.map(smoothedOverallLevel, 0, 0.8, 0, maxLayersBoost * 1.5, true);
    
    // Determine number of layers based on combined factors
    let layers = p.floor(p.lerp(baseLayers, baseLayers + layerPulse, volumeInfluencedEdgeSharpness));
    
    // Make alpha step more dramatic with volume for sharper edge contrast
    let alphaStep = p.lerp(
      baseAlphaStep,
      baseAlphaStep + maxAlphaStepBoost * (1 + volumeReactivity),
      volumeInfluencedEdgeSharpness
    );
    
    // Make radius step smaller with higher volume for more defined edge
    let radiusStepRatio = p.lerp(0.04, 0.01 * (1 + volumeReactivity), volumeInfluencedEdgeSharpness);
    
    // Ensure minimum layers for visual quality
    layers = p.max(4, layers);
    
    // Add gentle outer glow effect for speaking indication (softer, always present but subtle)
    // For elderly users, a consistent, gentle visual cue is better than dramatic changes
    {
      p.noFill();
      // Gentle pulsing glow that's always somewhat visible but enhances during speech
      const baseGlowIntensity = 5; // Always visible minimum
      const maxAdditionalGlow = 15; // Limited maximum for calm effect
      const glowIntensity = baseGlowIntensity + p.map(smoothedOverallLevel, 0.1, 0.7, 0, maxAdditionalGlow, true);
      
      // Soft, calming color with limited saturation for comfortable viewing
      const glowColor = p.color(currentHue, 50, 98, glowIntensity);
      p.stroke(glowColor);
      
      // Consistent, thin stroke for elegant appearance
      const baseStrokeWeight = 1.2;
      const maxAdditionalWeight = 1.0;
      p.strokeWeight(baseStrokeWeight + p.map(smoothedOverallLevel, 0.1, 0.7, 0, maxAdditionalWeight, true));
      
      // Very subtle size variation - barely noticeable but provides gentle feedback
      const glowSize = 1.01 + (smoothedOverallLevel * 0.03);
      p.beginShape();
      p.curveVertex(vertices[numVertices - 1].x * glowSize, vertices[numVertices - 1].y * glowSize);
      for (let i = 0; i < numVertices; i++) {
        p.curveVertex(vertices[i].x * glowSize, vertices[i].y * glowSize);
      }
      p.curveVertex(vertices[0].x * glowSize, vertices[0].y * glowSize);
      p.curveVertex(vertices[1].x * glowSize, vertices[1].y * glowSize);
      p.endShape(p.CLOSE);
    }
    
    // Draw standard blob layers
    for (let layer = 0; layer < layers; layer++) {
      let layerRadiusRatio = 1.0 - (layer * radiusStepRatio);
      let layerAlpha = p.alpha(currentEdgeColor) - layer * alphaStep;
      
      // Make the outer layers more influenced by volume
      const layerVolumeInfluence = layer < 2 ? volumeReactivity * 0.7 : 0;
      let colorMix = p.map(layer, 0, layers - 1, 0, 1);
      
      // Adjust color mix for outer layers based on volume
      if (layer < 3) {
        colorMix = p.lerp(colorMix, 1.0, layerVolumeInfluence);
      }
      
      let layerColor = p.lerpColor(currentCenterColor, currentEdgeColor, colorMix);
      layerColor.setAlpha(p.max(0, layerAlpha));
      
      p.noStroke();
      p.fill(layerColor);
      p.beginShape();
      p.curveVertex(vertices[numVertices - 1].x * layerRadiusRatio, vertices[numVertices - 1].y * layerRadiusRatio);
      for (let i = 0; i < numVertices; i++) {
        p.curveVertex(vertices[i].x * layerRadiusRatio, vertices[i].y * layerRadiusRatio);
      }
      p.curveVertex(vertices[0].x * layerRadiusRatio, vertices[0].y * layerRadiusRatio);
      p.curveVertex(vertices[1].x * layerRadiusRatio, vertices[1].y * layerRadiusRatio);
      p.endShape(p.CLOSE);
    }
  };

  // --- Pause Effect Rendering ---
  const drawPauseEffect = () => {
    if(pauseEffectIntensity <= 0.01) return;
    
    let rippleRadius = baseRadius * (1 + currentPassiveDeformationAmount + breathingAmount) * 1.1 * (1.0 - pauseEffectIntensity);
    let rippleAlpha = pauseEffectIntensity * 50;
    let rippleWeight = p.lerp(0.5, 3, pauseEffectIntensity);
    
    let currentSaturationValue = p.constrain(baseSaturation + saturationBoost, 60, 95);
    let currentBrightnessValue = p.constrain(baseBrightness + brightnessBoost, 92, 100);
    
    p.push();
    p.noFill();
    p.strokeWeight(rippleWeight);
    let rippleColor = p.color(currentHue, currentSaturationValue * 0.8, currentBrightnessValue, rippleAlpha);
    p.stroke(rippleColor);
    p.ellipse(0, 0, rippleRadius * 2, rippleRadius * 2);
    p.pop();
  };

  // --- External Control & Cleanup ---
  p.activate = async () => {
    console.log("p5: Received activation request.");
    silenceFrames = 0;
    isBreathing = false;
    pauseEnded = false;
    pauseEffectTimer = 0;
    pauseEffectIntensity = 0;
    inhaleAmount = 0;
    
    const success = await setupAudio();
    if (success) {
      isP5StateActive = true;
    } else {
      isP5StateActive = false;
    }
    return success;
  };
  
  p.deactivate = () => {
    console.log("p5: Received deactivation request.");
    isP5StateActive = false;
    isBreathing = false;
    pauseEnded = false;
    pauseEffectTimer = 0;
    pauseEffectIntensity = 0;
    inhaleAmount = 0;
    stopAudioProcessing();
  };
  
  p.cleanup = () => {
    console.log("p5: Cleaning up sketch and audio.");
    stopAudioProcessing();
    
    if (audioContext && audioContext.state !=='closed') {
      audioContext.close()
        .then(() => console.log("AudioContext closed."))
        .catch(e => console.error("Error closing context on cleanup:", e));
      audioContext = null;
    }
    
    p.remove();
    console.log("p5 cleanup complete.");
  };
  
  p.windowResized = () => {
    const container = document.getElementById('canvas-container');
    if (!container) return;
    
    p.resizeCanvas(container.offsetWidth, container.offsetHeight);
    baseRadius = p.min(p.width, p.height) / 5.0;
    console.log(`Resized, new baseRadius: ${baseRadius}`);
  };
};

// --- React Component Definition ---
const AudioReactiveBlob = () => {
  const canvasContainerRef = useRef(null);
  const p5InstanceRef = useRef(null);
  const [isUserActiveState, setIsUserActiveState] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [sensitivity, setSensitivity] = useState(50);
  const [size, setSize] = useState(50);

  useEffect(() => {
    let p5instance;
    let mounted = true;
    
    // Initialize p5.js with a slight delay to ensure DOM is fully ready
    const timer = setTimeout(() => {
      if (!mounted) return;
      
      import('p5').then(p5 => {
        if (!mounted) return;
        
        if (canvasContainerRef.current && !p5InstanceRef.current) {
          try {
            p5instance = new p5.default(sketch, canvasContainerRef.current);
            p5InstanceRef.current = p5instance;
            console.log("React: p5 instance created successfully");
            
            // Force a redraw after a short delay to ensure everything renders properly
            setTimeout(() => {
              if (mounted) {
                setIsLoading(false); // Hide loading indicator
                if (p5InstanceRef.current && p5InstanceRef.current.redraw) {
                  p5InstanceRef.current.redraw();
                  console.log("Forced redraw after initialization");
                }
              }
            }, 200);
          } catch (err) {
            console.error("Error creating p5 instance:", err);
            setErrorMessage("Failed to initialize visualization");
          }
        }
      }).catch(error => {
        console.error("Failed to load p5.js:", error);
        if (mounted) {
          setErrorMessage("Failed to load visualization component.");
        }
      });
    }, 50); // Short delay to ensure DOM is ready
    
    return () => {
      mounted = false;
      clearTimeout(timer);
      if (p5InstanceRef.current) {
        console.log("React: Cleaning up p5 instance.");
        try {
          p5InstanceRef.current.cleanup();
        } catch (e) {
          console.error("Error during cleanup:", e);
        }
        p5InstanceRef.current = null;
      }
    };
  }, []);

  const handleCanvasClick = useCallback(async () => {
    if (!p5InstanceRef.current) return;
    
    setErrorMessage('');
    
    if (isUserActiveState) {
      console.log("React: User clicked to Deactivate.");
      p5InstanceRef.current.deactivate();
      setIsUserActiveState(false);
    } else {
      console.log("React: User clicked to Activate.");
      try {
        const success = await p5InstanceRef.current.activate();
        if (success) {
          console.log("React: Activation successful.");
          setIsUserActiveState(true);
        } else {
          console.log("React: Activation failed (likely permissions).");
          setErrorMessage("Could not enable microphone. Please check browser permissions.");
          setIsUserActiveState(false);
        }
      } catch (error) {
        console.error("React: Error during activation:", error);
        setErrorMessage("An unexpected error occurred while activating the microphone.");
        setIsUserActiveState(false);
      }
    }
  }, [isUserActiveState]);

  const toggleSettings = (e) => {
    e.stopPropagation(); // Prevent canvas click
    setShowSettings(!showSettings);
    setShowHelp(false);
  };

  const toggleHelp = (e) => {
    e.stopPropagation(); // Prevent canvas click
    setShowHelp(!showHelp);
    setShowSettings(false);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        bgcolor: 'background.default',
        p: 2,
      }}>
        <Typography variant="h5" component="h1" gutterBottom sx={{ color: 'text.primary', textAlign: 'center' }}>
          Voice Visualization
        </Typography>
        
        <Paper
          elevation={3}
          sx={{
            width: 'clamp(300px, 90vw, 800px)',
            p: 3,
            mb: 2,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Box sx={{ 
            display: 'flex', 
            width: '100%', 
            justifyContent: 'space-between', 
            mb: 2,
            alignItems: 'center'
          }}>
            <Button
              variant={isUserActiveState ? "contained" : "outlined"}
              color={isUserActiveState ? "primary" : "primary"}
              startIcon={<MicIcon />}
              onClick={handleCanvasClick}
              size="large"
              sx={{ 
                fontSize: '1.1rem',
                py: 1.5,
                px: 3,
                borderRadius: 2
              }}
            >
              {isUserActiveState ? "Microphone On" : "Start Microphone"}
            </Button>
            
            <Box>
              <IconButton 
                onClick={toggleSettings}
                color="primary"
                size="large"
                aria-label="Settings"
                sx={{ ml: 1 }}
              >
                <SettingsIcon fontSize="large" />
              </IconButton>
              
              <IconButton 
                onClick={toggleHelp}
                color="primary"
                size="large"
                aria-label="Help"
                sx={{ ml: 1 }}
              >
                <HelpOutlineIcon fontSize="large" />
              </IconButton>
            </Box>
          </Box>
          
          {showSettings && (
            <Paper 
              elevation={2}
              sx={{ 
                width: '100%', 
                p: 2, 
                mb: 2,
                borderRadius: 2
              }}
            >
              <Typography variant="h6" gutterBottom>
                Settings
              </Typography>
              
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <VolumeUpIcon sx={{ mr: 2 }} />
                  <Typography id="sensitivity-slider" gutterBottom>
                    Audio Sensitivity
                  </Typography>
                </Box>
                <Slider
                  value={sensitivity}
                  onChange={(e, newValue) => setSensitivity(newValue)}
                  aria-labelledby="sensitivity-slider"
                  valueLabelDisplay="auto"
                  step={10}
                  marks
                  min={0}
                  max={100}
                />
              </Box>
              
              <Box>
                <Typography id="size-slider" gutterBottom>
                  Visualization Size
                </Typography>
                <Slider
                  value={size}
                  onChange={(e, newValue) => setSize(newValue)}
                  aria-labelledby="size-slider"
                  valueLabelDisplay="auto"
                  step={10}
                  marks
                  min={0}
                  max={100}
                />
              </Box>
            </Paper>
          )}
          
          {showHelp && (
            <Paper 
              elevation={2}
              sx={{ 
                width: '100%', 
                p: 2, 
                mb: 2,
                borderRadius: 2
              }}
            >
              <Typography variant="h6" gutterBottom>
                How to Use
              </Typography>
              
              <Typography paragraph>
                1. Click the "Start Microphone" button to begin voice visualization.
              </Typography>
              
              <Typography paragraph>
                2. Speak into your microphone and watch the blob react to your voice.
              </Typography>
              
              <Typography paragraph>
                3. Use the Settings panel to adjust sensitivity and size if needed.
              </Typography>
              
              <Typography paragraph>
                4. Click the microphone button again to stop recording.
              </Typography>
            </Paper>
          )}
          
          <Paper
            id="canvas-container"
            ref={canvasContainerRef}
            elevation={2}
            onClick={handleCanvasClick}
            sx={{
              width: '100%',
              height: 'clamp(300px, 50vh, 500px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              position: 'relative',
              overflow: 'hidden',
              borderRadius: 4,
              bgcolor: theme.palette.background.default
            }}
          >
            {isLoading && (
              <Box sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 5,
                bgcolor: theme.palette.background.default
              }}>
                <Typography variant="body1" sx={{ color: grey[500] }}>
                  Loading Visualizer...
                </Typography>
              </Box>
            )}
            
            {!isUserActiveState && !isLoading && (
              <Box sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 4,
                bgcolor: 'rgba(0,0,0,0.05)',
                borderRadius: 4,
              }}>
                <Typography variant="body1" sx={{ color: theme.palette.primary.main, fontWeight: 500 }}>
                  Click to start microphone
                </Typography>
              </Box>
            )}
            
            {errorMessage && (
              <Box sx={{
                position: 'absolute',
                bottom: 16,
                left: 16,
                right: 16,
                color: 'error.main',
                textAlign: 'center',
                backgroundColor: 'rgba(255, 235, 238, 0.9)',
                p: 2,
                borderRadius: 2,
                fontSize: '1rem',
                zIndex: 10
              }}>
                {errorMessage}
              </Box>
            )}
          </Paper>
          
          <Typography variant="body2" sx={{ mt: 2, color: grey[600], textAlign: 'center' }}>
            This visualization responds to your voice. Speak clearly for best results.
          </Typography>
        </Paper>
      </Box>
    </ThemeProvider>
  );
};

export default AudioReactiveBlob;
