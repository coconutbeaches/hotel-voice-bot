#!/usr/bin/env node

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

import { glob } from 'glob';

/**
 * Script to add or update "Last Updated: YYYY-MM-DD" to documentation and SQL files
 *
 * Usage:
 *   npm run docs:touch
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
 * Main function to update all documentation timestamps
 */
async function main() {
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
