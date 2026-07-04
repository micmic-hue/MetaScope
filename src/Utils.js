import { UnsupportedFormatError } from "./Errors.js";

export const JPEG_SOI = 0xffd8;
export const PNG_SIGNATURE = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export function toUint8Array(source) {
    if (source instanceof Uint8Array) {
        return source;
    }

    if (source instanceof ArrayBuffer) {
        return new Uint8Array(source);
    }

    if (source instanceof DataView) {
        return new Uint8Array(source.buffer, source.byteOffset, source.byteLength);
    }

    throw new TypeError("Expected ArrayBuffer, Uint8Array, or DataView.");
}

export function bytesToAscii(bytes) {
    let text = "";

    for (let index = 0; index < bytes.length; index += 1) {
        text += String.fromCharCode(bytes[index]);
    }

    return text;
}

export function asciiToBytes(text) {
    const bytes = new Uint8Array(text.length);

    for (let index = 0; index < text.length; index += 1) {
        bytes[index] = text.charCodeAt(index) & 0xff;
    }

    return bytes;
}

export function utf8ToBytes(text) {
    return new TextEncoder().encode(text);
}

export function bytesToUtf8(bytes) {
    return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}

export function concatBytes(parts) {
    const arrays = parts.map(toUint8Array);
    const total = arrays.reduce((sum, part) => sum + part.byteLength, 0);
    const output = new Uint8Array(total);
    let offset = 0;

    for (const part of arrays) {
        output.set(part, offset);
        offset += part.byteLength;
    }

    return output;
}

export function bytesEqual(left, right) {
    const a = toUint8Array(left);
    const b = toUint8Array(right);

    if (a.byteLength !== b.byteLength) {
        return false;
    }

    for (let index = 0; index < a.byteLength; index += 1) {
        if (a[index] !== b[index]) {
            return false;
        }
    }

    return true;
}

export function startsWithBytes(bytes, prefix) {
    const data = toUint8Array(bytes);
    const expected = toUint8Array(prefix);

    if (data.byteLength < expected.byteLength) {
        return false;
    }

    for (let index = 0; index < expected.byteLength; index += 1) {
        if (data[index] !== expected[index]) {
            return false;
        }
    }

    return true;
}

export function detectImageFormat(source) {
    const bytes = toUint8Array(source);

    if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xd8) {
        return "jpeg";
    }

    if (startsWithBytes(bytes, PNG_SIGNATURE)) {
        return "png";
    }

    if (bytes.length >= 12 && bytesToAscii(bytes.slice(4, 8)) === "ftyp") {
        return "bmff";
    }

    throw new UnsupportedFormatError("Unsupported image container.");
}

export function findSubarray(bytes, needle, start = 0) {
    const data = toUint8Array(bytes);
    const target = typeof needle === "string" ? asciiToBytes(needle) : toUint8Array(needle);

    if (target.length === 0) {
        return start;
    }

    for (let index = start; index <= data.length - target.length; index += 1) {
        let matches = true;

        for (let offset = 0; offset < target.length; offset += 1) {
            if (data[index + offset] !== target[offset]) {
                matches = false;
                break;
            }
        }

        if (matches) {
            return index;
        }
    }

    return -1;
}

export function readUint32BE(bytes, offset) {
    return (
        (bytes[offset] * 0x1000000) +
        ((bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3])
    ) >>> 0;
}

export function makeBoxType(value) {
    return typeof value === "string" ? value : bytesToAscii(value);
}
