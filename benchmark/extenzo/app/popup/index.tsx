import "../source/styles/index.css";
import { createRoot } from "react-dom/client";
import { PopupApp } from "../source/components/PopupApp";

const root = document.getElementById("root");
if (root) createRoot(root).render(<PopupApp />);
