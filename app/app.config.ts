export default defineAppConfig({
  ui: {
    colors: {
      primary: 'cyan', secondary: 'blue', success: 'green',
      info: 'sky', warning: 'amber', error: 'red', neutral: 'slate'
    },
    card: { slots: { root: 'rounded-xl' } }
  }
})
