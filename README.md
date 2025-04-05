# Streamlit Audio Reactive Blob

A Streamlit component that provides an audio-reactive visualization responding to microphone input, designed with accessibility features for elderly users. This component is specifically adapted for Alzheimer's screening applications.

## Features

- **Audio-reactive visualization** that responds to microphone input
- **Material Design adaptations** specifically for elderly users:
  - Larger text and controls
  - High contrast colors
  - Simplified interface
  - Gentle animations
  - Clear instructions
- **Accessibility considerations**:
  - Adjustable sensitivity
  - Visual feedback for microphone status
  - Help section with simple instructions
  - Error handling with clear messages

## Installation

### Option 1: Install from GitHub

```bash
pip install git+https://github.com/yourusername/streamlit-audio-blob.git
```

### Option 2: Local Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/streamlit-audio-blob.git
cd streamlit-audio-blob
```

2. Install the package:
```bash
pip install -e .
```

## Usage

```python
import streamlit as st
from streamlit_audio_blob import audio_reactive_blob

st.title("Voice Visualization")

# Use the component
mic_active = audio_reactive_blob(key="audio_blob")

if mic_active:
    st.success("Microphone is active! Speak to see the visualization respond.")
else:
    st.info("Click the microphone button to start.")
```

## Development

### Frontend Development

The component uses React with Material-UI and p5.js for the visualization. To develop the frontend:

1. Navigate to the frontend directory:
```bash
cd streamlit_audio_blob/frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

4. Build the frontend:
```bash
npm run build
```

### Python Component Development

The Streamlit component is defined in `streamlit_audio_blob/__init__.py`. You can modify this file to change the component's API.

## Building the Component

To build the component for distribution:

1. Build the frontend:
```bash
cd streamlit_audio_blob/frontend
npm install
npm run build
```

2. Install the Python package:
```bash
pip install -e .
```

## License

MIT
