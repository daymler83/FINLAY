export function getAppBaseUrl(request: Request) {
  return process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin
}
