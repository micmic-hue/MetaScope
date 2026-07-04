/*
    MetaScope
    Module : Gallery
*/

const Gallery = {

    activeThumbnail: null,

    createThumbnail(file, onClick) {

        const img = document.createElement("img");

        img.src = URL.createObjectURL(file);
        img.alt = file.name;
        img.className = "thumbnail";

        img.addEventListener("click", () => {

            // Clic sur la photo déjà active : désélection
            if (Gallery.activeThumbnail === img) {

                img.classList.remove("active");
                Gallery.activeThumbnail = null;

                onClick(null);

                return;
            }

            // Désélection de l'ancienne
            if (Gallery.activeThumbnail) {
                Gallery.activeThumbnail.classList.remove("active");
            }

            // Nouvelle sélection
            img.classList.add("active");
            Gallery.activeThumbnail = img;

            onClick(file);

        });

        return img;

    }

};