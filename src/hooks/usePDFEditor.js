import { useContext, useState } from 'react';
import { PDFContext } from '../contexts/PDFContext';

export const usePDFEditor = () => {
  const { pdfFile, editingOptions, toggleBlur, toggleErase, updateText } = useContext(PDFContext);
  const [selectedArea, setSelectedArea] = useState(null);
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });

  // Handle selecting an area for editing
  const handleAreaSelection = (x, y, width, height) => {
    setSelectedArea({ x, y, width, height });
  };

  // Handle applying blur effect to selected area
  const applyBlur = () => {
    if (!selectedArea || !pdfFile) return;
    
    // Implement the blur logic using pdf-lib
    console.log('Applying blur to:', selectedArea);
    toggleBlur();
    // Reset selection after applying effect
    setSelectedArea(null);
  };

  // Handle erasing content in selected area
  const applyErase = () => {
    if (!selectedArea || !pdfFile) return;
    
    // Implement the erase logic using pdf-lib
    console.log('Erasing content in:', selectedArea);
    toggleErase();
    // Reset selection after applying effect
    setSelectedArea(null);
  };

  // Handle adding text at cursor position
  const addText = (text) => {
    if (!pdfFile) return;
    
    // Add text at the current cursor position
    console.log('Adding text:', text, 'at position:', cursorPosition);
    updateText(text);
  };

  // Update cursor position when moving over the PDF
  const updateCursorPosition = (x, y) => {
    setCursorPosition({ x, y });
  };

  return {
    selectedArea,
    cursorPosition,
    handleAreaSelection,
    applyBlur,
    applyErase,
    addText,
    updateCursorPosition,
    isBlurActive: editingOptions?.blur || false,
    isEraseActive: editingOptions?.erase || false,
    currentText: editingOptions?.text || ''
  };
};