// 16-bit PCM WAV writer, used to hand the rendered soundtrack to ffmpeg.

/**
 * @param {Float32Array} left
 * @param {Float32Array} right
 * @param {number} sampleRate
 * @returns {Buffer}
 */
export function encodeWav(left, right, sampleRate) {
  const frames = left.length;
  const channels = 2;
  const bytesPerSample = 2;
  const dataSize = frames * channels * bytesPerSample;
  const buf = Buffer.alloc(44 + dataSize);

  buf.write('RIFF', 0, 'ascii');
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVE', 8, 'ascii');
  buf.write('fmt ', 12, 'ascii');
  buf.writeUInt32LE(16, 16);                                  // PCM chunk size
  buf.writeUInt16LE(1, 20);                                   // format: PCM
  buf.writeUInt16LE(channels, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * channels * bytesPerSample, 28);
  buf.writeUInt16LE(channels * bytesPerSample, 32);
  buf.writeUInt16LE(8 * bytesPerSample, 34);
  buf.write('data', 36, 'ascii');
  buf.writeUInt32LE(dataSize, 40);

  let o = 44;
  for (let i = 0; i < frames; i++) {
    for (const ch of [left, right]) {
      const v = Math.max(-1, Math.min(1, ch[i]));
      buf.writeInt16LE(Math.round(v * 32767), o);
      o += 2;
    }
  }
  return buf;
}
