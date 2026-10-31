"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, ImagePlus, Loader2, Trash2, UploadCloud } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { cn } from "@/shared/lib/utils";
import { Avatar, buttonClass } from "@/client/components/founder/ui";
import { removeLogo, uploadLogo } from "./actions";

const ACCEPT = ["image/png", "image/jpeg", "image/webp"];
const MAX_INPUT_BYTES = 10 * 1024 * 1024; // before we downscale
const MAX_UPLOAD_BYTES = 2 * 1024 * 1024; // matches the server cap
const MAX_EDGE = 512;
const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Downscale to at most 512px on the long edge and re-encode as WebP (PNG where
 * the browser can't encode WebP). Keeps transparency, shrinks the upload and
 * drops photo metadata such as GPS location.
 */
async function prepare(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bmp.width, bmp.height));
  const w = Math.max(1, Math.round(bmp.width * scale));
  const h = Math.max(1, Math.round(bmp.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/webp", 0.92));
  if (!blob) throw new Error("encode");
  return blob;
}

export function LogoUploader({ currentUrl, startupName }: { currentUrl: string | null; startupName: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<{ url: string; blob: Blob } | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview.url);
    };
  }, [preview]);

  async function pick(file: File | undefined) {
    setMsg(null);
    setConfirmRemove(false);
    if (!file) return;
    if (!ACCEPT.includes(file.type)) {
      setMsg({ ok: false, text: "Use a PNG, JPG or WebP image." });
      return;
    }
    if (file.size > MAX_INPUT_BYTES) {
      setMsg({ ok: false, text: "That file is over 10 MB. Please pick a smaller image." });
      return;
    }
    setPreparing(true);
    try {
      const blob = await prepare(file);
      if (blob.size > MAX_UPLOAD_BYTES) {
        setMsg({ ok: false, text: "That image is still over 2 MB after resizing. Try a simpler file." });
        return;
      }
      setPreview({ url: URL.createObjectURL(blob), blob });
    } catch {
      setMsg({ ok: false, text: "We couldn't read that image. Try a different PNG or JPG." });
    } finally {
      setPreparing(false);
    }
  }

  function save() {
    if (!preview) return;
    const fd = new FormData();
    fd.append("logo", preview.blob, `logo.${preview.blob.type === "image/png" ? "png" : "webp"}`);
    startTransition(async () => {
      const r = await uploadLogo(fd);
      if (r.ok) {
        setPreview(null);
        setMsg({ ok: true, text: "Logo saved. It now appears across your portal." });
        router.refresh();
      } else {
        setMsg({ ok: false, text: r.error });
      }
    });
  }

  function remove() {
    if (!confirmRemove) {
      setConfirmRemove(true);
      return;
    }
    startTransition(async () => {
      const r = await removeLogo();
      setConfirmRemove(false);
      if (r.ok) {
        setMsg({ ok: true, text: "Logo removed. Your initials are shown instead." });
        router.refresh();
      } else {
        setMsg({ ok: false, text: r.error });
      }
    });
  }

  const shown = preview?.url ?? currentUrl;
  const busy = pending || preparing;

  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
      <div className="relative h-28 w-28 shrink-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={shown ?? "initials"}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ duration: 0.25, ease: EASE }}
            className="absolute inset-0"
          >
            {shown ? (
              <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-[24px] bg-white p-3 shadow-sm ring-1 ring-navy-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={shown} alt={`${startupName} logo`} className="h-full w-full object-contain" />
              </span>
            ) : (
              <Avatar name={startupName} size="lg" className="h-full w-full rounded-[24px] text-2xl" />
            )}
          </motion.div>
        </AnimatePresence>
        {preview ? (
          <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-ocean-600 px-2 py-0.5 text-[10px] font-semibold text-white shadow">
            Preview
          </span>
        ) : null}
      </div>

      <div className="min-w-0 flex-1 space-y-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            void pick(e.dataTransfer.files?.[0]);
          }}
          disabled={busy}
          className={cn(
            "flex w-full items-center gap-3 rounded-2xl border-2 border-dashed px-4 py-4 text-left transition",
            dragging ? "border-ocean-600 bg-ocean-50" : "border-navy-200 bg-canvas/60 hover:border-ocean-600 hover:bg-ocean-50/60",
            busy && "opacity-60",
          )}
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-ocean-600 shadow-sm">
            {preparing ? <Loader2 className="h-5 w-5 animate-spin" /> : <UploadCloud className="h-5 w-5" />}
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-tide">
              {shown ? "Replace logo" : "Upload your logo"} — drag it here or browse
            </span>
            <span className="block text-xs text-navy-500">PNG, JPG or WebP · square works best · up to 10 MB</span>
          </span>
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT.join(",")}
          className="hidden"
          onChange={(e) => {
            void pick(e.target.files?.[0]);
            e.target.value = "";
          }}
        />

        <div className="flex flex-wrap items-center gap-2">
          {preview ? (
            <>
              <button type="button" onClick={save} disabled={busy} className={buttonClass("primary", "sm")}>
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                {pending ? "Saving…" : "Save logo"}
              </button>
              <button type="button" onClick={() => setPreview(null)} disabled={busy} className={buttonClass("ghost", "sm")}>
                Cancel
              </button>
            </>
          ) : currentUrl ? (
            <button
              type="button"
              onClick={remove}
              onBlur={() => setConfirmRemove(false)}
              disabled={busy}
              className={cn(
                buttonClass("ghost", "sm"),
                confirmRemove && "border-red-300 bg-red-50 text-red-700 hover:bg-red-100",
              )}
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              {confirmRemove ? "Click again to remove" : "Remove logo"}
            </button>
          ) : null}
        </div>

        <AnimatePresence>
          {msg ? (
            <motion.p
              key={msg.text}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              role="status"
              className={cn(
                "flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs",
                msg.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600",
              )}
            >
              {msg.ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
              {msg.text}
            </motion.p>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
