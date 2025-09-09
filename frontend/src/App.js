import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import DMPage from "./components/dm-page";
import PlayerPage from "./components/player-page";

function Home() {
  return (
    <div>
      <h1>Initiative Tracker</h1>
      <Link to="/dm"><button>DM</button></Link>
      <Link to="/player"><button>Player</button></Link>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dm" element={<DMPage />} />
        <Route path="/player" element={<PlayerPage />} />
      </Routes>
    </Router>
  );
}
