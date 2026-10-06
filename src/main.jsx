import React from 'react'
import ReactDOM from 'react-dom/client'

import App from './App'
import './index.css'
import { useVentasStore } from './modules/ventas/store/useVentasStore'

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, {
    scope: import.meta.env.BASE_URL
  }).catch((error) => {
    useVentasStore.getState().informarErrorServiceWorker(error)
    console.error('No se pudo registrar el Service Worker de ventas.', error)
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)