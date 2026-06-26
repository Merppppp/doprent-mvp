"use client";

import { useRef, useState } from "react";
import { uploadIdCard } from "@/app/actions/id-cards";
import type { IdCardItem } from "@/app/actions/id-cards";

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
  const fileRef = useRef<HTMLInputElement>(null);

  function select(path: string) {
    setSelectedPath(path);
    onSelect?.(path);
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError("");
    setUploading(true);

    const fd = new FormData();
    fd.set("id_card", file);
    const res = await uploadIdCard(fd);

    setUploading(false);
    // Reset the file input so the same file can be re-uploaded if needed.
    e.target.value = "";

    if (!res.ok) {
      setUploadError(res.error);
      return;
    }

    // Build a temporary card entry (no signed URL; thumbnail falls back to icon).
    const newCard: IdCardItem = {
      id: res.id,
      path: res.path,
      signedUrl: "",
      createdAt: new Date().toISOString(),
    };

    setCards((prev) => {
      // Newest first; server already removed oldest when at limit.
      return [newCard, ...prev].slice(0, 3);
    });

    select(res.path);
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

      {/* Upload new photo button */}
      <div>
        <button
          type="button"
          className="btn btn-outline text-[13px] py-2 px-4"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          {uploading
            ? "กำลังอัปโหลด..."
            : cards.length === 0
              ? "เลือกรูปถ่ายบัตรประชาชน"
              : "อัปโหลดรูปใหม่"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFile}
        />
        {cards.length > 0 && (
          <p className="text-[12px] text-ink-3 mt-1">
            อัปโหลดรูปใหม่จะแทนที่รูปเก่าสุดโดยอัตโนมัติ (เก็บได้สูงสุด 3 รูป)
          </p>
        )}
      </div>

      {uploadError && (
        <p className="text-[13px] text-danger">{uploadError}</p>
      )}
    </div>
  );
}
