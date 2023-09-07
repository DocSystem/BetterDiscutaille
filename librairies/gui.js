async function showBooleanPopup(title, text) {
    return new Promise((resolve, reject) => {
        const popup = document.createElement("div");
        popup.classList.add("popup");
        popup.innerHTML = `
        <div class="popup-content">
            <h2>${title}</h2>
            <p>${text}</p>
            <div class="popup-buttons">
                <button class="popup-button" id="popup-yes">Yes</button>
                <button class="popup-button" id="popup-no">No</button>
            </div>
        </div>
        `;
        document.body.appendChild(popup);
        document.getElementById("popup-yes").addEventListener("click", () => {
            document.body.removeChild(popup);
            resolve(true);
        });
        document.getElementById("popup-no").addEventListener("click", () => {
            document.body.removeChild(popup);
            resolve(false);
        });
    })
}
