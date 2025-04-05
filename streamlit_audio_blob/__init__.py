import os
import streamlit as st
import streamlit.components.v1 as components

# Define the component's local development path
_RELEASE = True

if not _RELEASE:
    _component_func = components.declare_component(
        "audio_reactive_blob",
        url="http://localhost:3001",  # Local dev server URL
    )
else:
    # When releasing to PyPI, use the build directory
    parent_dir = os.path.dirname(os.path.abspath(__file__))
    build_dir = os.path.join(parent_dir, "frontend/build")
    _component_func = components.declare_component("audio_reactive_blob", path=build_dir)

# Define the public API for the component
def audio_reactive_blob(key=None):
    """Create an audio-reactive blob visualization that responds to microphone input.
    
    Parameters
    ----------
    key: str or None
        An optional key that uniquely identifies this component. If this is
        None, and the component's arguments are changed, the component will
        be re-mounted in the Streamlit frontend and lose its current state.
    
    Returns
    -------
    bool
        True if the microphone is active, False otherwise.
    """
    component_value = _component_func(key=key, default=False)
    return component_value
