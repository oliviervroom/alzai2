import streamlit as st
import numpy as np
import time
from streamlit_javascript import st_javascript

# Set page config
st.set_page_config(
    page_title="Audio Reactive Blob",
    page_icon="🎤",
    layout="centered",
    initial_sidebar_state="collapsed"
)

# Custom CSS for styling
st.markdown("""
<style>
    .stApp {
        background-color: #f8f8f8;
    }
    .blob-container {
        background-color: #ffffff;
        border-radius: 16px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        border: 1px solid #e0e0e0;
        position: relative;
        overflow: hidden;
        width: 100%;
        height: 600px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto;
    }
    .fullscreen-button {
        position: absolute;
        top: 10px;
        right: 10px;
        z-index: 100;
        background-color: rgba(255, 255, 255, 0.7);
        border-radius: 50%;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        border: 1px solid #e0e0e0;
    }
    .fullscreen-icon {
        width: 20px;
        height: 20px;
    }
    .error-message {
        position: absolute;
        bottom: 16px;
        left: 16px;
        right: 16px;
        color: #d32f2f;
        text-align: center;
        background-color: rgba(255, 235, 238, 0.9);
        padding: 8px;
        border-radius: 4px;
        font-size: 0.875rem;
        z-index: 10;
    }
</style>
""", unsafe_allow_html=True)

# JavaScript for audio processing and visualization
js_code = """
function setupAudioReactiveBlob() {
    // Create a container for the p5.js sketch
    const container = document.createElement('div');
    container.id = 'p5-container';
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.position = 'relative';
    
    // Find the blob container and append the p5 container
    const blobContainer = document.querySelector('.blob-container');
    if (blobContainer) {
        blobContainer.innerHTML = '';
        blobContainer.appendChild(container);
    } else {
        console.error('Blob container not found');
        return null;
    }
    
    // Variables to store audio data
    let audioData = {
        overallLevel: 0,
        midLevel: 0,
        trebleLevel: 0,
        frequencySpread: 0,
        pitchProxy: 0.5
    };
    
    // Function to send audio data to Streamlit
    function sendAudioData() {
        if (window.Streamlit) {
            const dataToSend = JSON.stringify(audioData);
            window.Streamlit.setComponentValue(dataToSend);
        }
    }
    
    // Audio setup variables
    let audioContext;
    let analyser;
    let microphone;
    let micStream;
    let frequencyData;
    let audioReady = false;
    let isActive = false;
    const fftSize = 512;
    const audioThreshold = 0.09;
    
    // Setup audio processing
    async function setupAudio() {
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const sampleRate = audioContext.sampleRate;
            const nyquist = sampleRate / 2;
            
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
            isActive = true;
            return true;
        } catch (err) {
            console.error('Audio Setup Error:', err);
            audioReady = false;
            isActive = false;
            
            if (micStream) {
                micStream.getTracks().forEach(track => track.stop());
                micStream = null;
            }
            
            microphone = null;
            analyser = null;
            frequencyData = null;
            
            if (audioContext && audioContext.state !== 'closed') {
                await audioContext.close().catch(e => console.error("Error closing context on failure:", e));
            }
            
            audioContext = null;
            return false;
        }
    }
    
    // Stop audio processing
    function stopAudioProcessing() {
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
        isActive = false;
        
        // Reset audio data
        audioData = {
            overallLevel: 0,
            midLevel: 0,
            trebleLevel: 0,
            frequencySpread: 0,
            pitchProxy: 0.5
        };
        
        sendAudioData();
    }
    
    // Update audio analysis
    function updateAudio() {
        if (!isActive || !audioReady || !analyser || !frequencyData) {
            // Gradually reduce audio levels when inactive
            audioData.overallLevel *= 0.95;
            audioData.midLevel *= 0.95;
            audioData.trebleLevel *= 0.95;
            audioData.frequencySpread *= 0.95;
            
            if (audioData.overallLevel < 0.01) audioData.overallLevel = 0;
            if (audioData.midLevel < 0.01) audioData.midLevel = 0;
            if (audioData.trebleLevel < 0.01) audioData.trebleLevel = 0;
            if (audioData.frequencySpread < 0.01) audioData.frequencySpread = 0;
            
            sendAudioData();
            return;
        }
        
        analyser.getByteFrequencyData(frequencyData);
        
        let oSum = 0, mSum = 0, tSum = 0, activeBinCount = 0;
        const fbc = frequencyData.length;
        
        // Define frequency ranges
        const midEndFreq = 4000;
        const trebleStartFreq = 4000;
        const nyquist = audioContext.sampleRate / 2;
        
        const midEndIndex = Math.min(fbc - 1, Math.ceil(midEndFreq / (nyquist / fbc)));
        const trebleStartIndex = Math.min(fbc - 1, Math.floor(trebleStartFreq / (nyquist / fbc)));
        
        // Pitch detection
        const pitchMinFreq = 80;
        const pitchMaxFreq = 500;
        const binWidth = nyquist / (fftSize / 2);
        const pitchMinIndex = Math.max(1, Math.floor(pitchMinFreq / binWidth));
        const pitchMaxIndex = Math.min(fftSize / 2 - 1, Math.ceil(pitchMaxFreq / binWidth));
        
        let maxAmp = 0;
        let peakIndex = -1;
        
        for (let i = pitchMinIndex; i <= pitchMaxIndex; i++) {
            if (frequencyData[i] > maxAmp) {
                maxAmp = frequencyData[i];
                peakIndex = i;
            }
        }
        
        let targetPitchProxy = 0.5;
        if (peakIndex !== -1 && maxAmp > 15) {
            targetPitchProxy = (peakIndex - pitchMinIndex) / (pitchMaxIndex - pitchMinIndex);
            targetPitchProxy = Math.max(0, Math.min(1, targetPitchProxy));
        }
        
        // Smooth pitch changes
        audioData.pitchProxy = audioData.pitchProxy * 0.94 + targetPitchProxy * 0.06;
        
        // Process frequency data
        for (let i = 0; i < fbc; i++) {
            let l = frequencyData[i];
            oSum += l;
            
            if (i <= midEndIndex) mSum += l;
            else if (i >= trebleStartIndex) tSum += l;
            
            if (l > 10) activeBinCount++;
        }
        
        // Normalize levels
        let nO = fbc > 0 ? oSum / fbc : 0;
        let numMidBins = midEndIndex + 1;
        let numTrebleBins = fbc - trebleStartIndex;
        let nM = numMidBins > 0 ? mSum / numMidBins : 0;
        let nT = numTrebleBins > 0 ? tSum / numTrebleBins : 0;
        
        // Map to 0-1 range
        let normO = Math.min(1, Math.max(0, nO / 160));
        let normM = Math.min(1, Math.max(0, nM / 160));
        let normT = Math.min(1, Math.max(0, nT / 160));
        
        // Smooth audio levels
        const audioLerpFactor = 0.1;
        audioData.overallLevel = audioData.overallLevel * (1 - audioLerpFactor) + normO * audioLerpFactor;
        audioData.midLevel = audioData.midLevel * (1 - audioLerpFactor) + normM * audioLerpFactor;
        audioData.trebleLevel = audioData.trebleLevel * (1 - audioLerpFactor) + normT * audioLerpFactor;
        
        // Calculate frequency spread
        let targetSpread = fbc > 0 ? activeBinCount / fbc : 0;
        audioData.frequencySpread = audioData.frequencySpread * 0.97 + targetSpread * 0.03;
        
        // Send data to Streamlit
        sendAudioData();
    }
    
    // Initialize p5.js sketch
    let sketch = function(p) {
        // --- Blob Geometry & Core Properties ---
        let baseRadius = 100;
        const numVertices = 140;
        let vertices = [];
        
        // --- Core "Breathing" & Pause Effects ---
        let breathingTime = Math.random() * 500;
        const breathingSpeed = 0.0008;
        const breathingAmount = 0.025;
        let isBreathing = false;
        
        // --- Noise Parameters ---
        // Passive - Gentle, slow-moving baseline effects
        let passiveNoiseTime = Math.random() * 1000;
        const basePassiveNoiseSpeed = 0.0004;
        const passiveNoisePosScale = 0.7;
        let currentPassiveDeformationAmount = 0.04;
        const basePassiveDeformationAmount = 0.04;
        
        // Active - Shape (core form) - very subtle, slow changes
        let activeShapeNoiseTime = Math.random() * 2000;
        const baseActiveShapeNoiseSpeed = 0.0006;
        const baseActiveShapeNoiseScale = 0.9;
        let currentActiveShapeNoiseScale = baseActiveShapeNoiseScale;
        
        // Active - Texture (fine details) - very subtle
        let activeTextureNoiseTime = Math.random() * 3000;
        const baseActiveTextureNoiseSpeed = 0.0010;
        const activeTextureNoiseScale = 8.0;
        let currentActiveTextureIntensity = 0.04;
        const baseTextureIntensity = 0.02;
        
        // Active - Waviness (speaking motion) - gentle, controlled response
        let activeWavinessNoiseTime = Math.random() * 4000;
        const baseActiveWavinessNoiseSpeed = 0.0006;
        let currentWavinessNoiseScale = 3.5;
        const baseWavinessNoiseScale = 3.5;
        let currentWavinessInfluence = 0.0;
        
        // Active - Angular Offset
        let activeNoiseAngularOffset = Math.random() * p.TWO_PI;
        const baseActiveNoiseOffsetSpeed = 0.0003;
        
        // Peak extension control - gentle, smooth response
        let activePeakMultiplier = 1.0;
        
        // --- Internal Complexity Texture ---
        let internalTextureTime = Math.random() * 6000;
        const internalTextureSpeed = 0.0003;
        const internalTextureScale = 0.5;
        const internalTextureComplexityScale = 2.5;
        let internalTextureAlpha = 0;
        
        // --- Edge Sharpness / Certainty Proxy ---
        let edgeSharpness = 1.0;
        
        // --- Color Properties ---
        const baseHue = 210;
        let currentHue = baseHue;
        const baseSaturation = 60;
        const baseBrightness = 95;
        let currentCenterColor;
        let currentEdgeColor;
        
        p.setup = function() {
            const canvas = p.createCanvas(container.offsetWidth, container.offsetHeight);
            canvas.parent('p5-container');
            
            p.colorMode(p.HSB, 360, 100, 100, 100);
            p.angleMode(p.RADIANS);
            p.frameRate(60);
            
            baseRadius = p.min(p.width, p.height) / 5.0;
            
            // Initialize vertices
            for (let i = 0; i < numVertices; i++) {
                vertices.push(p.createVector(0, 0));
            }
            
            // Initialize core variables to their base values
            currentActiveShapeNoiseScale = baseActiveShapeNoiseScale;
            currentPassiveDeformationAmount = basePassiveDeformationAmount;
            currentWavinessNoiseScale = baseWavinessNoiseScale;
            
            // Initial calculations
            updateColor();
            calculateBlobShape();
            
            // Force a complete redraw once on setup
            p.clear();
            p.background(248, 248, 248);
        };
        
        p.draw = function() {
            let timeDelta = p.deltaTime / (1000 / 60);
            
            // Clear the entire canvas with background color to prevent artifacts
            p.clear();
            p.background(248, 248, 248);
            
            // Ensure everything is perfectly centered
            p.push();
            const centerX = Math.floor(p.width / 2);
            const centerY = Math.floor(p.height / 2);
            p.translate(centerX, centerY);
            
            updateStateAndMotion(timeDelta);
            updateColor();
            calculateBlobShape();
            drawInternalTexture();
            drawBlob();
            drawMicrophoneIcon();
            
            p.pop();
        };
        
        // --- Draw Microphone Icon ---
        function drawMicrophoneIcon() {
            // Use the same scaling factor for all elements to keep them in sync
            const smoothedLevel = Math.max(0, audioData.overallLevel);
            const peakMult = Math.max(0, activePeakMultiplier);
            const scaleFactor = 1 + smoothedLevel * peakMult * 0.6;
            
            // Draw scaling circle around microphone
            const minCircleRadius = Math.max(0.1, baseRadius * 0.75);
            const maxCircleRadius = Math.max(minCircleRadius + 0.1, baseRadius * 0.92);
            const safeLevel = p.constrain(smoothedLevel, 0, 1);
            const circleRadius = p.lerp(minCircleRadius, maxCircleRadius, safeLevel);
            
            p.push();
            p.noFill();
            p.stroke(255);
            p.strokeWeight(2);
            p.circle(0, 0, circleRadius * 2);
            p.pop();
            
            // Draw a simple, iconic podcast microphone
            p.push();
            p.fill(255);
            p.noStroke();
            
            // Base size for microphone that scales with audio
            const baseMicSize = Math.max(0.1, baseRadius * 0.28);
            const safeScaleFactor = Math.max(0.1, scaleFactor);
            const currentMicSize = baseMicSize * safeScaleFactor;
            
            // Main mic head - simple rounded rectangle
            p.rectMode(p.CENTER);
            const cornerRadius = Math.max(0.001, currentMicSize * 0.2);
            p.rect(0, -currentMicSize * 0.3, currentMicSize * 0.55, currentMicSize * 0.8, cornerRadius);
            
            // Simple mic stand
            p.rect(0, currentMicSize * 0.5, Math.max(0.001, currentMicSize * 0.12), Math.max(0.001, currentMicSize * 1.0));
            
            // Base
            p.ellipse(0, currentMicSize * 1.0, Math.max(0.001, currentMicSize * 0.7), Math.max(0.001, currentMicSize * 0.18));
            
            // Mic grille pattern - subtle circles
            p.fill(0, 0, 0, 30);
            
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
        }
        
        // --- Update State & Motion ---
        function updateStateAndMotion(timeDelta) {
            // Breathing effect when no audio
            if (audioData.overallLevel < 0.03) {
                isBreathing = true;
                breathingTime += breathingSpeed * timeDelta;
            } else {
                isBreathing = false;
            }
            
            // Update noise times based on audio levels
            const speedMultiplier = 1.0 + audioData.overallLevel * 1.5;
            
            passiveNoiseTime += basePassiveNoiseSpeed * speedMultiplier * timeDelta;
            activeShapeNoiseTime += baseActiveShapeNoiseSpeed * speedMultiplier * timeDelta;
            activeTextureNoiseTime += baseActiveTextureNoiseSpeed * speedMultiplier * timeDelta;
            activeWavinessNoiseTime += baseActiveWavinessNoiseSpeed * speedMultiplier * timeDelta;
            internalTextureTime += internalTextureSpeed * timeDelta;
            activeNoiseAngularOffset += baseActiveNoiseOffsetSpeed * speedMultiplier * timeDelta;
            activeNoiseAngularOffset %= p.TWO_PI;
            
            // Update peak multiplier based on audio level
            let targetMultiplier = 1.0;
            if (audioData.overallLevel > audioThreshold) {
                targetMultiplier = 1.0 + audioData.overallLevel * 0.2;
            }
            activePeakMultiplier = p.lerp(activePeakMultiplier, targetMultiplier, 0.08 * timeDelta);
            
            // Update waviness influence based on audio level
            let targetWavinessInfluence = 0;
            if (audioData.overallLevel > audioThreshold) {
                targetWavinessInfluence = audioData.overallLevel * 0.15;
            }
            currentWavinessInfluence = p.lerp(currentWavinessInfluence, targetWavinessInfluence, 0.012);
            
            // Update waviness scale based on pitch
            let targetWavinessScale = baseWavinessNoiseScale;
            if (audioData.overallLevel > audioThreshold) {
                targetWavinessScale = baseWavinessNoiseScale * (1 + (audioData.pitchProxy - 0.5) * 0.5);
                targetWavinessScale = p.max(1.0, targetWavinessScale);
            }
            currentWavinessNoiseScale = p.lerp(currentWavinessNoiseScale, targetWavinessScale, 0.01);
            
            // Update texture intensity based on frequency spread
            let targetTextureIntensity = baseTextureIntensity;
            if (audioData.overallLevel > audioThreshold) {
                targetTextureIntensity = baseTextureIntensity + audioData.frequencySpread * 0.06;
            }
            currentActiveTextureIntensity = p.lerp(currentActiveTextureIntensity, targetTextureIntensity, 0.012);
            
            // Update shape scale based on frequency spread
            let targetShapeScale = baseActiveShapeNoiseScale;
            if (audioData.overallLevel > audioThreshold) {
                targetShapeScale = baseActiveShapeNoiseScale * (1 + (audioData.frequencySpread - 0.5) * 0.16);
                targetShapeScale = p.max(0.5, targetShapeScale);
            }
            currentActiveShapeNoiseScale = p.lerp(currentActiveShapeNoiseScale, targetShapeScale, 0.008);
            
            // Update passive deformation amount based on mid-level audio
            let targetPassiveDeformation = basePassiveDeformationAmount;
            if (audioData.midLevel > audioThreshold * 1.2) {
                targetPassiveDeformation = basePassiveDeformationAmount + audioData.midLevel * 0.02;
            }
            currentPassiveDeformationAmount = p.lerp(currentPassiveDeformationAmount, targetPassiveDeformation, 0.008);
            
            // Update edge sharpness based on frequency spread
            let targetEdgeSharpness = 1.0;
            if (audioData.overallLevel > audioThreshold) {
                targetEdgeSharpness = 1.0 - audioData.frequencySpread * 0.7;
            }
            edgeSharpness = p.lerp(edgeSharpness, targetEdgeSharpness, 0.015);
            
            // Update internal texture alpha based on overall level
            let targetInternalAlpha = 0;
            if (audioData.overallLevel > audioThreshold + 0.05) {
                targetInternalAlpha = audioData.overallLevel * 18;
            }
            internalTextureAlpha = p.lerp(internalTextureAlpha, targetInternalAlpha, 0.015);
        }
        
        // --- Update Color ---
        function updateColor() {
            let targetHue = baseHue;
            if (audioData.overallLevel > audioThreshold) {
                let spreadShift = (audioData.frequencySpread - 0.5) * 10;
                let pitchShift = (audioData.pitchProxy - 0.5) * 15;
                targetHue = (baseHue + spreadShift + pitchShift + 360) % 360;
            }
            
            let hueDiff = targetHue - currentHue;
            if (Math.abs(hueDiff) > 180) {
                if (hueDiff > 0) currentHue += 360;
                else currentHue -= 360;
            }
            
            currentHue = p.lerp(currentHue, targetHue, 0.01);
            currentHue = (currentHue + 360) % 360;
            
            let saturationBoost = 0;
            let brightnessBoost = 0;
            
            if (audioData.overallLevel > audioThreshold) {
                saturationBoost = audioData.overallLevel * 10;
                brightnessBoost = audioData.overallLevel * 2;
            }
            
            let currentSaturationValue = p.constrain(baseSaturation + saturationBoost, 60, 95);
            let currentBrightnessValue = p.constrain(baseBrightness + brightnessBoost, 92, 100);
            
            currentCenterColor = p.color(currentHue, currentSaturationValue * 0.9, currentBrightnessValue * 0.98, 100);
            currentEdgeColor = p.color(currentHue, currentSaturationValue, currentBrightnessValue, 95);
        }
        
        // --- Blob Shape Calculation ---
        function calculateBlobShape() {
            let currentBaseRadius = baseRadius;
            let coreMod = 0;
            
            // Breathing effect
            if (isBreathing) {
                coreMod += p.sin(breathingTime * p.TWO_PI) * breathingAmount;
            }
            
            currentBaseRadius *= (1 + coreMod);
            
            // Create vertices for the blob shape
            for (let i = 0; i < numVertices; i++) {
                let angle = p.map(i, 0, numVertices, 0, p.TWO_PI);
                let cosAnglePassive = p.cos(angle);
                let sinAnglePassive = p.sin(angle);
                
                // Base passive noise (circular stability)
                let passiveNoiseX = p.map(cosAnglePassive, -1, 1, 0, passiveNoisePosScale);
                let passiveNoiseY = p.map(sinAnglePassive, -1, 1, 0, passiveNoisePosScale);
                let passiveNoiseVal = p.noise(passiveNoiseX, passiveNoiseY, passiveNoiseTime);
                
                // Apply volume-based modulation to passive noise
                let volumeModulatedAmount = currentPassiveDeformationAmount;
                if (audioData.overallLevel > 0.3) {
                    volumeModulatedAmount = p.lerp(
                        currentPassiveDeformationAmount,
                        currentPassiveDeformationAmount * (1 + audioData.overallLevel * 1.2),
                        p.map(audioData.overallLevel, 0.3, 0.9, 0, 1, true)
                    );
                }
                
                let passiveOffset = p.map(passiveNoiseVal, 0, 1, -volumeModulatedAmount, volumeModulatedAmount) * currentBaseRadius;
                let coreRadius = currentBaseRadius + passiveOffset;
                
                // Add very subtle high-frequency ripples for speech articulation cues
                if (audioData.trebleLevel > 0.25) {
                    const trebleRippleCount = Math.floor(2 + audioData.trebleLevel * 6);
                    const rippleAmplitude = currentBaseRadius * 0.004 * audioData.trebleLevel * (1 + audioData.trebleLevel * 0.6);
                    const ripplePhase = p.millis() * 0.0005 * (0.4 + audioData.overallLevel * 1.2) * 1.2;
                    const rippleOffset = Math.sin(angle * trebleRippleCount + ripplePhase) * rippleAmplitude;
                    coreRadius += rippleOffset;
                }
                
                let peakExtensionOffset = 0;
                
                // Active state deformations (audio responsive)
                if (audioData.overallLevel > 0.01) {
                    // Add very subtle angle shift for natural-sounding speech simulation
                    const volumeDrivenAngleShift = audioData.overallLevel > 0.3 ?
                        p.sin(p.millis() * 0.0005 * (0.4 + audioData.overallLevel * 1.2) * 0.6) * p.TWO_PI * 0.02 * p.map(audioData.overallLevel, 0.3, 0.9, 0, 1, true) : 0;
                    
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
                    let enhancedWavinessScale = currentWavinessNoiseScale * (1 + audioData.frequencySpread * 0.4);
                    let wavinessNoiseX = p.map(cosAngleActive, -1, 1, 0, enhancedWavinessScale);
                    let wavinessNoiseY = p.map(sinAngleActive, -1, 1, 0, enhancedWavinessScale);
                    
                    // Add a frequency component to waviness noise time for more variation
                    const freqTimeModifier = p.map(audioData.frequencySpread, 0, 1, 0, 0.5, true) * activeWavinessNoiseTime;
                    let wavinessNoiseVal = p.noise(wavinessNoiseX, wavinessNoiseY, activeWavinessNoiseTime + freqTimeModifier);
                    
                    // Amplify waviness based on volume
                    let amplifiedWavinessInfluence = currentWavinessInfluence;
                    if (audioData.overallLevel > 0.2) {
                        amplifiedWavinessInfluence = p.lerp(
                            currentWavinessInfluence,
                            currentWavinessInfluence * (1 + audioData.overallLevel * 1.5),
                            p.map(audioData.overallLevel, 0.2, 0.8, 0, 1, true)
                        );
                    }
                    
                    let wavinessOffset = p.map(wavinessNoiseVal, 0, 1, -1.0, 1.0) * amplifiedWavinessInfluence;
                    
                    // Add gentle, speech-like subtle mouth movements
                    if (audioData.overallLevel > 0.3) {
                        const wavePhase = p.millis() * 0.0005 * (0.4 + audioData.overallLevel * 1.2) * 0.6 + angle * 1.5;
                        const volumeWave = Math.sin(wavePhase) * 0.005 * 0.6 * currentBaseRadius *
                            p.map(audioData.overallLevel, 0.3, 0.8, 0, 1, true);
                        wavinessOffset += volumeWave;
                    }
                    
                    // Combine all noise effects
                    let combinedActiveNoiseShape = p.map(shapeNoiseVal, 0, 1, 0, 1) + textureOffset + wavinessOffset;
                    let peakMagnitude = baseRadius * p.max(0, combinedActiveNoiseShape) * p.max(0, activePeakMultiplier - 1.0);
                    peakExtensionOffset = peakMagnitude;
                }
                
                // Calculate final radius and constrain within limits
                let totalRadius = coreRadius + peakExtensionOffset;
                const minRadiusClamp = baseRadius * 0.2;
                const maxCoreDeformation = baseRadius * (1 + basePassiveDeformationAmount + 0.02 + breathingAmount);
                const maxPeak = baseRadius * 1.1;
                
                // Allow slightly more deformation at higher volumes
                const volumeDeformationFactor = 1.0 + audioData.overallLevel * 0.3;
                const maxRadiusClamp = (maxCoreDeformation + maxPeak * 1.2) * volumeDeformationFactor;
                
                totalRadius = p.constrain(totalRadius, minRadiusClamp, maxRadiusClamp);
                
                // Set vertex position
                let x = totalRadius * p.cos(angle);
                let y = totalRadius * p.sin(angle);
                vertices[i].set(x, y);
            }
        }
        
        // --- Internal Texture Rendering ---
        function drawInternalTexture() {
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
        }
        
        // --- Blob Rendering ---
        function drawBlob() {
            // Base parameters for blob layers
            const baseLayers = 8;
            const maxLayersBoost = 10;
            const baseAlphaStep = 2;
            const maxAlphaStepBoost = 6;
            
            // Make edge sharpness and layers more reactive to volume
            const volumeReactivity = p.map(audioData.overallLevel, 0.1, 0.8, 0, 1, true);
            const volumeInfluencedEdgeSharpness = p.lerp(edgeSharpness, 1.0, volumeReactivity * 0.8);
            
            // Add pulsing effect to layer count based on audio
            const layerPulse = p.map(audioData.overallLevel, 0, 0.8, 0, maxLayersBoost * 1.5, true);
            
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
            
            // Add gentle outer glow effect for speaking indication
            {
                p.noFill();
                const baseGlowIntensity = 5;
                const maxAdditionalGlow = 15;
                const glowIntensity = baseGlowIntensity + p.map(audioData.overallLevel, 0.1, 0.7, 0, maxAdditionalGlow, true);
                
                const glowColor = p.color(currentHue, 50, 98, glowIntensity);
                p.stroke(glowColor);
                
                const baseStrokeWeight = 1.2;
                const maxAdditionalWeight = 1.0;
                p.strokeWeight(baseStrokeWeight + p.map(audioData.overallLevel, 0.1, 0.7, 0, maxAdditionalWeight, true));
                
                const glowSize = 1.01 + (audioData.overallLevel * 0.03);
                
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
        }
        
        p.windowResized = function() {
            p.resizeCanvas(container.offsetWidth, container.offsetHeight);
            baseRadius = p.min(p.width, p.height) / 5.0;
        };
    };
    
    // Load p5.js from CDN
    return new Promise((resolve, reject) => {
        if (window.p5) {
            console.log("p5.js already loaded");
            initializeSketch();
            resolve(true);
        } else {
            console.log("Loading p5.js from CDN");
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.4.0/p5.min.js';
            script.onload = () => {
                console.log("p5.js loaded successfully");
                initializeSketch();
                resolve(true);
            };
            script.onerror = () => {
                console.error("Failed to load p5.js");
                reject(new Error("Failed to load p5.js"));
            };
            document.head.appendChild(script);
        }
    });
    
    function initializeSketch() {
        // Create the p5 instance
        new window.p5(sketch, 'p5-container');
        
        // Set up audio processing interval
        const audioUpdateInterval = setInterval(updateAudio, 50);
        
        // Add click handler to toggle audio
        container.addEventListener('click', async () => {
            if (!isActive) {
                const success = await setupAudio();
                if (!success) {
                    const errorElement = document.createElement('div');
                    errorElement.className = 'error-message';
                    errorElement.textContent = 'Could not enable microphone. Please check browser permissions.';
                    blobContainer.appendChild(errorElement);
                    
                    // Remove error message after 5 seconds
                    setTimeout(() => {
                        if (errorElement.parentNode) {
                            errorElement.parentNode.removeChild(errorElement);
                        }
                    }, 5000);
                }
            } else {
                stopAudioProcessing();
            }
        });
        
        // Clean up function
        return () => {
            clearInterval(audioUpdateInterval);
            stopAudioProcessing();
        };
    }
}

// Return a promise that resolves when the blob is set up
return setupAudioReactiveBlob();
"""

# Main Streamlit app
def main():
    st.title("Audio Reactive Blob Visualization")
    
    st.markdown("""
    This application creates an audio-reactive blob visualization that responds to your microphone input.
    Click on the blob to enable/disable the microphone.
    """)
    
    # Container for the blob visualization
    st.markdown('<div class="blob-container"></div>', unsafe_allow_html=True)
    
    # Add fullscreen button
    st.markdown("""
    <div class="fullscreen-button" onclick="toggleFullscreen()">
        <svg class="fullscreen-icon" viewBox="0 0 24 24">
            <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
        </svg>
    </div>
    <script>
    function toggleFullscreen() {
        const container = document.querySelector('.blob-container');
        if (!document.fullscreenElement) {
            if (container.requestFullscreen) {
                container.requestFullscreen();
            } else if (container.webkitRequestFullscreen) {
                container.webkitRequestFullscreen();
            } else if (container.msRequestFullscreen) {
                container.msRequestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }
        }
    }
    </script>
    """, unsafe_allow_html=True)
    
    # Use streamlit-javascript to run the audio reactive blob code
    audio_data = st_javascript(js_code)
    
    # Display audio data in debug section (can be removed in production)
    with st.expander("Debug Info (Audio Data)", expanded=False):
        if audio_data:
            try:
                data = json.loads(audio_data)
                st.write(data)
                
                # Create a simple visualization of the audio levels
                cols = st.columns(4)
                cols[0].metric("Overall Level", f"{data['overallLevel']:.2f}")
                cols[1].metric("Mid Level", f"{data['midLevel']:.2f}")
                cols[2].metric("Treble Level", f"{data['trebleLevel']:.2f}")
                cols[3].metric("Frequency Spread", f"{data['frequencySpread']:.2f}")
                
                # Show a progress bar for the overall level
                st.progress(data['overallLevel'])
            except:
                st.write("Waiting for audio data...")
        else:
            st.write("No audio data available. Click on the blob to enable microphone.")

if __name__ == "__main__":
    main()
