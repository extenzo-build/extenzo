import { createApp } from "vue";
import "../lib/global.css";

import { vPermission } from "../lib/directive";

import app from "./app";

createApp(app)
  .directive("permission", vPermission)
  .mount("#favourites-root");
