# Audio Reactive Blob Visualization

This Streamlit application creates an interactive audio-reactive blob visualization that responds to microphone input, similar to the visualization seen in ChatGPT's voice mode.

## Features

- Real-time audio processing using browser APIs
- Smooth, organic blob visualization that reacts to sound
- Color and shape changes based on audio characteristics
- Simple, intuitive interface with fullscreen support
- Works on desktop and mobile browsers

## Demo

When you speak into your microphone, the blue blob will change shape, size, and color based on your voice. The visualization responds to:

- Volume (overall amplitude)
- Frequency distribution
- Pitch variations
- Speech patterns

## Requirements

- Python 3.7+
- Streamlit
- A modern web browser with microphone access

## Installation

1. Clone this repository:
```bash
git clone https://github.com/yourusername/audio-reactive-blob.git
cd audio-reactive-blob
```

2. Install the required packages:
```bash
pip install -r requirements.txt
```

3. Run the Streamlit app:
```bash
streamlit run app.py
```

## Deployment on Streamlit Cloud

This application can be easily deployed on [Streamlit Cloud](https://streamlit.io/cloud):

1. Fork this repository to your GitHub account
2. Log in to Streamlit Cloud
3. Create a new app and select your forked repository
4. Set the main file path to `app.py`
5. Deploy!

## How It Works

The application uses:

- Streamlit for the Python web application framework
- streamlit-javascript for browser integration
- p5.js for the visualization rendering
- Web Audio API for microphone access and audio processing

The blob visualization is created using perlin noise to generate organic shapes that respond to audio input. The audio is analyzed in real-time to extract features like volume, frequency distribution, and pitch, which are then used to control various aspects of the visualization.

## Browser Permissions

When you first run the application, your browser will ask for permission to access your microphone. You need to allow this for the visualization to work properly.

## License

MIT

## Credits

This project was inspired by the audio visualizations in ChatGPT's voice mode and adapted for Streamlit.
