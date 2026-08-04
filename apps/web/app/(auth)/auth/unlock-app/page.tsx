"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const FORM_URL = "https://link.kpidriver.com/widget/form/vUL1Mt66ystym8CfIXHM";

export default function UnlockAppPage() {
  const router = useRouter();

  useEffect(() => {
    window.open(FORM_URL, "_blank", "noopener,noreferrer");
    router.replace("/dashboard");
  }, [router]);

  return null;
}
