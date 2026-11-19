import { createRoot } from "react-dom/client";
import { initialStudies, type Study } from "../lib/initial";
import brandLibrary from "../lib/brand-library.json";
import { editorialImages } from "../lib/editorial-images";
import Studio from "./studio";
import { NewsletterManage } from "./subscribe";
import "./globals.css";

const features = [
  ...initialStudies,
  ...brandLibrary.map((study): Study => ({ ...study, date: initialStudies[0].date, libraryOnly: true })),
].filter(study => Object.hasOwn(editorialImages, study.slug));

createRoot(document.getElementById("root")!).render(
  window.location.hash.startsWith("#newsletter/") ? <NewsletterManage/> : <Studio features={features}/>,
);
