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

function showTooltip(html, x, y, textColor) {
    const tooltip = document.createElement("div");
    tooltip.classList.add("tooltip");
    tooltip.innerHTML = html;
    document.body.appendChild(tooltip);
    const rect = tooltip.getBoundingClientRect();
    tooltip.style.left = `${x + 7 - rect.width / 2}px`;
    tooltip.style.bottom = `${window.innerHeight - y + 10}px`;
    tooltip.style.color = textColor;
}

function hideTooltips() {
    document.querySelectorAll(".tooltip").forEach((tooltip) => {
        document.body.removeChild(tooltip);
    });
}
