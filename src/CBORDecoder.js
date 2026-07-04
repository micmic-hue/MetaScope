import BinaryReader from "./BinaryReader.js";
import { ParseError } from "./Errors.js";
import { bytesToUtf8 } from "./Utils.js";

export class CBORDecoder {
    constructor(source) {
        this.reader = new BinaryReader(source);
    }

    decode() {
        const value = this.readItem();
        return value;
    }

    readItem() {
        const initial = this.reader.readUint8();
        const major = initial >> 5;
        const additional = initial & 0x1f;

        switch (major) {
            case 0:
                return this.readLength(additional);
            case 1:
                return -1 - this.readLength(additional);
            case 2:
                return this.reader.readBytes(Number(this.readLength(additional)));
            case 3:
                return bytesToUtf8(this.reader.readBytes(Number(this.readLength(additional))));
            case 4:
                return this.readArray(additional);
            case 5:
                return this.readMap(additional);
            case 6:
                return { tag: this.readLength(additional), value: this.readItem() };
            case 7:
                return this.readSimple(additional);
            default:
                throw new ParseError(`Unsupported CBOR major type ${major}.`);
        }
    }

    readLength(additional) {
        if (additional < 24) {
            return additional;
        }

        if (additional === 24) {
            return this.reader.readUint8();
        }

        if (additional === 25) {
            return this.reader.readUint16();
        }

        if (additional === 26) {
            return this.reader.readUint32();
        }

        if (additional === 27) {
            return this.reader.readBigUint64();
        }

        throw new ParseError("Indefinite CBOR lengths are not supported yet.");
    }

    readArray(additional) {
        const length = Number(this.readLength(additional));
        const output = [];

        for (let index = 0; index < length; index += 1) {
            output.push(this.readItem());
        }

        return output;
    }

    readMap(additional) {
        const length = Number(this.readLength(additional));
        const map = new Map();

        for (let index = 0; index < length; index += 1) {
            map.set(this.readItem(), this.readItem());
        }

        return map;
    }

    readSimple(additional) {
        if (additional === 20) {
            return false;
        }

        if (additional === 21) {
            return true;
        }

        if (additional === 22) {
            return null;
        }

        if (additional === 23) {
            return undefined;
        }

        if (additional === 26) {
            return this.reader.readFloat32();
        }

        if (additional === 27) {
            return this.reader.readFloat64();
        }

        throw new ParseError(`Unsupported CBOR simple value ${additional}.`);
    }

    static decode(source) {
        return new CBORDecoder(source).decode();
    }
}

export default CBORDecoder;
