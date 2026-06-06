import React, { useState, useRef, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RiFolderUploadLine, RiLoader4Line, RiFolder3Line, RiAlertLine } from "@remixicon/react";

interface UploadFormProps {
  onGameUrlReady: (url: string) => void;
}

export const UploadForm = ({ onGameUrlReady }: UploadFormProps) => {
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [fileCount, setFileCount] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = () => {
    const files = fileInputRef.current?.files;
    if (files && files.length > 0) {
      const folderName = files[0].webkitRelativePath.split('/')[0];
      setSelectedFolder(folderName || "Selected Folder");
      setFileCount(files.length);
    } else {
      setSelectedFolder(null);
      setFileCount(0);
    }
  };

  const handleUpload = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsUploading(true);

    const files = fileInputRef.current?.files;
    if (!files || files.length === 0) {
      setErrorMsg("Please select a valid folder containing your level files.");
      setIsUploading(false);
      return;
    }

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      formData.append("files", file, file.webkitRelativePath);
    }

    try {
      // hitting the proxy route defined in next.config.js
      const response = await fetch("/inject", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("server responded with an error.");
      }

      const data = await response.json();
      onGameUrlReady(`/play/${data.id}/pewpew.html`);
    } catch (err: any) {
      console.error("upload failed:", err);
      setErrorMsg("Server error! Please try later.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="relative w-full max-w-lg mx-auto mt-10">
      {/* Decorative background glows */}
      {/* <div className="absolute -top-10 -left-10 w-72 h-72 bg-primary/20 rounded-full blur-[80px] opacity-70 pointer-events-none animate-pulse"></div> */}
      {/* <div className="absolute -bottom-10 -right-10 w-72 h-72 bg-secondary/20 rounded-full blur-[80px] opacity-70 pointer-events-none animate-pulse" style={{ animationDelay: '1s' }}></div> */}
      
      <Card className="relative overflow-hidden border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl transition-all duration-300 hover:shadow-primary/5">
        {/* Decorative card header */}
        {/* <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-secondary to-primary opacity-80"></div> */}
        <CardHeader className="text-center pb-6 pt-8">
          {/* <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary/20 to-primary/5 border border-primary/20 shadow-inner"> */}
          {/*   <RiFolderUploadLine className="h-8 w-8 text-primary" /> */}
          {/* </div> */}
          <CardTitle className="flex items-center justify-center gap-2 text-2xl font-bold tracking-tight text-foreground font-heading">
            <svg 
              viewBox="0 0 128 128" 
              className="w-7 h-7 text-blue-500 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)] mr-1" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="64" cy="64" r="48" fill="none" stroke="currentColor" strokeWidth="12" strokeDasharray="20 12" />
              <circle cx="98" cy="30" r="16" fill="currentColor" />
            </svg>
            Load Level Directory
          </CardTitle>
          <CardDescription className="text-muted-foreground mt-2 text-sm">
            Select the folder containing your Lua level.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="px-8 pb-8">
          <form onSubmit={handleUpload} className="space-y-6">
            <div className="group relative">
              <input
                id="folderInput"
                type="file"
                ref={fileInputRef}
                // @ts-expect-error next/react types don't natively support webkitdirectory
                webkitdirectory=""
                directory=""
                multiple
                required
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl transition-all duration-300 ease-out
                ${selectedFolder ? 'border-primary/50 bg-primary/5' : 'border-border bg-black/20 group-hover:border-primary/50 group-hover:bg-primary/5'}`}>
                
                {selectedFolder ? (
                  <div className="flex flex-col items-center text-center space-y-2">
                    <div className="p-3 bg-primary/10 rounded-full">
                      <RiFolder3Line className="h-6 w-6 text-primary" />
                    </div>
                    <span className="font-semibold text-foreground">{selectedFolder}</span>
                    <span className="text-xs text-muted-foreground">{fileCount} files selected</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-center space-y-3">
                    <div className="p-3 bg-white/5 rounded-full group-hover:scale-110 transition-transform duration-300">
                      <RiFolderUploadLine className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Click to browse folder</p>
                      <p className="text-xs text-muted-foreground mt-1">There must be manifest.json file inside your folder</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 text-base font-semibold transition-all duration-300 hover:shadow-[0_0_20px_rgba(var(--primary),0.3)] hover:-translate-y-0.5 active:translate-y-0 relative overflow-hidden" 
              disabled={isUploading || !selectedFolder}
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
            <Alert variant="destructive" className="mt-6 border-red-500/20 bg-red-500/10 text-red-400">
              <RiAlertLine className="h-4 w-4" />
              <AlertDescription className="ml-2 font-medium">{errorMsg}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
