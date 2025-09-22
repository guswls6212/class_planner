"use client";

import { AboutPageLayout } from "@/components/organisms/AboutPageLayout";
import AuthGuard from "../../components/atoms/AuthGuard";

export default function AboutPage() {
  return (
    <AuthGuard requireAuth={false}>
      <AboutPageLayout />
    </AuthGuard>
  );
}
