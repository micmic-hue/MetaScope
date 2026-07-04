/*
    MetaScope
    Module : C2PA
*/

const C2PA_MODULE_URL = new URL("../src/C2PAReader.js", document.currentScript.src).href;

const C2PA = {
    async load(file) {
        try {
            const { default: C2PAReader } = await import(C2PA_MODULE_URL);
            const buffer = await file.arrayBuffer();

            return {
                found: true,
                result: C2PAReader.read(buffer),
                error: null
            };
        } catch (error) {
            return {
                found: false,
                result: null,
                error
            };
        }
    },

    show(report) {
        const c2paInfo = document.getElementById("c2paInfo");
        c2paInfo.innerHTML = "";

        if (!report || !report.found) {
            if (report && report.error && report.error.name !== "C2PANotFoundError") {
                c2paInfo.textContent = "Erreur de lecture C2PA : " + report.error.message;
                console.error("Erreur C2PA :", report.error);
                return;
            }

            c2paInfo.textContent = "Aucune donnée C2PA.";
            return;
        }

        const result = report.result;
        const summary = document.createElement("div");

        summary.innerHTML = `
            <p><strong>Statut :</strong> données C2PA détectées</p>
            <p><strong>Format :</strong> ${escapeHtml(result.format)}</p>
            <p><strong>Source :</strong> ${escapeHtml(result.c2pa.format)}</p>
            <p><strong>Boxes JUMBF :</strong> ${result.jumbf.flattened.length}</p>
            <p><strong>Boxes CBOR :</strong> ${result.jumbf.cborBoxes.length}</p>
        `;

        c2paInfo.appendChild(summary);

        const labels = result.jumbf.flattened
            .filter((box) => box.label)
            .map((box) => box.path || box.label);

        if (labels.length) {
            const labelsTitle = document.createElement("p");
            labelsTitle.innerHTML = "<strong>Labels :</strong>";
            c2paInfo.appendChild(labelsTitle);

            const list = document.createElement("ul");

            for (const label of labels.slice(0, 12)) {
                const item = document.createElement("li");
                item.textContent = label;
                list.appendChild(item);
            }

            c2paInfo.appendChild(list);
        }

        if (result.manifest && result.manifest.cbor) {
            const details = document.createElement("details");
            const title = document.createElement("summary");
            const pre = document.createElement("pre");

            title.textContent = "Manifest CBOR";
            pre.textContent = stringifyMetadata(result.manifest.cbor);

            details.appendChild(title);
            details.appendChild(pre);
            c2paInfo.appendChild(details);
        }
    },

    showLoading() {
        const c2paInfo = document.getElementById("c2paInfo");

        if (c2paInfo) {
            c2paInfo.textContent = "Lecture C2PA en cours...";
        }
    },

    clear() {
        const c2paInfo = document.getElementById("c2paInfo");

        if (c2paInfo) {
            c2paInfo.textContent = "Aucune donnée C2PA.";
        }
    }
};

function stringifyMetadata(value) {
    return JSON.stringify(normalizeMetadata(value), null, 2);
}

function normalizeMetadata(value) {
    if (value instanceof Map) {
        return Object.fromEntries(
            Array.from(value.entries(), ([key, item]) => [
                String(key),
                normalizeMetadata(item)
            ])
        );
    }

    if (value instanceof Uint8Array) {
        return {
            type: "bytes",
            length: value.byteLength,
            preview: Array.from(value.slice(0, 24), (byte) =>
                byte.toString(16).padStart(2, "0")
            ).join(" ")
        };
    }

    if (Array.isArray(value)) {
        return value.map(normalizeMetadata);
    }

    if (value && typeof value === "object") {
        return Object.fromEntries(
            Object.entries(value).map(([key, item]) => [key, normalizeMetadata(item)])
        );
    }

    if (typeof value === "bigint") {
        return value.toString();
    }

    return value;
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
