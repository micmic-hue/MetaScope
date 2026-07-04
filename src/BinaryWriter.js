import { asciiToBytes, concatBytes, utf8ToBytes } from "./Utils.js";

export class BinaryWriter {
    constructor(initialCapacity = 1024) {
        if (!Number.isInteger(initialCapacity) || initialCapacity <= 0) {
            throw new RangeError("BinaryWriter initial capacity must be a positive integer.");
        }

        this.buffer = new ArrayBuffer(initialCapacity);
        this.view = new DataView(this.buffer);
        this.bytes = new Uint8Array(this.buffer);
        this.offset = 0;
    }

    get length() {
        return this.offset;
    }

    ensure(size) {
        const needed = this.offset + size;

        if (needed <= this.buffer.byteLength) {
            return;
        }

        let capacity = this.buffer.byteLength;

        while (capacity < needed) {
            capacity *= 2;
        }

        const next = new ArrayBuffer(capacity);
        new Uint8Array(next).set(this.bytes.slice(0, this.offset));
        this.buffer = next;
        this.view = new DataView(this.buffer);
        this.bytes = new Uint8Array(this.buffer);
    }

    writeUint8(value) {
        this.ensure(1);
        this.view.setUint8(this.offset, value);
        this.offset += 1;
        return this;
    }

    writeUint16(value, littleEndian = false) {
        this.ensure(2);
        this.view.setUint16(this.offset, value, littleEndian);
        this.offset += 2;
        return this;
    }

    writeUint24(value, littleEndian = false) {
        this.ensure(3);

        if (littleEndian) {
            this.bytes[this.offset] = value & 0xff;
            this.bytes[this.offset + 1] = (value >>> 8) & 0xff;
            this.bytes[this.offset + 2] = (value >>> 16) & 0xff;
        } else {
            this.bytes[this.offset] = (value >>> 16) & 0xff;
            this.bytes[this.offset + 1] = (value >>> 8) & 0xff;
            this.bytes[this.offset + 2] = value & 0xff;
        }

        this.offset += 3;
        return this;
    }

    writeUint32(value, littleEndian = false) {
        this.ensure(4);
        this.view.setUint32(this.offset, value, littleEndian);
        this.offset += 4;
        return this;
    }

    writeBigUint64(value, littleEndian = false) {
        this.ensure(8);
        this.view.setBigUint64(this.offset, BigInt(value), littleEndian);
        this.offset += 8;
        return this;
    }

    writeBytes(value) {
        const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
        this.ensure(bytes.byteLength);
        this.bytes.set(bytes, this.offset);
        this.offset += bytes.byteLength;
        return this;
    }

    writeAscii(text) {
        return this.writeBytes(asciiToBytes(text));
    }

    writeUtf8(text) {
        return this.writeBytes(utf8ToBytes(text));
    }

    writeNullTerminatedUtf8(text) {
        this.writeUtf8(text);
        return this.writeUint8(0);
    }

    align(value, fill = 0) {
        if (!Number.isInteger(value) || value <= 0) {
            throw new RangeError(`Invalid alignment ${value}`);
        }

        while (this.offset % value !== 0) {
            this.writeUint8(fill);
        }

        return this;
    }

    toUint8Array() {
        return this.bytes.slice(0, this.offset);
    }

    toArrayBuffer() {
        return this.toUint8Array().buffer;
    }

    static concat(parts) {
        return concatBytes(parts);
    }
}

export default BinaryWriter;
