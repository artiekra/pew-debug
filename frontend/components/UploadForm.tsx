import React, { useState, useRef, FormEvent, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  RiFolderUploadLine,
  RiLoader4Line,
  RiFolder3Line,
  RiAlertLine,
} from "@remixicon/react"

interface SessionRecord {
  id: string
  name: string
  time: number
}

const PewPewText = ({ text }: { text: string }) => {
  if (!text) return null
  const parts = text.split(/(#[0-9a-fA-F]{8})/i)
  const elements = []
  let currentColor = "#ffffff"

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]
    if (/^#[0-9a-fA-F]{8}$/i.test(part)) {
      currentColor = part
    } else if (part) {
      elements.push(
        <span key={i} style={{ color: currentColor }}>
          {part}
        </span>
      )
    }
  }

  return <>{elements}</>
}

interface UploadFormProps {
  onGameUrlReady: (url: string) => void
}

export const UploadForm = ({ onGameUrlReady }: UploadFormProps) => {
  const [mode, setMode] = useState<"upload" | "existing">("upload")
  const [existingSessionId, setExistingSessionId] = useState<string>("")
  const [isUploading, setIsUploading] = useState<boolean>(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  const [fileCount, setFileCount] = useState<number>(0)
  const [invulnerability, setInvulnerability] = useState<boolean>(false)
  const [recentSessions, setRecentSessions] = useState<SessionRecord[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    try {
      const stored = localStorage.getItem("pewpew_sessions")
      if (stored) {
        setRecentSessions(JSON.parse(stored))
      }
    } catch (e) {
      console.error("Failed to parse sessions", e)
    }
  }, [])

  const handleFileChange = () => {
    const files = fileInputRef.current?.files
    if (files && files.length > 0) {
      const folderName = files[0].webkitRelativePath.split("/")[0]
      setSelectedFolder(folderName || "Selected Folder")
      setFileCount(files.length)
    } else {
      setSelectedFolder(null)
      setFileCount(0)
    }
  }

  const handleUpload = async (e: FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (mode === "existing") {
      if (!existingSessionId.trim()) {
        setErrorMsg("Please enter a valid session ID.")
        return
      }
      onGameUrlReady(existingSessionId.trim())
      return
    }

    setIsUploading(true)

    const files = fileInputRef.current?.files
    if (!files || files.length === 0) {
      setErrorMsg("Please select a valid folder containing your level files.")
      setIsUploading(false)
      return
    }

    let levelName = "Unknown Level"
    for (let i = 0; i < files.length; i++) {
      if (files[i].name === "manifest.json") {
        try {
          const text = await files[i].text()
          const manifest = JSON.parse(text)
          if (manifest.name) {
            levelName = manifest.name
          }
        } catch (err) {
          console.error("Failed to parse manifest.json", err)
        }
        break
      }
    }

    const formData = new FormData()
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      formData.append("files", file, file.webkitRelativePath)
    }
    formData.append("invulnerability", String(invulnerability))

    try {
      // hitting the proxy route defined in next.config.js
      const response = await fetch("/inject", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("server responded with an error.")
      }

      const data = await response.json()

      const newSession: SessionRecord = {
        id: data.id,
        name: levelName,
        time: Date.now(),
      }
      try {
        const existingStr = localStorage.getItem("pewpew_sessions")
        let sessions: SessionRecord[] = existingStr
          ? JSON.parse(existingStr)
          : []
        sessions = sessions.filter((s) => s.id !== data.id)
        sessions.unshift(newSession)
        if (sessions.length > 5) sessions = sessions.slice(0, 5)
        localStorage.setItem("pewpew_sessions", JSON.stringify(sessions))
        setRecentSessions(sessions)
      } catch (e) {
        console.error("Failed to save session", e)
      }

      onGameUrlReady(data.id)
    } catch (err: any) {
      console.error("upload failed:", err)
      setErrorMsg("Server error! Please try later.")
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="relative mx-auto mt-10 w-full max-w-lg">
      <Card className="relative overflow-hidden border-white/10 bg-black/40 shadow-2xl backdrop-blur-xl transition-all duration-300 hover:shadow-primary/5">
        <CardHeader className="pt-8 pb-6 text-center">
          <CardTitle className="flex items-center justify-center gap-2 font-heading text-2xl font-bold tracking-tight text-foreground">
            <svg
              viewBox="0 0 128 128"
              className="mr-1 h-7 w-7 text-blue-500 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle
                cx="64"
                cy="64"
                r="48"
                fill="none"
                stroke="currentColor"
                strokeWidth="12"
                strokeDasharray="20 12"
              />
              <circle cx="98" cy="30" r="16" fill="currentColor" />
            </svg>
            Load Level Directory
          </CardTitle>
          <CardDescription className="mt-2 text-sm text-muted-foreground">
            Select the folder containing your Lua level or enter an existing
            session.
          </CardDescription>
        </CardHeader>

        <CardContent className="px-8 pb-8">
          <form onSubmit={handleUpload} className="space-y-6">
            <div className="flex w-full rounded-lg border border-white/5 bg-black/20 p-1">
              <button
                type="button"
                onClick={() => setMode("upload")}
                className={`flex-1 rounded-md py-2 text-sm font-medium transition-all ${mode === "upload" ? "bg-white/10 text-white shadow-sm" : "text-muted-foreground hover:text-white"}`}
              >
                Upload Folder
              </button>
              <button
                type="button"
                onClick={() => setMode("existing")}
                className={`flex-1 rounded-md py-2 text-sm font-medium transition-all ${mode === "existing" ? "bg-white/10 text-white shadow-sm" : "text-muted-foreground hover:text-white"}`}
              >
                Existing Session
              </button>
            </div>

            {mode === "upload" ? (
              <div className="space-y-4">
                <div className="group relative">
                  <input
                    id="folderInput"
                    type="file"
                    ref={fileInputRef}
                    // @ts-expect-error next/react types don't natively support webkitdirectory
                    webkitdirectory=""
                    directory=""
                    multiple
                    required={mode === "upload"}
                    onChange={handleFileChange}
                    className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                  />
                  <div
                    className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-all duration-300 ease-out ${selectedFolder ? "border-primary/50 bg-primary/5" : "border-border bg-black/20 group-hover:border-primary/50 group-hover:bg-primary/5"}`}
                  >
                    {selectedFolder ? (
                      <div className="flex flex-col items-center space-y-2 text-center">
                        <div className="rounded-full bg-primary/10 p-3">
                          <RiFolder3Line className="h-6 w-6 text-primary" />
                        </div>
                        <span className="font-semibold text-foreground">
                          {selectedFolder}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {fileCount} files selected
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center space-y-3 text-center">
                        <div className="rounded-full bg-white/5 p-3 transition-transform duration-300 group-hover:scale-110">
                          <RiFolderUploadLine className="h-6 w-6 text-muted-foreground transition-colors group-hover:text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            Click to browse folder
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            There must be manifest.json file inside your folder
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-3 rounded-xl border border-white/5 bg-black/20 px-4 py-3 transition-all hover:border-primary/30">
                  <input
                    type="checkbox"
                    id="invulnerability"
                    checked={invulnerability}
                    onChange={(e) => setInvulnerability(e.target.checked)}
                    className="h-4 w-4 rounded border-white/20 bg-black/40 text-primary transition-all focus:ring-1 focus:ring-primary focus:ring-offset-0"
                  />
                  <label
                    htmlFor="invulnerability"
                    className="cursor-pointer text-sm font-medium text-foreground"
                  >
                    Player Invulnerability
                  </label>
                </div>
              </div>
            ) : (
              <div className="space-y-4 pt-2 pb-6">
                <div className="space-y-3">
                  <label
                    htmlFor="sessionId"
                    className="text-sm font-medium text-foreground"
                  >
                    Session ID
                  </label>
                  <Input
                    id="sessionId"
                    type="text"
                    placeholder="Paste your copied Session ID here"
                    value={existingSessionId}
                    onChange={(e) => setExistingSessionId(e.target.value)}
                    className="border-white/10 bg-black/20"
                    required={mode === "existing"}
                  />
                </div>

                {recentSessions.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <label className="text-sm font-medium text-foreground">
                      Recent Sessions
                    </label>
                    <div className="flex flex-col gap-2">
                      {recentSessions.map((session) => (
                        <div
                          key={session.id}
                          onClick={() => setExistingSessionId(session.id)}
                          className={`flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-all ${
                            existingSessionId === session.id
                              ? "border-primary/50 bg-black"
                              : "border-white/5 bg-black hover:border-white/20"
                          }`}
                        >
                          <div className="flex flex-col overflow-hidden">
                            <span className="truncate text-sm font-medium">
                              <PewPewText text={session.name} />
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {session.id}
                            </span>
                          </div>
                          <span className="ml-4 shrink-0 text-xs text-muted-foreground">
                            {new Date(session.time).toLocaleString(undefined, {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <Button
              type="submit"
              className="relative h-12 w-full overflow-hidden text-base font-semibold transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_20px_rgba(var(--primary),0.3)] active:translate-y-0"
              disabled={
                isUploading ||
                (mode === "upload"
                  ? !selectedFolder
                  : !existingSessionId.trim())
              }
            >
              {isUploading ? (
                <>
                  <RiLoader4Line className="mr-2 h-5 w-5 animate-spin" />
                  Instrumenting Code...
                </>
              ) : (
                <span className="relative z-10">Launch Sandbox</span>
              )}
            </Button>
          </form>

          {errorMsg && (
            <Alert
              variant="destructive"
              className="mt-6 border-red-500/20 bg-red-500/10 text-red-400"
            >
              <RiAlertLine className="h-4 w-4" />
              <AlertDescription className="ml-2 font-medium">
                {errorMsg}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
