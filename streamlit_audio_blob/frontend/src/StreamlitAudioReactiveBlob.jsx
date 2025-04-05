import React, { useEffect, useState } from "react";
import { Streamlit, withStreamlitConnection } from "streamlit-component-lib";
import AudioReactiveBlob from "./AudioReactiveBlob";

const StreamlitAudioReactiveBlob = ({ args }) => {
  const [micActive, setMicActive] = useState(false);

  // Update Streamlit when microphone state changes
  useEffect(() => {
    Streamlit.setComponentValue(micActive);
  }, [micActive]);

  // Resize the iframe to fit the content
  useEffect(() => {
    Streamlit.setFrameHeight();
  }, []);

  // Handle microphone state changes from the AudioReactiveBlob component
  const handleMicStateChange = (isActive) => {
    setMicActive(isActive);
  };

  return (
    <div style={{ width: "100%", height: "500px" }}>
      <AudioReactiveBlob onMicStateChange={handleMicStateChange} />
    </div>
  );
};

export default withStreamlitConnection(StreamlitAudioReactiveBlob);
