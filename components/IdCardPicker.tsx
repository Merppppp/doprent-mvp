"use client";

import { useEffect, useRef, useState } from "react";
import { uploadIdCard } from "@/app/actions/id-cards";
import type { IdCardItem } from "@/app/actions/id-cards";
import { prepareImageFileForUpload } from "@/lib/image";

type Props = {
  /** Existing ID cards from getUserIdCards() — newest first. */
  initialCards: IdCardItem[];
  /** Name of the hidden input that carries the selected R2 path to the parent form. */
  inputName?: string;
  /** Called whenever the selected path changes (optional controlled mode). */
  onSelect?: (path: string) => void;
};

export default function IdCardPicker({ initialCards, inputName = "id_card_path", onSelect }: Props) {
  const [cards, setCards] = useState<IdCardItem[]>(initialCards);
  const [selectedPath, setSelectedPath] = useState<string>(
    initialCards[0]?.path ?? "",
  );
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [preparing, setPreparing] = useState(false);
  // A picked-and-compressed photo awaiting the user's confirmation. Shown as a
  // large preview; only uploaded to the server once they press "ใช้รูปนี้".
  const [pending, setPending] = useState<{ file: File; url: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  // Local blob: URLs created for just-uploaded cards (instant preview before the
  // server signed URL exists). Revoked on unmount to avoid leaking object URLs.
  const previewUrlsRef = useRef<string[]>([]);
  useEffect(() => () => {
    previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  function select(path: string) {
    setSelectedPath(path);
    onSelect?.(path);
  }

  // Step 1: pick a file → compress → show a large preview. Nothing is uploaded
  // yet; the user must review the photo and confirm it first.
  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file later
    if (!file) return;
    setUploadError("");
    // Drop any earlier pending preview before replacing it.
    if (pending) URL.revokeObjectURL(pending.url);
    setPending(null);
    setPreparing(true);

    // Downscale to <=1920px + re-encode WebP/JPEG (reuses product-image
    // compressor). An ID card stays fully legible and shrinks to well under the
    // server cap, so high-res phone photos no longer get rejected.
    let prepared: File;
    try {
      prepared = await prepareImageFileForUpload(file);
    } catch (err) {
      setPreparing(false);
      setUploadError(err instanceof Error ? err.message : "ไม่สามารถเตรียมไฟล์รูปภาพได้");
      return;
    }

    setPreparing(false);
    setPending({ file: prepared, url: URL.createObjectURL(prepared) });
  }

  // Step 2: confirm the previewed photo → upload → add it to the options list.
  async function confirmPending() {
    if (!pending) return;
    setUploadError("");
    setUploading(true);

    const fd = new FormData();
    fd.set("id_card", pending.file);
    const res = await uploadIdCard(fd);

    setUploading(false);
    if (!res.ok) {
      setUploadError(res.error);
      return;
    }

    // Reuse the pending blob: URL as the thumbnail (the server signed URL isn't
    // back yet). Hand ownership to previewUrlsRef so it's revoked on unmount.
    previewUrlsRef.current.push(pending.url);
    const newCard: IdCardItem = {
      id: res.id,
      path: res.path,
      signedUrl: pending.url,
      createdAt: new Date().toISOString(),
    };
    // Newest first; server already removed the oldest when at the limit.
    setCards((prev) => [newCard, ...prev].slice(0, 3));
    select(res.path);
    setPending(null);
  }

  // Discard the pending preview without uploading.
  function cancelPending() {
    if (pending) URL.revokeObjectURL(pending.url);
    setPending(null);
    setUploadError("");
  }

  return (
    <div className="grid gap-3">
      {/* Existing card thumbnails — radio-style selection */}
      {cards.length > 0 && (
        <div className="grid gap-2">
          {cards.map((card, i) => {
            const isSelected = selectedPath === card.path;
            return (
              <label
                key={card.id}
                className={[
                  "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors",
                  isSelected
                    ? "border-accent bg-accent-soft"
                    : "border-line bg-surface",
                ].join(" ")}
              >
                <input
                  type="radio"
                  name="id_card_radio"
                  value={card.path}
                  checked={isSelected}
                  onChange={() => select(card.path)}
                  className="w-[18px] h-[18px] accent-accent shrink-0"
                />
                {card.signedUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={card.signedUrl}
                    alt={`บัตรประชาชน ${i + 1}`}
                    className="w-16 h-10 object-cover rounded-md border border-line shrink-0"
                  />
                ) : (
                  <div className="w-16 h-10 rounded-md border border-line bg-bg shrink-0 flex items-center justify-center">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-ink-3"
                      aria-hidden="true"
                    >
                      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                      <circle cx="8" cy="10" r="2" />
                      <line x1="4" y1="20" x2="12" y2="14" />
                    </svg>
                  </div>
                )}
                <span className="text-[13px] text-ink-2">
                  {i === 0 ? "ล่าสุด" : `รูปที่ ${i + 1}`}
                </span>
              </label>
            );
          })}
        </div>
      )}

      {/* Hidden input carrying the selected path to the parent form submit */}
      <input type="hidden" name={inputName} value={selectedPath} />

      {/* Hidden file input — always mounted so it can be triggered from either
          the pick button or the "เลือกรูปอื่น" action in the preview. */}
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFile}
      />

      {pending ? (
        /* Step-2 large preview — review the photo before it's uploaded */
        <div className="grid gap-3 p-3 rounded-xl border border-accent bg-accent-soft">
          <div className="text-[13px] font-semibold text-ink">
            ตรวจสอบรูปบัตรให้ชัดก่อนยืนยัน
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={pending.url}
            alt="ตัวอย่างรูปบัตรประชาชน"
            className="w-full max-h-[60vh] object-contain rounded-lg border border-line bg-bg"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-primary flex-1 py-2.5 text-[14px]"
              onClick={confirmPending}
              disabled={uploading}
            >
              {uploading ? "กำลังอัปโหลด..." : "ใช้รูปนี้"}
            </button>
            <button
              type="button"
              className="btn btn-outline py-2.5 px-4 text-[14px]"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              เลือกรูปอื่น
            </button>
            <button
              type="button"
              className="btn btn-outline py-2.5 px-4 text-[14px]"
              onClick={cancelPending}
              disabled={uploading}
            >
              ยกเลิก
            </button>
          </div>
        </div>
      ) : (
        /* Step-1 pick button */
        <div>
          <button
            type="button"
            className="btn btn-outline text-[13px] py-2 px-4"
            onClick={() => fileRef.current?.click()}
            disabled={preparing}
          >
            {preparing
              ? "กำลังเตรียมรูป..."
              : cards.length === 0
                ? "เลือกรูปถ่ายบัตรประชาชน"
                : "อัปโหลดรูปใหม่"}
          </button>
          {cards.length > 0 && (
            <p className="text-[12px] text-ink-3 mt-1">
              อัปโหลดรูปใหม่จะแทนที่รูปเก่าสุดโดยอัตโนมัติ (เก็บได้สูงสุด 3 รูป)
            </p>
          )}
        </div>
      )}

      {uploadError && (
        <p className="text-[13px] text-danger">{uploadError}</p>
      )}
    </div>
  );
}
