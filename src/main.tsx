import { render } from "preact";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { App } from "./App";
import "./styles/tokens.css";

const root = document.getElementById("app")!;
const path = location.pathname.replace(/\/$/, "");

// Dev-only tools (local server only, never in the production build). No analytics on these.
if (import.meta.env.DEV && path === "/dev/cards") {
  import("./dev/CardsPreview").then(({ CardsPreview }) => render(<CardsPreview />, root));
} else if (import.meta.env.DEV && path === "/dev/add") {
  import("./dev/AddRestaurant").then(({ AddRestaurant }) => render(<AddRestaurant />, root));
} else if (import.meta.env.DEV && path === "/dev/photos") {
  import("./dev/PhotoPicker").then(({ PhotoPicker }) => render(<PhotoPicker />, root));
} else {
  render(
    <>
      <App />
      <Analytics />
      <SpeedInsights />
    </>,
    root,
  );
}
