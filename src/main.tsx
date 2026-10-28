import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { Loading } from './components/Loading'
import { Sky } from './components/Sky'
import { sceneFromSearch } from './story'
import './styles.css'

// The sky and a loading message show at once; the 3D book (three.js and friends) loads alongside.
const App = lazy(() => import('./App').then((m) => ({ default: m.App })))

// Dev scene picker: on in `npm run dev`, hidden from automated browsers so it never gets in the way of e2e tests.
const devTools = import.meta.env.DEV && !navigator.webdriver

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Sky />
    <Suspense fallback={<Loading />}>
      <App initialScene={sceneFromSearch(window.location.search)} devTools={devTools} />
    </Suspense>
  </StrictMode>,
)
