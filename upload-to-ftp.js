import { Client } from 'basic-ftp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function uploadToFTP() {
  const client = new Client();
  client.ftp.verbose = true;

  try {
    await client.access({
      host: 'c111927.sgvps.net',
      port: 21,
      user: 'dev@followerfabrik.de',
      password: 't4_5c8OD11$ka1',
      secure: false
    });

    console.log('Connected to FTP server');

    // First, let's see what's in the remote directory
    const list = await client.list();
    console.log('Current directory contents:', list.map(item => item.name));

    // We're already in the right directory (this appears to be the web root)
    console.log('Uploading to current directory...');

    // Upload all files from dist directory
    await client.uploadFromDir(path.join(__dirname, 'dist'), '.');

    console.log('Upload completed successfully!');
  } catch (err) {
    console.error('FTP Error:', err);
  }

  client.close();
}

uploadToFTP();