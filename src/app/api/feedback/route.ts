import { getServiceRoleClient } from "@/lib/supabaseServiceRole";
import { resolveAcademyMembership } from "@/lib/resolveAcademyMembership";
import { logger } from "@/lib/logger";
import { toErrorResponse } from "@/lib/errors";
import { NextRequest, NextResponse } from "next/server";

const ALLOWED_CATEGORIES = ["bug", "feature", "difficulty", "general"] as const;
type Category = (typeof ALLOWED_CATEGORIES)[number];
const MAX_BODY_LENGTH = 4000;
const MAX_METADATA_BYTES = 8 * 1024; // 8KB
const MAX_SCREENSHOT_BYTES = 1024 * 1024; // 1MB
const SCREENSHOT_BUCKET = "feedback-screenshots";

function isCategory(value: unknown): value is Category {
  return (
    typeof value === "string" &&
    (ALLOWED_CATEGORIES as readonly string[]).includes(value)
  );
}

/**
 * x-forwarded-for header 에서 client IP 추출.
 * Lightsail Nginx 가 client IP 를 X-Forwarded-For 첫 번째 항목으로 forwarding.
 * 여러 IP 있으면 첫 번째 (가장 가까운 client).
 */
function extractClientIp(request: NextRequest): string | null {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0].trim();
    if (first.length > 0) return first;
  }
  const xri = request.headers.get("x-real-ip");
  if (xri) return xri.trim();
  return null;
}

/**
 * Storage upload — client formData 의 screenshot blob 을 bucket 에 저장.
 * path: <academy_id>/<timestamp>-<random>.jpg
 * 실패 시 throw — caller 에서 screenshot 없이 insert 진행.
 */
async function uploadScreenshot(
  client: ReturnType<typeof getServiceRoleClient>,
  academyId: string,
  blob: Blob,
): Promise<string> {
  if (blob.size > MAX_SCREENSHOT_BYTES) {
    throw new Error(
      `SCREENSHOT_TOO_LARGE: 스크린샷이 ${MAX_SCREENSHOT_BYTES} bytes 를 초과합니다 (현재 ${blob.size}).`,
    );
  }
  const ext = blob.type === "image/png" ? "png" : "jpg";
  const path = `${academyId}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;

  const { error } = await client.storage
    .from(SCREENSHOT_BUCKET)
    .upload(path, blob, {
      contentType: blob.type || "image/jpeg",
      upsert: false,
    });
  if (error) {
    throw new Error(`SCREENSHOT_UPLOAD_FAILED: ${error.message}`);
  }
  return path; // bucket 내 path 만 저장 (signed URL 은 조회 시 발급)
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "userId is required" },
        { status: 400 },
      );
    }

    // 학원 멤버 (owner/admin/member) 만. share-token viewer 차단.
    let academyId: string;
    let role: string;
    try {
      const membership = await resolveAcademyMembership(userId);
      academyId = membership.academyId;
      role = membership.role;
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "FEEDBACK_REQUIRES_ACADEMY: 학원 멤버만 피드백 작성 가능합니다.",
        },
        { status: 403 },
      );
    }

    if (!role || !["owner", "admin", "member"].includes(role)) {
      return NextResponse.json(
        {
          success: false,
          error: "FEEDBACK_REQUIRES_MEMBER: 학원 멤버만 피드백 작성 가능합니다.",
        },
        { status: 403 },
      );
    }

    // Content-Type 분기: multipart (스크린샷 포함) vs JSON (텍스트만).
    const contentType = request.headers.get("content-type") ?? "";
    let body: string = "";
    let category: Category = "general";
    let url: string | null = null;
    let userAgent: string | null = null;
    let clientMetadata: Record<string, unknown> = {};
    let screenshotBlob: Blob | null = null;

    if (contentType.startsWith("multipart/form-data")) {
      const formData = await request.formData();
      body = String(formData.get("body") ?? "").trim();
      const rawCategory = formData.get("category");
      if (isCategory(rawCategory)) category = rawCategory;
      url = (formData.get("url") as string) ?? null;
      userAgent = (formData.get("userAgent") as string) ?? null;
      const metaRaw = formData.get("metadata");
      if (typeof metaRaw === "string" && metaRaw.length > 0) {
        if (metaRaw.length > MAX_METADATA_BYTES) {
          return NextResponse.json(
            { success: false, error: "FEEDBACK_METADATA_TOO_LARGE" },
            { status: 400 },
          );
        }
        try {
          clientMetadata = JSON.parse(metaRaw);
        } catch {
          // metadata invalid JSON → 무시
        }
      }
      const screenshot = formData.get("screenshot");
      if (screenshot instanceof Blob && screenshot.size > 0) {
        screenshotBlob = screenshot;
      }
    } else {
      const raw = await request.json().catch(() => ({}));
      body = typeof raw.body === "string" ? raw.body.trim() : "";
      if (isCategory(raw.category)) category = raw.category;
      url = typeof raw.url === "string" ? raw.url.slice(0, 500) : null;
      userAgent =
        typeof raw.userAgent === "string" ? raw.userAgent.slice(0, 500) : null;
      if (raw.metadata && typeof raw.metadata === "object") {
        clientMetadata = raw.metadata;
      }
    }

    if (body.length === 0) {
      return NextResponse.json(
        { success: false, error: "FEEDBACK_BODY_REQUIRED: 내용을 입력해주세요." },
        { status: 400 },
      );
    }
    if (body.length > MAX_BODY_LENGTH) {
      return NextResponse.json(
        {
          success: false,
          error: `FEEDBACK_BODY_TOO_LONG: 최대 ${MAX_BODY_LENGTH}자까지 작성 가능합니다.`,
        },
        { status: 400 },
      );
    }

    // Server-side metadata 추가 (role, academy_name, request 시점 info).
    const client = getServiceRoleClient();
    const ipAddress = extractClientIp(request);

    const { data: academyRow } = await client
      .from("academies")
      .select("name")
      .eq("id", academyId)
      .maybeSingle();

    const fullMetadata = {
      ...clientMetadata,
      server: {
        role,
        academy_name: academyRow?.name ?? null,
        captured_at: new Date().toISOString(),
      },
    };

    // 스크린샷 upload (있으면). 실패 시 screenshot_url null 로 진행.
    let screenshotPath: string | null = null;
    if (screenshotBlob) {
      try {
        screenshotPath = await uploadScreenshot(client, academyId, screenshotBlob);
      } catch (error) {
        logger.warn("스크린샷 upload 실패 — screenshot 없이 진행", {
          userId,
          academyId,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const { data, error } = await client
      .from("feedback")
      .insert({
        academy_id: academyId,
        user_id: userId,
        category,
        body,
        url,
        user_agent: userAgent,
        ip_address: ipAddress,
        metadata: fullMetadata,
        screenshot_url: screenshotPath,
      })
      .select("id, created_at")
      .single();

    if (error) {
      logger.error(
        "피드백 저장 실패",
        { userId, academyId, category },
        error as Error,
      );
      return NextResponse.json(
        {
          success: false,
          error: "FEEDBACK_INSERT_FAILED: 피드백 저장에 실패했습니다.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: data.id,
        createdAt: data.created_at,
        screenshotAttached: screenshotPath !== null,
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
