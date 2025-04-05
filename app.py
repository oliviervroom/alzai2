import streamlit as st

st.set_page_config(
    page_title="Alzheimer's Screening Tool",
    page_icon="🎤",
    layout="wide",
)

st.title("Voice Visualization for Alzheimer's Screening")

st.markdown("""
### Instructions
1. Click the microphone button in the visualization below to start.
2. Speak clearly into your microphone.
3. The visualization will react to your voice patterns.
4. Use the settings panel to adjust sensitivity if needed.
""")

col1, col2 = st.columns([3, 1])

with col1:
    st.subheader("Voice Visualization")
    # Placeholder for the audio reactive component
    st.info("Audio visualization component will appear here when deployed correctly.")
    
    # Temporary button to simulate microphone activation
    if st.button("Simulate Microphone Activation"):
        st.success("Microphone is active! Speak to see the visualization respond.")
    else:
        st.info("Click the button to simulate microphone activation.")

with col2:
    st.subheader("About")
    st.markdown("""
    This tool visualizes voice patterns to assist in early detection of speech 
    patterns that may indicate cognitive changes.
    
    The visualization is designed to be:
    - Easy to use for older adults
    - Visually clear with high contrast
    - Responsive to speech patterns
    - Calming and non-intimidating
    """)
    
    st.subheader("Privacy Note")
    st.markdown("""
    Your voice data is processed locally in your browser and is not stored or sent 
    to any server.
    """)
