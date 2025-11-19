import React from 'react';
// ИСПРАВЛЕНО: путь к стилям теперь в папке styles
import './styles/App.css';
import TokyoPacman from './components/TokyoPacman';

function App() {
    return (
        <div className="App">
            <TokyoPacman />
        </div>
    );
}

export default App;
