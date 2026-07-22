"use client";

import { useEffect, useMemo, useState } from "react";
import { MAX_TAGS_PER_ENTRY, SUGGESTED_BENEFIT_TAGS } from "@/lib/benefit-tags";

interface TagOption {
  slug: string;
  label: string;
}

export function BenefitTagsPicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (tags: string[]) => void;
}) {
  const [suggestions, setSuggestions] = useState<TagOption[]>(
    SUGGESTED_BENEFIT_TAGS.map((label) => ({
      slug: label.toLowerCase(),
      label,
    })),
  );
  const [custom, setCustom] = useState("");

  useEffect(() => {
    fetch("/api/tags")
      .then((r) => r.json())
      .then((j) => {
        if (Array.isArray(j.tags) && j.tags.length > 0) {
          setSuggestions(j.tags);
        }
      })
      .catch(() => {
        /* keep curated defaults */
      });
  }, []);

  const selected = useMemo(() => new Set(value.map((t) => t.toLowerCase())), [value]);

  function toggle(label: string) {
    const exists = value.some((t) => t.toLowerCase() === label.toLowerCase());
    if (exists) {
      onChange(value.filter((t) => t.toLowerCase() !== label.toLowerCase()));
      return;
    }
    if (value.length >= MAX_TAGS_PER_ENTRY) return;
    onChange([...value, label]);
  }

  function addCustom() {
    const label = custom.trim();
    if (!label) return;
    toggle(label);
    setCustom("");
  }

  const unusedSuggestions = suggestions.filter(
    (t) => !selected.has(t.label.toLowerCase()) && !selected.has(t.slug),
  );

  return (
    <div className="space-y-2">
      <label className="label">Beneficios / tags (opcional)</label>
      <p className="text-xs text-ink/50">
        Elegí de las sugerencias o agregá los tuyos. Máximo {MAX_TAGS_PER_ENTRY}.
      </p>

      {value.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {value.map((tag) => (
            <button
              key={tag}
              type="button"
              className="inline-flex items-center gap-1 rounded-full bg-ink px-2.5 py-1 text-xs text-white"
              onClick={() => toggle(tag)}
            >
              {tag}
              <span aria-hidden="true">×</span>
            </button>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-1.5">
        {unusedSuggestions.slice(0, 24).map((tag) => (
          <button
            key={tag.slug}
            type="button"
            disabled={value.length >= MAX_TAGS_PER_ENTRY}
            className="rounded-full border border-ink/15 bg-white px-2.5 py-1 text-xs text-ink/80 hover:border-ink/40 disabled:opacity-40"
            onClick={() => toggle(tag.label)}
          >
            + {tag.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          className="input"
          value={custom}
          maxLength={40}
          placeholder="Otro beneficio…"
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addCustom();
            }
          }}
        />
        <button
          type="button"
          className="btn-secondary shrink-0"
          disabled={!custom.trim() || value.length >= MAX_TAGS_PER_ENTRY}
          onClick={addCustom}
        >
          Agregar
        </button>
      </div>
    </div>
  );
}
