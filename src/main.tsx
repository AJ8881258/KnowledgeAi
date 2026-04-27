import { createRoot } from "react-dom/client";

// React-Router
import { BrowserRouter, Routes, Route } from "react-router";

// css
import "@/index.css";


// Pages
import DashboardPage from "@/pages/DashboardPage";
import LoginPage from "@/pages/LoginPage";
import KnowledgeBases from "@/pages/KnowledgeBases";
import SliderLayout from "@/components/slider-layout";

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <Routes>
      <Route element={<SliderLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/knowledge-bases" element={<KnowledgeBases />} />
      </Route>

      <Route path="/login" element={<LoginPage />} />
    </Routes>
  </BrowserRouter>,
);
