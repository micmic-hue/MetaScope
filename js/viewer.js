/*
    MetaScope
    Module : Viewer
*/

const Viewer = {

    showFileInfo(file) {

        fileInfo.innerHTML = `
            <p><strong>Nom :</strong> ${file.name}</p>
            <p><strong>Type :</strong> ${file.type}</p>
            <p><strong>Taille :</strong> ${(file.size / 1024 / 1024).toFixed(2)} Mo</p>
        `;

    },

    clear() {

        activePhotoInfo.textContent = "Aucune photo active.";
        fileInfo.innerHTML = "";
        C2PA.clear();

    }

};
