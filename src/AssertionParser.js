import CBORDecoder from "./CBORDecoder.js";
import { findSubarray } from "./Utils.js";

export class AssertionParser {
    constructor(source) {
        this.bytes = source instanceof Uint8Array ? source : new Uint8Array(source);
    }

    parse() {
        const cborOffset = findLikelyCborOffset(this.bytes);
        let cbor = null;
        let error = null;

        if (cborOffset >= 0) {
            try {
                cbor = CBORDecoder.decode(this.bytes.slice(cborOffset));
            } catch (decodeError) {
                error = decodeError;
            }
        }

        return {
            type: "assertion",
            bytes: this.bytes,
            cborOffset,
            cbor,
            error
        };
    }

    static parse(source) {
        return new AssertionParser(source).parse();
    }
}

function findLikelyCborOffset(bytes) {
    const candidates = [0xa0, 0xa1, 0xa2, 0xa3, 0xa4, 0xa5, 0x80, 0x81, 0x82, 0x83];

    for (let index = 0; index < bytes.length; index += 1) {
        if (candidates.includes(bytes[index])) {
            return index;
        }
    }

    return -1;
}

export default AssertionParser;
