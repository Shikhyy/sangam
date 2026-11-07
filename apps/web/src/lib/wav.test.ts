import { describe, expect, it } from "vitest";
import { encodeWav } from "./wav";

async function bytesOf(blob: Blob): Promise<DataView> {
  return new DataView(await blob.arrayBuffer());
}

const ascii = (view: DataView, offset: number, length: number) =>
  Array.from({ length }, (_, i) => String.fromCharCode(view.getUint8(offset + i))).join("");

describe("encodeWav", () => {
  it("writes a valid 16-bit mono WAV header", async () => {
    const view = await bytesOf(encodeWav(new Float32Array(160), 16000));
    expect(ascii(view, 0, 4)).toBe("RIFF");
    expect(ascii(view, 8, 4)).toBe("WAVE");
    expect(ascii(view, 12, 4)).toBe("fmt ");
    expect(view.getUint16(20, true)).toBe(1);
    expect(view.getUint16(22, true)).toBe(1);
    expect(view.getUint32(24, true)).toBe(16000);
    expect(view.getUint16(34, true)).toBe(16);
    expect(ascii(view, 36, 4)).toBe("data");
    expect(view.getUint32(40, true)).toBe(320);
    expect(view.byteLength).toBe(44 + 320);
  });

  it("scales samples to 16-bit and clamps anything louder", async () => {
    const view = await bytesOf(encodeWav(new Float32Array([0, 1, -1, 2, -2]), 8000));
    const sample = (index: number) => view.getInt16(44 + index * 2, true);
    expect([sample(0), sample(1), sample(2), sample(3), sample(4)]).toEqual([0, 32767, -32768, 32767, -32768]);
  });

  it("makes a file of the right type", () => {
    expect(encodeWav(new Float32Array(1), 16000).type).toBe("audio/wav");
  });
});
