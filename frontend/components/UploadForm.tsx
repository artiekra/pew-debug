import React, { useState, useRef, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface UploadFormProps {
  onGameUrlReady: (url: string) => void;
}

export const UploadForm = ({ onGameUrlReady }: UploadFormProps) => {
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsUploading(true);

    const files = fileInputRef.current?.files;
    if (!files || files.length === 0) {
      setErrorMsg("please select a folder.");
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
      setErrorMsg("upload failed! make sure your backend is running.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="container mx-auto pt-20 px-4">
      <Card className="max-w-md mx-auto shadow-sm">
        <CardHeader>
          <CardTitle className="text-center text-xl">upload level folder</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpload} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="folderInput" className="text-sm text-muted-foreground">
                select your lua level directory
              </label>
              <Input
                id="folderInput"
                type="file"
                ref={fileInputRef}
                // @ts-expect-error
                webkitdirectory=""
                directory=""
                multiple
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isUploading}>
              {isUploading ? "instrumenting code..." : "upload & launch"}
            </Button>
          </form>

          {errorMsg && (
            <Alert variant="destructive" className="mt-4">
              <AlertDescription className="text-center">{errorMsg}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
