"use client";
import Link from "next/link";
import type { EnvironmentSource } from "@/lib/v3/environment-form";
import { EnvironmentSummary } from "./environment-summary";
import { Standards } from "./standards";
import { storedLayoutFile } from "@/lib/v3/layout-file";
import { ResultLayoutEditor } from "./result-layout-editor";
export function EnvironmentResult({
  data,
  onSaved,
}: {
  data: EnvironmentSource;
  onSaved: () => void;
}) {
  const code = encodeURIComponent(data.submission_code),
    base = encodeURIComponent(data.revision.revision_id),
    form = `/assessment/environment-form?category=${data.assessment_category}&base=${base}`,
    canRetest = data.is_latest && data.can_retest && !data.revision.is_pass;
  return (
    <section className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap gap-3 print:hidden">
        {canRetest && (
          <Link
            className="btn-primary-gradient rounded-xl px-3 py-2"
            href={`${form}&retest=${code}`}
          >
            ประเมินวัดซ้ำ
          </Link>
        )}
      </div>
      <EnvironmentSummary
        revision={data.revision}
        layoutFile={storedLayoutFile(data.revision.layout_file_id, data.layout)}
        layoutEditor={
          data.is_latest ? (
            <ResultLayoutEditor data={data} onSaved={onSaved} />
          ) : undefined
        }
      />
      <Standards
        category={data.assessment_category}
        isPass={data.revision.is_pass}
        failedCount={
          data.revision.observations.filter((o) => !o.result.is_pass).length
        }
        isArea={data.revision.observations[0]?.unit.kind === "light_area"}
        snapshot={data.revision.observations[0]?.result.standard}
      />
    </section>
  );
}
