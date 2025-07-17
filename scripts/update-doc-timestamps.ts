#!/usr/bin/env node

import { readFileSync, writeFileSync, statSync } from 'fs';
import { extname } from 'path';

import { glob } from 'glob';

/**
 * Script to add or update "Last Updated: YYYY-MM-DD" to documentation and SQL files
 *
 * Usage:
 *   npm run docs:touch
 *   npm run docs:touch -- --check  # Check if timestamps are fresh (within 24h of commit)
 *   CI_COMMIT_DATE=2024-01-15 npm run docs:touch
 */

const LAST_UPDATED_REGEX =
  /^(<!--\s*)?Last Updated:\s*\d{4}-\d{2}-\d{2}(\s*-->)?$/gm;

/**
 * Get the date to use for the "Last Updated" field
 */
function getUpdateDate(): string {
  // Use CI_COMMIT_DATE if available (for CI/CD environments)
  const ciDate = process.env.CI_COMMIT_DATE;
  if (ciDate) {
    const date = new Date(ciDate);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  }

  // Otherwise use current date
  return new Date().toISOString().split('T')[0];
}

/**
 * Extract timestamp from file content based on file type
 */
function extractTimestamp(filePath: string): string | null {
  try {
    const content = readFileSync(filePath, 'utf8');
    const ext = extname(filePath).toLowerCase();
    
    switch (ext) {
      case '.md': {
        const match = content.match(/<!--\s*Last Updated:\s*(\d{4}-\d{2}-\d{2})\s*-->/i);
        return match ? match[1] : null;
      }
      case '.sql': {
        const match = content.match(/--\s*Last Updated:\s*(\d{4}-\d{2}-\d{2})/i);
        return match ? match[1] : null;
      }
      case '.yaml':
      case '.yml': {
        const match = content.match(/#\s*Last Updated:\s*(\d{4}-\d{2}-\d{2})/i);
        return match ? match[1] : null;
      }
      default:
        return null;
    }
  } catch (error) {
    console.error(`Error extracting timestamp from ${filePath}:`, error);
    return null;
  }
}

/**
 * Check if timestamp is within 24 hours of the reference date
 */
function isTimestampFresh(timestamp: string, referenceDate: string): boolean {
  const timestampDate = new Date(timestamp);
  const refDate = new Date(referenceDate);
  
  if (isNaN(timestampDate.getTime()) || isNaN(refDate.getTime())) {
    return false;
  }
  
  const timeDiff = Math.abs(refDate.getTime() - timestampDate.getTime());
  const hoursDiff = timeDiff / (1000 * 60 * 60);
  
  return hoursDiff <= 24;
}

/**
 * Add or update "Last Updated" metadata for Markdown files
 */
function updateMarkdownFile(filePath: string, updateDate: string): boolean {
  try {
    const content = readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    // Check if "Last Updated" already exists
    const existingIndex = lines.findIndex(line =>
      LAST_UPDATED_REGEX.test(line.trim())
    );

    const lastUpdatedLine = `<!-- Last Updated: ${updateDate} -->`;

    if (existingIndex !== -1) {
      // Update existing line
      lines[existingIndex] = lastUpdatedLine;
    } else {
      // Add new line after title or at beginning
      let insertIndex = 0;

      // Find the first H1 title and insert after it
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith('# ')) {
          insertIndex = i + 1;
          break;
        }
      }

      // Insert the last updated line with proper spacing
      if (insertIndex > 0 && lines[insertIndex]?.trim() !== '') {
        lines.splice(insertIndex, 0, '', lastUpdatedLine);
      } else {
        lines.splice(insertIndex, 0, lastUpdatedLine);
      }
    }

    const newContent = lines.join('\n');

    // Only write if content changed
    if (newContent !== content) {
      writeFileSync(filePath, newContent, 'utf8');
      return true;
    }

    return false;
  } catch (error) {
    console.error(`Error updating markdown file ${filePath}:`, error);
    return false;
  }
}

/**
 * Add or update "Last Updated" metadata for SQL files
 */
function updateSqlFile(filePath: string, updateDate: string): boolean {
  try {
    const content = readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    // Check if "Last Updated" already exists
    const existingIndex = lines.findIndex(line =>
      line.trim().startsWith('-- Last Updated:')
    );

    const lastUpdatedLine = `-- Last Updated: ${updateDate}`;

    if (existingIndex !== -1) {
      // Update existing line
      lines[existingIndex] = lastUpdatedLine;
    } else {
      // Add new line at the beginning
      lines.unshift(lastUpdatedLine, '');
    }

    const newContent = lines.join('\n');

    // Only write if content changed
    if (newContent !== content) {
      writeFileSync(filePath, newContent, 'utf8');
      return true;
    }

    return false;
  } catch (error) {
    console.error(`Error updating SQL file ${filePath}:`, error);
    return false;
  }
}

/**
 * Add or update "Last Updated" metadata for YAML files
 */
function updateYamlFile(filePath: string, updateDate: string): boolean {
  try {
    const content = readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    // Check if "Last Updated" already exists
    const existingIndex = lines.findIndex(line =>
      line.trim().startsWith('# Last Updated:')
    );

    const lastUpdatedLine = `# Last Updated: ${updateDate}`;

    if (existingIndex !== -1) {
      // Update existing line
      lines[existingIndex] = lastUpdatedLine;
    } else {
      // Add new line at the beginning
      lines.unshift(lastUpdatedLine, '');
    }

    const newContent = lines.join('\n');

    // Only write if content changed
    if (newContent !== content) {
      writeFileSync(filePath, newContent, 'utf8');
      return true;
    }

    return false;
  } catch (error) {
    console.error(`Error updating YAML file ${filePath}:`, error);
    return false;
  }
}

/**
 * Process a single file based on its extension
 */
function processFile(filePath: string, updateDate: string): boolean {
  const ext = extname(filePath).toLowerCase();

  switch (ext) {
    case '.md':
      return updateMarkdownFile(filePath, updateDate);
    case '.sql':
      return updateSqlFile(filePath, updateDate);
    case '.yaml':
    case '.yml':
      return updateYamlFile(filePath, updateDate);
    default:
      console.warn(`Unsupported file type: ${filePath}`);
      return false;
  }
}

/**
 * Check if all documentation timestamps are fresh (within 24h of commit date)
 */
async function checkTimestamps() {
  const referenceDate = getUpdateDate();
  console.log(`Checking documentation timestamps against: ${referenceDate}`);

  const patterns = [
    'docs/runbooks/**/*.md',
    'packages/**/migrations/*.sql',
    'openapi.yaml',
    '*.md',
  ];

  let totalFiles = 0;
  let staleFiles = 0;
  const staleFilesList: string[] = [];

  for (const pattern of patterns) {
    try {
      const files = glob.sync(pattern, {
        ignore: ['node_modules/**', '.git/**', 'dist/**', 'build/**'],
        absolute: true,
      });

      console.log(`\nChecking pattern: ${pattern}`);
      console.log(`Found ${files.length} files`);

      for (const file of files) {
        try {
          const stat = statSync(file);
          if (stat.isFile()) {
            totalFiles++;
            const timestamp = extractTimestamp(file);
            
            if (!timestamp) {
              staleFiles++;
              staleFilesList.push(file);
              console.log(`  ✗ Missing timestamp: ${file}`);
            } else if (!isTimestampFresh(timestamp, referenceDate)) {
              staleFiles++;
              staleFilesList.push(file);
              console.log(`  ✗ Stale timestamp (${timestamp}): ${file}`);
            } else {
              console.log(`  ✓ Fresh timestamp (${timestamp}): ${file}`);
            }
          }
        } catch (error) {
          console.error(`  ✗ Error checking ${file}:`, error);
          staleFiles++;
          staleFilesList.push(file);
        }
      }
    } catch (error) {
      console.error(`Error processing pattern ${pattern}:`, error);
    }
  }

  console.log(`\n📊 Check results:`);
  console.log(`   Total files checked: ${totalFiles}`);
  console.log(`   Fresh timestamps: ${totalFiles - staleFiles}`);
  console.log(`   Stale/missing timestamps: ${staleFiles}`);
  
  if (staleFiles > 0) {
    console.log(`\n❌ Files with stale/missing timestamps:`);
    staleFilesList.forEach(file => console.log(`   - ${file}`));
    console.log(`\nRun 'npm run docs:touch' to update timestamps.`);
    process.exit(1);
  } else {
    console.log(`\n✅ All timestamps are fresh!`);
  }
}

/**
 * Main function to update all documentation timestamps
 */
async function main() {
  const args = process.argv.slice(2);
  const isCheckMode = args.includes('--check');
  
  if (isCheckMode) {
    await checkTimestamps();
    return;
  }
  
  const updateDate = getUpdateDate();
  console.log(`Updating documentation timestamps to: ${updateDate}`);

  const patterns = [
    'docs/runbooks/**/*.md',
    'packages/**/migrations/*.sql',
    'openapi.yaml',
    '*.md',
  ];

  let totalFiles = 0;
  let updatedFiles = 0;

  for (const pattern of patterns) {
    try {
      const files = glob.sync(pattern, {
        ignore: ['node_modules/**', '.git/**', 'dist/**', 'build/**'],
        absolute: true,
      });

      console.log(`\nProcessing pattern: ${pattern}`);
      console.log(`Found ${files.length} files`);

      for (const file of files) {
        try {
          const stat = statSync(file);
          if (stat.isFile()) {
            totalFiles++;
            const wasUpdated = processFile(file, updateDate);
            if (wasUpdated) {
              updatedFiles++;
              console.log(`  ✓ Updated: ${file}`);
            } else {
              console.log(`  - Skipped: ${file} (no changes needed)`);
            }
          }
        } catch (error) {
          console.error(`  ✗ Error processing ${file}:`, error);
        }
      }
    } catch (error) {
      console.error(`Error processing pattern ${pattern}:`, error);
    }
  }

  console.log(`\n✅ Process complete:`);
  console.log(`   Total files processed: ${totalFiles}`);
  console.log(`   Files updated: ${updatedFiles}`);
  console.log(`   Files skipped: ${totalFiles - updatedFiles}`);
}

// Run the script
main().catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});
