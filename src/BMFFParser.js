import BinaryReader from "./BinaryReader.js";
import { InvalidFormatError } from "./Errors.js";

const CONTAINER_BOXES = new Set([
    "moov",
    "trak",
    "mdia",
    "minf",
    "dinf",
    "stbl",
    "edts",
    "meta",
    "iprp",
    "ipco",
    "iref",
    "meco",
    "mere"
]);

const C2PA_BOX_TYPES = new Set(["c2pa", "jumb"]);

export class BMFFParser {
    constructor(source) {
        this.reader = new BinaryReader(source);
    }

    parse() {
        const reader = this.reader;
        const boxes = this.readBoxes(reader, reader.length, 0);

        if (!boxes.some((box) => box.type === "ftyp")) {
            throw new InvalidFormatError("Invalid BMFF: missing ftyp box.");
        }

        return {
            type: "bmff",
            boxes,
            c2pa: this.extractC2PAFromBoxes(boxes)
        };
    }

    readBoxes(reader, endOffset, depth) {
        const boxes = [];

        while (reader.tell() + 8 <= endOffset) {
            const start = reader.tell();
            let size = reader.readUint32();
            const type = reader.readAscii(4);
            let headerSize = 8;

            if (size === 1) {
                size = Number(reader.readBigUint64());
                headerSize = 16;
            } else if (size === 0) {
                size = endOffset - start;
            }

            if (size < headerSize || start + size > endOffset) {
                throw new InvalidFormatError("Invalid BMFF box size.", { type, start, size, endOffset });
            }

            const dataOffset = start + headerSize;
            const dataLength = size - headerSize;
            const box = {
                type,
                start,
                size,
                headerSize,
                dataOffset,
                dataLength,
                data: reader.slice(dataOffset, dataLength),
                children: []
            };

            if (CONTAINER_BOXES.has(type) && dataLength >= 8) {
                reader.push();
                reader.seek(dataOffset + (type === "meta" ? 4 : 0));
                box.children = this.readBoxes(reader, start + size, depth + 1);
                reader.pop();
            }

            boxes.push(box);
            reader.seek(start + size);
        }

        return boxes;
    }

    extractC2PAFromBoxes(boxes) {
        const found = [];
        walkBoxes(boxes, (box) => {
            if (C2PA_BOX_TYPES.has(box.type)) {
                found.push(box);
            }
        });

        if (!found.length) {
            return null;
        }

        return {
            format: "bmff-box",
            boxes: found,
            bytes: found[0].data
        };
    }

    static parse(source) {
        return new BMFFParser(source).parse();
    }
}

function walkBoxes(boxes, callback) {
    for (const box of boxes) {
        callback(box);

        if (box.children && box.children.length) {
            walkBoxes(box.children, callback);
        }
    }
}

export default BMFFParser;
