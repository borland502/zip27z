import "@/globals";

import { Command } from "commander";
import { hello } from "@/index";
import { readdirSync, statSync, existsSync, unlinkSync, mkdtempSync, rmSync } from "fs";
import { join, extname, dirname, basename } from "path";
import { spawnSync } from "child_process";
import { tmpdir } from "os";

export const program = new Command();

program.name("zip27z").description("Tool for converting ZIP archives to 7Z format").version("0.0.2");

// Function to find all .zip files recursively
function findZipFiles(dir: string): string[] {
  let results: string[] = [];

  try {
    const items = readdirSync(dir);

    for (const item of items) {
      const fullPath = join(dir, item);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        results = results.concat(findZipFiles(fullPath));
      } else if (extname(fullPath).toLowerCase() === ".zip") {
        results.push(fullPath);
      }
    }
  } catch (err) {
    logger.error(`Error reading directory ${dir}:`, err);
  }

  return results;
}

// Function to check if a zip file is valid
function checkZipIntegrity(zipPath: string): boolean {
  const result = spawnSync("unzip", ["-t", zipPath]);
  return result.status === 0;
}

// Function to check if a 7z file is valid
function check7zIntegrity(archivePath: string): boolean {
  const result = spawnSync("7z", ["t", archivePath]);
  return result.status === 0;
}

/**
 * Converts a ZIP file to 7Z format.
 *
 * This function takes a ZIP file, extracts its contents to a temporary directory,
 * then compresses those contents into a 7Z file using maximum compression level (9).
 * The temporary directory is automatically cleaned up after the operation.
 *
 * @param zipPath - The file path of the ZIP file to be converted
 * @returns The path to the created 7Z file if successful, or null if conversion fails
 *
 * @example
 * const result = convertZipTo7z('/path/to/archive.zip');
 * if (result) {
 *   logger.log(`Successfully converted to ${result}`);
 * }
 */
function convertZipTo7z(zipPath: string): string | null {
  const dir = dirname(zipPath);
  const fileNameWithoutExt = basename(zipPath, ".zip");
  const outputPath = join(dir, `${fileNameWithoutExt}.7z`);

  // Create a unique temporary directory for extraction
  const tempDir = mkdtempSync(join(tmpdir(), "zip27z-"));

  try {
    logger.info(`Extracting ${zipPath} to temporary directory...`);
    // Extract the zip file to the temp directory
    const extractResult = spawnSync("unzip", ["-q", zipPath, "-d", tempDir]);
    if (extractResult.status !== 0) {
      logger.error(`Failed to extract ${zipPath}`);
      return null;
    }

    logger.info(`Compressing extracted contents to 7Z format...`);
    // Compress the extracted contents to 7z format
    const compressResult = spawnSync("7z", ["a", "-mx=9", outputPath, "."], {
      cwd: tempDir,
    });

    if (compressResult.status !== 0) {
      logger.error(`Failed to compress contents to ${outputPath}`);
      return null;
    }

    return outputPath;
  } catch (error) {
    logger.error(`Error during conversion: ${error}`);
    return null;
  } finally {
    // Clean up the temporary directory
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch (error) {
      logger.error(`Failed to clean up temporary directory ${tempDir}: ${error}`);
    }
  }
}

// Function to get file size in bytes
function getFileSize(filePath: string): number {
  return statSync(filePath).size;
}

// Main conversion function
async function convertAllZipsTo7z(rootDir: string): Promise<void> {
  logger.info(`Starting ZIP to 7Z conversion from ${rootDir}...`);

  // Find all zip files
  const zipFiles = findZipFiles(rootDir);
  logger.info(`Found ${zipFiles.length} ZIP files.`);

  if (zipFiles.length === 0) {
    logger.info("No ZIP files found. Exiting.");
    return;
  }

  let totalSaved = 0;
  let totalProcessed = 0;
  let totalFailed = 0;

  for (const zipFile of zipFiles) {
    logger.info(`\nProcessing: ${zipFile}`);

    // Check input zip integrity
    logger.info(`Checking integrity of source file...`);
    if (!checkZipIntegrity(zipFile)) {
      logger.error(`❌ Integrity check failed for input file: ${zipFile}. Skipping.`);
      totalFailed++;
      continue;
    }

    // Get original size
    const originalSize = getFileSize(zipFile);

    // Convert to 7z
    logger.info(`Converting to 7Z format...`);
    const outputFile = convertZipTo7z(zipFile);
    if (!outputFile || !existsSync(outputFile)) {
      logger.error(`❌ Failed to convert: ${zipFile}`);
      totalFailed++;
      continue;
    }

    // Check output 7z integrity
    logger.info(`Checking integrity of converted file...`);
    if (!check7zIntegrity(outputFile)) {
      logger.error(`❌ Integrity check failed for output file: ${outputFile}. Removing.`);
      try {
        unlinkSync(outputFile);
      } catch (e) {
        logger.error(`Failed to remove corrupted output file: ${outputFile}`, e);
      }
      totalFailed++;
      continue;
    }

    // Calculate space saved
    const newSize = getFileSize(outputFile);
    const saved = originalSize - newSize;
    const savedPercentage = (saved / originalSize) * 100;

    logger.info(`✅ Converted: ${zipFile} -> ${outputFile}`);
    logger.info(`   Original size: ${(originalSize / 1024).toFixed(2)} KB`);
    logger.info(`   New size: ${(newSize / 1024).toFixed(2)} KB`);
    logger.info(`   Saved: ${(saved / 1024).toFixed(2)} KB (${savedPercentage.toFixed(2)}%)`);

    totalSaved += saved;
    totalProcessed++;
  }

  logger.info("\n📊 Conversion Summary:");
  logger.info(`   Files processed: ${totalProcessed}`);
  logger.info(`   Files failed: ${totalFailed}`);
  logger.info(
    `   Total space saved: ${(totalSaved / 1024).toFixed(2)} KB (${(totalSaved / (1024 * 1024)).toFixed(2)} MB)`,
  );
}

// Standard hello command
program
  .command("hello")
  .description("Hello world command")
  .action(async () => {
    hello();
  });

// Default command to convert zip to 7z
program
  .argument("<directory>")
  .description("Convert all ZIP files to 7Z format recursively")
  .action(async (directory: string) => {
    try {
      await convertAllZipsTo7z(directory);
    } catch (error) {
      logger.error("Error during conversion:", error);
      process.exit(1);
    }
  });

program.parse(process.argv);
