import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from '@/components/Layout';
import Home from '@/pages/Home';
import Result from '@/pages/Result';
import SavedExample from '@/pages/SavedExample';
import Examples from '@/pages/Examples';
import About from '@/pages/About';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/r/:id" element={<Result />} />
          <Route path="/e/:id" element={<SavedExample />} />
          <Route path="/examples" element={<Examples />} />
          <Route path="/about" element={<About />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
