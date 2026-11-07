import React from "react";
import { render } from "ink";
import App from "./src/App.tsx";

const arg = process.argv[2];
const isBuilder =
  arg === "create" ||
  arg === "init" ||
  arg === "build" ||
  arg === "--create";

render(<App initialMode={isBuilder ? "builder" : "view"} />);
