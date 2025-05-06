import "@/globals";

import { Command } from "commander";
import { hello } from "@/index";
import { readdirSync, statSync, existsSync, unlinkSync } from "fs";
import { join, extname, dirname, basename } from "path";
import { spawnSync } from "child_process";

export const program = new Command();

program.name("zip27z").description("Tool for converting ZIP archives to 7Z format").version("0.0.1");

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
    console.error(`Error reading directory ${dir}:`, err);
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

// Function to convert zip to 7z
function convertZipTo7z(zipPath: string): string | null {
  const dir = dirname(zipPath);
  const fileNameWithoutExt = basename(zipPath, ".zip");
  const outputPath = join(dir, `${fileNameWithoutExt}.7z`);

  const result = spawnSync("7z", ["a", "-mx=9", outputPath, zipPath]);

  return result.status === 0 ? outputPath : null;
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
      console.error(`❌ Integrity check failed for input file: ${zipFile}. Skipping.`);
      totalFailed++;
      continue;
    }

    // Get original size
    const originalSize = getFileSize(zipFile);

    // Convert to 7z
    logger.info(`Converting to 7Z format...`);
    const outputFile = convertZipTo7z(zipFile);
    if (!outputFile || !existsSync(outputFile)) {
      console.error(`❌ Failed to convert: ${zipFile}`);
      totalFailed++;
      continue;
    }

    // Check output 7z integrity
    logger.info(`Checking integrity of converted file...`);
    if (!check7zIntegrity(outputFile)) {
      console.error(`❌ Integrity check failed for output file: ${outputFile}. Removing.`);
      try {
        unlinkSync(outputFile);
      } catch (e) {
        console.error(`Failed to remove corrupted output file: ${outputFile}`, e);
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
      console.error("Error during conversion:", error);
      process.exit(1);
    }
  });

program.parse(process.argv);
