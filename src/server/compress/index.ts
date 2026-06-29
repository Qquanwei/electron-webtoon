import fs from "fs/promises";
import path from "path";
import { ArchiveReader, libarchiveWasm } from "libarchive-wasm";
import {
  parseZipEntryPathnames,
  resolveArchiveEntryPathname,
} from "./pathnameEncoding";

type LibarchiveModule = Awaited<ReturnType<typeof libarchiveWasm>>;

export interface DecompressEntryProgress {
  processed: number;
  total: number;
}

let wasmModule: LibarchiveModule | null = null;

async function getWasmModule(): Promise<LibarchiveModule> {
  if (!wasmModule) {
    wasmModule = await libarchiveWasm();
  }
  return wasmModule;
}

function archiveBaseName(filePath: string): string {
  const base = path.basename(filePath);
  const lower = base.toLowerCase();
  const compoundExts = [".tar.gz", ".tar.bz2", ".tar.xz", ".tar.z"];

  for (const ext of compoundExts) {
    if (lower.endsWith(ext)) {
      return base.slice(0, -ext.length);
    }
  }

  const dot = base.lastIndexOf(".");
  return dot > 0 ? base.slice(0, dot) : base;
}

function resolveEntryPath(outputDir: string, entryPath: string): string {
  const normalized = entryPath.replace(/\\/g, "/").replace(/^\/+/, "");
  const destPath = path.resolve(outputDir, normalized);

  if (
    destPath !== outputDir &&
    !destPath.startsWith(`${outputDir}${path.sep}`)
  ) {
    throw new Error(`非法压缩包路径: ${entryPath}`);
  }

  return destPath;
}

function countFileEntries(
  mod: LibarchiveModule,
  archiveBuffer: Buffer,
): number {
  const reader = new ArchiveReader(mod, new Int8Array(archiveBuffer));

  try {
    let count = 0;
    for (const entry of reader.entries()) {
      if (entry.getFiletype() === "File") {
        count += 1;
      }
    }
    return count;
  } finally {
    reader.free();
  }
}

async function writeEntry(
  entry: {
    getPathname(): string;
    getFiletype(): string;
    readData(): Int8Array | undefined;
    skipData(): void;
  },
  outputDir: string,
  zipPathnames: string[] | null,
  entryIndex: number,
): Promise<boolean> {
  const entryPath = resolveArchiveEntryPathname(
    entry.getPathname(),
    zipPathnames,
    entryIndex,
  );
  if (!entryPath || entryPath === "." || entryPath === "./") {
    entry.skipData();
    return false;
  }

  const destPath = resolveEntryPath(outputDir, entryPath);
  const fileType = entry.getFiletype();

  if (fileType === "Directory") {
    await fs.mkdir(destPath, { recursive: true });
    entry.skipData();
    return false;
  }

  if (fileType === "SymbolicLink") {
    entry.skipData();
    return false;
  }

  if (fileType !== "File") {
    entry.skipData();
    return false;
  }

  const data = entry.readData();
  if (!data?.length) {
    return false;
  }

  await fs.mkdir(path.dirname(destPath), { recursive: true });
  await fs.writeFile(destPath, Buffer.from(data));
  return true;
}

export default async function decompress(
  file: string,
  outputPath: string,
  onEntry: (message: string) => void,
  onDone: (data: { pathname: string }) => void,
  onProgress?: (progress: DecompressEntryProgress) => void,
): Promise<void> {
  const outputDirname = path.resolve(outputPath, archiveBaseName(file));
  await fs.mkdir(outputDirname, { recursive: true });

  const archiveBuffer = await fs.readFile(file);
  const mod = await getWasmModule();
  const zipPathnames = parseZipEntryPathnames(archiveBuffer);
  const totalEntries = countFileEntries(mod, archiveBuffer);
  const reader = new ArchiveReader(mod, new Int8Array(archiveBuffer));
  let processedEntries = 0;
  let entryIndex = 0;

  onProgress?.({ processed: 0, total: totalEntries });

  try {
    if (reader.hasEncryptedData()) {
      throw new Error("暂不支持加密压缩包");
    }

    for (const entry of reader.entries()) {
      const wroteFile = await writeEntry(
        entry,
        outputDirname,
        zipPathnames,
        entryIndex,
      );
      entryIndex += 1;
      if (wroteFile) {
        processedEntries += 1;
        onProgress?.({ processed: processedEntries, total: totalEntries });
      }
    }

    onDone({ pathname: outputDirname });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    onEntry(`${file}解压失败:${message}`);
    throw error;
  } finally {
    reader.free();
  }
}
