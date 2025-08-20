import { useState, useRef } from 'react'
import './App.css';

function UploadFile() {
  const [file, setFile] = useState(null);
  const [threshold, setThreshold] = useState(30);
  const [status, setStatus] = useState('');
  const inputRef = useRef(null);

  const handleSubmit = async event => {
    event.preventDefault();

    if (!file) {
      alert("Please select a file to upload.");
      return;
    } else if (file.type !== "text/csv") {
      alert("Upload file must be a CSV.");
      return;
    } else if (Array.from(file).length > 1) {
      alert(`Cannot upload multiple files`);
      return;
    } else if (isNaN(threshold) || threshold < 0) {
      alert("Threshold must be a non-negative number.");
      return;
    }

    try {
      setStatus('Uploading...');
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(
        `http://127.0.0.1:3000/energy/upload/${threshold}`, 
        { 
          method: 'POST',
          body: formData
        }
      );

      setStatus('');
      setFile(null);
      inputRef.current.value = "";

      const data = await response.text();
      const parsedData = JSON.parse(data);
      const thresholdExceeded = parsedData.thresholdExceeded.length ? `\n${parsedData.thresholdExceeded.map(record => `Usage of ${record.usage} on ${record.date} exceeded threshold of 30`).join('\n')}` : ''
      alert("File uploaded successfully!" + thresholdExceeded);
    } catch (error) {
      setStatus('');
      setFile(null);
      inputRef.current.value = "";
      alert(`There was an error uploading your file:\n${error}`);
    }
  }

  return (
    <div className="App">
      <form onSubmit={ handleSubmit }>
        <label>Upload Energy Usage CSV:</label>
        <input
          type="file"
          ref={inputRef}
          onChange={ (e) => setFile(e.target.files[0]) }
        />
        <label>Threshold</label>
        <input
          type="number"
          min="0"
          defaultValue="30"
          onChange={ (e) => setThreshold(e.target.value) }
        />
        <button type="submit" disabled={ !file } value={file ? undefined : ''}>Upload</button>
      </form>
      { status && <h3>{status}</h3> }
    </div>
  );
}

export default UploadFile;
