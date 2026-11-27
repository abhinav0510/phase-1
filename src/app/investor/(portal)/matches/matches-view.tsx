"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Check, ChevronDown, GraduationCap, Layers, Loader2, Pencil, Search, Sparkles, Target, TrendingUp, Users, Wallet, X } from "lucide-react";
import { Card, CardBody, Chip, CompanyLogo, buttonClass, inputClass } from "@/client/components/founder/ui";
import { cn } from "@/shared/lib/utils";
import { updateThesis } from "./actions";
import { removeLearnedRule } from "../deal-actions";

export interface CardData {
  id: number;
  name: string;
  logoUrl: string | null;
  oneLiner: string | null;
  sector: string;
  stage: string;
  room: string | null;
  raising: string;
  revenue: string | null;
  interestedCount: number;
  interested: boolean;
}

export interface Option {
  key: string;
  label: string;
}

export interface SectorGroup {
  group: string;
  options: Option[];
}

/** Stored instead of sector codes to mean "any sector" (sector-taxonomy ANY_SECTOR). */
const ANY = "ANY";

export interface EditorThesis {
  sectors: string[];
  stages: string[];
  chequeMinCr: number | null;
  chequeMaxCr: number | null;
  fromFile: boolean;
}

/**
 * Thesis editor + match list (clauses 2.4, 2.6). Every change saves at once
 * (chips on click, cheque fields on blur) and the server re-renders the list;
 * startups that newly match are tagged "New match". No Save button, no reload.
 */
export function MatchesView({
  thesis,
  sectorGroups,
  stageOptions,
  cards,
  doNotContact,
  learned,
}: {
  learned: { sectors: Option[]; stages: Option[]; minRevenueL: number | null };
  thesis: EditorThesis;
  sectorGroups: SectorGroup[];
  stageOptions: Option[];
  cards: CardData[];
  doNotContact: boolean;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(thesis);
  const [editing, setEditing] = useState(thesis.sectors.length === 0);
  const [pending, start] = useTransition();
  const [newIds, setNewIds] = useState<Set<number>>(new Set());
  const [notice, setNotice] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function save(next: EditorThesis) {
    setDraft(next);
    start(async () => {
      const res = await updateThesis({
        sectors: next.sectors,
        stages: next.stages,
        chequeMinCr: next.chequeMinCr,
        chequeMaxCr: next.chequeMaxCr,
      });
      if (!res.ok) {
        setNotice({ tone: "err", text: res.error });
        return;
      }
      setNewIds(new Set(res.added));
      const parts = [
        res.added.length ? `${res.added.length} new` : null,
        res.removed.length ? `${res.removed.length} no longer matching` : null,
      ].filter(Boolean);
      setNotice({ tone: "ok", text: parts.length ? `Thesis saved: ${parts.join(", ")}.` : "Thesis saved." });
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setNotice(null), 4000);
      router.refresh();
    });
  }

  const toggle = (field: "sectors" | "stages", key: string) => {
    const list = field === "sectors" ? draft.sectors.filter((k) => k !== ANY) : draft.stages;
    save({ ...draft, [field]: list.includes(key) ? list.filter((k) => k !== key) : [...list, key] });
  };

  /** Pick or clear a whole group of sectors in one save. */
  const setGroup = (keys: string[], on: boolean) => {
    const list = draft.sectors.filter((k) => k !== ANY);
    save({ ...draft, sectors: on ? [...new Set([...list, ...keys])] : list.filter((k) => !keys.includes(k)) });
  };

  const setAnySector = (on: boolean) => save({ ...draft, sectors: on ? [ANY] : [] });

  const setCheque = (field: "chequeMinCr" | "chequeMaxCr", raw: string) => {
    const v = raw.trim() === "" ? null : Number(raw);
    if (v !== null && (!Number.isFinite(v) || v < 0)) return;
    if (v === draft[field]) return;
    save({ ...draft, [field]: v });
  };

  const removeLearned = (kind: "sector" | "stage" | "revenue", value: string) =>
    start(async () => {
      await removeLearnedRule(kind, value);
      router.refresh();
    });

  const sectorOptions = sectorGroups.flatMap((g) => g.options);
  const labelOf = (opts: Option[], k: string) => (k === ANY ? "Any sector" : opts.find((o) => o.key === k)?.label ?? k);
  const noThesis = draft.sectors.length === 0 && cards.length === 0;

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-navy-100/70 bg-gradient-to-r from-ocean-50 via-white to-leaf-50 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-ocean-600 text-white shadow-md shadow-ocean-600/30">
              <Target className="h-5 w-5" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[15px] font-semibold text-tide">Your investment thesis</h2>
                {!noThesis ? (
                  <Chip tone={thesis.fromFile ? "neutral" : "green"}>{thesis.fromFile ? "From your Sidana profile" : "Edited by you"}</Chip>
                ) : null}
              </div>
              <p className="mt-0.5 text-xs text-navy-500">
                {noThesis ? "Pick the sectors you invest in to see startups that fit." : "Change anything and your matches update straight away."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {pending ? (
              <span className="flex items-center gap-1.5 text-xs text-navy-500">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…
              </span>
            ) : null}
            <button type="button" onClick={() => setEditing((e) => !e)} className={buttonClass(editing ? "primary" : "ghost", "sm")}>
              {editing ? <Check className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
              {editing ? "Done" : "Edit thesis"}
            </button>
          </div>
        </div>
        <CardBody className="space-y-4">
          {!editing ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <ThesisPanel
                icon={<Layers className="h-4 w-4" />}
                label="Sectors"
                hint={draft.sectors.includes(ANY) ? "Open to every sector" : `${draft.sectors.length} picked`}
              >
                <div className="flex flex-wrap gap-1.5">
                  {draft.sectors.length ? (
                    <>
                      {draft.sectors.slice(0, 5).map((s) => (
                        <Chip key={s} tone="ocean">
                          {labelOf(sectorOptions, s)}
                        </Chip>
                      ))}
                      {draft.sectors.length > 5 ? (
                        <button type="button" onClick={() => setEditing(true)} className="text-xs font-semibold text-ocean-700 hover:underline">
                          +{draft.sectors.length - 5} more
                        </button>
                      ) : null}
                    </>
                  ) : (
                    <span className="text-sm text-navy-400">None yet</span>
                  )}
                </div>
              </ThesisPanel>
              <ThesisPanel icon={<TrendingUp className="h-4 w-4" />} label="Stages" hint={draft.stages.length ? `${draft.stages.length} picked` : "Open to all"}>
                <div className="flex flex-wrap gap-1.5">
                  {draft.stages.length ? draft.stages.map((s) => <Chip key={s} tone="green">{labelOf(stageOptions, s)}</Chip>) : <Chip tone="neutral">Any stage</Chip>}
                </div>
              </ThesisPanel>
              <ThesisPanel icon={<Wallet className="h-4 w-4" />} label="Cheque size" hint="Per deal">
                <p className="text-xl font-bold tracking-tight text-tide">
                  {draft.chequeMinCr != null || draft.chequeMaxCr != null ? `₹${draft.chequeMinCr ?? 0}–${draft.chequeMaxCr ?? "any"} Cr` : "Any size"}
                </p>
              </ThesisPanel>
              <ThesisPanel icon={<Sparkles className="h-4 w-4" />} label="Matching now" hint="Live startups that fit" accent>
                <p className="text-3xl font-bold tracking-tight text-tide">{cards.length}</p>
              </ThesisPanel>
            </div>
          ) : null}
          {!editing && (learned.sectors.length || learned.stages.length || learned.minRevenueL != null) ? (
            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-dashed border-navy-200 px-4 py-3">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-navy-700">
                <GraduationCap className="h-4 w-4 text-ocean-600" /> Learned from your passes:
              </span>
              {learned.sectors.map((o) => (
                <LearnedChip key={`s-${o.key}`} text={`No ${o.label}`} onRemove={() => removeLearned("sector", o.key)} disabled={pending} />
              ))}
              {learned.stages.map((o) => (
                <LearnedChip key={`g-${o.key}`} text={`No ${o.label} rounds`} onRemove={() => removeLearned("stage", o.key)} disabled={pending} />
              ))}
              {learned.minRevenueL != null ? (
                <LearnedChip
                  text={`ARR at least ₹${learned.minRevenueL >= 100 ? `${Math.round(learned.minRevenueL) / 100} Cr` : `${learned.minRevenueL} L`}`}
                  onRemove={() => removeLearned("revenue", "")}
                  disabled={pending}
                />
              ) : null}
            </div>
          ) : null}
          {editing ? (
            <div className="space-y-4">
              <SectorPicker
                groups={sectorGroups}
                selected={draft.sectors}
                onToggle={(k) => toggle("sectors", k)}
                onGroup={setGroup}
                onAny={setAnySector}
                disabled={pending}
              />
              <ChipPicker label="Stages (none picked = any stage)" options={stageOptions} selected={draft.stages} onToggle={(k) => toggle("stages", k)} disabled={pending} />
              <div className="grid max-w-md grid-cols-2 gap-3">
                <label className="text-xs font-medium text-navy-600">
                  Minimum cheque (₹ Cr)
                  <input
                    type="number"
                    min={0}
                    step="0.1"
                    defaultValue={draft.chequeMinCr ?? ""}
                    onBlur={(e) => setCheque("chequeMinCr", e.target.value)}
                    className={cn(inputClass, "mt-1")}
                  />
                </label>
                <label className="text-xs font-medium text-navy-600">
                  Maximum cheque (₹ Cr)
                  <input
                    type="number"
                    min={0}
                    step="0.1"
                    defaultValue={draft.chequeMaxCr ?? ""}
                    onBlur={(e) => setCheque("chequeMaxCr", e.target.value)}
                    className={cn(inputClass, "mt-1")}
                  />
                </label>
              </div>
            </div>
          ) : null}

          {notice ? (
            <p role="status" className={cn("rounded-xl px-3 py-2 text-sm", notice.tone === "ok" ? "bg-leaf-50 text-leaf-700" : "bg-red-50 text-red-700")}>
              {notice.text}
            </p>
          ) : null}
        </CardBody>
      </Card>

      {doNotContact ? (
        <EmptyCard title="No startups to show" text="Please contact the Sidana team about your preferences." />
      ) : noThesis ? (
        <EmptyCard title="Set your thesis to see startups" text="Choose at least one sector above. Startups that fit appear here automatically." />
      ) : cards.length === 0 ? (
        <EmptyCard title="No startups fit right now" text="Try adding a sector or stage, or lowering the minimum cheque." />
      ) : (
        <>
          <p className="text-sm text-navy-500">
            <b className="text-tide">{cards.length}</b> {cards.length === 1 ? "startup fits" : "startups fit"} your thesis
          </p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {cards.map((c) => (
              <MatchCard key={c.id} card={c} isNew={newIds.has(c.id)} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Sector picker: picked sectors as removable chips, a search box, and the
 * agents' sectors folded into groups (open a group, or type to search).
 */
function SectorPicker({
  groups,
  selected,
  onToggle,
  onGroup,
  onAny,
  disabled,
}: {
  groups: SectorGroup[];
  selected: string[];
  onToggle: (key: string) => void;
  onGroup: (keys: string[], on: boolean) => void;
  onAny: (on: boolean) => void;
  disabled: boolean;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Set<string>>(new Set());
  const any = selected.includes(ANY);
  const picked = new Set(selected);
  const all = groups.flatMap((g) => g.options);
  const q = query.trim().toLowerCase();
  const shown = groups
    .map((g) => ({
      ...g,
      options: q ? g.options.filter((o) => o.label.toLowerCase().includes(q) || g.group.toLowerCase().includes(q)) : g.options,
    }))
    .filter((g) => g.options.length);

  const flip = (group: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });

  return (
    <fieldset className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <legend className="text-xs font-medium text-navy-600">
          Sectors{" "}
          <span className="text-navy-400">· {any ? "any sector" : `${selected.length} picked`}</span>
        </legend>
        <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-navy-700">
          <input
            type="checkbox"
            checked={any}
            disabled={disabled}
            onChange={(e) => onAny(e.target.checked)}
            className="h-4 w-4 rounded border-navy-300 text-ocean-600 focus:ring-ocean-500"
          />
          Open to any sector
        </label>
      </div>

      {!any && selected.length ? (
        <div className="flex flex-wrap gap-1.5" aria-label="Picked sectors">
          {selected.map((k) => (
            <span key={k} className="inline-flex items-center gap-1 rounded-full bg-ocean-600 py-1 pl-3 pr-1 text-xs font-semibold text-white">
              {all.find((o) => o.key === k)?.label ?? k}
              <button
                type="button"
                disabled={disabled}
                onClick={() => onToggle(k)}
                aria-label={`Remove ${all.find((o) => o.key === k)?.label ?? k}`}
                className="rounded-full p-0.5 hover:bg-white/20"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      ) : null}

      {any ? (
        <p className="rounded-xl bg-navy-50/70 px-3 py-2 text-xs text-navy-600">
          Every sector is shown. Untick “Open to any sector” to pick specific ones.
        </p>
      ) : (
        <div className="rounded-2xl ring-1 ring-navy-100">
          <div className="relative border-b border-navy-100">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search sectors, e.g. lending, HR, beauty"
              aria-label="Search sectors"
              className="w-full rounded-t-2xl bg-transparent py-2.5 pl-9 pr-3 text-sm text-tide placeholder:text-navy-400 focus:outline-none"
            />
          </div>
          {shown.length === 0 ? (
            <p className="px-4 py-4 text-sm text-navy-500">No sector matches “{query}”.</p>
          ) : (
            <ul className="divide-y divide-navy-100">
              {shown.map((g) => {
                const keys = g.options.map((o) => o.key);
                const count = keys.filter((k) => picked.has(k)).length;
                const isOpen = !!q || open.has(g.group);
                const allOn = count === keys.length;
                return (
                  <li key={g.group}>
                    <div className="flex items-center gap-2 px-4 py-2.5">
                      <button
                        type="button"
                        onClick={() => flip(g.group)}
                        aria-expanded={isOpen}
                        className="flex flex-1 items-center gap-2 text-left text-sm font-semibold text-tide"
                      >
                        <ChevronDown className={cn("h-4 w-4 text-navy-400 transition", isOpen ? "rotate-0" : "-rotate-90")} />
                        {g.group}
                        {count ? <span className="rounded-full bg-ocean-50 px-2 py-0.5 text-[11px] font-semibold text-ocean-700">{count} picked</span> : null}
                      </button>
                      {isOpen && !q ? (
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => onGroup(keys, !allOn)}
                          className="text-xs font-semibold text-ocean-700 hover:underline disabled:opacity-60"
                        >
                          {allOn ? "Clear group" : "Select all"}
                        </button>
                      ) : null}
                    </div>
                    {isOpen ? (
                      <div className="flex flex-wrap gap-1.5 px-4 pb-3">
                        {g.options.map((o) => {
                          const on = picked.has(o.key);
                          return (
                            <button
                              key={o.key}
                              type="button"
                              aria-pressed={on}
                              disabled={disabled}
                              onClick={() => onToggle(o.key)}
                              className={cn(
                                "rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition disabled:opacity-60",
                                on ? "bg-ocean-600 text-white ring-ocean-600" : "bg-white text-navy-700 ring-navy-200 hover:bg-navy-50",
                              )}
                            >
                              {on ? <Check className="mr-1 inline h-3 w-3" /> : null}
                              {o.label}
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </fieldset>
  );
}

function ChipPicker({
  label,
  options,
  selected,
  onToggle,
  disabled,
}: {
  label: string;
  options: Option[];
  selected: string[];
  onToggle: (key: string) => void;
  disabled: boolean;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-xs font-medium text-navy-600">{label}</legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const on = selected.includes(o.key);
          return (
            <button
              key={o.key}
              type="button"
              aria-pressed={on}
              disabled={disabled}
              onClick={() => onToggle(o.key)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition disabled:opacity-60",
                on ? "bg-ocean-600 text-white ring-ocean-600" : "bg-white text-navy-700 ring-navy-200 hover:bg-navy-50",
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function MatchCard({ card, isNew }: { card: CardData; isNew: boolean }) {
  return (
    <Card className={cn("flex flex-col", isNew && "ring-2 ring-leaf-400")}>
      <CardBody className="flex flex-1 flex-col gap-3">
        <div className="flex items-start gap-3">
          <CompanyLogo src={card.logoUrl} name={card.name} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <h3 className="truncate text-base font-semibold text-tide">{card.name}</h3>
              {isNew ? (
                <Chip tone="green">
                  <Sparkles className="h-3 w-3" /> New match
                </Chip>
              ) : null}
              {card.interested ? <Chip tone="ocean">Interested</Chip> : null}
            </div>
            {card.oneLiner ? <p className="mt-1 line-clamp-2 text-sm text-navy-500">{card.oneLiner}</p> : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Chip tone="ocean">
            <Check className="h-3 w-3" /> {card.sector}
          </Chip>
          <Chip tone="green">
            <Check className="h-3 w-3" /> {card.stage}
          </Chip>
          {card.room ? (
            <Chip tone="neutral">
              <Check className="h-3 w-3" /> Room {card.room}
            </Chip>
          ) : null}
        </div>

        <dl className="grid grid-cols-3 gap-2 rounded-2xl bg-navy-50/60 p-3 text-xs">
          <div>
            <dt className="text-navy-500">Raising</dt>
            <dd className="mt-0.5 font-semibold text-tide">{card.raising}</dd>
          </div>
          <div>
            <dt className="text-navy-500">Revenue</dt>
            <dd className="mt-0.5 font-semibold text-tide">{card.revenue ?? "—"}</dd>
          </div>
          <div>
            <dt className="flex items-center gap-1 text-navy-500">
              <Users className="h-3 w-3" /> Interested
            </dt>
            <dd className="mt-0.5 font-semibold text-tide">{card.interestedCount}</dd>
          </div>
        </dl>

        <div className="mt-auto pt-1">
          <Link href={`/investor/startup/${card.id}`} className={buttonClass("primary", "sm")}>
            View profile
          </Link>
        </div>
      </CardBody>
    </Card>
  );
}

function EmptyCard({ title, text }: { title: string; text: string }) {
  return (
    <Card>
      <CardBody className="py-10 text-center">
        <p className="text-base font-semibold text-tide">{title}</p>
        <p className="mt-1 text-sm text-navy-500">{text}</p>
      </CardBody>
    </Card>
  );
}

function ThesisPanel({
  icon,
  label,
  hint,
  accent,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-2xl p-4 ring-1",
        accent ? "bg-gradient-to-br from-ocean-100 to-leaf-50 ring-ocean-200/70" : "bg-navy-50/50 ring-navy-100/70",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-navy-600">{label}</span>
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-ocean-600 shadow-sm">{icon}</span>
      </div>
      <div className="flex-1">{children}</div>
      <p className="text-[11px] text-navy-500">{hint}</p>
    </div>
  );
}

function LearnedChip({ text, onRemove, disabled }: { text: string; onRemove: () => void; disabled: boolean }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-navy-50 py-1 pl-3 pr-1 text-xs font-semibold text-navy-700">
      {text}
      <button type="button" onClick={onRemove} disabled={disabled} aria-label={`Remove: ${text}`} className="rounded-full p-0.5 hover:bg-navy-100">
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}
