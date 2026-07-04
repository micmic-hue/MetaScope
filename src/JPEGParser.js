import BinaryReader from "./BinaryReader.js";
import { InvalidFormatError } from "./Errors.js";
import { bytesToUtf8, concatBytes } from "./Utils.js";

const STANDALONE_MARKERS = new Set([0x01, 0xd0, 0xd1, 0xd2, 0xd3, 0xd4, 0xd5, 0xd6, 0xd7, 0xd8, 0xd9]);
const C2PA_JUMBF_LABEL = "http://ns.adobe.com/xap/1.0/";

export class JPEGParser {
    constructor(source) {
        this.reader = new BinaryReader(source);
    }

    parse() {
        const reader = this.reader;

        if (reader.readUint16() !== 0xffd8) {
            throw new InvalidFormatError("Invalid JPEG: missing SOI marker.");
        }

        const segments = [];

        while (!reader.eof()) {
            if (reader.readUint8() !== 0xff) {
                break;
            }

            let marker = reader.readUint8();

            while (marker === 0xff) {
                marker = reader.readUint8();
            }

            if (marker === 0xd9) {
                segments.push({ marker, name: "EOI", offset: reader.tell() - 2, length: 0, data: new Uint8Array() });
                break;
            }

            if (marker === 0xda) {
                const offset = reader.tell() - 2;
                const length = reader.readUint16();
                const data = reader.readBytes(length - 2);
                segments.push({ marker, name: "SOS", offset, length, data });
                break;
            }

            if (STANDALONE_MARKERS.has(marker)) {
                segments.push({ marker, name: markerName(marker), offset: reader.tell() - 2, length: 0, data: new Uint8Array() });
                continue;
            }

            const offset = reader.tell() - 2;
            const length = reader.readUint16();

            if (length < 2) {
                throw new InvalidFormatError("Invalid JPEG segment length.", { marker, offset, length });
            }

            const data = reader.readBytes(length - 2);
            segments.push({ marker, name: markerName(marker), offset, length, data });
        }

        return {
            type: "jpeg",
            segments,
            c2pa: this.extractC2PAFromSegments(segments),
            xmp: this.extractXMPFromSegments(segments)
        };
    }

    extractC2PAFromSegments(segments) {
        const app11 = segments.filter((segment) => segment.marker === 0xeb);
        const chunks = [];

        for (const segment of app11) {
            if (segment.data.length < 4) {
                continue;
            }

            const header = bytesToUtf8(segment.data.slice(0, 2));

            if (header === "JP") {
                chunks.push(segment.data);
            }
        }

        if (!chunks.length) {
            return null;
        }

        return {
            format: "jpeg-app11",
            chunks,
            bytes: concatBytes(chunks)
        };
    }

    extractXMPFromSegments(segments) {
        for (const segment of segments) {
            if (segment.marker !== 0xe1) {
                continue;
            }

            const text = bytesToUtf8(segment.data);

            if (text.startsWith(C2PA_JUMBF_LABEL) || text.includes("<x:xmpmeta")) {
                return {
                    format: "jpeg-app1-xmp",
                    bytes: segment.data,
                    text
                };
            }
        }

        return null;
    }

    static parse(source) {
        return new JPEGParser(source).parse();
    }
}

function markerName(marker) {
    if (marker >= 0xe0 && marker <= 0xef) {
        return `APP${marker - 0xe0}`;
    }

    if (marker >= 0xd0 && marker <= 0xd7) {
        return `RST${marker - 0xd0}`;
    }

    const names = {
        0xc0: "SOF0",
        0xc2: "SOF2",
        0xc4: "DHT",
        0xd8: "SOI",
        0xd9: "EOI",
        0xda: "SOS",
        0xdb: "DQT",
        0xdd: "DRI",
        0xfe: "COM"
    };

    return names[marker] || `0x${marker.toString(16).padStart(2, "0")}`;
}

export default JPEGParser;
