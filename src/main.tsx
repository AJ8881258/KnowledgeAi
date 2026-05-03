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
import Documents from "@/pages/Documents";
import Chat from "@/pages/Chat";
import Settings from "@/pages/Settings";

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <Routes>
      <Route element={<SliderLayout />}>
        <Route index path="/" element={<DashboardPage />} />
        <Route path="/KnowledgeBases" element={<KnowledgeBases />} />
        <Route path="/KnowledgeBases/:knowledgeBaseId" element={<KnowledgeBases />} />
        <Route path="/Documents" element={<Documents />} />
        <Route path="/Chat" element={<Chat />} />
        <Route path="/Settings" element={<Settings />} />
      </Route>

      <Route path="/login" element={<LoginPage />} />
    </Routes>
  </BrowserRouter>,
);
