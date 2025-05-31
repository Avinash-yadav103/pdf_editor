import React from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import PDFUploader from './components/PDFUploader';
import PDFViewer from './components/PDFViewer';
import PDFEditor from './components/PDFEditor';
import { PDFProvider } from './contexts/PDFContext';
import './styles/main.css';
import './styles/editor.css';
import './styles/theme.css';

function App() {
  return (
    <PDFProvider>
      <div className="app-container">
        <Header />
        <main>
          <PDFUploader />
          <PDFViewer />
          <PDFEditor />
        </main>
        <Footer />
      </div>
    </PDFProvider>
  );
}

export default App;