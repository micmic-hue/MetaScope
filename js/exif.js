/*
    MetaScope
    Module : EXIF
*/

const Exif = {

    async load(file) {

        try {

            return await ExifReader.load(file);

        }
        catch (error) {

            console.error("Erreur EXIF :", error);
            return null;

        }

    },

    show(tags) {

        const exifInfo = document.getElementById("exifInfo");

        exifInfo.innerHTML = "";

        if (!tags) {

            exifInfo.textContent = "Aucune donnée EXIF.";
            return;

        }

        for (const tag in tags) {

            const p = document.createElement("p");

            p.innerHTML = "<strong>" + tag + "</strong> : " + tags[tag].description;

            exifInfo.appendChild(p);

        }

    }

};