const toastRoot = document.getElementById('notyf-toast-root')

function adopt(notyf) {
  toastRoot.append(notyf.view.container, notyf.view.a11yContainer)
  return notyf
}

window.notyf = adopt(new Notyf({
  duration: 12000,
  position: { x: 'right', y: 'top' },
  dismissible: true,
}))

window.notyfStatus = adopt(new Notyf({}))
