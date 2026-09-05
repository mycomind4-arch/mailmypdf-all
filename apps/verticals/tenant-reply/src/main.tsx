import React from 'react'
import ReactDOM from 'react-dom/client'
import Root from './Root'
import '../../../../packages/design-system/src/tokens.css'
import '../../../../packages/design-system/src/patterns.css'
import './styles/globals.css'

document.body.dataset.mmpTheme = 'tenant-reply'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
)
