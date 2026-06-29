import { net, protocol } from "electron";
import { pathToFileURL } from "url";

export const COMIC_FILE_SCHEME = "comic-file";

export function registerComicFileScheme(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: COMIC_FILE_SCHEME,
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        corsEnabled: true,
        stream: true,
      },
    },
  ]);
}

export function setupComicFileProtocol(): void {
  protocol.handle(COMIC_FILE_SCHEME, (request) => {
    const url = new URL(request.url);
    const filePath = decodeURIComponent(url.searchParams.get("path") ?? "");

    if (!filePath) {
      return new Response("Not Found", { status: 404 });
    }

    return net.fetch(pathToFileURL(filePath).href);
  });
}

export function makeComicFileUrl(filename: string): string {
  return `${COMIC_FILE_SCHEME}://local?path=${encodeURIComponent(filename)}`;
}
