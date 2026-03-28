import fs from "fs";
import path from "path";
import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";

const guidesDirectoryCandidates = [
  path.join(process.cwd(), "content/guides"),
  path.resolve(process.cwd(), "../../content/guides"),
];

const guidesDirectory =
  guidesDirectoryCandidates.find((candidate) => fs.existsSync(candidate)) ??
  guidesDirectoryCandidates[0];

const guideSlugs = new Set(
  fs
    .readdirSync(guidesDirectory, { withFileTypes: true })
    .flatMap((entry) => {
      if (entry.isFile() && entry.name.endsWith(".md")) {
        return [entry.name.replace(/\.md$/, "")];
      }

      if (entry.isDirectory() && entry.name === "en") {
        return fs
          .readdirSync(path.join(guidesDirectory, entry.name), { withFileTypes: true })
          .filter((nestedEntry) => nestedEntry.isFile() && nestedEntry.name.endsWith(".md"))
          .map((nestedEntry) => nestedEntry.name.replace(/\.md$/, ""));
      }

      return [];
    })
);

const intlProxy = createMiddleware(routing);

function getMissingGuideRewritePath(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  const locale =
    segments[0] === "en" || segments[0] === "zh-TW" ? segments[0] : routing.defaultLocale;
  const routeOffset = locale === routing.defaultLocale && segments[0] !== "zh-TW" ? 0 : 1;

  if (segments[routeOffset] !== "learn" || segments.length !== routeOffset + 2) {
    return null;
  }

  const slug = segments[routeOffset + 1];
  if (guideSlugs.has(slug)) {
    return null;
  }

  return locale === routing.defaultLocale ? "/__guide-not-found__" : `/${locale}/__guide-not-found__`;
}

export default function proxy(request: NextRequest) {
  const rewritePath = getMissingGuideRewritePath(request.nextUrl.pathname);

  if (rewritePath) {
    const rewriteUrl = new URL(rewritePath, request.url);
    return NextResponse.rewrite(rewriteUrl);
  }

  return intlProxy(request);
}

export const config = {
  matcher: "/((?!api|auth|_next|_vercel|.*\\..*).*)",
};
