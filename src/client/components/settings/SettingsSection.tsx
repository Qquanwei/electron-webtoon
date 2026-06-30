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
    <section className="overflow-hidden border border-neutral-300 bg-white">
      <div className="border-b border-neutral-200 bg-white px-6 py-5">
        <div className="flex items-start gap-3">
          {icon ? (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-neutral-300 bg-neutral-50 text-black">
              {icon}
            </div>
          ) : null}
          <div>
            <h2 className="text-lg font-semibold text-black">{title}</h2>
            {description ? (
              <p className="mt-1 text-sm leading-relaxed text-neutral-500">
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
      <label className="block text-sm font-medium text-neutral-800">{label}</label>
      <input
        className="w-full border border-neutral-300 bg-neutral-50 px-4 py-3 font-mono text-sm text-black placeholder:text-neutral-400 transition focus:border-black focus:bg-white focus:outline-none focus:ring-2 focus:ring-black/10"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-800 transition hover:border-black hover:bg-neutral-50"
          onClick={onChoose}
        >
          浏览文件夹
        </button>
        <button
          type="button"
          className="border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-800 transition hover:border-black hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={onReset}
          disabled={resetting}
        >
          {resetting ? "重置中…" : "恢复默认"}
        </button>
        <button
          type="button"
          className="border border-black bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
          onClick={onSave}
          disabled={saving}
        >
          {saving ? "保存中…" : "保存"}
        </button>
      </div>
      <p className="text-sm leading-relaxed text-neutral-500">{hint}</p>
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
  "border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-800 transition hover:border-black hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50";

export const settingsBtnPrimary =
  "border border-black bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60";
