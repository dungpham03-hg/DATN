import React, { useEffect, useState } from 'react';
// Import Quill CSS globally
import 'quill/dist/quill.snow.css';

const QuillWrapper = ({ value, onChange, readOnly, placeholder, ...props }) => {
  const [EditorComp, setEditorComp] = useState(null);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    // Dynamically import ReactQuill to avoid SSR issues
    const loadQuill = async () => {
      try {
        console.log('Loading Quill editor...');
        
        // Import ReactQuill dynamically
        const ReactQuillLib = await import('react-quill');
        const ReactQuill = ReactQuillLib.default || ReactQuillLib;
        
        console.log('ReactQuill loaded:', ReactQuill);
        
        if (ReactQuill && typeof ReactQuill === 'function') {
          setEditorComp(() => ReactQuill);
          console.log('Quill editor component set successfully');
        } else {
          console.warn('ReactQuill is not a valid component:', ReactQuill);
          setError('Không thể tải rich text editor. Đang dùng textarea đơn giản.');
        }
      } catch (error) {
        console.error('Failed to load Quill:', error);
        setError(error.message);
      }
    };
    
    loadQuill();
  }, []);

  // Show loading state
  if (!EditorComp && !error) {
    return (
      <div style={{ 
        minHeight: '200px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        border: '1px solid #ccc',
        borderRadius: '4px',
        background: '#f9f9f9'
      }}>
        <span>Đang tải rich text editor...</span>
      </div>
    );
  }

  // Fallback textarea if Quill is not loaded
  if (!EditorComp || error) {
    return (
      <textarea
        value={value || ''}
        onChange={(e) => onChange && onChange(e.target.value)}
        readOnly={readOnly}
        placeholder={placeholder || 'Nhập nội dung biên bản...'}
        style={{
          width: '100%',
          minHeight: '200px',
          padding: '12px',
          border: '1px solid #ccc',
          borderRadius: '4px',
          fontFamily: 'inherit',
          fontSize: '14px',
          resize: 'vertical'
        }}
        {...props}
      />
    );
  }

  return (
    <EditorComp
      value={value}
      onChange={onChange}
      modules={{
        toolbar: [
          [{ 'font': ['Arial', 'Helvetica', 'Times New Roman', 'Courier New', 'Verdana', 'Georgia', 'Tahoma', 'Comic Sans MS', 'Impact'] }],
          [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
          [{ 'size': ['small', false, 'large', 'huge'] }],
          ['bold', 'italic', 'underline', 'strike'],
          [{ 'script': 'sub'}, { 'script': 'super' }],
          [{ 'color': [] }, { 'background': [] }],
          [{ 'list': 'ordered'}, { 'list': 'bullet' }],
          [{ 'indent': '-1'}, { 'indent': '+1' }],
          [{ 'align': [] }],
          ['blockquote', 'code-block'],
          ['link', 'image'],
          ['clean']
        ],
      }}
      formats={[
        'font', 'header', 'size', 'bold', 'italic', 'underline', 'strike',
        'script', 'color', 'background',
        'list', 'bullet', 'indent', 'align',
        'blockquote', 'code-block',
        'link', 'image'
      ]}
      bounds="self"
      style={{
        backgroundColor: 'white',
        minHeight: '250px'
      }}
      {...props}
    />
  );
};

export default QuillWrapper;
