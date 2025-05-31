import React, { useState } from 'react';

const PDFUploader = ({ onUpload }) => {
    const [file, setFile] = useState(null);

    const handleFileChange = (event) => {
        const selectedFile = event.target.files[0];
        if (selectedFile && selectedFile.type === 'application/pdf') {
            setFile(selectedFile);
            onUpload(selectedFile);
        } else {
            alert('Please upload a valid PDF file.');
        }
    };

    return (
        <div className="pdf-uploader">
            <h2>Upload PDF</h2>
            <input 
                type="file" 
                accept="application/pdf" 
                onChange={handleFileChange} 
            />
            {file && <p>Uploaded: {file.name}</p>}
        </div>
    );
};

export default PDFUploader;