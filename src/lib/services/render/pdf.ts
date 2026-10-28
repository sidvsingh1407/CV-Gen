import { execFile } from 'child_process';
import { promisify } from 'util';
import os from 'os';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';

const execFileAsync = promisify(execFile);

export async function isLibreOfficeAvailable(): Promise<boolean> {
  try {
    await execFileAsync('libreoffice', ['--version']);
    return true;
  } catch (err) {
    return false;
  }
}

export async function convertDocxToPdf(docxBuffer: Buffer): Promise<Buffer> {
  const isAvailable = await isLibreOfficeAvailable();
  if (!isAvailable) {
    throw new Error('PDF conversion is currently unavailable in this environment (LibreOffice not found).');
  }

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cv-gen-'));
  const inputFileName = `${uuidv4()}.docx`;
  const inputFilePath = path.join(tmpDir, inputFileName);

  try {
    await fs.writeFile(inputFilePath, docxBuffer);

    // Run LibreOffice conversion
    // libreoffice --headless --convert-to pdf <input> --outdir <dir>
    await execFileAsync('libreoffice', [
      '--headless',
      '--convert-to',
      'pdf',
      inputFilePath,
      '--outdir',
      tmpDir
    ]);

    const outputFileName = inputFileName.replace('.docx', '.pdf');
    const outputFilePath = path.join(tmpDir, outputFileName);

    const pdfBuffer = await fs.readFile(outputFilePath);
    return pdfBuffer;
  } finally {
    // Cleanup temporary directory and all files inside
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch (cleanupErr) {
      console.error('Failed to clean up temporary directory:', cleanupErr);
    }
  }
}
