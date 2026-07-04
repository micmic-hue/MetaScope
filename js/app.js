/*
    MetaScope
    Version : 0.4.0
    Nom : Active Photo
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

    const files = photoPicker.files;

    if (files.length === 0) {

        selectionInfo.textContent = "Aucune photo sélectionnée.";
        activePhotoInfo.textContent = "";
        return;

    }

    if (files.length === 1)
        selectionInfo.textContent = "Vous avez sélectionné 1 photo.";
    else
        selectionInfo.textContent = "Vous avez sélectionné " + files.length + " photos.";

    activePhotoInfo.textContent = "";

    for (const file of files) {

        const thumbnail = Gallery.createThumbnail(file, async function (selectedFile)  {

    if (selectedFile === null) {

    
        currentPhoto = null;
        Viewer.clear();
        return;
    }

    currentPhoto = selectedFile;
 
        Viewer.showFileInfo(currentPhoto);
            const tags = await Exif.load(currentPhoto);
            Exif.show(tags);

        activePhotoInfo.textContent =
        "Photo active : " + currentPhoto.name;

});

        gallery.appendChild(thumbnail);

    }

})


