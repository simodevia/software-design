import React from "react";
import { createRoot } from "react-dom/client";
import "./i18n.js";
import App from "./App.jsx";
import "./styles.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error('The HTML element with id "root" was not found.');
}

const root = createRoot(rootElement);

root.render(<App />);