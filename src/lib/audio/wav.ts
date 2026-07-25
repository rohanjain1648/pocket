// Minimal RIFF/WAVE chunk reader/writer — needed because Groq's Orpheus TTS
// only supports response_format "wav" (mp3 returns a 400), and naively
// Buffer.concat-ing multiple whole WAV files corrupts everything after the
// first one (each file has its own RIFF header and chunk layout, e.g. a
// LIST chunk before "data" that isn't fixed-offset).

interface WavData {
  fmt: Buffer; // the fmt chunk body (channels, sample rate, bit depth, ...)
  data: Buffer; // raw PCM samples
}

function findChunk(buf: Buffer, id: string, start: number): { offset: number; size: number } | null {
  let offset = start;
  while (offset + 8 <= buf.length) {
    const chunkId = buf.toString("ascii", offset, offset + 4);
    const chunkSize = buf.readUInt32LE(offset + 4);
    if (chunkId === id) return { offset: offset + 8, size: chunkSize };
    offset += 8 + chunkSize + (chunkSize % 2); // chunks are word-aligned
  }
  return null;
}

function parseWav(buf: Buffer): WavData {
  if (buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WAVE") {
    throw new Error("Not a WAV buffer");
  }
  const fmtChunk = findChunk(buf, "fmt ", 12);
  const dataChunk = findChunk(buf, "data", 12);
  if (!fmtChunk || !dataChunk) throw new Error("WAV missing fmt or data chunk");
  return {
    fmt: buf.subarray(fmtChunk.offset, fmtChunk.offset + fmtChunk.size),
    data: buf.subarray(dataChunk.offset, dataChunk.offset + dataChunk.size),
  };
}

/** Concatenates multiple standalone WAV buffers (same format) into one valid WAV file. */
export function concatWav(buffers: Buffer[]): Buffer {
  if (buffers.length === 0) throw new Error("concatWav requires at least one buffer");
  const parsed = buffers.map(parseWav);
  const fmt = parsed[0].fmt;
  const pcm = Buffer.concat(parsed.map((p) => p.data));

  const header = Buffer.alloc(44);
  header.write("RIFF", 0, "ascii");
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8, "ascii");
  header.write("fmt ", 12, "ascii");
  header.writeUInt32LE(16, 16); // standard fmt chunk is always written as 16 bytes (PCM)
  header.writeUInt16LE(fmt.readUInt16LE(0), 20); // audioFormat
  header.writeUInt16LE(fmt.readUInt16LE(2), 22); // channels
  header.writeUInt32LE(fmt.readUInt32LE(4), 24); // sampleRate
  header.writeUInt32LE(fmt.readUInt32LE(8), 28); // byteRate
  header.writeUInt16LE(fmt.readUInt16LE(12), 32); // blockAlign
  header.writeUInt16LE(fmt.readUInt16LE(14), 34); // bitsPerSample
  header.write("data", 36, "ascii");
  header.writeUInt32LE(pcm.length, 40);

  return Buffer.concat([header, pcm]);
}
