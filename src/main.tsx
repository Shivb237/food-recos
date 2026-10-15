import { render } from "preact";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { App } from "./App";
import "./styles/tokens.css";

const root = document.getElementById("app")!;
const path = location.pathname.replace(/\/$/, "");

if (import.meta.env.DEV && path === "/dev/cards") {
  import("./dev/CardsPreview").then(({ CardsPreview }) => render(
    <>
      <CardsPreview />
      <Analytics />
      <SpeedInsights />
    </>,
    root
  ));
} else if (import.meta.env.DEV && path === "/dev/photos") {
  import("./dev/PhotoPicker").then(({ PhotoPicker }) => render(
    <>
      <PhotoPicker />
      <Analytics />
      <SpeedInsights />
    </>,
    root
  ));
} else {
  render(
    <>
      <App />
      <Analytics />
      <SpeedInsights />
    </>,
    root
  );
}
