export function showToast(message, type = 'info') {
  window.dispatchEvent(
    new CustomEvent('show-toast', {
      detail: { message, type },
    })
  );
}
