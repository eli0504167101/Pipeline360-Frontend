const dialogs = document.querySelectorAll('dialog');

document.querySelectorAll('[data-dialog]').forEach(button => {
    button.addEventListener('click', () => {
        document.getElementById(button.dataset.dialog).showModal();
    });
});

dialogs.forEach(dialog => {
    dialog.querySelector('.close-dialog').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => {
        const bounds = dialog.getBoundingClientRect();
        if (event.target === dialog && (
            event.clientX < bounds.left || event.clientX > bounds.right ||
            event.clientY < bounds.top || event.clientY > bounds.bottom
        )) {
            dialog.close();
        }
    });
});

// Preserve links to the former booking and lookup pages.
const requestedDialog = document.getElementById(location.hash.slice(1));
if (requestedDialog instanceof HTMLDialogElement) {
    requestedDialog.showModal();
}
