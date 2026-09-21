import React from 'react'
import ReactDOM from 'react-dom/client'
import Root from './Root'
import '@mailmypdf/design-system/vertical-landing.css'
import './styles/globals.css'

document.body.dataset.mmpTheme = 'permit-reply'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
)
