import BMFFParser from "./BMFFParser.js";
import JPEGParser from "./JPEGParser.js";
import JUMBFParser from "./JUMBFParser.js";
import ManifestParser from "./ManifestParser.js";
import PNGParser from "./PNGParser.js";
import { C2PANotFoundError } from "./Errors.js";
import { detectImageFormat } from "./Utils.js";

export class C2PAReader {
    constructor(source) {
        this.source = source;
    }

    read() {
        const format = detectImageFormat(this.source);
        const container = this.parseContainer(format);
        const c2pa = container.c2pa;

        if (!c2pa || !c2pa.bytes || !c2pa.bytes.byteLength) {
            throw new C2PANotFoundError(undefined, { format });
        }

        const jumbf = this.parseJUMBF(c2pa.bytes);
        const manifestBytes = this.selectManifestBytes(jumbf, c2pa.bytes);

        return {
            format,
            container,
            c2pa,
            jumbf,
            manifest: ManifestParser.parse(manifestBytes)
        };
    }

    parseContainer(format) {
        if (format === "jpeg") {
            return JPEGParser.parse(this.source);
        }

        if (format === "png") {
            return PNGParser.parse(this.source);
        }

        if (format === "bmff") {
            return BMFFParser.parse(this.source);
        }

        throw new C2PANotFoundError("Unsupported C2PA container.", { format });
    }

    parseJUMBF(bytes) {
        try {
            return JUMBFParser.parse(bytes);
        } catch (error) {
            return {
                type: "jumbf",
                boxes: [],
                flattened: [],
                manifestStore: null,
                manifests: [],
                assertionStores: [],
                claims: [],
                signatures: [],
                cborBoxes: [],
                contentBoxes: [],
                errors: [error]
            };
        }
    }

    selectManifestBytes(jumbf, fallback) {
        if (jumbf.cborBoxes && jumbf.cborBoxes.length) {
            return jumbf.cborBoxes[0].data;
        }

        if (jumbf.manifestStore && jumbf.manifestStore.data) {
            return jumbf.manifestStore.data;
        }

        return fallback;
    }

    static read(source) {
        return new C2PAReader(source).read();
    }
}

export default C2PAReader;
