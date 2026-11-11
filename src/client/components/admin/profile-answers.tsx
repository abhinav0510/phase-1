import { Sparkles } from "lucide-react";
import { Card, CardHeader, CardBody } from "@/client/components/admin/ui/card";
import { Badge } from "@/client/components/ui/badge";
import { toRupees } from "@/shared/lib/currency";
import { PROFILE_FIELDS, SECTIONS, displayValue, isFilled, recordValue, type Answers } from "@/shared/lib/profile-fields";
import { cn } from "@/shared/lib/utils";
import type { Startup } from "@/shared/types/db";

/**
 * Every Complete Profile question, section by section: the founder's answer beside
 * what is on the startup record, with new or changed answers flagged. Used on the
 * profile review page and the startup page, so the team sees the same thing on both.
 */
export function ProfileAnswers({ startup, answers }: { startup: Startup | null; answers: Answers | null }) {
  return (
    <>
      {SECTIONS.map((s) => (
        <section key={s.key} data-profile-section={s.key}>
        <Card>
          <CardHeader title={s.title} />
          <CardBody className="p-0">
            <div className="divide-y divide-navy-50">
              <div className="hidden grid-cols-[220px_1fr_1fr] gap-4 px-5 py-2 text-[11px] font-semibold uppercase tracking-wide text-navy-400 md:grid">
                <span>Field</span>
                <span>Founder&apos;s answer</span>
                <span>On record</span>
              </div>
              {PROFILE_FIELDS.filter((f) => f.section === s.key).map((f) => {
                const answer = toRupees(displayValue(answers?.[f.key]));
                const rec = recordValue(f, startup) ?? "";
                const changed = isFilled(answer) && isFilled(rec) && answer !== rec;
                const added = isFilled(answer) && !isFilled(rec);
                return (
                  <div
                    key={f.key}
                    data-field={f.key}
                    className="grid grid-cols-1 gap-1 px-5 py-3 text-sm md:grid-cols-[220px_1fr_1fr] md:gap-4"
                  >
                    <span className="flex items-center gap-1.5 font-medium text-navy-700">
                      {f.label}
                      {f.matching ? <Sparkles className="h-3 w-3 text-[#9a6f2a]" aria-label="Used for matching" /> : null}
                    </span>
                    <span
                      className={cn(
                        "whitespace-pre-wrap break-words",
                        answer ? "text-navy-900" : "text-navy-300",
                        (changed || added) && "font-medium",
                      )}
                    >
                      {answer || "—"}
                      {changed ? <Badge tone="amber" className="ml-2">changed</Badge> : null}
                      {added ? <Badge tone="blue" className="ml-2">new</Badge> : null}
                    </span>
                    <span className="whitespace-pre-wrap break-words text-navy-500">{rec || "—"}</span>
                  </div>
                );
              })}
            </div>
          </CardBody>
        </Card>
        </section>
      ))}
    </>
  );
}
