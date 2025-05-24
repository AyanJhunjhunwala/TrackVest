import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import Router from "./Router.jsx";
import "./index.css";
import { initializeSession, isNewSession } from "./utils/sessionManager";
import { clearChartCache } from "./utils/localChartCache";

// Initialize application cache and session management
const initializeApp = () => {
  try {
    // Check if this is a new session (after server restart)
    const newSession = isNewSession();
    
    if (newSession) {
      console.log("New session detected - localhost may have restarted");
      // Clear existing cache when the server is restarted
      clearChartCache();
    } else {
      console.log("Continuing existing session - cache preserved");
    }
    
    // Initialize the current session
    initializeSession();
  } catch (error) {
    console.error("Error initializing app:", error);
  }
};

// Run initialization
initializeApp();

// App component with additional initialization
const App = () => {
  return <Router />;
};

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
