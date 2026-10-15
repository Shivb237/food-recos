import { render } from "preact";
import { App } from "./App";
import "./styles/tokens.css";

const root = document.getElementById("app")!;
const path = location.pathname.replace(/\/$/, "");

if (import.meta.env.DEV && path === "/dev/cards") {
  import("./dev/CardsPreview").then(({ CardsPreview }) => render(<CardsPreview />, root));
} else if (import.meta.env.DEV && path === "/dev/photos") {
  import("./dev/PhotoPicker").then(({ PhotoPicker }) => render(<PhotoPicker />, root));
} else {
  render(<App />, root);
}
