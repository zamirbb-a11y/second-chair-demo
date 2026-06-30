import React from "react";
import ReactDOM from "react-dom/client";
import posthog from "posthog-js";
import App from "./App";

posthog.init("phc_BHdzeBKKk4WjiQtvJtTBqK6NpGciJkQhM8w5NSqf7fsL", {
  api_host: "https://us.i.posthog.com",
  person_profiles: "identified_only",
  session_recording: { maskAllInputs: false },
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
