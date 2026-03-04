import "../../source/styles/index.css";
import { createRoot } from "react-dom/client";
import { OptionsApp } from "../../source/components/OptionsApp";

const root = document.getElementById("root");
if (root) createRoot(root).render(<OptionsApp />);
