import { LucideIcon } from "lucide-react";

interface EmptyPageProps {
  title: string;
  description: string;
  icon: LucideIcon;
  color: string;
}

export function EmptyPage({ title, description, icon: Icon, color }: EmptyPageProps) {
  return (
    <div
      className="p-6 min-h-full flex flex-col"
      style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
    >
      {/* Header */}
      <div className="mb-6">
        <p className="text-[11px] text-[#94A3B8] uppercase tracking-wider mb-1">
          Dashboard / {title}
        </p>
        <h1
          className="text-[#0F2035]"
          style={{ fontWeight: 600 }}
        >
          {title}
        </h1>
        <p className="text-[13px] text-[#64748B] mt-0.5">{description}</p>
      </div>

      {/* Empty state */}
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-sm">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: color + "18" }}
          >
            <Icon size={28} color={color} />
          </div>
          <h2
            className="text-[#1E293B] mb-2"
            style={{ fontWeight: 600 }}
          >
            {title}
          </h2>
          <p className="text-[13px] text-[#64748B] mb-4 leading-relaxed">
            {description}. This module is not yet available.
          </p>
          <div
            className="flex items-center justify-center gap-1.5 text-[12px]"
            style={{ color: "#94A3B8" }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-[#CBD5E1]" />
            <span>Coming soon</span>
          </div>
        </div>
      </div>
    </div>
  );
}
