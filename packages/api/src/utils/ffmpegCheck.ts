import { execSync } from 'child_process';
import { logger } from './logger.js';

export function verifyFFmpegInstallation(): boolean {
  try {
    execSync('ffmpeg -version', { stdio: 'pipe' });
    logger.info('[ffmpeg] FFmpeg is available and ready for audio conversion');
    return true;
  } catch (error) {
    logger.error('[ffmpeg] FFmpeg is not available - Safari/iOS audio conversion will fail', error);
    return false;
  }
}
