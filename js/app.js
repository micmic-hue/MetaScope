/*
    MetaScope
    Module : Application
*/

const pickButton = document.getElementById("pickButton");
const photoPicker = document.getElementById("photoPicker");
const gallery = document.getElementById("gallery");
const selectionInfo = document.getElementById("selectionInfo");
const activePhotoInfo = document.getElementById("activePhotoInfo");
const fileInfo = document.getElementById("fileInfo");

let currentPhoto = null;

pickButton.addEventListener("click", function () {
    photoPicker.click();
});

photoPicker.addEventListener("change", function () {
    gallery.innerHTML = "";
    Gallery.activeThumbnail = null;

    const files = photoPicker.files;

    if (files.length === 0) {
        selectionInfo.textContent = "Aucune photo sélectionnée.";
        activePhotoInfo.textContent = "Aucune photo active.";
        Viewer.clear();
        return;
    }

    selectionInfo.textContent = files.length === 1
        ? "Vous avez sélectionné 1 photo."
        : "Vous avez sélectionné " + files.length + " photos.";

    activePhotoInfo.textContent = "Cliquez sur une photo pour afficher ses métadonnées.";
    fileInfo.innerHTML = "";
    Exif.clear();
    C2PA.clear();

    for (const file of files) {
        const thumbnail = Gallery.createThumbnail(file, async function (selectedFile) {
            if (selectedFile === null) {
                currentPhoto = null;
                Viewer.clear();
                Exif.clear();
                C2PA.clear();
                return;
            }

            currentPhoto = selectedFile;
            activePhotoInfo.textContent = "Photo active : " + currentPhoto.name;
            Viewer.showFileInfo(currentPhoto);
            C2PA.showLoading();

            const tags = await Exif.load(currentPhoto);
            Exif.show(tags);

            const c2pa = await C2PA.load(currentPhoto);
            C2PA.show(c2pa);
        });

        gallery.appendChild(thumbnail);
    }
});
