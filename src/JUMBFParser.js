import BinaryReader from "./BinaryReader.js";
import { InvalidFormatError } from "./Errors.js";
import { bytesToUtf8, findSubarray, toUint8Array } from "./Utils.js";

export const C2PA_JUMBF_UUIDS = {
    manifestStore: "63327061-0011-0010-8000-00aa00389b71",
    standardManifest: "63326d61-0011-0010-8000-00aa00389b71",
    compressedManifest: "6332636d-0011-0010-8000-00aa00389b71",
    updateManifest: "6332756d-0011-0010-8000-00aa00389b71",
    assertionStore: "63326173-0011-0010-8000-00aa00389b71",
    claim: "6332636c-0011-0010-8000-00aa00389b71",
    claimSignature: "63326373-0011-0010-8000-00aa00389b71",
    dataBoxStore: "63326462-0011-0010-8000-00aa00389b71"
};

const CONTAINER_TYPES = new Set(["jumb", "c2pa"]);
const CONTENT_BOX_TYPES = new Set(["cbor", "json", "xml ", "uuid", "bfdb", "bidb", "brob"]);

export class JUMBFParser {
    constructor(source) {
        this.bytes = toUint8Array(source);
    }

    parse() {
        const startOffset = findFirstBoxOffset(this.bytes);

        if (startOffset < 0) {
            throw new InvalidFormatError("No JUMBF box structure found.");
        }

        const reader = new BinaryReader(this.bytes.slice(startOffset));
        const boxes = this.readBoxes(reader, reader.length, 0, "");
        const flattened = flattenBoxes(boxes);

        return {
            type: "jumbf",
            startOffset,
            boxes,
            flattened,
            manifestStore: findManifestStore(flattened),
            manifests: findManifestBoxes(flattened),
            assertionStores: findByLabel(flattened, "c2pa.assertions"),
            claims: findByLabel(flattened, "c2pa.claim.v2"),
            signatures: findByLabel(flattened, "c2pa.signature"),
            cborBoxes: flattened.filter((box) => box.type === "cbor"),
            contentBoxes: flattened.filter((box) => CONTENT_BOX_TYPES.has(box.type)),
            errors: []
        };
    }

    readBoxes(reader, endOffset, depth, parentPath) {
        const boxes = [];

        while (reader.tell() + 8 <= endOffset) {
            const start = reader.tell();
            const box = this.readBox(reader, endOffset, depth, parentPath);
            boxes.push(box);
            reader.seek(start + box.size);
        }

        return boxes;
    }

    readBox(reader, endOffset, depth, parentPath) {
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
            throw new InvalidFormatError("Invalid JUMBF box size.", { type, start, size, endOffset });
        }

        const dataOffset = start + headerSize;
        const dataLength = size - headerSize;
        const data = reader.slice(dataOffset, dataLength);
        const box = {
            type,
            start,
            size,
            headerSize,
            dataOffset,
            dataLength,
            data,
            depth,
            description: null,
            label: null,
            uuid: null,
            path: parentPath,
            children: []
        };

        if (type === "jumd") {
            box.description = parseDescriptionBox(data);
            box.label = box.description.label;
            box.uuid = box.description.uuid;
            box.path = buildPath(parentPath, box.label);
            return box;
        }

        if (CONTAINER_TYPES.has(type)) {
            reader.push();
            reader.seek(dataOffset);
            box.children = this.readBoxes(reader, start + size, depth + 1, parentPath);
            reader.pop();
            applyContainerDescription(box, parentPath);
        }

        return box;
    }

    static parse(source) {
        return new JUMBFParser(source).parse();
    }
}

function parseDescriptionBox(data) {
    const reader = new BinaryReader(data);
    const uuid = reader.remaining() >= 16 ? reader.readUUID().toLowerCase() : null;
    const toggles = reader.remaining() >= 1 ? reader.readUint8() : 0;
    const requestable = Boolean(toggles & 0x01);
    const labelPresent = Boolean(toggles & 0x02);
    const privateBox = Boolean(toggles & 0x10);
    let label = null;
    let id = null;
    let salt = null;

    if (labelPresent && reader.remaining() > 0) {
        label = reader.readNullTerminatedString(reader.remaining(), "utf-8");
    }

    if (reader.remaining() >= 4) {
        id = reader.readUint32();
    }

    if (privateBox && reader.remaining() > 0) {
        salt = reader.readBytes(reader.remaining());
    }

    return {
        uuid,
        uuidName: nameForUuid(uuid),
        toggles,
        requestable,
        labelPresent,
        privateBox,
        label,
        id,
        salt
    };
}

function applyContainerDescription(box, parentPath) {
    const description = box.children.find((child) => child.type === "jumd");

    if (!description || !description.description) {
        return;
    }

    box.description = description.description;
    box.label = description.label;
    box.uuid = description.uuid;
    box.path = buildPath(parentPath, box.label);

    for (const child of box.children) {
        if (child === description) {
            child.path = box.path;
            continue;
        }

        if (!child.path || child.path === parentPath) {
            child.path = box.path;
        }

        updateChildPaths(child, box.path);
    }
}

function updateChildPaths(box, parentPath) {
    if (box.type === "jumd") {
        box.path = buildPath(parentPath, box.label);
        return;
    }

    if (box.children && box.children.length) {
        applyContainerDescription(box, parentPath);
        return;
    }

    box.path = parentPath;
}

function buildPath(parentPath, label) {
    if (!label) {
        return parentPath;
    }

    return `${parentPath}/${label}`.replace(/^\/+/, "/");
}

function flattenBoxes(boxes) {
    const output = [];

    for (const box of boxes) {
        output.push(box);

        if (box.children && box.children.length) {
            output.push(...flattenBoxes(box.children));
        }
    }

    return output;
}

function findManifestStore(boxes) {
    return boxes.find((box) =>
        box.label === "c2pa" ||
        box.uuid === C2PA_JUMBF_UUIDS.manifestStore
    ) || null;
}

function findManifestBoxes(boxes) {
    const uuids = new Set([
        C2PA_JUMBF_UUIDS.standardManifest,
        C2PA_JUMBF_UUIDS.compressedManifest,
        C2PA_JUMBF_UUIDS.updateManifest
    ]);

    return boxes.filter((box) => uuids.has(box.uuid));
}

function findByLabel(boxes, label) {
    return boxes.filter((box) => box.label === label || box.path.endsWith(`/${label}`));
}

function nameForUuid(uuid) {
    if (!uuid) {
        return null;
    }

    for (const [name, value] of Object.entries(C2PA_JUMBF_UUIDS)) {
        if (value === uuid) {
            return name;
        }
    }

    return null;
}

function findFirstBoxOffset(bytes) {
    if (looksLikeBoxAt(bytes, 0)) {
        return 0;
    }

    const candidates = ["jumb", "jumd", "c2pa", "cbor", "json", "brob"];

    for (const candidate of candidates) {
        let typeOffset = findSubarray(bytes, candidate);

        while (typeOffset >= 4) {
            const boxOffset = typeOffset - 4;

            if (looksLikeBoxAt(bytes, boxOffset)) {
                return boxOffset;
            }

            typeOffset = findSubarray(bytes, candidate, typeOffset + 1);
        }
    }

    return -1;
}

function looksLikeBoxAt(bytes, offset) {
    if (offset < 0 || offset + 8 > bytes.length) {
        return false;
    }

    const size =
        (bytes[offset] * 0x1000000) +
        ((bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3]);
    const type = bytesToUtf8(bytes.slice(offset + 4, offset + 8));

    if (!/^[A-Za-z0-9 ][A-Za-z0-9 ][A-Za-z0-9 ][A-Za-z0-9 ]$/.test(type)) {
        return false;
    }

    if (size === 1) {
        return offset + 16 <= bytes.length;
    }

    return size >= 8 && offset + size <= bytes.length;
}

export default JUMBFParser;
