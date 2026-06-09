import React, { useState } from "react"
import { Snapshot } from "@/hooks/useSandboxEngine"
import { Button } from "@/components/ui/button"
import {
  RiDeleteBinLine,
  RiEditLine,
  RiHistoryLine,
  RiSaveLine,
  RiCheckLine,
  RiCloseLine,
} from "@remixicon/react"
import { Input } from "@/components/ui/input"

interface SnapshotTabProps {
  snapshots: Snapshot[]
  takeSnapshot: (name?: string) => void
  restoreSnapshot: (id: string) => void
  renameSnapshot: (id: string, newName: string) => void
  deleteSnapshot: (id: string) => void
}

export const SnapshotTab: React.FC<SnapshotTabProps> = ({
  snapshots,
  takeSnapshot,
  restoreSnapshot,
  renameSnapshot,
  deleteSnapshot,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [newName, setNewName] = useState("")

  return (
    <div className="flex h-full w-full flex-col bg-black/40 p-6 text-white backdrop-blur-xl">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold">Snapshots</h2>
      </div>

      <div className="mb-6 flex gap-2">
        <Input
          placeholder="Snapshot name (optional)..."
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="border-white/10 bg-black/40"
        />
        <Button
          onClick={() => {
            takeSnapshot(newName.trim() || undefined)
            setNewName("")
          }}
          className="shrink-0 hover:bg-primary/30"
        >
          <RiSaveLine className="mr-2 h-4 w-4" /> Save
        </Button>
      </div>

      <div className="flex-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent overflow-y-auto pr-2">
        {snapshots.length === 0 ? (
          <div className="mt-8 text-center text-sm text-white/40">
            No snapshots taken yet.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {snapshots.map((snap) => (
              <div
                key={snap.id}
                className="flex items-center justify-between rounded-md border border-white/10 bg-black/40 p-3 transition-colors hover:bg-white/5"
              >
                {editingId === snap.id ? (
                  <div className="mr-4 flex flex-1 items-center gap-2">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-8 border-white/20 bg-black/60"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          renameSnapshot(snap.id, editName)
                          setEditingId(null)
                        } else if (e.key === "Escape") {
                          setEditingId(null)
                        }
                      }}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-green-400 hover:bg-green-400/20 hover:text-green-300"
                      onClick={() => {
                        renameSnapshot(snap.id, editName)
                        setEditingId(null)
                      }}
                    >
                      <RiCheckLine className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-red-400 hover:bg-red-400/20 hover:text-red-300"
                      onClick={() => setEditingId(null)}
                    >
                      <RiCloseLine className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="mr-4 flex flex-1 flex-col overflow-hidden">
                    <div className="truncate font-semibold">{snap.name}</div>
                    <div className="text-xs text-white/50">
                      {new Date(snap.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                )}

                {editingId !== snap.id && (
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-white/70 hover:text-white"
                      onClick={() => {
                        setEditingId(snap.id)
                        setEditName(snap.name)
                      }}
                    >
                      <RiEditLine className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-white/70 hover:bg-primary/20 hover:text-primary"
                      onClick={() => restoreSnapshot(snap.id)}
                    >
                      <RiHistoryLine className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-white/70 hover:bg-red-400/20 hover:text-red-400"
                      onClick={() => deleteSnapshot(snap.id)}
                    >
                      <RiDeleteBinLine className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
