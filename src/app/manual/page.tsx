"use client";

import { ManualPageLayout } from "@/components/organisms/ManualPageLayout";
import AuthGuard from "../../components/atoms/AuthGuard";

export default function ManualPage() {
  return (
    <AuthGuard requireAuth={true}>
      <ManualPageLayout />
    </AuthGuard>
  );
}
