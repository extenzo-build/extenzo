export function getLocalePrefix(pathname: string): string {
  if (pathname.startsWith("/en") || pathname === "/en" || pathname === "/en/") {
    return "/en";
  }
  return "";
}
