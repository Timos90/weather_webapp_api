export function runDeleteAnimation(buttonEl: HTMLButtonElement) {
  buttonEl.setAttribute('data-running', 'true');
  setTimeout(() => {
    buttonEl.setAttribute('data-running', 'false');
  }, 2000);
}
