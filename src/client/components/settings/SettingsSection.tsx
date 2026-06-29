import type { ReactNode } from "react";

interface SettingsSectionProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  children: ReactNode;
}

export function SettingsSection({
  icon,
  title,
  description,
  children,
}: SettingsSectionProps) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/50 overflow-hidden">
      <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-6 py-5">
        <div className="flex items-start gap-3">
          {icon ? (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600">
              {icon}
            </div>
          ) : null}
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
            {description ? (
              <p className="mt-1 text-sm leading-relaxed text-slate-500">
                {description}
              </p>
            ) : null}
          </div>
        </div>
      </div>
      <div className="px-6 py-5">{children}</div>
    </section>
  );
}

interface PathSettingFieldProps {
  label: string;
  hint: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  onChoose: () => void;
  onReset: () => void;
  onSave: () => void;
  saving?: boolean;
  resetting?: boolean;
}

export function PathSettingField({
  label,
  hint,
  value,
  placeholder,
  onChange,
  onChoose,
  onReset,
  onSave,
  saving,
  resetting,
}: PathSettingFieldProps) {
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-slate-700">{label}</label>
      <input
        className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 font-mono text-sm text-slate-800 placeholder:text-slate-400 transition focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-sky-500/10"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
          onClick={onChoose}
        >
          浏览文件夹
        </button>
        <button
          type="button"
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={onReset}
          disabled={resetting}
        >
          {resetting ? "重置中…" : "恢复默认"}
        </button>
        <button
          type="button"
          className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-sky-500/25 transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
          onClick={onSave}
          disabled={saving}
        >
          {saving ? "保存中…" : "保存"}
        </button>
      </div>
      <p className="text-sm leading-relaxed text-slate-500">{hint}</p>
    </div>
  );
}

export function SettingsActions({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap gap-2 pt-1 ${className}`}>{children}</div>
  );
}

export const settingsBtnSecondary =
  "rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";

export const settingsBtnPrimary =
  "rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-sky-500/25 transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60";
