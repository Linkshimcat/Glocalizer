import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import type {
  Project,
  ProjectImage,
  TargetLanguage,
  TranslationStyle,
} from "@/types/project"
import { buildCandidates } from "@/lib/mockTranslate"
import { sampleProject } from "@/data/sampleProject"

interface ProjectContextValue {
  project: Project | null
  loadSample: () => void
  setProject: (project: Project) => void
  updateImage: (id: string, patch: Partial<ProjectImage>) => void
  applyTargetLanguage: (lang: TargetLanguage) => void
  applyStyleToAll: (style: TranslationStyle) => void
}

const ProjectContext = createContext<ProjectContextValue | null>(null)

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [project, setProjectState] = useState<Project | null>(null)

  const loadSample = useCallback(() => {
    setProjectState(structuredClone(sampleProject))
  }, [])

  const setProject = useCallback((next: Project) => {
    setProjectState(next)
  }, [])

  const updateImage = useCallback((id: string, patch: Partial<ProjectImage>) => {
    setProjectState((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        images: prev.images.map((img) =>
          img.id === id ? { ...img, ...patch } : img,
        ),
      }
    })
  }, [])

  const applyTargetLanguage = useCallback((lang: TargetLanguage) => {
    setProjectState((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        targetLanguage: lang,
        images: prev.images.map((img) => {
          const translations = buildCandidates(img.sourceText, lang)
          const preferred =
            translations.find((t) => t.type === prev.translationStyle) ??
            translations[0]
          return {
            ...img,
            translations,
            selectedTranslation: preferred.text,
            editedText: undefined,
          }
        }),
      }
    })
  }, [])

  const applyStyleToAll = useCallback((style: TranslationStyle) => {
    setProjectState((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        translationStyle: style,
        images: prev.images.map((img) => {
          const match =
            img.translations.find((t) => t.type === style) ?? img.translations[0]
          return {
            ...img,
            selectedTranslation: match.text,
            editedText: undefined,
          }
        }),
      }
    })
  }, [])

  const value = useMemo(
    () => ({
      project,
      loadSample,
      setProject,
      updateImage,
      applyTargetLanguage,
      applyStyleToAll,
    }),
    [project, loadSample, setProject, updateImage, applyTargetLanguage, applyStyleToAll],
  )

  return (
    <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
  )
}

export function useProjectState() {
  const ctx = useContext(ProjectContext)
  if (!ctx) {
    throw new Error("useProjectState must be used within a ProjectProvider")
  }
  return ctx
}
