import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react"

export interface Settings {
  showFunctions: boolean
  formatColors: boolean
  showDebugInfo: boolean
}

const defaultSettings: Settings = {
  showFunctions: true,
  formatColors: true,
  showDebugInfo: true,
}

export interface SettingsContextType extends Settings {
  updateSettings: (newSettings: Partial<Settings>) => void
}

const SettingsContext = createContext<SettingsContextType>({
  ...defaultSettings,
  updateSettings: () => {},
})

export const useSettings = () => useContext(SettingsContext)

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<Settings>(defaultSettings)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem("pewpew-settings")
    if (saved) {
      try {
        setSettings({ ...defaultSettings, ...JSON.parse(saved) })
      } catch (e) {}
    }
    setIsLoaded(true)
  }, [])

  const updateSettings = (updates: Partial<Settings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...updates }
      localStorage.setItem("pewpew-settings", JSON.stringify(updated))
      return updated
    })
  }

  return (
    <SettingsContext.Provider value={{ ...settings, updateSettings }}>
      {/* Provide an empty wrapper if not loaded to prevent mismatch, though typically safe */}
      <div style={{ display: "contents", opacity: isLoaded ? 1 : 0 }}>
        {children}
      </div>
    </SettingsContext.Provider>
  )
}
