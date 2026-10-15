import { render } from "preact";
import { Analytics } from "@vercel/analytics/react";
import { App } from "./App";
import "./styles/tokens.css";

const root = document.getElementById("app")!;
const path = location.pathname.replace(/\/$/, "");

if (import.meta.env.DEV && path === "/dev/cards") {
  import("./dev/CardsPreview").then(({ CardsPreview }) => render(
    <>
      <CardsPreview />
      <Analytics />
    </>,
    root
  ));
} else if (import.meta.env.DEV && path === "/dev/photos") {
  import("./dev/PhotoPicker").then(({ PhotoPicker }) => render(
    <>
      <PhotoPicker />
      <Analytics />
    </>,
    root
  ));
} else {
  render(
    <>
      <App />
      <Analytics />
    </>,
    root
  );
}
