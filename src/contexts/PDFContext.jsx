import React, { createContext, useState } from 'react';

export const PDFContext = createContext();

export const PDFProvider = ({ children }) => {
    const [pdfFile, setPdfFile] = useState(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [editingOptions, setEditingOptions] = useState({
        blur: false,
        erase: false,
        text: ''
    });

    const uploadPDF = (file) => {
        setPdfFile(file);
    };

    const toggleBlur = () => {
        setEditingOptions(prev => ({ ...prev, blur: !prev.blur }));
    };

    const toggleErase = () => {
        setEditingOptions(prev => ({ ...prev, erase: !prev.erase }));
    };

    const updateText = (newText) => {
        setEditingOptions(prev => ({ ...prev, text: newText }));
    };

    return (
        <PDFContext.Provider value={{ 
          pdfFile, 
          uploadPDF, 
          editingOptions, 
          toggleBlur, 
          toggleErase, 
          updateText,
          pageNumber,
          setPageNumber
        }}>
            {children}
        </PDFContext.Provider>
    );
};