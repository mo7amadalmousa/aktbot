"use client";

import { useRef, useState, useEffect } from "react";
import { Upload, Camera, Trash2, Loader2, X, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UploadVariant } from "@/lib/storage/image";

export async function deleteManaged(url: string) {
  if (!url) return;
  try {
    await fetch("/api/upload/delete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url }),
    });
  } catch {}
}

function CameraModal({
  onCapture,
  onClose,
}: {
  onCapture: (blob: Blob) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
      } catch {
        setError("تعذّر الوصول للكاميرا. استخدم رفع ملف بدلاً منها.");
      }
    })();
    return () => {
      active = false;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const snap = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (blob) onCapture(blob);
      },
      "image/jpeg",
      0.92,
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-2xl bg-card p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <span className="font-semibold text-foreground">التقاط صورة</span>
          <button type="button" onClick={onClose} aria-label="إغلاق">
            <X className="size-5 text-muted-foreground" />
          </button>
        </div>
        {error ? (
          <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {error}
          </p>
        ) : (
          <>
            <video
              ref={videoRef}
              playsInline
              muted
              className="aspect-video w-full rounded-lg bg-black object-cover"
            />
            <button
              type="button"
              onClick={snap}
              className="mt-3 w-full rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              التقاط
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export function ImageUpload({
  value,
  onChange,
  variant,
  shape = "rect",
}: {
  value: string;
  onChange: (url: string) => void;
  variant: UploadVariant;
  shape?: "circle" | "rect";
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const captureRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [urlMode, setUrlMode] = useState(false);

  const upload = (file: Blob) => {
    setError(null);
    setProgress(0);
    const fd = new FormData();
    fd.append("file", file, "upload.jpg");
    fd.append("variant", variant);
    if (value) fd.append("previousUrl", value);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      setProgress(null);
      try {
        const r = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && r.ok) {
          onChange(r.url);
        } else {
          setError(r.error || "فشل الرفع.");
        }
      } catch {
        setError("فشل الرفع.");
      }
    };
    xhr.onerror = () => {
      setProgress(null);
      setError("تعذّر الاتصال بالخادم.");
    };
    xhr.send(fd);
  };

  const remove = async () => {
    const old = value;
    onChange("");
    await deleteManaged(old);
  };

  const busy = progress !== null;

  return (
    <div>
      <div className="flex items-center gap-3">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value}
            alt=""
            className={cn(
              "size-16 border border-border object-cover",
              shape === "circle" ? "rounded-full" : "rounded-lg",
            )}
          />
        ) : (
          <div
            className={cn(
              "flex size-16 items-center justify-center border border-dashed border-border bg-muted/40 text-muted-foreground",
              shape === "circle" ? "rounded-full" : "rounded-lg",
            )}
          >
            <Upload className="size-5" />
          </div>
        )}

        <div className="flex flex-1 flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50"
          >
            <Upload className="size-4" /> رفع
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (
                typeof navigator !== "undefined" &&
                typeof navigator.mediaDevices?.getUserMedia === "function"
              ) {
                setShowCamera(true);
              } else {
                captureRef.current?.click();
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50"
          >
            <Camera className="size-4" /> كاميرا
          </button>
          {value ? (
            <button
              type="button"
              disabled={busy}
              onClick={remove}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
            >
              <Trash2 className="size-4" /> حذف
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setUrlMode((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <Link2 className="size-3.5" /> رابط
          </button>
        </div>
      </div>

      {busy ? (
        <div className="mt-2 flex items-center gap-2">
          <Loader2 className="size-4 animate-spin text-primary" />
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground">{progress}%</span>
        </div>
      ) : null}

      {error ? (
        <p className="mt-2 text-xs text-destructive">{error}</p>
      ) : null}

      {urlMode ? (
        <input
          type="url"
          defaultValue={value}
          placeholder="https://…/image.jpg"
          onBlur={(e) => onChange(e.target.value.trim())}
          className="mt-2 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
        />
      ) : null}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload(f);
          e.target.value = "";
        }}
      />
      <input
        ref={captureRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload(f);
          e.target.value = "";
        }}
      />

      {showCamera ? (
        <CameraModal
          onClose={() => setShowCamera(false)}
          onCapture={(blob) => {
            setShowCamera(false);
            upload(blob);
          }}
        />
      ) : null}
    </div>
  );
}
