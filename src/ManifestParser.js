import AssertionParser from "./AssertionParser.js";
import CBORDecoder from "./CBORDecoder.js";
import { findSubarray } from "./Utils.js";

export class ManifestParser {
    constructor(source) {
        this.bytes = source instanceof Uint8Array ? source : new Uint8Array(source);
    }

    parse() {
        const manifest = {
            type: "c2pa-manifest-store",
            bytes: this.bytes,
            rawSize: this.bytes.byteLength,
            cbor: null,
            assertions: [],
            errors: []
        };

        const cborOffset = findLikelyCborOffset(this.bytes);

        if (cborOffset >= 0) {
            try {
                manifest.cbor = CBORDecoder.decode(this.bytes.slice(cborOffset));
                manifest.cborOffset = cborOffset;
            } catch (error) {
                manifest.errors.push(error);
            }
        }

        const assertionHints = findAssertionHints(this.bytes);

        for (const hint of assertionHints) {
            const start = Math.max(0, hint - 64);
            const end = Math.min(this.bytes.length, hint + 4096);
            manifest.assertions.push(AssertionParser.parse(this.bytes.slice(start, end)));
        }

        return manifest;
    }

    static parse(source) {
        return new ManifestParser(source).parse();
    }
}

function findLikelyCborOffset(bytes) {
    for (let index = 0; index < bytes.length; index += 1) {
        const value = bytes[index];

        if ((value >= 0xa1 && value <= 0xbf) || (value >= 0x81 && value <= 0x9f)) {
            return index;
        }
    }

    return -1;
}

function findAssertionHints(bytes) {
    const hints = [];
    const labels = [
        "c2pa.actions",
        "c2pa.hash",
        "c2pa.thumbnail",
        "stds.schema-org",
        "adobe."
    ];

    for (const label of labels) {
        let offset = findSubarray(bytes, label);

        while (offset >= 0) {
            hints.push(offset);
            offset = findSubarray(bytes, label, offset + 1);
        }
    }

    return [...new Set(hints)].sort((a, b) => a - b);
}

export default ManifestParser;
