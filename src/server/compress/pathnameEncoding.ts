import { TextDecoder } from "util";

const ZIP_EOCD_SIGNATURE = 0x06054b50;
const ZIP_CENTRAL_DIR_SIGNATURE = 0x02014b50;
const ZIP_UTF8_FLAG = 0x800;

const utf8Decoder = new TextDecoder("utf-8");
const gb18030Decoder = new TextDecoder("gb18030");

const CJK_PATTERN = /[\u3400-\u9fff\uf900-\ufaff]/;

function isZipArchive(buffer: Buffer): boolean {
  return (
    buffer.length >= 4 &&
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    (buffer[2] === 0x03 || buffer[2] === 0x05 || buffer[2] === 0x07)
  );
}

function findZipEndOfCentralDirectory(buffer: Buffer): number {
  const minPos = Math.max(0, buffer.length - 22 - 65535);
  for (let offset = buffer.length - 22; offset >= minPos; offset -= 1) {
    if (buffer.readUInt32LE(offset) === ZIP_EOCD_SIGNATURE) {
      return offset;
    }
  }
  return -1;
}

function decodeZipFilename(bytes: Buffer, isUtf8: boolean): string {
  if (isUtf8) {
    return utf8Decoder.decode(bytes);
  }

  const utf8 = utf8Decoder.decode(bytes);
  const gb18030 = gb18030Decoder.decode(bytes);

  if (CJK_PATTERN.test(utf8) && !utf8.includes("\uFFFD")) {
    return utf8;
  }
  if (CJK_PATTERN.test(gb18030)) {
    return gb18030;
  }
  if (!utf8.includes("\uFFFD")) {
    return utf8;
  }

  return gb18030;
}

export function parseZipEntryPathnames(buffer: Buffer): string[] | null {
  if (!isZipArchive(buffer)) {
    return null;
  }

  const eocdOffset = findZipEndOfCentralDirectory(buffer);
  if (eocdOffset < 0) {
    return null;
  }

  const centralDirOffset = buffer.readUInt32LE(eocdOffset + 16);
  const entryCount = buffer.readUInt16LE(eocdOffset + 10);
  const pathnames: string[] = [];
  let offset = centralDirOffset;

  for (let index = 0; index < entryCount; index += 1) {
    if (buffer.readUInt32LE(offset) !== ZIP_CENTRAL_DIR_SIGNATURE) {
      return null;
    }

    const flags = buffer.readUInt16LE(offset + 8);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const nameStart = offset + 46;
    const nameBytes = buffer.subarray(nameStart, nameStart + nameLength);

    pathnames.push(decodeZipFilename(nameBytes, (flags & ZIP_UTF8_FLAG) !== 0));
    offset += 46 + nameLength + extraLength + commentLength;
  }

  return pathnames;
}

export function fixPathnameEncoding(pathname: string): string {
  if (!pathname || CJK_PATTERN.test(pathname)) {
    return pathname;
  }

  const hasHighByte = [...pathname].some((char) => char.charCodeAt(0) > 127);
  if (!hasHighByte) {
    return pathname;
  }

  const bytes = Buffer.from(pathname, "latin1");
  const decoded = gb18030Decoder.decode(bytes);
  return CJK_PATTERN.test(decoded) ? decoded : pathname;
}

export function resolveArchiveEntryPathname(
  pathname: string,
  zipPathnames: string[] | null,
  entryIndex: number,
): string {
  const zipPathname = zipPathnames?.[entryIndex];
  if (zipPathname) {
    return zipPathname;
  }

  return fixPathnameEncoding(pathname);
}
