/**
 * MetaScope
 * BinaryReader
 *
 * Safe sequential binary reader for ArrayBuffer and Uint8Array sources.
 */

export class BinaryReader {
    /**
     * @param {ArrayBuffer|Uint8Array|DataView} source
     */
    constructor(source) {
        if (source instanceof DataView) {
            this.buffer = source.buffer.slice(
                source.byteOffset,
                source.byteOffset + source.byteLength
            );
        } else if (source instanceof Uint8Array) {
            this.buffer = source.buffer.slice(
                source.byteOffset,
                source.byteOffset + source.byteLength
            );
        } else if (source instanceof ArrayBuffer) {
            this.buffer = source.slice(0);
        } else {
            throw new TypeError("BinaryReader expects ArrayBuffer, Uint8Array, or DataView.");
        }

        this.view = new DataView(this.buffer);
        this.bytes = new Uint8Array(this.buffer);
        this.offset = 0;
        this.stack = [];
        this.decoder = new TextDecoder("utf-8", { fatal: false });
    }

    get length() {
        return this.buffer.byteLength;
    }

    get position() {
        return this.offset;
    }

    tell() {
        return this.offset;
    }

    remaining() {
        return this.length - this.offset;
    }

    eof() {
        return this.offset >= this.length;
    }

    ensure(size, offset = this.offset) {
        if (!Number.isInteger(size) || size < 0) {
            throw new RangeError(`Invalid read size ${size}`);
        }

        if (!Number.isInteger(offset) || offset < 0) {
            throw new RangeError(`Invalid read offset ${offset}`);
        }

        if (offset + size > this.length) {
            throw new RangeError(
                `Read outside buffer (offset=${offset}, size=${size}, length=${this.length})`
            );
        }
    }

    seek(position) {
        if (!Number.isInteger(position) || position < 0 || position > this.length) {
            throw new RangeError(`Invalid seek position ${position}`);
        }

        this.offset = position;
        return this;
    }

    skip(bytes) {
        if (!Number.isInteger(bytes)) {
            throw new RangeError(`Invalid skip size ${bytes}`);
        }

        return this.seek(this.offset + bytes);
    }

    rewind(bytes) {
        if (!Number.isInteger(bytes) || bytes < 0) {
            throw new RangeError(`Invalid rewind size ${bytes}`);
        }

        return this.seek(this.offset - bytes);
    }

    push() {
        this.stack.push(this.offset);
        return this;
    }

    pop() {
        if (!this.stack.length) {
            throw new Error("BinaryReader stack is empty.");
        }

        this.offset = this.stack.pop();
        return this;
    }

    discardPush() {
        if (!this.stack.length) {
            throw new Error("BinaryReader stack is empty.");
        }

        this.stack.pop();
        return this;
    }

    align(value) {
        if (!Number.isInteger(value) || value <= 0) {
            throw new RangeError(`Invalid alignment ${value}`);
        }

        const mod = this.offset % value;

        if (mod !== 0) {
            this.skip(value - mod);
        }

        return this;
    }

    at(position, callback) {
        if (typeof callback !== "function") {
            throw new TypeError("BinaryReader.at expects a callback.");
        }

        this.push();

        try {
            this.seek(position);
            return callback(this);
        } finally {
            this.pop();
        }
    }

    subreader(length) {
        return new BinaryReader(this.readBytes(length));
    }

    readUint8() {
        this.ensure(1);
        const value = this.view.getUint8(this.offset);
        this.offset += 1;
        return value;
    }

    readInt8() {
        this.ensure(1);
        const value = this.view.getInt8(this.offset);
        this.offset += 1;
        return value;
    }

    peekUint8() {
        this.ensure(1);
        return this.view.getUint8(this.offset);
    }

    readBool() {
        return this.readUint8() !== 0;
    }

    readUint16(littleEndian = false) {
        this.ensure(2);
        const value = this.view.getUint16(this.offset, littleEndian);
        this.offset += 2;
        return value;
    }

    readInt16(littleEndian = false) {
        this.ensure(2);
        const value = this.view.getInt16(this.offset, littleEndian);
        this.offset += 2;
        return value;
    }

    peekUint16(littleEndian = false) {
        this.ensure(2);
        return this.view.getUint16(this.offset, littleEndian);
    }

    peekInt16(littleEndian = false) {
        this.ensure(2);
        return this.view.getInt16(this.offset, littleEndian);
    }

    readUint24(littleEndian = false) {
        this.ensure(3);

        const value = littleEndian
            ? this.bytes[this.offset]
                | (this.bytes[this.offset + 1] << 8)
                | (this.bytes[this.offset + 2] << 16)
            : (this.bytes[this.offset] << 16)
                | (this.bytes[this.offset + 1] << 8)
                | this.bytes[this.offset + 2];

        this.offset += 3;
        return value >>> 0;
    }

    readInt24(littleEndian = false) {
        const value = this.readUint24(littleEndian);
        return value & 0x800000 ? value - 0x1000000 : value;
    }

    peekUint24(littleEndian = false) {
        this.ensure(3);

        return (littleEndian
            ? this.bytes[this.offset]
                | (this.bytes[this.offset + 1] << 8)
                | (this.bytes[this.offset + 2] << 16)
            : (this.bytes[this.offset] << 16)
                | (this.bytes[this.offset + 1] << 8)
                | this.bytes[this.offset + 2]) >>> 0;
    }

    peekInt24(littleEndian = false) {
        const value = this.peekUint24(littleEndian);
        return value & 0x800000 ? value - 0x1000000 : value;
    }

    readUint32(littleEndian = false) {
        this.ensure(4);
        const value = this.view.getUint32(this.offset, littleEndian);
        this.offset += 4;
        return value;
    }

    readInt32(littleEndian = false) {
        this.ensure(4);
        const value = this.view.getInt32(this.offset, littleEndian);
        this.offset += 4;
        return value;
    }

    peekUint32(littleEndian = false) {
        this.ensure(4);
        return this.view.getUint32(this.offset, littleEndian);
    }

    peekInt32(littleEndian = false) {
        this.ensure(4);
        return this.view.getInt32(this.offset, littleEndian);
    }

    readBigUint64(littleEndian = false) {
        this.ensure(8);
        const value = this.view.getBigUint64(this.offset, littleEndian);
        this.offset += 8;
        return value;
    }

    readBigInt64(littleEndian = false) {
        this.ensure(8);
        const value = this.view.getBigInt64(this.offset, littleEndian);
        this.offset += 8;
        return value;
    }

    peekBigUint64(littleEndian = false) {
        this.ensure(8);
        return this.view.getBigUint64(this.offset, littleEndian);
    }

    peekBigInt64(littleEndian = false) {
        this.ensure(8);
        return this.view.getBigInt64(this.offset, littleEndian);
    }

    readFloat32(littleEndian = false) {
        this.ensure(4);
        const value = this.view.getFloat32(this.offset, littleEndian);
        this.offset += 4;
        return value;
    }

    readFloat64(littleEndian = false) {
        this.ensure(8);
        const value = this.view.getFloat64(this.offset, littleEndian);
        this.offset += 8;
        return value;
    }

    peekFloat32(littleEndian = false) {
        this.ensure(4);
        return this.view.getFloat32(this.offset, littleEndian);
    }

    peekFloat64(littleEndian = false) {
        this.ensure(8);
        return this.view.getFloat64(this.offset, littleEndian);
    }

    readBytes(length) {
        this.ensure(length);
        const value = this.bytes.slice(this.offset, this.offset + length);
        this.offset += length;
        return value;
    }

    peekBytes(length) {
        this.ensure(length);
        return this.bytes.slice(this.offset, this.offset + length);
    }

    consume(length) {
        return this.readBytes(length);
    }

    slice(offset, length) {
        this.ensure(length, offset);
        return this.bytes.slice(offset, offset + length);
    }

    readArrayBuffer(length) {
        return this.readBytes(length).buffer;
    }

    peekArrayBuffer(length) {
        return this.peekBytes(length).buffer;
    }

    readAscii(length) {
        const bytes = this.readBytes(length);
        let text = "";

        for (let index = 0; index < bytes.length; index += 1) {
            text += String.fromCharCode(bytes[index]);
        }

        return text;
    }

    peekAscii(length) {
        this.push();

        try {
            return this.readAscii(length);
        } finally {
            this.pop();
        }
    }

    readUtf8(length) {
        return this.decoder.decode(this.readBytes(length));
    }

    peekUtf8(length) {
        this.push();

        try {
            return this.readUtf8(length);
        } finally {
            this.pop();
        }
    }

    readString(length, encoding = "utf-8") {
        if (encoding === "ascii") {
            return this.readAscii(length);
        }

        if (encoding === "utf-8" || encoding === "utf8") {
            return this.readUtf8(length);
        }

        return new TextDecoder(encoding, { fatal: false }).decode(this.readBytes(length));
    }

    peekString(length, encoding = "utf-8") {
        this.push();

        try {
            return this.readString(length, encoding);
        } finally {
            this.pop();
        }
    }

    readNullTerminatedString(maxLength = this.remaining(), encoding = "utf-8") {
        if (!Number.isInteger(maxLength) || maxLength < 0) {
            throw new RangeError(`Invalid string length ${maxLength}`);
        }

        this.ensure(maxLength);

        const start = this.offset;
        const limit = this.offset + maxLength;
        let end = start;

        while (end < limit && this.bytes[end] !== 0) {
            end += 1;
        }

        const bytes = this.bytes.slice(start, end);
        this.offset = end < limit ? end + 1 : limit;

        if (encoding === "ascii") {
            let text = "";

            for (let index = 0; index < bytes.length; index += 1) {
                text += String.fromCharCode(bytes[index]);
            }

            return text;
        }

        return new TextDecoder(encoding, { fatal: false }).decode(bytes);
    }

    readPascalString(lengthBytes = 1, encoding = "utf-8", littleEndian = false) {
        let length;

        if (lengthBytes === 1) {
            length = this.readUint8();
        } else if (lengthBytes === 2) {
            length = this.readUint16(littleEndian);
        } else if (lengthBytes === 4) {
            length = this.readUint32(littleEndian);
        } else {
            throw new RangeError("Pascal string lengthBytes must be 1, 2, or 4.");
        }

        return this.readString(length, encoding);
    }

    readHex(length, separator = "") {
        return Array.from(this.readBytes(length), (byte) =>
            byte.toString(16).padStart(2, "0")
        ).join(separator);
    }

    peekHex(length, separator = "") {
        this.push();

        try {
            return this.readHex(length, separator);
        } finally {
            this.pop();
        }
    }

    readUUID() {
        const hex = this.readHex(16);

        return [
            hex.slice(0, 8),
            hex.slice(8, 12),
            hex.slice(12, 16),
            hex.slice(16, 20),
            hex.slice(20)
        ].join("-");
    }

    peekUUID() {
        this.push();

        try {
            return this.readUUID();
        } finally {
            this.pop();
        }
    }

    matchBytes(expected) {
        const bytes = expected instanceof Uint8Array
            ? expected
            : new Uint8Array(expected);

        this.ensure(bytes.length);

        for (let index = 0; index < bytes.length; index += 1) {
            if (this.bytes[this.offset + index] !== bytes[index]) {
                return false;
            }
        }

        return true;
    }

    matchAscii(text) {
        this.ensure(text.length);

        for (let index = 0; index < text.length; index += 1) {
            if (this.bytes[this.offset + index] !== text.charCodeAt(index)) {
                return false;
            }
        }

        return true;
    }

    expectBytes(expected, message = "Unexpected byte sequence.") {
        if (!this.matchBytes(expected)) {
            throw new Error(message);
        }

        return this.readBytes(
            expected instanceof Uint8Array ? expected.length : expected.byteLength
        );
    }

    expectAscii(text, message = `Expected "${text}".`) {
        if (!this.matchAscii(text)) {
            throw new Error(message);
        }

        return this.readAscii(text.length);
    }

    toUint8Array() {
        return this.bytes.slice();
    }
}

export default BinaryReader;
