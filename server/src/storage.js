const fs = require('fs');
const path = require('path');

const localRootUploads = path.resolve(__dirname, '..', '..', 'uploads');
const dockerUploads = path.resolve(__dirname, '..', 'uploads');
const UPLOADS_DIR = process.env.UPLOADS_DIR || (
  fs.existsSync(localRootUploads) ? localRootUploads : dockerUploads
);

const TMP_DIR = path.join(UPLOADS_DIR, 'tmp');
const RESUMES_DIR = path.join(UPLOADS_DIR, 'resumes');

/**
 * Initializes the upload directories on disk.
 */
function initStorage() {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
  if (!fs.existsSync(TMP_DIR)) {
    fs.mkdirSync(TMP_DIR, { recursive: true });
  }
  if (!fs.existsSync(RESUMES_DIR)) {
    fs.mkdirSync(RESUMES_DIR, { recursive: true });
  }
}

/**
 * Starts a new upload session by creating a temporary folder.
 * @param {string} sessionId
 */
function startUpload(sessionId) {
  const sessionPath = path.join(TMP_DIR, sessionId);
  if (!fs.existsSync(sessionPath)) {
    fs.mkdirSync(sessionPath, { recursive: true });
  }
}

/**
 * Writes a chunk buffer to the session directory.
 * @param {string} sessionId
 * @param {number} chunkIndex
 * @param {Buffer} buffer
 */
function writeChunk(sessionId, chunkIndex, buffer) {
  const chunkPath = path.join(TMP_DIR, sessionId, `chunk_${chunkIndex}`);
  fs.writeFileSync(chunkPath, buffer);
}

/**
 * Concatenates all chunks in order, writes the final file, and cleans up the temporary directory.
 * @param {string} sessionId
 * @param {number} totalChunks
 * @param {string} candidateId
 * @param {string} fileName
 * @returns {string} The final file path of the assembled file.
 */
async function completeUpload(sessionId, totalChunks, candidateId, fileName) {
  const sessionPath = path.join(TMP_DIR, sessionId);

  // Create sanitized filename to prevent directory traversal
  const sanitizedFileName = path.basename(fileName);
  const finalFileName = `${candidateId}_${sanitizedFileName}`;
  const finalFilePath = path.join(RESUMES_DIR, finalFileName);

  const writeStream = fs.createWriteStream(finalFilePath);

  for (let i = 0; i < totalChunks; i++) {
    const chunkPath = path.join(sessionPath, `chunk_${i}`);
    if (!fs.existsSync(chunkPath)) {
      throw new Error(`Missing chunk ${i} for session ${sessionId}`);
    }
    const chunkBuffer = fs.readFileSync(chunkPath);
    writeStream.write(chunkBuffer);
  }

  // Wait for the file to be fully flushed to disk before proceeding —
  // downstream checksum/parsing steps need to read a complete file.
  await new Promise((resolve, reject) => {
    writeStream.on('finish', resolve);
    writeStream.on('error', reject);
    writeStream.end();
  });

  // Clean up chunk files and the session folder
  for (let i = 0; i < totalChunks; i++) {
    const chunkPath = path.join(sessionPath, `chunk_${i}`);
    if (fs.existsSync(chunkPath)) {
      fs.unlinkSync(chunkPath);
    }
  }
  if (fs.existsSync(sessionPath)) {
    fs.rmdirSync(sessionPath);
  }

  // Attempt upload to Supabase Storage if configured
  await uploadToSupabaseStorage(finalFileName, finalFilePath);

  // Return path relative to server root or absolute path
  return path.relative(path.join(__dirname, '..'), finalFilePath).replace(/\\/g, '/');
}

/**
 * Uploads assembled file to Supabase Storage if configured in process.env.
 * @param {string} fileName 
 * @param {string} filePath 
 */
async function uploadToSupabaseStorage(fileName, filePath) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
  const bucketName = process.env.SUPABASE_STORAGE_BUCKET || 'resumes';

  if (!supabaseUrl || !supabaseKey) return null;

  try {
    const fileBuffer = fs.readFileSync(filePath);
    const uploadUrl = `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/${bucketName}/${encodeURIComponent(fileName)}`;
    
    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apiKey': supabaseKey,
        'Content-Type': fileName.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream',
        'x-upsert': 'true'
      },
      body: fileBuffer
    });

    if (response.ok) {
      console.log(`[Supabase Storage] Successfully uploaded ${fileName} to bucket '${bucketName}'`);
      return `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/${bucketName}/${encodeURIComponent(fileName)}`;
    } else {
      const errText = await response.text();
      console.warn(`[Supabase Storage] Upload warning: ${response.status} - ${errText}`);
    }
  } catch (err) {
    console.warn(`[Supabase Storage] Upload failed: ${err.message}`);
  }
  return null;
}

module.exports = {
  initStorage,
  startUpload,
  writeChunk,
  completeUpload,
  uploadToSupabaseStorage,
};

