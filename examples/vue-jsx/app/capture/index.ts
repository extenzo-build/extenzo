import "./index.less";
import "../content/index";

import { createVideoRollApp } from "../lib/share";
import app from "./app";

createVideoRollApp(app, '#app')