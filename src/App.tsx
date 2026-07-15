import { Routes, Route, Navigate } from "react-router-dom"
import { ProjectProvider } from "@/hooks/useProjectState"
import { ToastProvider } from "@/hooks/useToast"
import { LandingPage } from "@/pages/LandingPage"
import { DashboardPage } from "@/pages/DashboardPage"
import { EditorPage } from "@/pages/EditorPage"

export function App() {
  return (
    <ProjectProvider>
      <ToastProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/editor" element={<EditorPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ToastProvider>
    </ProjectProvider>
  )
}
