/**
 * MetaScope
 * BinaryReader
 *
 * A safe sequential binary reader for ArrayBuffer.
 *
 * Features:
 *  - Bounds checking
 *  - Big/Little Endian
 *  - Signed/Unsigned integers
 *  - Float32 / Float64
 *  - ASCII / UTF-8 strings
 *  - UUID
 *  - Position stack
 *  - Peek functions
 *
 * Author : MetaScope Project
 * License: MIT
 */

export class BinaryReader {

    /**
     * @param {ArrayBuffer|Uint8Array} source
     */
    constructor(source) {

        if (source instanceof Uint8Array) {

            this.buffer = source.buffer.slice(
                source.byteOffset,
                source.byteOffset + source.byteLength
            );

        } else if (source instanceof ArrayBuffer) {

            this.buffer = source;

        } else {

            throw new TypeError(
                "BinaryReader expects ArrayBuffer or Uint8Array."
            );

        }

        this.view = new DataView(this.buffer);

        this.bytes = new Uint8Array(this.buffer);

        this.offset = 0;

        this.stack = [];

        this.decoder = new TextDecoder("utf-8");

    }

    /**
     * Total size
     */
    get length() {

        return this.buffer.byteLength;

    }

    /**
     * Current cursor
     */
    tell() {

        return this.offset;

    }

    /**
     * Bytes remaining
     */
    remaining() {

        return this.length - this.offset;

    }

    /**
     * EOF
     */
    eof() {

        return this.offset >= this.length;

    }

    /**
     * Verify bounds
     */
    ensure(size) {

        if (this.offset + size > this.length) {

            throw new RangeError(
                `Read outside buffer (offset=${this.offset}, size=${size}, length=${this.length})`
            );

        }

    }

    /**
     * Jump to absolute position
     */
    seek(position) {

        if (position < 0 || position > this.length) {

            throw new RangeError(
                `Invalid seek position ${position}`
            );

        }

        this.offset = position;

        return this;

    }

    /**
     * Relative move
     */
    skip(bytes) {

        return this.seek(
            this.offset + bytes
        );

    }

    /**
     * Move backwards
     */
    rewind(bytes) {

        return this.seek(
            this.offset - bytes
        );

    }

    /**
     * Push current position
     */
    push() {

        this.stack.push(
            this.offset
        );

    }

    /**
     * Restore position
     */
    pop() {

        if (!this.stack.length) {

            throw new Error(
                "BinaryReader stack is empty."
            );

        }

        this.offset = this.stack.pop();

    }

    /**
     * Align cursor
     */
    align(value) {

        const mod = this.offset % value;

        if (mod !== 0) {

            this.skip(
                value - mod
            );

        }

    }

    /**
     * Peek one byte
     */
    peekUint8() {

        this.ensure(1);

        return this.view.getUint8(
            this.offset
        );

    }

    /**
     * Read one byte
     */
    readUint8() {

        this.ensure(1);

        const value = this.view.getUint8(
            this.offset
        );

        this.offset++;

        return value;

    }

    /**
     * Read signed byte
     */
    readInt8() {

        this.ensure(1);

        const value = this.view.getInt8(
            this.offset
        );

        this.offset++;

        return value;

    }

    /**
     * Read boolean
     */
    readBool() {

        return this.readUint8() !== 0;

    }

    /**
     * Read raw bytes
     *
     * @param {number} length
     * @returns {Uint8Array}
     */
    readBytes(length) {

        this.ensure(length);

        const value = this.bytes.slice(
            this.offset,
            this.offset + length
        );

        this.offset += length;

        return value;

    }

    /**
     * Peek bytes
     */
    peekBytes(length) {

        this.ensure(length);

        return this.bytes.slice(
            this.offset,
            this.offset + length
        );

    }

    /**
     * Skip bytes and return them
     */
    consume(length) {

        return this.readBytes(length);

    }

    /**
     * Return a slice without moving
     */
    slice(offset, length) {

        if (offset < 0) {

            throw new RangeError(
                "Negative offset"
            );

        }

        if (offset + length > this.length) {

            throw new RangeError(
                "Slice outside buffer"
            );

        }

        return this.bytes.slice(
            offset,
            offset + length
        );

    }
        /**
     * Read unsigned 16-bit integer.
     *
     * @param {boolean} littleEndian
     * @returns {number}
     */
    readUint16(littleEndian = false) {

        this.ensure(2);

        const value = this.view.getUint16(
            this.offset,
            littleEndian
        );

        this.offset += 2;

        return value;

    }

    /**
     * Read signed 16-bit integer.
     *
     * @param {boolean} littleEndian
     * @returns {number}
     */
    readInt16(littleEndian = false) {

        this.ensure(2);

        const value = this.view.getInt16(
            this.offset,
            littleEndian
        );

        this.offset += 2;

        return value;

    }

    /**
     * Peek unsigned 16-bit integer.
     *
     * @param {boolean} littleEndian
     * @returns {number}
     */
    peekUint16(littleEndian = false) {

        this.ensure(2);

        return this.view.getUint16(
            this.offset,
            littleEndian
        );

    }

    /**
     * Read unsigned 24-bit integer.
     *
     * JavaScript does not provide a native Uint24,
     * therefore it is assembled manually.
     *
     * @param {boolean} littleEndian
     * @returns {number}
     */
    readUint24(littleEndian = false) {

        this.ensure(3);

        let value;

        if (littleEndian) {

            value =
                this.bytes[this.offset] |
                (this.bytes[this.offset + 1] << 8) |
                (this.bytes[this.offset + 2] << 16);

        } else {

            value =
                (this.bytes[this.offset] << 16) |
                (this.bytes[this.offset + 1] << 8) |
                this.bytes[this.offset + 2];

        }

        this.offset += 3;

        return value >>> 0;

    }

    /**
     * Peek unsigned 24-bit integer.
     *
     * @param {boolean} littleEndian
     * @returns {number}
     */
    peekUint24(littleEndian = false) {

        this.ensure(3);

        if (littleEndian) {

            return (
                this.bytes[this.offset] |
                (this.bytes[this.offset + 1] << 8) |
                (this.bytes[this.offset + 2] << 16)
            ) >>> 0;

        }

        return (
            (this.bytes[this.offset] << 16) |
            (this.bytes[this.offset + 1] << 8) |
            this.bytes[this.offset + 2]
        ) >>> 0;

    }

    /**
     * Read unsigned 32-bit integer.
     *
     * @param {boolean} littleEndian
     * @returns {number}
     */
    readUint32(littleEndian = false) {

        this.ensure(4);

        const value = this.view.getUint32(
            this.offset,
            littleEndian
        );

        this.offset += 4;

        return value;

    }

    /**
     * Peek unsigned 32-bit integer.
     *
     * @param {boolean} littleEndian
     * @returns {number}
     */
    peekUint32(littleEndian = false) {

        this.ensure(4);

        return this.view.getUint32(
            this.offset,
            littleEndian
        );

    }

    /**
     * Read signed 32-bit integer.
     *
     * @param {boolean} littleEndian
     * @returns {number}
     */
    readInt32(littleEndian = false) {

        this.ensure(4);

        const value = this.view.getInt32(
            this.offset,
            littleEndian
        );

        this.offset += 4;

        return value;

    }

    /**
     * Read unsigned 64-bit integer.
     *
     * Returns BigInt.
     *
     * @param {boolean} littleEndian
     * @returns {bigint}
     */
    readBigUint64(littleEndian = false) {

        this.ensure(8);

        const value = this.view.getBigUint64(
            this.offset,
            littleEndian
        );

        this.offset += 8;

        return value;

    }

    /**
     * Read signed 64-bit integer.
     *
     * Returns BigInt.
     *
     * @param {boolean} littleEndian
     * @returns {bigint}
     */
    readBigInt64(littleEndian = false) {

        this.ensure(8);

        const value = this.view.getBigInt64(
            this.offset,
            littleEndian
        );

        this.offset += 8;

        return value;

    }

    /**
     * Peek unsigned 64-bit integer.
     *
     * @param {boolean} littleEndian
     * @returns {bigint}
     */
    peekBigUint64(littleEndian = false) {

        this.ensure(8);

        return this.view.getBigUint64(
            this.offset,
            littleEndian
        );

    }

    /**
     * Read Float32.
     *
     * @param {boolean} littleEndian
     * @returns {number}
     */
    readFloat32(littleEndian = false) {

        this.ensure(4);

        const value = this.view.getFloat32(
            this.offset,
            littleEndian
        );

        this.offset += 4;

        return value;

    }

    /**
     * Read Float64.
     *
     * @param {boolean} littleEndian
     * @returns {number}
     */
    readFloat64(littleEndian = false) {

        this.ensure(8);

        const value = this.view.getFloat64(
            this.offset,
            littleEndian
        );

        this.offset += 8;

        return value;

    }
    