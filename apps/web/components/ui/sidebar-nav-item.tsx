"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { C } from "@/components/platform/brand";

interface Props {
  href:   string
  icon:   React.ElementType
  label:  string
  pillId: string
  exact?: boolean
}

export default function SidebarNavItem({ href, icon: Icon, label, pillId, exact }: Props) {
  const pathname = usePathname();
  const active   = exact ? pathname === href : pathname.startsWith(href);

  return (
    <Link href={href} style={{
      display: "flex", alignItems: "center", gap: 9,
      padding: "8px 10px", borderRadius: 9, marginBottom: 2,
      textDecoration: "none", position: "relative",
      border: "1px solid transparent",
    }}>
      {active && (
        <motion.div
          layoutId={pillId}
          style={{
            position: "absolute", inset: 0, borderRadius: 9,
            background: "linear-gradient(90deg, rgba(48,125,192,0.18) 0%, rgba(48,125,192,0.06) 100%)",
            border: "1px solid rgba(48,125,192,0.22)",
          }}
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
        />
      )}
      <Icon size={15} style={{ color: active ? C.blue : C.dimText, flexShrink: 0, position: "relative", zIndex: 1 }} />
      <span style={{
        fontSize: 13, fontWeight: active ? 700 : 500,
        color: active ? C.white : C.mutedText,
        flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        position: "relative", zIndex: 1,
      }}>
        {label}
      </span>
      {active && (
        <span style={{ width: 5, height: 5, borderRadius: "50%", background: C.blue, flexShrink: 0, position: "relative", zIndex: 1 }} />
      )}
    </Link>
  );
}
