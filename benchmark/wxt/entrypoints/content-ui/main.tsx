import "../../source/styles/index.css";
import { createRoot } from "react-dom/client";
import { ContentUIApp } from "../../source/components/ContentUIApp";

const root = document.getElementById("root");
if (root) createRoot(root).render(<ContentUIApp />);
