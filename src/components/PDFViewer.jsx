import React, { useContext } from 'react';
import { PDFContext } from '../contexts/PDFContext';
import { Document, Page } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import '../styles/PDFViewer.css';

const PDFViewer = () => {
    const { pdfFile, pageNumber, setPageNumber } = useContext(PDFContext);

    const handlePreviousPage = () => {
        setPageNumber(prevPageNumber => Math.max(prevPageNumber - 1, 1));
    };

    const handleNextPage = () => {
        setPageNumber(prevPageNumber => prevPageNumber + 1);
    };

    return (
        <div className="pdf-viewer">
            {pdfFile ? (
                <div>
                    <Document file={pdfFile}>
                        <Page pageNumber={pageNumber} />
                    </Document>
                    <div className="navigation">
                        <button onClick={handlePreviousPage} disabled={pageNumber <= 1}>
                            Previous
                        </button>
                        <span>Page {pageNumber}</span>
                        <button onClick={handleNextPage}>
                            Next
                        </button>
                    </div>
                </div>
            ) : (
                <p>No PDF file uploaded. Please upload a PDF to view it.</p>
            )}
        </div>
    );
};

export default PDFViewer;