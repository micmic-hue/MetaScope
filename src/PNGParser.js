import BinaryReader from "./BinaryReader.js";
import { InvalidFormatError } from "./Errors.js";
import { PNG_SIGNATURE, bytesEqual, bytesToUtf8 } from "./Utils.js";

const C2PA_CHUNK_TYPES = new Set(["caBX", "caBS"]);

export class PNGParser {
    constructor(source) {
        this.reader = new BinaryReader(source);
    }

    parse() {
        const reader = this.reader;
        const signature = reader.readBytes(8);

        if (!bytesEqual(signature, PNG_SIGNATURE)) {
            throw new InvalidFormatError("Invalid PNG: missing signature.");
        }

        const chunks = [];

        while (!reader.eof()) {
            const offset = reader.tell();
            const length = reader.readUint32();
            const type = reader.readAscii(4);
            const data = reader.readBytes(length);
            const crc = reader.readUint32();

            chunks.push({ offset, length, type, data, crc });

            if (type === "IEND") {
                break;
            }
        }

        return {
            type: "png",
            chunks,
            c2pa: this.extractC2PAFromChunks(chunks),
            text: this.extractTextChunks(chunks)
        };
    }

    extractC2PAFromChunks(chunks) {
        const c2paChunks = chunks.filter((chunk) => C2PA_CHUNK_TYPES.has(chunk.type));

        if (!c2paChunks.length) {
            return null;
        }

        return {
            format: "png-c2pa-chunk",
            chunks: c2paChunks,
            bytes: c2paChunks.length === 1 ? c2paChunks[0].data : concatChunkData(c2paChunks)
        };
    }

    extractTextChunks(chunks) {
        const text = [];

        for (const chunk of chunks) {
            if (chunk.type !== "tEXt" && chunk.type !== "iTXt" && chunk.type !== "zTXt") {
                continue;
            }

            text.push({
                type: chunk.type,
                text: bytesToUtf8(chunk.data),
                data: chunk.data
            });
        }

        return text;
    }

    static parse(source) {
        return new PNGParser(source).parse();
    }
}

function concatChunkData(chunks) {
    const total = chunks.reduce((sum, chunk) => sum + chunk.data.length, 0);
    const bytes = new Uint8Array(total);
    let offset = 0;

    for (const chunk of chunks) {
        bytes.set(chunk.data, offset);
        offset += chunk.data.length;
    }

    return bytes;
}

export default PNGParser;
