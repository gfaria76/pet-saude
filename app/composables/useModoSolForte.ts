export function useModoSolForte() {
  const colorMode = useColorMode()
  const modoSolForte = useCookie<boolean>('pet-saude-sol-forte', { default: () => false, sameSite: 'lax' })
  const temaAnterior = useCookie<string>('pet-saude-tema-anterior', { default: () => 'system', sameSite: 'lax' })
  useHead(() => ({ htmlAttrs: { class: modoSolForte.value ? 'modo-sol-forte' : '' } }))

  onMounted(() => {
    if (modoSolForte.value) colorMode.preference = 'light'
  })

  function alternarModoSolForte() {
    if (modoSolForte.value) {
      modoSolForte.value = false
      colorMode.preference = temaAnterior.value
    } else {
      temaAnterior.value = colorMode.preference
      colorMode.preference = 'light'
      modoSolForte.value = true
    }
  }

  return { modoSolForte, alternarModoSolForte }
}
