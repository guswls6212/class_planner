"use client";

import { AboutPageLayout } from "@/components/organisms/AboutPageLayout";
import AuthGuard from "../../components/atoms/AuthGuard";
import { useHiddenRedirect } from "../../hooks/useHiddenRedirect";

export default function AboutPage() {
  const hidden = useHiddenRedirect("aboutPage");
  if (hidden) return null;
  return (
    <AuthGuard requireAuth={false}>
      <AboutPageLayout />
    </AuthGuard>
  );
}
