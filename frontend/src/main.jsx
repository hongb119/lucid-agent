import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { BrowserRouter } from 'react-router-dom'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* basename을 / 로 수정하여 모든 경로를 수용하도록 합니다 */}
    <BrowserRouter basename="/"> 
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)