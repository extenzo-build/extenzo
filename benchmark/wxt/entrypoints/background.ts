import { initBackground } from "../source/background/index";

export default defineBackground(() => {
  initBackground("offscreen.html");
});
