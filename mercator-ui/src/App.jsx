import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';

import Details from './components/Details';
import NavigationBar from './components/NavigationBar';

import './App.scss';
import 'bootstrap/dist/css/bootstrap.min.css';
import TimelineDomainName from './components/timelineCards/TimelineDomainName';
import ClusterValidator from './components/ClusterValidator';

function App() {
  const [search, setSearch] = useState(null);
  const [page, setPage] = useState(0);

  return (
      <div className="App">
        <NavigationBar setSearch={setSearch} setPage={setPage}/>

        <Routes>

          <Route path="/*" element={<TimelineDomainName search={search} page={page} setPage={setPage}/>} />
          <Route path="/details/:visitId" element={<Details />} />
          <Route path="/cluster" element={<ClusterValidator />} />

        </Routes>
      </div>
  );
}

export default App;
