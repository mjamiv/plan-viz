export default function Upload({ onUpload }) {
  const handleChange = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      onUpload(file);
    }
  };

  return (
    <label className="upload">
      <span>Upload PDF</span>
      <input type="file" accept="application/pdf" onChange={handleChange} />
    </label>
  );
}
