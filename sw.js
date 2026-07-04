const CACHE_NAME = "metascope-pwa-v2";

const APP_SHELL = [
    "./",
    "./index.html",
    "./manifest.webmanifest",
    "./css/style.css",
    "./js/config.js",
    "./js/gallery.js",
    "./js/exif.js",
    "./js/c2pa.js",
    "./js/viewer.js",
    "./js/app.js",
    "./js/lib/exifreader/exif-reader.js",
    "./src/AssertionParser.js",
    "./src/BinaryReader.js",
    "./src/BinaryWriter.js",
    "./src/BMFFParser.js",
    "./src/C2PAReader.js",
    "./src/CBORDecoder.js",
    "./src/Errors.js",
    "./src/JPEGParser.js",
    "./src/JUMBFParser.js",
    "./src/ManifestParser.js",
    "./src/PNGParser.js",
    "./src/Utils.js",
    "./assets/icons/icon-120.png",
    "./assets/icons/icon-152.png",
    "./assets/icons/icon-167.png",
    "./assets/icons/icon-180.png",
    "./assets/icons/icon-192.png",
    "./assets/icons/icon-512.png"
];

self.addEventListener("install", function (event) {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(APP_SHELL))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener("activate", function (event) {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(
                keys
                    .filter((key) => key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", function (event) {
    if (event.request.method !== "GET") {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then((cached) => cached || fetch(event.request)
                .then((response) => {
                    if (!response || response.status !== 200) {
                        return response;
                    }

                    const copy = response.clone();

                    caches.open(CACHE_NAME)
                        .then((cache) => cache.put(event.request, copy));

                    return response;
                })
                .catch(() => {
                    if (event.request.mode === "navigate") {
                        return caches.match("./index.html");
                    }

                    return undefined;
                }))
    );
});
