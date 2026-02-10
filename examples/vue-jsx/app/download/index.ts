import "./index.less";
import "./mux-mp4.min.js";
import "../content/index";

import { createVideoRollApp } from "../lib/share";
import app from "./app";

createVideoRollApp(app, "#download-root");